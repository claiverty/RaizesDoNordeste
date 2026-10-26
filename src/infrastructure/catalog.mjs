const units = [
  {
    id: 'recife-centro',
    name: 'Raízes do Nordeste — Recife Centro',
    city: 'Recife',
    active: true,
    channels: ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'],
  },
  {
    id: 'natal-norte',
    name: 'Raízes do Nordeste — Natal Norte',
    city: 'Natal',
    active: false,
    channels: ['APP', 'WEB', 'TOTEM', 'BALCAO', 'PICKUP'],
  },
];

const productsByUnit = {
  'recife-centro': [
    { id: 'bolo-milho', name: 'Bolo de milho', description: 'Fatia da casa, receita tradicional.', priceCents: 1250, available: true },
    { id: 'carne-sol', name: 'Escondidinho de carne de sol', description: 'Purê de macaxeira e carne de sol.', priceCents: 2890, available: true },
    { id: 'baiao-dois', name: 'Baião de dois com carne de sol', description: 'Feijão-fradinho, arroz, queijo coalho e carne de sol.', priceCents: 3190, available: true },
    { id: 'carne-sol-macaxeira', name: 'Carne de sol com macaxeira', description: 'Carne acebolada, macaxeira dourada e vinagrete.', priceCents: 3690, available: true },
    { id: 'tapioca-queijo', name: 'Tapioca com queijo coalho', description: 'Feita na hora, com queijo coalho.', priceCents: 1600, available: true },
    { id: 'tapioca-carne-sol', name: 'Tapioca de carne de sol com queijo coalho', description: 'Carne de sol desfiada e queijo coalho derretido.', priceCents: 2190, available: true },
    { id: 'tapioca-frango', name: 'Tapioca de frango cremoso', description: 'Frango desfiado, requeijão cremoso e cheiro-verde.', priceCents: 1890, available: true },
    { id: 'tapioca-coco', name: 'Tapioca de coco com leite condensado', description: 'Coco ralado fresco e leite condensado.', priceCents: 1690, available: true },
    { id: 'queijo-coalho', name: 'Queijo coalho na chapa', description: 'Porção individual.', priceCents: 950, available: true },
    { id: 'macaxeira-frita', name: 'Macaxeira frita', description: 'Porção crocante com molho de ervas da casa.', priceCents: 1290, available: true },
    { id: 'farofa-banana', name: 'Farofa de banana-da-terra', description: 'Farofa de mandioca tostada com banana dourada.', priceCents: 890, available: true },
    { id: 'vinagrete', name: 'Vinagrete da casa', description: 'Tomate, cebola, pimentão, coentro e limão.', priceCents: 590, available: true },
    { id: 'cuscuz-sertao', name: 'Cuscuz sertanejo', description: 'Indisponível nesta unidade hoje.', priceCents: 1850, available: false },
    { id: 'suco-caja', name: 'Suco de cajá', description: 'Polpa de cajá batida e servida gelada · 300 ml.', priceCents: 950, available: true },
    { id: 'suco-caju', name: 'Suco de caju', description: 'Suco de caju natural e gelado · 300 ml.', priceCents: 950, available: true },
    { id: 'suco-graviola', name: 'Suco de graviola', description: 'Suco cremoso de graviola · 300 ml.', priceCents: 1050, available: true },
    { id: 'suco-acerola', name: 'Suco de acerola', description: 'Suco de acerola natural e gelado · 300 ml.', priceCents: 890, available: true },
    { id: 'agua-coco', name: 'Água de coco', description: 'Água de coco gelada · 300 ml.', priceCents: 800, available: true },
    { id: 'cola-tradicional', name: 'Refrigerante de cola', description: 'Lata gelada · 350 ml.', priceCents: 650, available: true },
    { id: 'cola-zero', name: 'Refrigerante de cola zero', description: 'Lata gelada, sem açúcar · 350 ml.', priceCents: 650, available: true },
    { id: 'guarana', name: 'Refrigerante de guaraná', description: 'Lata gelada · 350 ml.', priceCents: 650, available: true },
    { id: 'agua-mineral', name: 'Água mineral', description: 'Garrafa de água mineral sem gás · cortesia da casa.', priceCents: 0, available: true },
    { id: 'bolo-rolo', name: 'Bolo de rolo', description: 'Massa fina enrolada com camadas de goiabada.', priceCents: 1200, available: true },
    { id: 'cartola', name: 'Cartola pernambucana', description: 'Banana dourada, queijo coalho, açúcar e canela.', priceCents: 1490, available: true },
  ],
  'natal-norte': [
    { id: 'bolo-milho', name: 'Bolo de milho', description: 'Fatia da casa, receita tradicional.', priceCents: 1290, available: true },
    { id: 'carne-sol', name: 'Escondidinho de carne de sol', description: 'Purê de macaxeira e carne de sol.', priceCents: 2950, available: true },
  ],
};

export const catalog = Object.freeze({
  listUnits() {
    return units.map((unit) => ({ ...unit }));
  },
  getUnit(unitId) {
    const unit = units.find((candidate) => candidate.id === unitId);
    return unit ? { ...unit } : null;
  },
  getMenu(unitId) {
    if (!productsByUnit[unitId]) return null;
    return productsByUnit[unitId].map((product) => ({ ...product }));
  },
});
