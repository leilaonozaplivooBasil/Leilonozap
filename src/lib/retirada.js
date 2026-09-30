// 📦 RETIRADA DIGITAL — regras e textos (30/09/2026). PURO: vale no navegador e
// no servidor, e é o que os testes leem.
//
// Pedido (WhatsApp, repassado pelo dono): "criar um link, um ícone […] para
// ficar comprovado junto ao pedido que a mercadoria foi retirada no escritório,
// na loja, seja onde for. A Beatriz vai criar um termo de retirada." Padrões
// aprovados pelo dono em 30/09: quem registra = admin, diretoria e as contas da
// loja/ponto de retirada; locais = Escritório, Ponto de Retirada Bangu, Outro;
// terceiro pode retirar com o código + nome + 4 últimos dígitos do documento.

export const LOCAIS = Object.freeze([
  { valor: 'escritorio', rotulo: 'Escritório' },
  { valor: 'ponto_bangu', rotulo: 'Ponto de Retirada Bangu' },
  { valor: 'outro', rotulo: 'Outro' },
]);

/** Quem pode registrar uma retirada (papel OU cargo). */
export const PAPEIS_QUE_REGISTRAM = Object.freeze(['admin', 'super_admin']);
export const CARGOS_QUE_REGISTRAM = Object.freeze(['diretoria_operacao', 'loja_fisica', 'ponto_retirada', 'ceo', 'fundador']);

export function podeRegistrarRetirada(pessoa) {
  if (!pessoa || pessoa.active === false) return false;
  if (PAPEIS_QUE_REGISTRAM.includes(pessoa.role)) return true;
  const cargos = [pessoa.primary_career_level, ...(Array.isArray(pessoa.career_levels) ? pessoa.career_levels : [])];
  return cargos.some((c) => CARGOS_QUE_REGISTRAM.includes(c));
}

/**
 * O TERMO. Provisório até a Beatriz mandar o definitivo — a versão fica
 * gravada junto de cada retirada, então trocar o texto depois não altera o que
 * cada cliente assinou.
 */
export const TERMO = Object.freeze({
  versao: 'provisorio-30-09-2026',
  titulo: 'Termo de retirada',
  texto: (pedido) => `Declaro que retirei pessoalmente, ou por pessoa autorizada por mim, o(s) produto(s) do pedido #${pedido} no Leilão NoZap, que conferi o(s) produto(s) no ato da retirada e que o(s) recebi em perfeito estado.`,
});

export const ehRetirada = (venda) => {
  let raw = venda?.raw_base44;
  if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch { raw = null; } }
  return raw?.delivery_type === 'pickup';
};

// o dinheiro já entrou: dá pra entregar. Cancelado/aguardando pagamento, não.
const PAGOS = ['paid', 'preparando', 'entregue', 'delivered', 'shipped', 'saiu_entrega', 'confirmado', 'pago', 'concluido'];
export const vendaPodeSerRetirada = (venda) => ehRetirada(venda) && PAGOS.includes(String(venda?.status || '').toLowerCase());

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');
export const codigoLimpo = (v) => soDigitos(v).slice(0, 6);
/** "482913" → "482 913" (fácil de ditar no balcão) */
export const codigoFormatado = (c) => { const d = codigoLimpo(c); return d.length === 6 ? `${d.slice(0, 3)} ${d.slice(3)}` : d; };

const ASSINATURA_MAX = 300_000; // ~220 KB de PNG — sobra pra uma assinatura com o dedo

/**
 * Confere o formulário do balcão. Devolve a lista de erros (vazia = pode gravar).
 * @param {{local, localOutro, quem, terceiroNome, terceiroDoc4, codigo, semCodigo, motivoSemCodigo, assinatura, aceite}} f
 */
export function errosDaRetirada(f = {}) {
  const e = [];
  if (!LOCAIS.some((l) => l.valor === f.local)) e.push('Escolha o local da retirada.');
  if (f.local === 'outro' && String(f.localOutro || '').trim().length < 3) e.push('Escreva onde foi a retirada.');
  if (f.quem !== 'comprador' && f.quem !== 'terceiro') e.push('Diga quem está retirando.');
  if (f.quem === 'terceiro') {
    if (String(f.terceiroNome || '').trim().split(/\s+/).length < 2) e.push('Nome completo de quem está retirando.');
    if (soDigitos(f.terceiroDoc4).length !== 4) e.push('Os 4 últimos dígitos do documento de quem está retirando.');
  }
  if (!f.semCodigo && codigoLimpo(f.codigo).length !== 6) e.push('Digite o código de retirada do cliente (6 números).');
  if (f.semCodigo && String(f.motivoSemCodigo || '').trim().length < 5) e.push('Explique por que a retirada foi sem código.');
  if (f.semCodigo && f.quem === 'terceiro') e.push('Terceiro só retira com o código do cliente.');
  const a = String(f.assinatura || '');
  if (!a.startsWith('data:image/png;base64,') || a.length < 200) e.push('Falta a assinatura.');
  else if (a.length > ASSINATURA_MAX) e.push('Assinatura grande demais — limpe e assine de novo.');
  if (!f.aceite) e.push('Marque que o cliente leu o termo.');
  return e;
}

export const rotuloDoLocal = (local, localOutro) => (local === 'outro' ? String(localOutro || 'Outro').trim() : (LOCAIS.find((l) => l.valor === local)?.rotulo || local));

/** "30/09/2026 às 15:42" (Brasília) */
export function quandoRetirou(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

/** O número que o cliente vê ("LZ42C79347"/"AR…") — mesma regra do servidor (regrasDosAvisos.numeroDoPedido). */
export function numeroDoPedidoTela({ id, kind, tracking_code: tc } = {}) {
  if (/^(LZ|AR)[0-9A-F]{8}$/i.test(String(tc || '').trim())) return String(tc).trim().toUpperCase();
  const base = String(id || '').slice(0, 8).toUpperCase();
  return base ? `${kind === 'arremate' ? 'AR' : 'LZ'}${base}` : '';
}
