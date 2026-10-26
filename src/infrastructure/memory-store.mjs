const RETENTION_MS = 24 * 60 * 60 * 1000;

export class MemoryStore {
  #orders = new Map();
  #idempotency = new Map();
  #sequence = 0;
  #now;
  #cleanupTimer;

  constructor({ now = Date.now, cleanupIntervalMs = 60_000 } = {}) {
    this.#now = now;
    this.#cleanupTimer = setInterval(() => this.#purgeExpired(), cleanupIntervalMs);
    this.#cleanupTimer.unref?.();
  }

  dispose() {
    clearInterval(this.#cleanupTimer);
  }

  #purgeExpired() {
    const now = this.#now();
    for (const [key, record] of this.#idempotency) {
      if (record.expiresAt <= now) this.#idempotency.delete(key);
    }
    for (const [id, order] of this.#orders) {
      if (order.expiresAt <= now) this.#orders.delete(id);
    }
  }

  getIdempotency(key) {
    this.#purgeExpired();
    return this.#idempotency.get(key) ?? null;
  }

  reserveIdempotency(key, fingerprint) {
    this.#purgeExpired();
    const existing = this.#idempotency.get(key);
    if (existing) return { kind: 'existing', record: existing };
    const record = {
      fingerprint,
      state: 'PROCESSING',
      result: null,
      expiresAt: this.#now() + RETENTION_MS,
    };
    this.#idempotency.set(key, record);
    return { kind: 'reserved', record };
  }

  completeIdempotency(key, result) {
    const record = this.#idempotency.get(key);
    if (!record) return false;
    record.state = 'COMPLETED';
    record.result = structuredClone(result);
    return true;
  }

  createOrder(order) {
    this.#purgeExpired();
    this.#sequence += 1;
    const stored = {
      ...structuredClone(order),
      orderNumber: `RN-${String(this.#sequence).padStart(6, '0')}`,
      expiresAt: this.#now() + RETENTION_MS,
    };
    this.#orders.set(stored.id, stored);
    return structuredClone(stored);
  }

  getOrder(id) {
    this.#purgeExpired();
    const order = this.#orders.get(id);
    return order ? structuredClone(order) : null;
  }

  countOrders() {
    this.#purgeExpired();
    return this.#orders.size;
  }
}
