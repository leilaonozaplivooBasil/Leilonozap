// 🕛 JANELA DE DATAS DO BANNER — as regras, sem a tela (08/10/2026).
//
// O dono sobe três artes de um leilão de TV (faltando 3, 2 e 1 dia) e quer que
// cada uma entre e saia sozinha à meia-noite. Cada banner tem uma janela
// opcional: `starts_at` (antes disso não aparece) e `ends_at` (a partir disso
// não aparece mais). Nulo em qualquer ponta = sem limite naquele lado.
//
// ⏱️ O fuso é o de BRASÍLIA (UTC−3, sem horário de verão desde 2019): o dono
// digita "12/10 às 00:00" e é isso que vale, no celular de qualquer um. No
// banco fica o instante absoluto (timestamptz).
//
// 🔀 A janela é início-inclusivo e fim-exclusivo: às 00:00 em que a arte A
// termina, a arte B começa — nenhum segundo com as duas, nenhum sem nenhuma.

const FUSO = 'America/Sao_Paulo';
const OFFSET_BRASILIA = '-03:00';

const ms = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
};

/** O banner está dentro da janela neste instante? (não olha `is_active`). */
export function dentroDaJanela(banner, agoraMs = Date.now()) {
  const ini = ms(banner?.starts_at);
  const fim = ms(banner?.ends_at);
  if (ini !== null && agoraMs < ini) return false;
  if (fim !== null && agoraMs >= fim) return false;
  return true;
}

/** Só os banners cuja janela vale agora. Devolve array NOVO. */
export function filtrarPorJanela(lista, agoraMs = Date.now()) {
  return (Array.isArray(lista) ? lista : []).filter((b) => b && dentroDaJanela(b, agoraMs));
}

/** Próximo instante em que algum banner entra ou sai (ms), ou null. */
export function proximaVirada(lista, agoraMs = Date.now()) {
  let menor = null;
  for (const b of Array.isArray(lista) ? lista : []) {
    for (const t of [ms(b?.starts_at), ms(b?.ends_at)]) {
      if (t !== null && t > agoraMs && (menor === null || t < menor)) menor = t;
    }
  }
  return menor;
}

/** 'YYYY-MM-DDTHH:mm' (horário de Brasília, do <input datetime-local>) → ISO UTC, ou null. */
export function paraISOBrasilia(valorLocal) {
  const v = String(valorLocal || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const t = new Date(`${v}:00${OFFSET_BRASILIA}`).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/** ISO/instante → 'YYYY-MM-DDTHH:mm' no horário de Brasília (para o <input datetime-local>), ou ''. */
export function deISOBrasilia(valor) {
  const t = ms(valor);
  if (t === null) return '';
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(t)).map((p) => [p.type, p.value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}`;
}

/** '12/10 às 00:00' no horário de Brasília. */
export function rotuloDeData(valor) {
  const t = ms(valor);
  if (t === null) return '';
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(t)).map((x) => [x.type, x.value]),
  );
  return `${p.day}/${p.month} às ${p.hour}:${p.minute}`;
}

/** null se a janela é válida; senão a mensagem para o painel. */
export function validarJanela(inicio, fim) {
  const i = ms(inicio);
  const f = ms(fim);
  if (i !== null && f !== null && f <= i) return 'O fim precisa ser depois do início.';
  return null;
}

/**
 * Como o painel descreve o banner agora. `estado`:
 *   desligado | agendado | encerrado | no_ar_com_fim | no_ar
 */
export function situacaoDoBanner(banner, agoraMs = Date.now()) {
  if (banner?.is_active === false) return { estado: 'desligado', texto: 'Desligado' };
  const ini = ms(banner?.starts_at);
  const fim = ms(banner?.ends_at);
  if (ini !== null && agoraMs < ini) return { estado: 'agendado', texto: `Entra em ${rotuloDeData(ini)}` };
  if (fim !== null && agoraMs >= fim) return { estado: 'encerrado', texto: `Saiu do ar em ${rotuloDeData(fim)}` };
  if (fim !== null) return { estado: 'no_ar_com_fim', texto: `No ar · sai em ${rotuloDeData(fim)}` };
  return { estado: 'no_ar', texto: 'No ar' };
}
