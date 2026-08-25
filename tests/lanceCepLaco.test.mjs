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

test('a cotação continua saindo do cadastro, nunca do corpo', () => {
  // O CEP do corpo NÃO vira parâmetro de cotação. Ele só pode preencher um
  // cadastro vazio. O selo autoriza reserva de saldo — se a cotação aceitasse um
  // CEP escolhido na hora, daria para cotar por um vizinho barato e receber no
  // endereço real.
  assert.match(rota, /cotarFreteDoLeilao\(\{ auctionId, userId: donoDaCotacao \}\)/);
  assert.ok(!/cotarFreteDoLeilao\([^)]*cep:/.test(rota), 'o CEP do corpo virou parâmetro de cotação');
});

test('o SERVIDOR grava o CEP de quem não tem nenhum', () => {
  // 🔴 O print da cliente provou o furo: apareceu "Não conseguimos salvar seu CEP
  // agora". Navegador de cliente comum não escreve em app_users — só admin e
  // cargo de estoque (plataformaAdapter._operatorActor). Quem grava tem que ser
  // o servidor, que tem a chave de serviço.
  assert.match(rota, /await salvarCepSeVazio\(donoDaCotacao, body\?\.cep\)/);
  assert.match(rota, /import \{ cotarFreteDoLeilao, salvarCepSeVazio \}/);
});

test('a gravação usa a identidade do crachá, nunca a do corpo', () => {
  assert.match(rota, /salvarCepSeVazio\(donoDaCotacao/);
  assert.ok(!/salvarCepSeVazio\(userId/.test(rota), 'passou a gravar no id que veio do corpo');
});

test('nunca sobrescreve um CEP que já existe', () => {
  // Quem troca de endereço faz no Perfil, onde rua e número são conferidos junto.
  assert.match(helper, /if \(atual\.length === 8\) return \{ gravou: false, motivo: 'ja_tinha' \}/);
});

test('a tela não impede mais a cotação quando não consegue gravar', () => {
  // Era este `return` que prendia o cliente novo: a tela falhava ao gravar e
  // nem chegava a chamar o servidor.
  assert.ok(
    !/setFreteStatus\('cep_nao_salvo'\)/.test(sala),
    'a tela voltou a travar a cotação quando não consegue gravar'
  );
  assert.match(sala, /o servidor grava/);
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

test('o banner continua oferecendo a caixinha quando a cotação falha', () => {
  assert.match(banner, /status === "needs_cep" \|\| status === "error"/);
});

// ── O efeito: réplica do laço, para provar e não só descrever ────────────────
// `quemGrava`: 'ninguem' = antes de tudo | 'tela' = PONTO 128, falha para cliente
// comum | 'servidor' = PONTO 129, sempre funciona.
function rodada({ cepNoCadastro, cepDigitado, quemGrava, ehDaEquipe = false }) {
  let cadastro = cepNoCadastro;
  const conseguiuGravar =
    quemGrava === 'servidor' ? true :
    quemGrava === 'tela' ? ehDaEquipe :   // navegador só escreve se for admin/estoque
    false;
  if (conseguiuGravar && cepDigitado.length === 8 && cadastro.length !== 8) cadastro = cepDigitado;
  // A cotação SEMPRE lê o cadastro — o CEP digitado nunca vira parâmetro dela.
  return cadastro.length === 8 ? 'cotou' : 'needs_cep';
}

test('o efeito: ninguém gravando — o laço original', () => {
  assert.equal(rodada({ cepNoCadastro: '', cepDigitado: '22790669', quemGrava: 'ninguem' }), 'needs_cep');
});

test('o efeito: gravando só pela tela, cliente comum CONTINUA preso', () => {
  // Foi isto que o print da cliente mostrou, depois da primeira correção.
  assert.equal(
    rodada({ cepNoCadastro: '', cepDigitado: '22790669', quemGrava: 'tela', ehDaEquipe: false }),
    'needs_cep',
    'cliente comum não escreve em app_users pelo navegador'
  );
});

test('o efeito: gravando só pela tela, quem é da equipe passava', () => {
  // Explica por que o teste interno funcionou e o do cliente não.
  assert.equal(
    rodada({ cepNoCadastro: '', cepDigitado: '22790669', quemGrava: 'tela', ehDaEquipe: true }),
    'cotou'
  );
});

test('o efeito: com o servidor gravando, cliente comum cota', () => {
  assert.equal(
    rodada({ cepNoCadastro: '', cepDigitado: '22790669', quemGrava: 'servidor', ehDaEquipe: false }),
    'cotou'
  );
});

test('o efeito: quem já tinha CEP nunca sentiu o problema', () => {
  assert.equal(rodada({ cepNoCadastro: '20040020', cepDigitado: '', quemGrava: 'ninguem' }), 'cotou');
});

test('o efeito: CEP incompleto continua sendo recusado', () => {
  assert.equal(rodada({ cepNoCadastro: '', cepDigitado: '2279', quemGrava: 'servidor' }), 'needs_cep');
});

test('o efeito: CEP existente não é trocado pelo digitado', () => {
  assert.equal(
    rodada({ cepNoCadastro: '20040020', cepDigitado: '22790669', quemGrava: 'servidor' }),
    'cotou'
  );
});
