// 🏦 "Pagamentos de Comissões" — 23/09/2026 (virou só consulta) → 24/09/2026
// (voltou a pagar, sem o furo de antes)
//
// 23/09: a Beatriz clicou em "Marcar pago" e levou "tabela não permitida".
// Consertar a lista seria pior: o botão nunca descontava o saldo real
// (commission_balance), então pagar por fora e marcar pago aqui pagava em
// dobro. A tela virou só consulta.
//
// 24/09: pedido da Beatriz, autorizado pelo dono — "que ela consiga pagar
// esse povo, marcar como pago e dar baixa nesse valor do saldo de comissão
// da pessoa." Isto NÃO é o mesmo furo de volta: o botão novo desconta o
// saldo NO MESMO ato que registra o pagamento (payCommissionManually.js,
// provado em tests/pagamentoManualDeComissao.test.mjs). Esta suíte prova o
// que sobrevive da decisão de 23/09 (a etapa do KYC, o link pra fila de
// aprovação) e o que mudou (o botão existe, a fonte do saldo é a real).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { etapaDoKyc, proximoPasso, AVISO_COMISSAO, LINK_APROVACAO, ETAPA_KYC } from '../src/lib/comissaoSoConsulta.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const PAGINA = ler('../src/pages/PagamentosComissoes.jsx');
const CARTAO = ler('../src/components/comissoes/ComissaoUsuarioCard.jsx');
const MODAL = ler('../src/components/comissoes/PagarComissaoManualModal.jsx');
const MENU = ler('../src/lib/adminMenu.js');

test('etapa do KYC: os quatro estados, e quem nunca começou (nulo/desconhecido) cai em "não iniciado"', () => {
  assert.equal(etapaDoKyc('aprovado').rotulo, 'KYC aprovado — pode sacar');
  assert.equal(etapaDoKyc('em_analise').rotulo, 'KYC em análise');
  assert.equal(etapaDoKyc('reprovado').rotulo, 'KYC reprovado');
  assert.equal(etapaDoKyc('nao_iniciado'), ETAPA_KYC.nao_iniciado);
  assert.equal(etapaDoKyc(null), ETAPA_KYC.nao_iniciado);
  assert.equal(etapaDoKyc('qualquer_coisa'), ETAPA_KYC.nao_iniciado);
  // cada etapa tem cor própria — quem opera bate o olho e sabe
  assert.equal(new Set(Object.values(ETAPA_KYC).map((e) => e.tom)).size, 4);
});

test('próximo passo (o caminho do SAQUE pela plataforma) continua igual', () => {
  assert.equal(proximoPasso('aprovado', 0), 'Sem saldo a receber');
  assert.equal(proximoPasso('aprovado', '0.00'), 'Sem saldo a receber');
  assert.equal(proximoPasso('nao_iniciado', null), 'Sem saldo a receber');
  assert.equal(proximoPasso('aprovado', 178.39), 'Pode pedir o saque na Carteira');
  assert.equal(proximoPasso('em_analise', 10), 'Aguardando aprovação em KYC & Saques');
  assert.equal(proximoPasso('nao_iniciado', 10), 'Precisa validar a identidade na Carteira');
  assert.equal(proximoPasso('reprovado', 10), 'Precisa validar a identidade na Carteira');
  assert.equal(proximoPasso(undefined, 10), 'Precisa validar a identidade na Carteira');
});

test('🔴 o aviso agora fala do pagamento manual — e não promete mais "nunca por PIX na mão"', () => {
  // a promessa antiga ficaria FALSA: agora existe um caminho oficial de pagar
  // por fora, então o texto não pode mais dizer que isso "paga duas vezes"
  assert.doesNotMatch(AVISO_COMISSAO, /nunca por PIX na mão/);
  assert.doesNotMatch(AVISO_COMISSAO, /paga duas vezes/);
  // mas tem que avisar o que ESTE caminho não confere, já que o saque confere
  assert.match(AVISO_COMISSAO, /desconta o saldo na hora/);
  assert.match(AVISO_COMISSAO, /NÃO confere identidade/);
  assert.equal(LINK_APROVACAO, '/AdminFinanceiro');
});

test('🔴 "a receber" vem do saldo real (commission_balance), não da soma de commission_records', () => {
  // a razão: quem tem saque em andamento já teve o valor tirado de
  // commission_balance, mas o commission_record ficava "pendente" do mesmo
  // jeito — pagar em cima da soma dos registros pagaria dinheiro já reservado
  assert.match(PAGINA, /totalPendente: Math\.max\(0, Number\(u\?\.commission_balance\) \|\| 0\)/);
  assert.doesNotMatch(PAGINA, /totalPendente \+= c\.amount/);
});

test('o botão "Pagar manualmente" existe, só aparece com saldo, e desconta atômico no servidor', () => {
  assert.match(CARTAO, /import PagarComissaoManualModal from '\.\/PagarComissaoManualModal'/);
  assert.match(CARTAO, /\{grupo\.totalPendente > 0 && \(/);
  assert.match(CARTAO, /data-teste="abrir-pagar-manual"/);
  assert.match(CARTAO, /<PagarComissaoManualModal/);
  assert.match(CARTAO, /saldoDisponivel=\{grupo\.totalPendente\}/);
  // o modal chama a rota do servidor — o desconto não acontece no navegador
  assert.match(MODAL, /plataforma\.functions\.invoke\('payCommissionManually'/);
  assert.doesNotMatch(MODAL, /commission_balance\s*[:=]/);
});

test('o modal avisa quando a pessoa não tem KYC aprovado — mas não bloqueia', () => {
  assert.match(MODAL, /data-teste="aviso-sem-kyc"/);
  assert.match(MODAL, /kycAprovado = pessoa\?\.kyc_status === 'aprovado'/);
  // o formulário continua acessível mesmo sem KYC — não existe "return null" ali
  assert.doesNotMatch(MODAL, /!kycAprovado[\s\S]{0,20}return null/);
});

test('a tela mostra o aviso e leva pra fila de aprovação; o cartão mostra a etapa do KYC', () => {
  assert.ok(PAGINA.includes('data-teste="aviso-pagamento-manual"'));
  assert.ok(PAGINA.includes('{AVISO_COMISSAO}'));
  assert.ok(PAGINA.includes('<Link to={LINK_APROVACAO}'));
  assert.ok(PAGINA.includes("kyc_status: u?.kyc_status || 'nao_iniciado'"));
  assert.ok(CARTAO.includes('data-teste="etapa-kyc"'));
  assert.ok(CARTAO.includes('etapaDoKyc(grupo.kyc_status)'));
  assert.ok(CARTAO.includes('proximoPasso(grupo.kyc_status, grupo.totalPendente)'));
});

test('depois de pagar, a tela recarrega — não fica com o número velho na cara da Beatriz', () => {
  assert.match(PAGINA, /onPago=\{carregar\}/);
  assert.match(CARTAO, /onSuccess=\{onPago\}/);
});

test('"KYC & Saques" (a fila de aprovação) está no menu Financeiro do admin', () => {
  assert.match(MENU, /\{ title: "KYC & Saques", pageName: "AdminFinanceiro", icon: ShieldCheck \}/);
});
