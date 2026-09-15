// 🧹 AUDITORIA (15/09/2026) — o que os logs do Supabase/Vercel denunciaram depois
// da noite: 400/401 recorrentes que ninguém via na tela, e um produto sem frete.
// Dono: "corrige isso tudo de um jeito para funcionar".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('L1: entityWrite tira ANTES as colunas que a tabela não tem (fim dos 400 em system_logs/metodo_tarefas)', () => {
  const s = ler('../api/functions/entityWrite.js');
  assert.match(s, /system_logs: new Set\(\['created_date', 'updated_date'\]\)/);
  assert.match(s, /metodo_tarefas: new Set\(\['base44_id', 'updated_date'\]\)/);
  assert.match(s, /lembrarColunaAusente\(table, bad\);/);
  assert.match(s, /const patch = semColunasAusentes\(table, \{ \.\.\.\(body\?\.payload \|\| \{\}\), updated_date: now \}\);/);
  assert.match(s, /payload\.map\(norm\)\.map\(\(x\) => semColunasAusentes\(table, x\)\) : semColunasAusentes\(table, norm\(payload\)\)/);
});

test('L2: presença online vai pela rota liveHeartbeat (chave de serviço + limite por IP), não mais direto do navegador', () => {
  const rota = ler('../api/functions/liveHeartbeat.js');
  assert.match(rota, /estourouLimite\(`presenca:\$\{ipDoRequest\(req\)\}`, 60, 300\)/);
  assert.match(rota, /FORMATO_SESSAO = \/\^session_\\d\{10,16\}_\[a-z0-9\]\{4,16\}\$\//);
  assert.match(rota, /live_sessions\?select=id&session_id=eq\./);
  const hook = ler('../src/components/system/useActiveSession.jsx');
  assert.match(hook, /fetch\('\/api\/functions\/liveHeartbeat'/);
  assert.ok(!/LiveSession\.(create|update|filter)/.test(hook), 'o hook ainda escreve direto em live_sessions');
});

test('L3: telas não consultam mais tabelas legadas vazias com coluna inexistente', () => {
  const footer = ler('../src/components/common/Footer.jsx');
  assert.ok(!/FooterSettings\.list/.test(footer), 'Footer ainda lê footer_settings');
  for (const f of ['../src/components/home/LiveStats.jsx', '../src/components/admin/LiveMetrics.jsx']) {
    const s = ler(f);
    assert.ok(!/Bid\.list\('-timestamp'/.test(s), `${f} ainda lê a tabela bids`);
    assert.match(s, /AuctionMessage\.filter\(\{ message_type: 'bid' \}, '-created_date'/, f);
    assert.match(s, /Number\(bid\.bid_amount\)/, f);
  }
  assert.match(ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx'), /Negotiation\.list\('-created_at', 1000\)/);
  assert.match(ler('../src/components/licensees/LicenseeDetailsPanel.jsx'), /CatalogSale\.filter\(\{ seller_id: selected\.id \}/);
  assert.match(ler('../src/components/sellers/SellersListPanel.jsx'), /CatalogSale\.filter\(\{ seller_id: seller\.id \}\)/);
  const gp = ler('../api/functions/getPartnerPurchases.js');
  assert.match(gp, /raw_base44->>status=eq\./);
  assert.match(gp, /raw_base44->>user_id=eq\./);
  assert.ok(!/order=activated_at/.test(gp));
  assert.match(gp, /function desdobrar\(rows\) \{\s*\n\s*if \(!Array\.isArray\(rows\)\) return \[\];/);
});

test('L4: produto grande demais para os Correios tem saída — retirada na loja ou frete combinado', () => {
  const frete = ler('../api/_lib/frete.js');
  assert.match(frete, /const grandeDemais = \/dimens\|peso\|limite\/i\.test\(motivos\);/);
  assert.match(frete, /motivo: 'produto_grande'/);
  assert.match(frete, /motivo: 'sem_transportadora'/);
  assert.match(ler('../api/functions/cotarFrete.js'), /error: r\.error, motivo: r\.motivo \|\| null/);
  const cart = ler('../src/pages/Cart.jsx');
  assert.match(cart, /setFreteSemTransportadora\(\['produto_grande', 'sem_transportadora'\]\.includes\(r\?\.motivo\)\);/);
  assert.match(cart, /onRetirada=\{\(\) => setDeliveryMethod\('pickup'\)\}/);
  const resumo = ler('../src/components/cart/FreteResumo.jsx');
  assert.match(resumo, /semTransportadora && !bloqueado && !calculando/);
  assert.match(resumo, /Retirar na loja \(grátis\)/);
  assert.match(resumo, /Combinar frete no WhatsApp/);
});

test('L5: o log de encerramento do leilão usa a coluna que existe (created_at)', () => {
  const s = ler('../api/_lib/finalizeAuctionCore.js');
  const i = s.indexOf("step: 'AUCTION_FINALIZED'");
  assert.ok(i > 0);
  const bloco = s.slice(i, i + 400);
  assert.match(bloco, /created_at: new Date\(\)\.toISOString\(\)/);
  assert.ok(!/created_date:/.test(bloco));
});
