// ⭐ O ATALHO DA TOP COLLEGE NO CABEÇALHO — 23/09/2026
//
// Pedido do dono: "atalho da Top College, já com a lógica de só usuários
// visualizarem, direcionando para o Compromisso. O usuário pode mudar entre
// qual caminho ele quer cair: lista, jornada, quadro… Esse atalho deve ficar
// no header, ali próximo do menu de navegação. E lá no X-Game os usuários
// devem poder escolher para onde vai esse atalho (pré-programado para levar
// para o Compromisso)." E depois: "o atalho deve ser o ícone".
//
// O ícone é a marca da Top College. Quem não está logado não vê. O destino é
// uma VISÃO do Compromisso (a mesma faixa Jornada · Lista · Quadro · Mapa ·
// Demandas); a pessoa fixa a dela pela estrela na própria faixa, e a escolha
// vive no aparelho (localStorage) e no perfil (metodo_perfil.atalho_destino)
// — o perfil manda quando os dois discordam, pra valer em qualquer aparelho.

export const CHAVE_ATALHO = 'nz_atalho_topcollege';
export const DESTINO_PADRAO = 'jornada';

export const DESTINOS_DO_ATALHO = Object.freeze([
  { id: 'jornada',  rotulo: 'Jornada' },
  { id: 'lista',    rotulo: 'Lista' },
  { id: 'quadro',   rotulo: 'Quadro' },
  { id: 'mapa',     rotulo: 'Mapa' },
  { id: 'demandas', rotulo: 'Demandas' },
]);

// As seções do Método que a URL pode abrir direto (?secao=). Só estas — um
// valor inventado cai no padrão da tela, nunca numa seção que não existe.
export const SECOES_DO_METODO = Object.freeze([
  'sonho', 'compromisso', 'lista', 'contato', 'apresentacao', 'acompanhamento', 'verificacao', 'duplicacao',
]);

/** Um destino válido, ou o padrão. */
export function normalizarDestino(valor) {
  const v = String(valor ?? '').trim().toLowerCase();
  return DESTINOS_DO_ATALHO.some((d) => d.id === v) ? v : DESTINO_PADRAO;
}

/** O rótulo do destino, pra tela. */
export function rotuloDoDestino(destino) {
  const d = normalizarDestino(destino);
  return DESTINOS_DO_ATALHO.find((x) => x.id === d).rotulo;
}

/** A URL que o ícone abre: Top College → Central → Compromisso → a visão escolhida. */
export function urlDoAtalho(destino) {
  // 🔴 23/09 (dono: "está levando para a página de Alavancagem"): a sub-aba era
  // catalogo-clientes (Venda Direta). O Método — os 8 Hábitos, o Compromisso —
  // mora em catalogo-crm. E quem já estava na Top College precisava de remount:
  // agora Licensing, a Central e o Compromisso reagem à URL (useLocation).
  return `/Licensing?tab=catalogo&catalogTab=catalogo-crm&secao=compromisso&visao=${normalizarDestino(destino)}`;
}

/** Só quem está logado vê o ícone. */
export function mostraAtalho(usuario) {
  return Boolean(usuario && usuario.email);
}

// ── o que está gravado no aparelho ─────────────────────────────────────────
function armazem(storage) {
  if (storage) return storage;
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function lerAtalho(storage) {
  try { return normalizarDestino(armazem(storage)?.getItem(CHAVE_ATALHO)); } catch { return DESTINO_PADRAO; }
}

export function gravarAtalho(destino, storage) {
  const d = normalizarDestino(destino);
  try { armazem(storage)?.setItem(CHAVE_ATALHO, d); } catch { /* aparelho sem storage: segue o padrão */ }
  return d;
}

// ── o que a URL pede ───────────────────────────────────────────────────────
function parametro(search, nome) {
  try { return new URLSearchParams(search || '').get(nome); } catch { return null; }
}

/** ?secao=compromisso → 'compromisso'; inválida ou ausente → null (a tela decide o padrão dela). */
export function secaoDaUrl(search) {
  const s = String(parametro(search, 'secao') ?? '').trim().toLowerCase();
  return SECOES_DO_METODO.includes(s) ? s : null;
}

/** ?visao=quadro → 'quadro'; inválida ou ausente → null. */
export function visaoDaUrl(search) {
  const v = String(parametro(search, 'visao') ?? '').trim().toLowerCase();
  return DESTINOS_DO_ATALHO.some((d) => d.id === v) ? v : null;
}
