import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const args = parseArgs(process.argv.slice(2));
const baseUrl = args.baseUrl ?? process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const vus = Number(args.vus ?? 500);
const rampUpSeconds = Number(args.warmup ?? args['ramp-up'] ?? 5);
const holdSeconds = Number(args.duration ?? 30);
const rampDownSeconds = Number(args['ramp-down'] ?? 5);
const errorLimit = Number(args['error-threshold'] ?? 0.01);

if (!Number.isInteger(vus) || vus < 1 || vus > 5000) throw new Error('--vus deve ser inteiro de 1 a 5000.');
for (const [name, value] of [['--warmup/--ramp-up', rampUpSeconds], ['--duration', holdSeconds], ['--ramp-down', rampDownSeconds]]) {
  if (!Number.isFinite(value) || value < 1 || value > 900) throw new Error(`${name} deve ser entre 1 e 900 segundos.`);
}

const health = await fetch(`${baseUrl}/api/v1/health`);
if (!health.ok) throw new Error(`Servidor de teste indisponível: HTTP ${health.status}`);

const menuResponse = await fetch(`${baseUrl}/api/v1/units/recife-centro/menu`);
if (!menuResponse.ok) throw new Error(`Cardápio indisponível: HTTP ${menuResponse.status}`);

const results = [];
const startAt = performance.now();
const rampUpEnd = startAt + rampUpSeconds * 1000;
const holdEnd = rampUpEnd + holdSeconds * 1000;
const endAt = holdEnd + rampDownSeconds * 1000;
let startedOperations = 0;
let warmupOperations = 0;

async function worker(workerIndex) {
  const startDelayMs = rampUpSeconds * 1000 * workerIndex / vus;
  await new Promise((resolve) => setTimeout(resolve, startDelayMs));
  const stopAt = holdEnd + rampDownSeconds * 1000 * (1 - (workerIndex + 1) / vus);
  while (performance.now() < stopAt && performance.now() < endAt) {
    const operationStarted = performance.now();
    const phase = operationStarted < rampUpEnd ? 'ramp_up' : operationStarted < holdEnd ? 'hold' : 'ramp_down';
    const doOrder = (startedOperations + workerIndex) % 10 === 0;
    startedOperations += 1;
    let responseStatus = 0;
    let operation = doOrder ? 'order' : 'menu';
    try {
      let response;
      if (doOrder) {
        response = await fetch(`${baseUrl}/api/v1/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `load-${randomUUID()}` },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            unitId: 'recife-centro', channel: 'WEB', fulfillment: 'PICKUP',
            items: [{ productId: 'bolo-milho', quantity: 1 }],
            payment: { method: 'PIX', outcome: 'APPROVED' },
          }),
        });
      } else {
        response = await fetch(`${baseUrl}/api/v1/units/recife-centro/menu`, { signal: AbortSignal.timeout(5000) });
      }
      responseStatus = response.status;
      await response.arrayBuffer();
    } catch {
      responseStatus = 0;
    }
    const durationMs = performance.now() - operationStarted;
    if (phase === 'ramp_up') warmupOperations += 1;
    else results.push({ phase, operation, status: responseStatus, durationMs });
  }
}

const wallStart = performance.now();
await Promise.all(Array.from({ length: vus }, (_, index) => worker(index)));
const totalDurationMs = performance.now() - wallStart;
const measuredDurationMs = totalDurationMs - rampUpSeconds * 1000;
const summary = summarize(results, measuredDurationMs, warmupOperations, vus, holdSeconds, errorLimit);
const output = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  config: { vus, rampUpSeconds, holdSeconds, rampDownSeconds, errorThreshold: errorLimit },
  ...summary,
};
console.log(JSON.stringify(output, null, 2));
if (summary.errorRate > errorLimit || summary.thresholdFailures.length > 0) process.exitCode = 1;

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) continue;
    const [rawKey, inlineValue] = value.slice(2).split('=', 2);
    const key = rawKey;
    parsed[key] = inlineValue ?? argv[++i];
  }
  return parsed;
}

function percentile(sorted, fraction) {
  if (sorted.length === 0) return null;
  const index = Math.max(0, Math.ceil(fraction * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

function summarize(records, wallMs, warmupCount, configuredVus, duration, maxErrorRate) {
  const successes = records.filter((record) => record.status >= 200 && record.status < 300);
  const errors = records.length - successes.length;
  const sortedAll = records.map((record) => record.durationMs).sort((a, b) => a - b);
  const byOperation = {};
  for (const operation of ['menu', 'order']) {
    const rows = records.filter((record) => record.operation === operation);
    const sorted = rows.map((record) => record.durationMs).sort((a, b) => a - b);
    byOperation[operation] = {
      requests: rows.length,
      successful: rows.filter((record) => record.status >= 200 && record.status < 300).length,
      errors: rows.filter((record) => !(record.status >= 200 && record.status < 300)).length,
      p50Ms: percentile(sorted, 0.50),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
    };
  }
  const holdRecords = records.filter((record) => record.phase === 'hold');
  const holdByOperation = {};
  for (const operation of ['menu', 'order']) {
    const rows = holdRecords.filter((record) => record.operation === operation);
    const sorted = rows.map((record) => record.durationMs).sort((a, b) => a - b);
    holdByOperation[operation] = {
      requests: rows.length,
      successful: rows.filter((record) => record.status >= 200 && record.status < 300).length,
      errors: rows.filter((record) => !(record.status >= 200 && record.status < 300)).length,
      p50Ms: percentile(sorted, 0.50),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
    };
  }
  const stageMetrics = {};
  for (const phase of ['hold', 'ramp_down']) {
    const rows = records.filter((record) => record.phase === phase);
    const sorted = rows.map((record) => record.durationMs).sort((a, b) => a - b);
    stageMetrics[phase] = {
      requests: rows.length,
      errors: rows.filter((record) => !(record.status >= 200 && record.status < 300)).length,
      p50Ms: percentile(sorted, 0.50),
      p95Ms: percentile(sorted, 0.95),
      p99Ms: percentile(sorted, 0.99),
    };
  }
  const thresholdFailures = [];
  if ((holdByOperation.menu.p95Ms ?? Infinity) > 250) thresholdFailures.push('menu_hold_p95_ms_gt_250');
  if ((holdByOperation.order.p95Ms ?? Infinity) > 750) thresholdFailures.push('order_hold_p95_ms_gt_750');
  const elapsedSeconds = wallMs / 1000;
  return {
    warmupRequests: warmupCount,
    measuredRequests: records.length,
    successfulRequests: successes.length,
    errors,
    errorRate: records.length ? Math.round(errors / records.length * 10000) / 10000 : 1,
    throughputRps: Math.round(records.length / elapsedSeconds * 100) / 100,
    wallDurationMs: Math.round(wallMs),
    overallLatencyMs: {
      p50: percentile(sortedAll, 0.50),
      p95: percentile(sortedAll, 0.95),
      p99: percentile(sortedAll, 0.99),
    },
    configuredVus,
    requestedDurationSeconds: duration,
    operationMetrics: byOperation,
    holdMetrics: holdByOperation,
    stageMetrics,
    thresholdFailures,
    errorThreshold: maxErrorRate,
  };
}
