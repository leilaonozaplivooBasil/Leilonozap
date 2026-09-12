// O corpo do e-mail e do SMS.
//
// O que está testado aqui é o que quebra campanha de verdade: assunto longo
// demais, SMS que vira duas mensagens, e-mail sem link de descadastro, nome de
// cadastro que na verdade é recado ("Vim pelo wendrel") virando saudação.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emReais, quandoEncerra, primeiroNome, escaparHtml, assunto, previa,
  corpoTexto, corpoHtml, corpoSms, montarMensagem, urlDoLeilao, urlDeDescadastro,
  semAcento, LIMITE_SMS, LIMITE_ASSUNTO,
} from '../scripts/campanha/modelo.mjs';

// 11/09/2026 às 20h15 de Brasília = 23h15 UTC
const FIM = '2026-09-11T23:15:00+00:00';
const AGORA = new Date('2026-09-11T18:47:00+00:00');
const LOTE = {
  id: '784657d60a0c5de77cdfbf14',
  title: 'Bike Harley M4 - SEM CNH',
  current_price: '897',
  end_time: FIM,
  capa: 'https://exemplo/imagem.png',
};
const SAIDA = urlDeDescadastro('fulano@gmail.com', 'abc123');

test('MOD-1 dinheiro sai no formato brasileiro', () => {
  assert.equal(emReais('897'), 'R$ 897,00');
  assert.equal(emReais(1234.5), 'R$ 1.234,50');
  assert.equal(emReais(21.6), 'R$ 21,60');
  assert.equal(emReais(null), 'R$ 0,00');
});

test('MOD-2 o prazo é escrito em Brasília, não em UTC', () => {
  // 23h15 UTC é 20h15 aqui. Se isto virar "23h15", o e-mail mente o prazo.
  assert.equal(quandoEncerra(FIM, AGORA), 'hoje às 20h15');
});

test('MOD-3 amanhã é "amanhã", não a data', () => {
  assert.equal(quandoEncerra('2026-09-12T12:00:00+00:00', AGORA), 'amanhã às 09h00');
});

test('MOD-4 mais de um dia à frente sai com o dia da semana', () => {
  const txt = quandoEncerra('2026-09-13T11:49:08+00:00', AGORA);
  assert.match(txt, /13\/09/);
  assert.match(txt, /08h49/);
});

test('MOD-5 prazo inválido não vira "Invalid Date" no e-mail', () => {
  assert.equal(quandoEncerra('não é data', AGORA), '');
  assert.equal(quandoEncerra(null, AGORA), '');
});

test('MOD-6 "Vim pelo wendrel" não vira saudação', () => {
  // 🔴 A base tem dezenas de cadastros cujo "nome" é um recado de indicação.
  // "Vim, o leilão de hoje fecha" seria constrangedor em massa.
  assert.equal(primeiroNome('Vim pelo wendrel'), '');
  assert.equal(primeiroNome('Indicado pelo Wendel'), '');
  assert.equal(primeiroNome('Parceiro Bangu'), '');
  assert.equal(primeiroNome('QA Teste Pix'), '');
});

test('MOD-7 nome de gente vira primeiro nome com inicial maiúscula', () => {
  assert.equal(primeiroNome('ALBERTINA MIRANDA DA SILVA'), 'Albertina');
  assert.equal(primeiroNome('  rosenberg  de oliveira '), 'Rosenberg');
  assert.equal(primeiroNome(''), '');
  assert.equal(primeiroNome('1FLAVIO DE SOUZA'), '');
});

test('MOD-8 o assunto cabe na tela do celular', () => {
  // 🔴 Relógio congelado. Sem passar AGORA, este teste passava no dia 11 e
  // quebrava sozinho no dia 12: a mesma data vira "hoje" hoje e "sexta-feira,
  // 11/09" amanhã. Teste que depende do relógio apodrece na virada da meia-noite.
  const a = assunto(LOTE, AGORA);
  assert.ok(a.length <= LIMITE_ASSUNTO, `assunto com ${a.length} caracteres: ${a}`);
  assert.match(a, /R\$ 897,00/);
  assert.match(a, /hoje às 20h15/);
  // caixa alta e exclamação repetida são gatilho de spam
  assert.ok(!/!!/.test(a));
  assert.notEqual(a, a.toUpperCase());
});

test('MOD-9 título comprido é cortado, não estoura o assunto', () => {
  const comprido = { ...LOTE, title: 'Kit Trilho Eletrificado Click 1m + 3 Spots 5w 3000k Branco Quente Bivolt' };
  const a = assunto(comprido, AGORA);
  assert.ok(a.length <= LIMITE_ASSUNTO, `assunto com ${a.length}: ${a}`);
  assert.match(a, /…/);
});

test('MOD-8b leilão que fecha daqui a dias também cabe no assunto', () => {
  // A data por extenso come 16 caracteres a mais que "hoje às 20h15". Era por
  // aqui que o assunto estourava em produção — não só no teste.
  for (const dias of [2, 3, 5, 9]) {
    const fim = new Date(new Date(FIM).getTime() + dias * 86400000);
    const a = assunto({ ...LOTE, end_time: fim.toISOString() }, AGORA);
    assert.ok(a.length <= LIMITE_ASSUNTO, `${dias} dia(s): assunto com ${a.length}: ${a}`);
    assert.match(a, /R\$ 897,00/);
  }
});

test('MOD-10 o SMS cabe em UMA mensagem', () => {
  // Acima de 160 a operadora quebra em duas e cobra duas.
  const sms = corpoSms({ contato: { nome: 'Albertina Miranda' }, destaque: LOTE });
  assert.ok(sms.tamanho <= LIMITE_SMS, `SMS com ${sms.tamanho}: ${sms.texto}`);
  assert.equal(sms.partes, 1);
  assert.match(sms.texto, /SAIR/);
  assert.match(sms.texto, /AuctionRoom/);
  assert.match(sms.texto, /Albertina/);
  assert.match(sms.texto, /Bike Harley/);
});

test('MOD-11 SMS de título gigante continua em uma mensagem só', () => {
  const gigante = {
    ...LOTE,
    title: 'Tapete Grande Protetor De Cadeira Dello 120x100cm Preto Comprimento 1.2 M Desenho Do Tecido Série Black Largura 1 M',
  };
  const sms = corpoSms({ contato: { nome: 'Maria Aparecida dos Santos' }, destaque: gigante });
  assert.ok(sms.tamanho <= LIMITE_SMS, `SMS com ${sms.tamanho}: ${sms.texto}`);
  assert.equal(sms.partes, 1);
  // o link é a única parte que não pode sumir no encolhimento
  assert.match(sms.texto, /AuctionRoom\?id=784657d60a0c5de77cdfbf14/);
});

test('MOD-11b o SMS não leva acento — senão o limite cai de 160 para 70', () => {
  // "Leilão", "ção", "está": qualquer ã/õ/ç joga a mensagem para UCS-2.
  // Título CURTO de propósito: cabe inteiro no SMS, então se o acento não for
  // tirado ele chega na mensagem final — é isso que este teste tem que pegar.
  const sms = corpoSms({
    contato: { nome: 'Conceição' },
    destaque: { ...LOTE, title: 'Violão São Paulo' },
  });
  assert.ok(!/[^\x20-\x7E]/.test(sms.texto), `SMS com caractere fora do GSM-7: ${sms.texto}`);
  assert.match(sms.texto, /Violao Sao Paulo/);
  assert.match(sms.texto, /Conceicao/);
  assert.equal(semAcento('Leilão à ação ç'), 'Leilao a acao c');
});

test('MOD-12 todo e-mail leva link de descadastro — no HTML e no texto', () => {
  const html = corpoHtml({ contato: { nome: 'Ana' }, destaque: LOTE, outros: [], linkSaida: SAIDA });
  const txt = corpoTexto({ contato: { nome: 'Ana' }, destaque: LOTE, outros: [], linkSaida: SAIDA });
  assert.ok(html.includes('descadastrar'), 'HTML sem link de saída');
  assert.ok(txt.includes('descadastrar'), 'texto sem link de saída');
  assert.match(html, /Não quero mais receber/);
});

test('MOD-13 o link do lote aponta para a sala do leilão certa', () => {
  assert.equal(urlDoLeilao('784657d60a0c5de77cdfbf14'),
    'https://leilaonozap.net/AuctionRoom?id=784657d60a0c5de77cdfbf14');
  const html = corpoHtml({ contato: {}, destaque: LOTE, outros: [], linkSaida: SAIDA });
  assert.ok(html.includes('AuctionRoom?id=784657d60a0c5de77cdfbf14'));
});

test('MOD-14 título com aspas ou sinal de HTML não quebra o e-mail', () => {
  const perigoso = { ...LOTE, title: 'Cadeira <b>"presidente"</b> & cia' };
  const html = corpoHtml({ contato: {}, destaque: perigoso, outros: [], linkSaida: SAIDA });
  assert.ok(!html.includes('<b>"presidente"</b>'), 'HTML do cadastro entrou cru no e-mail');
  assert.ok(html.includes('&lt;b&gt;'));
  assert.equal(escaparHtml('a & b'), 'a &amp; b');
});

test('MOD-15 os outros lotes aparecem quando existem, e somem quando não existem', () => {
  const outro = { id: 'ba59', title: 'cadeira presidente', current_price: '246', end_time: '2026-09-11T23:58:00+00:00' };
  const com = corpoHtml({ contato: {}, destaque: LOTE, outros: [outro], linkSaida: SAIDA });
  const sem = corpoHtml({ contato: {}, destaque: LOTE, outros: [], linkSaida: SAIDA });
  assert.match(com, /Também fechando/);
  assert.match(com, /AuctionRoom\?id=ba59/);
  assert.ok(!/Também fechando/.test(sem));
});

test('MOD-16 sem nome no cadastro, o e-mail não chama ninguém de nada', () => {
  const txt = corpoTexto({ contato: { nome: '' }, destaque: LOTE, outros: [], linkSaida: SAIDA });
  assert.match(txt, /^O leilão de hoje fecha daqui a pouco\./);
  assert.ok(!txt.includes('undefined'));
  assert.ok(!txt.includes(', o leilão'));
});

test('MOD-17 o e-mail sai sempre nas duas versões, HTML e texto', () => {
  const m = montarMensagem({ contato: { nome: 'Ana' }, destaque: LOTE, outros: [], linkSaida: SAIDA });
  assert.ok(m.html.startsWith('<!doctype html>'));
  assert.ok(m.texto.length > 120);
  assert.ok(!m.texto.includes('<'), 'a versão texto veio com HTML dentro');
  assert.ok(m.assunto && m.sms.texto);
});

test('MOD-18 a linha de prévia conta quantos outros lotes existem', () => {
  assert.match(previa(LOTE, [{}, {}]), /mais 2 lotes fechando/);
  assert.match(previa(LOTE, [{}]), /mais 1 lote fechando/);
  assert.ok(!/mais 0/.test(previa(LOTE, [])));
});
