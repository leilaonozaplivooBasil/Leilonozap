// 🏦 "Pagamentos de Comissões" virou só consulta — 23/09/2026
//
// A Beatriz clicou em "Marcar pago" e levou "tabela não permitida". Consertar a
// lista seria pior: a comissão já está no saldo da pessoa (Verônica: R$ 178,39
// na tela = R$ 178,39 de commission_balance) e sai pelo saque depois do KYC.
// Decisão do dono: comissão só pelo saque. A tela não pode voltar a oferecer
// pagamento na mão.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { etapaDoKyc, proximoPasso, AVISO_COMISSAO, LINK_APROVACAO, ETAPA_KYC } from '../src/lib/comissaoSoConsulta.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const PAGINA = ler('../src/pages/PagamentosComissoes.jsx');
const CARTAO = ler('../src/components/comissoes/ComissaoUsuarioCard.jsx');
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

test('próximo passo: depende do saldo primeiro, depois do KYC', () => {
  assert.equal(proximoPasso('aprovado', 0), 'Sem saldo a receber');
  assert.equal(proximoPasso('aprovado', '0.00'), 'Sem saldo a receber');
  assert.equal(proximoPasso('nao_iniciado', null), 'Sem saldo a receber');
  assert.equal(proximoPasso('aprovado', 178.39), 'Pode pedir o saque na Carteira');
  assert.equal(proximoPasso('em_analise', 10), 'Aguardando aprovação em KYC & Saques');
  assert.equal(proximoPasso('nao_iniciado', 10), 'Precisa validar a identidade na Carteira');
  assert.equal(proximoPasso('reprovado', 10), 'Precisa validar a identidade na Carteira');
  assert.equal(proximoPasso(undefined, 10), 'Precisa validar a identidade na Carteira');
});

test('o aviso diz o essencial: pelo saque, nunca PIX na mão, senão paga duas vezes', () => {
  assert.match(AVISO_COMISSAO, /saque da plataforma/);
  assert.match(AVISO_COMISSAO, /nunca por PIX na mão/);
  assert.match(AVISO_COMISSAO, /paga duas vezes/);
  assert.equal(LINK_APROVACAO, '/AdminFinanceiro');
});

test('a tela não grava mais nada: sem update de comissão, sem chave PIX, sem "marcar pago"', () => {
  assert.ok(!PAGINA.includes('CommissionRecord.update'));
  assert.ok(!PAGINA.includes('AppUser.update'));
  assert.ok(!/marcar/i.test(PAGINA));
  assert.ok(!/pix_key/.test(PAGINA));
  assert.ok(!/onMarcarPago|onSalvarPix/.test(CARTAO));
  assert.ok(!/Marcar (tudo como )?pago/.test(CARTAO));
  assert.ok(!/Chave PIX/.test(CARTAO));
});

test('a tela mostra o aviso e leva pra fila de aprovação; o cartão mostra a etapa do KYC', () => {
  assert.ok(PAGINA.includes('data-teste="aviso-so-consulta"'));
  assert.ok(PAGINA.includes('{AVISO_COMISSAO}'));
  assert.ok(PAGINA.includes('<Link to={LINK_APROVACAO}'));
  assert.ok(PAGINA.includes("kyc_status: u?.kyc_status || 'nao_iniciado'"));
  assert.ok(CARTAO.includes('data-teste="etapa-kyc"'));
  assert.ok(CARTAO.includes('etapaDoKyc(grupo.kyc_status)'));
  assert.ok(CARTAO.includes('proximoPasso(grupo.kyc_status, grupo.totalPendente)'));
});

test('"KYC & Saques" (a fila de aprovação) está no menu Financeiro do admin', () => {
  assert.match(MENU, /\{ title: "KYC & Saques", pageName: "AdminFinanceiro", icon: ShieldCheck \}/);
});
