// 🔔 NOTIFICAÇÕES NA TELA (o sino do cliente) — 28/09/2026
//
// Dono: "precisamos implementar o mesmo padrão dos e-mails para notificações na
// tela do usuário. Principalmente ações como 'alguém cobriu o lance, arrematou,
// pedido enviado e etc' sem perturbações como PIX gerado — não tem cabimento
// receber esse aviso na tela ao logar."
//
// Mesmo gatilho do e-mail (enviarAviso grava as duas coisas), texto curto de
// sino. Só entram os tipos de TIPOS_NA_TELA — o que é "aconteceu algo com você".
// Ficam de fora, de propósito:
//   • pix_pendente  — cobrança, não notícia (pedido do dono);
//   • cadastro      — a pessoa acabou de se cadastrar, está vendo a tela;
//   • entrou_no_leilao — é o próprio lance dela, a sala já confirma;
//   • nutrição e campanhas — marketing não entra no sino.
//
// Independente das preferências de E-MAIL (avisos_leilao/avisos_conta): quem
// desligou e-mail continua vendo o sino dentro do site.
import { reais, quandoBR } from './textosDosAvisos.js';

export const TIPOS_NA_TELA = Object.freeze([
  'superado', 'arrematou', 'ultima_hora',
  'compra_confirmada', 'compra_enviada',
  'deposito', 'saque_pago', 'kyc_aprovado', 'comissao_paga_manual',
]);

/** "Superado" do mesmo leilão não empilha: a notificação é renovada. */
export const TIPOS_QUE_RENOVAM = Object.freeze(['superado']);

const horaBR = (iso) => quandoBR(iso).split(' às ')[1] || '';
const nomeCurto = (s, max = 60) => { const t = String(s || '').trim(); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };

/**
 * @returns {{titulo:string, texto:string, link:string}|null}  link é caminho do site ("/Carteira")
 */
export function notificacaoDaTela(tipo, d = {}) {
  if (!TIPOS_NA_TELA.includes(tipo)) return null;
  const produto = nomeCurto(d.produto) || 'o leilão';
  const sala = d.leilaoId ? `/AuctionRoom?id=${encodeURIComponent(d.leilaoId)}` : '/leiloes';
  switch (tipo) {
    case 'superado':
      return { titulo: 'Cobriram seu lance', texto: `${produto} agora está em ${reais(d.valorAtual)}. Ainda dá tempo de voltar.`, link: sala };
    case 'arrematou':
      return { titulo: 'Você arrematou!', texto: `${produto} é seu por ${reais(d.valor)}.`, link: '/MyWinnings' };
    case 'ultima_hora': {
      const h = horaBR(d.termina);
      return { titulo: d.naFrente ? 'Última hora, você está na frente' : 'Última hora do leilão', texto: `${produto} encerra${h ? ` às ${h}` : ' em breve'}. Lance atual: ${reais(d.valorAtual)}.`, link: sala };
    }
    case 'compra_confirmada':
      return { titulo: 'Pedido confirmado', texto: `Recebemos o pagamento do pedido #${d.pedido} (${reais(d.valor)}).`, link: '/MyCatalogOrders' };
    case 'compra_enviada':
      return { titulo: 'Pedido a caminho', texto: `O pedido #${d.pedido} saiu pra entrega.${d.rastreio ? ` Rastreio: ${d.rastreio}.` : ''}`, link: d.arremate ? '/MyWinnings' : '/MyCatalogOrders' };
    case 'deposito':
      return { titulo: 'Depósito confirmado', texto: `${reais(d.valor)} entrou na sua Carteira.`, link: '/Carteira' };
    case 'saque_pago':
      return { titulo: 'Saque pago', texto: `${reais(d.valor)} foi pago no PIX do seu CPF.`, link: '/Carteira' };
    case 'kyc_aprovado':
      return { titulo: 'Identidade validada', texto: 'O saque está liberado na sua Carteira.', link: '/Carteira' };
    case 'comissao_paga_manual':
      return { titulo: 'Comissão paga', texto: `Sua comissão de ${reais(d.valor)} foi paga.`, link: '/Carteira' };
    default:
      return null;
  }
}

// ── gravação (rede) ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Grava a notificação do sino. NUNCA lança (mesma regra do e-mail: não pode
 * derrubar lance, pagamento ou cadastro). Devolve { gravada, motivo }.
 */
export async function gravarNotificacao({ tipo, userId, chave, dados = {} }) {
  try {
    const n = notificacaoDaTela(tipo, dados);
    if (!n || !userId || !chave) return { gravada: false, motivo: 'fora_do_sino' };
    if (!SUPABASE_URL || !SR) return { gravada: false, motivo: 'config' };
    const renova = TIPOS_QUE_RENOVAM.includes(tipo);
    const linha = { user_id: String(userId), tipo, chave: String(chave), ...n, criada_em: new Date().toISOString(), ...(renova ? { lida_em: null } : {}) };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/notificacoes?on_conflict=user_id,tipo,chave`, {
      method: 'POST',
      headers: {
        apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json',
        Prefer: `return=minimal,resolution=${renova ? 'merge' : 'ignore'}-duplicates`,
      },
      body: JSON.stringify(linha),
    });
    return { gravada: r.ok, motivo: r.ok ? 'ok' : `http_${r.status}` };
  } catch (e) {
    return { gravada: false, motivo: `erro:${e?.message}` };
  }
}
