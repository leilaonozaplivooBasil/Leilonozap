// ✉️ Os 8 gatilhos estão pendurados nos pontos certos, e o link de sair é assinado
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('cada gatilho chama enviarAviso com o tipo e a chave certos, no ponto certo', () => {
  assert.ok(ler('../api/functions/registerNetworkUser.js').includes("enviarAviso({ tipo: 'cadastro', userId: id, chave: 'conta'"));
  const lance = ler('../api/functions/submitAtomicBid.js');
  assert.ok(lance.includes("enviarAviso({ tipo: 'entrou_no_leilao', userId, chave: auctionId"));
  assert.ok(lance.includes("enviarAviso({ tipo: 'superado', userId: auction.winner_id, chave: auctionId"));
  assert.ok(lance.includes("const COLUNAS_BASE = 'id,title,"), 'o lance precisa do título do leilão pro e-mail');
  assert.ok(lance.indexOf("tipo: 'entrou_no_leilao'") > lance.indexOf('const patchedRow = '), 'o aviso sai só depois de o lance valer');
  assert.ok(ler('../api/_lib/finalizeAuctionCore.js').includes("enviarAviso({ tipo: 'arrematou', userId: winnerId, chave: auctionId"));
  const mp = ler('../api/functions/mpWebhook.js');
  assert.ok(mp.includes("if (sale.kind === 'wallet_deposit') await enviarAviso({ tipo: 'deposito', userId: sale.buyer_id, chave: sale.id"));
  assert.ok(mp.includes("enviarAviso({ tipo: 'compra_confirmada', userId: sale.buyer_id, chave: sale.id"));
  assert.ok(mp.indexOf("tipo: 'compra_confirmada'") > mp.indexOf('const r = await fulfillStoreOrder(sale);'));
  const ew = ler('../api/functions/entityWrite.js');
  assert.ok(ew.includes("if (table === 'catalog_sales' && body?.payload?.status === 'shipped')"));
  assert.ok(ew.includes("enviarAviso({ tipo: 'compra_enviada', userId: venda.buyer_id, chave: id"));
  assert.ok(ler('../api/functions/reviewKyc.js').includes("if (decision === 'aprovado') await enviarAviso({ tipo: 'kyc_aprovado', userId: user_id, chave: 'conta' })"));
  assert.ok(ler('../api/functions/approveWithdrawal.js').includes("if (decision === 'approve') await enviarAviso({ tipo: 'saque_pago', userId: w.user_id, chave: String(withdrawal_id)"));
  assert.ok(ler('../api/functions/avisoUltimaHora.js').includes("enviarAviso({ tipo: 'ultima_hora', userId: uid, chave: a.id"));
  assert.match(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'), /"\/api\/functions\/avisoUltimaHora", "schedule": "\*\/15 \* \* \* \*"/);
});

test('o remetente é o mesmo dos códigos, o envio nunca lança, e o tipo "aviso" existe no registro', () => {
  const env = ler('../api/_lib/avisosPorEmail.js');
  assert.ok(env.includes("const FROM_EMAIL = 'no-reply@leilaonozap.com';"));
  assert.ok(env.includes("const REPLY_TO = 'relacionamento@leilaonozap.com';"));
  assert.ok(env.includes("return { enviado: false, motivo: 'erro' };"));
  assert.ok(env.includes("tipo: 'aviso'"));
  assert.ok(ler('../api/_lib/registroDeEmail.js').includes("'aviso',"));
});

test('o link de sair é assinado e conferido em tempo constante; o endpoint só aceita leilao|conta', async () => {
  process.env.SESSAO_SECRET = 'segredo-de-teste';
  const { assinarDescadastro, conferirDescadastro, linkDescadastro } = await import('../api/_lib/avisosPorEmail.js');
  const t = assinarDescadastro('u1', 'leilao');
  assert.equal(conferirDescadastro('u1', 'leilao', t), true);
  assert.equal(conferirDescadastro('u1', 'conta', t), false, 'categoria trocada não passa');
  assert.equal(conferirDescadastro('u2', 'leilao', t), false, 'outra pessoa não passa');
  assert.equal(conferirDescadastro('u1', 'leilao', t + 'x'), false);
  assert.equal(conferirDescadastro('u1', 'leilao', ''), false);
  assert.equal(linkDescadastro('u1', 'leilao'), `https://leilaonozap.net/api/functions/descadastrarAvisos?u=u1&c=leilao&t=${t}`);
  const ep = ler('../api/functions/descadastrarAvisos.js');
  assert.ok(ep.includes("if (!['leilao', 'conta'].includes(categoria) || !userId || !conferirDescadastro(userId, categoria, token))"));
  assert.ok(ep.includes("body: JSON.stringify({ [coluna]: voltar })"));
});
