// liquidarArrematesPendentes — O ARREMATE VIRA PEDIDO SOZINHO, sem depender do
// vencedor voltar ao site.
//
// ══════════════════════════════════════════════════════════════════════════════
// O PROBLEMA (medido em produção, 24/08/2026)
// ══════════════════════════════════════════════════════════════════════════════
// finalizeAuctionCore.js:351 grava `order_status: 'awaiting_payment'` no martelo.
// Quem tira dali e cria o pedido em catalog_sales é settleAuctionWithBalance —
// e ele só era chamado de DOIS lugares, os dois dentro do navegador do vencedor:
//   • WinnerModal.jsx  — se ele estivesse com a sala aberta no exato momento
//   • MyWinnings.jsx   — se ele abrisse "Meus Arremates" depois
//
// Vencedor que fechou a aba e não voltou = arremate que NUNCA vira pedido. Não
// aparece na Gestão de Pedidos, a logística não vê, ninguém envia nada. Para
// sempre.
//
// Retrato de 24/08/2026: 4 produtos reais travados em awaiting_payment, o mais
// antigo parado há 28 dias. Foi o caso relatado — "arrematado e não apareceu nos
// pedidos" (Kit Driver Reator / Rosenberg e Organizador de Mesa / Lucas Arruda,
// os dois parados há 3 dias, com saldo de sobra na carteira).
//
// ══════════════════════════════════════════════════════════════════════════════
// POR QUE LIQUIDAR SOZINHO É CERTO (e não uma decisão inventada aqui)
// ══════════════════════════════════════════════════════════════════════════════
// Não existe escolha de pagamento no arremate. O WinnerModal diz, no próprio
// código: "Liquidação automática: ao abrir como vencedor, o lance é debitado do
// saldo na hora" — sem confirmação, sem opção de PIX. O dinheiro já está travado
// em saldo_reservado desde o lance. Ou seja: o débito automático já é a regra;
// o navegador era só um gatilho acidental. Este cron é o gatilho confiável.
//
// ══════════════════════════════════════════════════════════════════════════════
// COMO — e por que NÃO mexemos em settleAuctionWithBalance
// ══════════════════════════════════════════════════════════════════════════════
// Toda a matemática do dinheiro (débito reserva→disponível, CAS otimista,
// livro-caixa, comissões, criação da venda) fica EXATAMENTE onde está. Este
// arquivo não copia, não move e não reescreve uma linha dela — só chama o mesmo
// endpoint que o navegador chama, com o mesmo corpo.
//
// A única peça nova é o crachá: emitirSessao() assina um crachá válido para o
// vencedor com a chave que só o servidor tem (api/_lib/sessao.js). Assim a
// chamada passa igual à do navegador, e continua funcionando quando o
// SESSAO_MODO=bloquear for ligado (etapa 2).
//
// Corrida com o navegador é impossível por construção: o flip de order_status
// lá dentro é atômico (`&order_status=eq.awaiting_payment` + return=representation).
// Quem chegar depois recebe `already_paid` e não debita nada. Chamar este
// endpoint duas vezes seguidas também não cobra em dobro.
//
// ⚠️ PLANO DE CARREIRA FICA DE FORA. Plano/investimento também nasce
// 'awaiting_payment', mas tem caminho de pagamento próprio (createPartnerPlanPix)
// e NÃO pode ser debitado da carteira. São 44 registros hoje — o filtro abaixo é
// o mesmo que MyWinnings.jsx já usa pra não listá-los.
import { emitirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = process.env.PUBLIC_BASE_URL || 'https://leilaonozap.net';

const LOTE = 20; // por execução — o cron roda de novo em 10 min

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

// Plano de carreira / investimento / leilão de teste: nunca liquidar da carteira.
// Espelha o filtro de MyWinnings.jsx — se um dia mudar lá, mude aqui junto.
function ehPlanoOuTeste(a) {
  return a?.is_investment_plan === true
    || a?.is_test_auction === true
    || /\bplano\b/i.test(a?.title || '');
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  try {
    if (!SUPABASE_URL || !SR) return res.status(500).json({ success: false, error: 'Config do servidor ausente' });

    const rows = await (await sb(
      'auctions?select=id,title,winner_id,winner_name,current_price,is_investment_plan,is_test_auction' +
      '&order_status=eq.awaiting_payment&winner_id=not.is.null&status=in.(ended,sold,processing)' +
      `&order=end_time.asc&limit=${LOTE}`
    )).json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(200).json({ success: true, liquidados: 0, resultados: [] });
    }

    const alvos = rows.filter((a) => !ehPlanoOuTeste(a));
    const resultados = [];

    for (const a of alvos) {
      try {
        const cracha = emitirSessao(a.winner_id);
        if (!cracha) {
          // Sem chave de assinatura no servidor não dá pra provar quem está chamando.
          // Melhor não liquidar do que liquidar sem identidade.
          resultados.push({ auction_id: a.id, erro: 'sem_chave_de_sessao' });
          continue;
        }

        const r = await fetch(`${BASE_URL}/api/functions/settleAuctionWithBalance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-sessao': cracha },
          body: JSON.stringify({ auction_id: a.id, user_id: a.winner_id }),
        });
        const d = await r.json().catch(() => null);

        resultados.push({
          auction_id: a.id,
          titulo: a.title,
          vencedor: a.winner_name,
          ok: d?.success === true,
          ja_pago: d?.already_paid === true,
          sem_saldo: d?.insufficient === true,
          erro: d?.success === true ? undefined : (d?.error || `http ${r.status}`),
        });
      } catch (e) {
        console.error(`[CRON LIQUIDAR] falha no leilão ${a.id}:`, e?.message);
        resultados.push({ auction_id: a.id, erro: String(e?.message || e) });
      }
    }

    const liquidados = resultados.filter((x) => x.ok && !x.ja_pago).length;
    const semSaldo = resultados.filter((x) => x.sem_saldo).length;
    // Só faz barulho quando algo mudou ou travou — cron silencioso não polui o log.
    if (liquidados || semSaldo || resultados.some((x) => x.erro)) {
      console.log(`[CRON LIQUIDAR] ${liquidados} liquidado(s), ${semSaldo} sem saldo, de ${alvos.length} pendente(s).`);
    }
    return res.status(200).json({ success: true, liquidados, sem_saldo: semSaldo, resultados });
  } catch (e) {
    console.error('[CRON LIQUIDAR] erro fatal:', e);
    return res.status(500).json({ success: false, error: String(e?.message || e) });
  }
}
