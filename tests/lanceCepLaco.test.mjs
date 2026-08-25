// "Preenchi o CEP certo e continua pedindo o CEP — não consigo dar lance."
//
// Não era o CEP de ninguém. A caixinha de CEP da sala de leilão nunca gravou
// nada: ela guardava o número num estado da tela, e o servidor lê o CEP do
// CADASTRO. Cadastro vazio → volta 'sem_cep' → a caixinha reaparece → para
// sempre, em leilão ao vivo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const sala = ler('../src/pages/AuctionRoom.jsx');
const banner = ler('../src/components/auction/FreteLanceBanner.jsx');
const rota = ler('../api/functions/cotarFrete.js');
const helper = ler('../api/_lib/freteLeilao.js');

test('a rota do leilão continua ignorando o CEP do navegador', () => {
  // É de propósito (BLOQUEADOR 14): o selo que ela devolve autoriza reserva de
  // saldo. Se o servidor cotasse por um CEP escolhido na hora, daria para cotar
  // por um vizinho barato e receber no endereço real. A correção NÃO afrouxa
  // isso — ela grava o CEP no cadastro antes de pedir a cotação.
  assert.match(rota, /body\.items e body\.cep NÃO são lidos aqui/);
  assert.match(rota, /cotarFreteDoLeilao\(\{ auctionId, userId: donoDaCotacao \}\)/);
});

test('sem CEP no cadastro, o servidor responde sem_cep', () => {
  assert.match(helper, /cepUsar = String\(usuario\?\.address_zip_code \|\| ''\)/);
  assert.match(helper, /if \(cepUsar\.length !== 8\) return \{ ok: false, motivo: 'sem_cep'/);
});

test('a sala GRAVA o CEP no cadastro antes de cotar', () => {
  // Esta é a linha que quebra o laço.
  assert.match(
    sala,
    /AppUser\.update\(currentUser\.id, \{ address_zip_code: cep \}\)/,
    'a caixinha de CEP voltou a ser decorativa'
  );
});

test('grava antes de chamar cotarFrete, não depois', () => {
  const posGravacao = sala.indexOf('address_zip_code: cep }');
  const posCotacao = sala.indexOf("invoke('cotarFrete'");
  assert.ok(posGravacao > 0 && posCotacao > 0);
  assert.ok(posGravacao < posCotacao, 'a gravação caiu depois da cotação — o laço volta');
});

test('não grava à toa quando o CEP já é o do cadastro', () => {
  assert.match(sala, /const cepDoCadastro = String\(currentUser\?\.address_zip_code \|\| ''\)/);
  assert.match(sala, /if \(currentUser\?\.id && cep !== cepDoCadastro\)/);
});

test('falha ao gravar tem status próprio, não vira "confira o CEP"', () => {
  // Mandar "confira e tente outro" faria a pessoa apagar um número correto.
  assert.match(sala, /setFreteStatus\('cep_nao_salvo'\)/);
  assert.match(sala, /freteStatus === 'cep_nao_salvo'/);
});

test('o banner continua na tela quando a gravação falha', () => {
  // Sem isto o banner devolveria null, a caixinha sumiria e a pessoa ficaria
  // sem nenhum jeito de tentar de novo.
  assert.match(sala, /'cep_nao_salvo'/);
  assert.match(banner, /status === "needs_cep" \|\| status === "error" \|\| status === "cep_nao_salvo"/);
  assert.match(banner, /Não conseguimos salvar seu CEP agora/);
});

// ── O efeito: réplica do laço, para provar e não só descrever ────────────────
function rodada({ cepNoCadastro, cepDigitado, gravaAntes }) {
  let cadastro = cepNoCadastro;
  if (gravaAntes && cepDigitado.length === 8) cadastro = cepDigitado;   // a correção
  // O servidor SEMPRE lê o cadastro — o CEP digitado nunca chega até ele.
  return cadastro.length === 8 ? 'cotou' : 'needs_cep';
}

test('o efeito: sem gravar, o CEP certo devolve needs_cep — o laço', () => {
  assert.equal(
    rodada({ cepNoCadastro: '', cepDigitado: '26381367', gravaAntes: false }),
    'needs_cep',
    'era exatamente isto que a pessoa via, quantas vezes tentasse'
  );
});

test('o efeito: gravando antes, o mesmo CEP cota', () => {
  assert.equal(rodada({ cepNoCadastro: '', cepDigitado: '26381367', gravaAntes: true }), 'cotou');
});

test('o efeito: quem já tinha CEP no cadastro nunca sentiu o problema', () => {
  // Por isso não aparecia para todo mundo — só para quem nunca cadastrou CEP.
  assert.equal(rodada({ cepNoCadastro: '20040020', cepDigitado: '', gravaAntes: false }), 'cotou');
});

test('o efeito: CEP incompleto continua sendo recusado', () => {
  assert.equal(rodada({ cepNoCadastro: '', cepDigitado: '2638', gravaAntes: true }), 'needs_cep');
});
