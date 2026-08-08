// 🖼️ PONTO 79 — imagem padrão por TIPO de pedido.
// Produtos digitais (adesão / licença / plano / parceiro) não têm foto de produto:
// sem isso o card caía num placeholder cinza escrito "Imagem".
// As artes são as MESMAS já usadas na página Lucre (nada novo criado).
// Detecta pelo campo `kind` quando existe e, como os registros atuais estão com
// `kind` vazio no banco, também pelo título (fonte real hoje).

const IMG_VENDEDOR = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/2f7400a5d_generated_image.png';
const IMG_LICENCIADO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/28db39fb0_generated_image.png';
const IMG_INFLUENCIADOR = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/84782e7ee_generated_image.png';
const IMG_PARCEIRO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/3debca5db_generated_image.png';
// 🖤 PLANOS DO PARCEIRO DE COMPRA — arte própria preto/dourado por plano
// (os 4 planos oficiais estão em InvestorDashboard: PORTFOLIOS).
// Antes, "Plano Elite" caía na arte do Licenciado (regra genérica de "plano").
const IMG_PC_VISIONARIO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/ed46aa722_generated_image.png';
const IMG_PC_SOCIOS_OURO = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/347d9ddb9_generated_image.png';
const IMG_PC_ELITE = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/ff1866234_generated_image.png';
// Private Galpão: usa a MESMA arte oficial do carrossel de planos
const IMG_PRIVATE = 'https://media.base44.com/images/public/68d536db3c26ff51f79c4137/0afd480b8_generated_image.png';

// Sem foto e sem tipo reconhecido: caixa neutra (nada de texto "Imagem")
export const IMG_SEM_FOTO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%231f2937' width='100' height='100'/%3E%3Cpath d='M28 62l14-16 10 11 8-9 12 14z' fill='%234b5563'/%3E%3Ccircle cx='37' cy='38' r='6' fill='%234b5563'/%3E%3C/svg%3E";

// Da mais específica para a mais genérica
const REGRAS = [
  // Planos do Parceiro primeiro: são os mais específicos
  { re: /private|galp[ãa]o/i, img: IMG_PRIVATE },
  { re: /vision[áa]rio/i, img: IMG_PC_VISIONARIO },
  { re: /s[óo]cios?\s+de\s+ouro/i, img: IMG_PC_SOCIOS_OURO },
  { re: /elite/i, img: IMG_PC_ELITE },
  { re: /vendedor/i, img: IMG_VENDEDOR },
  { re: /licenciad|lojista/i, img: IMG_LICENCIADO },
  { re: /influenciador|influencer/i, img: IMG_INFLUENCIADOR },
  { re: /parceiro|investidor/i, img: IMG_PARCEIRO },
  // genéricos de produto digital sem cargo no título
  { re: /ades[ãa]o|licen[çc]a|plano|assinatura/i, img: IMG_LICENCIADO },
];

const KINDS_DIGITAL = ['adesao', 'licenca', 'plano', 'digital'];

// Arte do tipo, ou null quando não é produto digital reconhecido
function arteDoTipo(order) {
  const titulo = order?.product_title || '';
  const ehDigital = KINDS_DIGITAL.includes(order?.kind) || /ades[ãa]o|licen[çc]a|plano|assinatura|parceiro de compra|private|galp[ãa]o|vision[áa]rio|s[óo]cios? de ouro|elite/i.test(titulo);
  if (!ehDigital) return null;
  const regra = REGRAS.find((r) => r.re.test(titulo));
  return regra ? regra.img : IMG_LICENCIADO;
}

// Imagem final do card: foto do produto quando existe, senão a arte do tipo.
export function imagemPedido(order) {
  if (order?.product_image) return order.product_image;
  return arteDoTipo(order) || IMG_SEM_FOTO;
}

// Usada no onError: se a URL da foto quebrar, cai na arte do tipo (nunca no "Imagem").
export function imagemFallback(order) {
  return arteDoTipo(order) || IMG_SEM_FOTO;
}