// O catálogo de ações (06/09/2026): "o sistema identifica a mentalidade e o
// peso da ação; me dá a lista do que tem pra fazer; e o que eu colocar eu
// posso adicionar no menu".
import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarAcao, lerTexto, ACOES_PADRAO, catalogoJunto, jaNoCatalogo, acaoParaGravar, montarMentoria, ROTEIRO_MENTORIA, parecidas, TEMAS } from '../src/lib/catalogoAcoes.js';

test('classificarAcao: lê o texto e diz a mentalidade — time/números é diretor, diretoria/sistema é CEO, o resto é a própria mão', () => {
  assert.equal(classificarAcao('Fazer 3 apresentações de sucesso').mentalidade, 'executivo');
  assert.equal(classificarAcao('Conferir os números da semana do time').mentalidade, 'diretor');
  assert.equal(classificarAcao('Preparar a reunião de diretoria').mentalidade, 'ceo');
  assert.equal(classificarAcao('Desenhar o processo de onboarding').mentalidade, 'ceo');
  // a mentalidade escolhida pelo dono vence o texto
  assert.equal(classificarAcao('Conferir os números do time', 'ceo').mentalidade, 'ceo');
  assert.equal(classificarAcao('Conferir os números do time', 'ceo').porqueMentalidade, 'escolhida por você');
});

test('classificarAcao: o Hábito lido cai dentro da trilha da mentalidade; o peso vem da régua com o acréscimo', () => {
  const a = classificarAcao('Fazer 20 contatos com F.O.R.M.');
  assert.deepEqual([a.mentalidade, a.habito], ['executivo', 4]);
  const b = classificarAcao('Treinar o time no Hábito da semana');
  assert.deepEqual([b.mentalidade, b.habito], ['diretor', 8]);
  assert.equal(b.peso, 6, 'treinamento 5 + 1 do diretor');
  // "cobrar" e "proposta" são acompanhamento (6)
  assert.equal(classificarAcao('Cobrar o time pelas propostas do dia').habito, 6);
  // "cobrar" (6) empata com "contatos" (4), e o ÚLTIMO escrito vence: 4 — mas o diretor vai de 5 a 8: cai no 5
  assert.equal(classificarAcao('Cobrar o time pelos contatos do dia').habito, 5);
  // sem palavra de hábito: o Hábito TÍPICO da mentalidade — nunca fica vazio
  const almoco = classificarAcao('Almoço com o fornecedor');
  assert.deepEqual([almoco.habito, almoco.peso], [2, 1]);
  assert.match(almoco.porqueHabito, /Hábito típico da Mentalidade do Executivo/);
  assert.equal(classificarAcao('Decidir o orçamento da diretoria').habito, 7, 'decidir = verificação');
  assert.equal(classificarAcao('Organizar as pautas com os diretores para a reunião de amanhã').habito, 7);
  assert.equal(classificarAcao('').habito, null, 'campo vazio: nada a ler');
});

test('o catálogo inicial tem as três mentalidades, cada ação já classificada e dentro da trilha', () => {
  assert.ok(ACOES_PADRAO.length >= 18);
  for (const m of ['executivo', 'diretor', 'ceo']) assert.ok(ACOES_PADRAO.filter((a) => a.mentalidade === m).length >= 5, m);
  for (const a of ACOES_PADRAO) {
    assert.ok(a.peso >= 1 && a.peso <= 6, a.titulo);
    assert.ok(a.padrao);
    const foco = a.mentalidade === 'executivo' ? [1, 2, 3, 4, 5] : [5, 6, 7, 8];
    assert.ok(foco.includes(a.habito), `${a.titulo}: hábito ${a.habito} fora da trilha`);
  }
  assert.equal(ACOES_PADRAO.find((a) => a.titulo.startsWith('Pegar as pautas')).peso, 6, 'reunião (6) + 1 do diretor, teto 6');
});

test('catalogoJunto: o banco por cima do padrão (mesmo título = a do banco vale), sem repetir, ordenado por mentalidade', () => {
  const junto = catalogoJunto(ACOES_PADRAO, [
    { id: 'b1', titulo: 'pegar as pautas da reunião de segunda', mentalidade: 'ceo', habito: 7, peso: 5 },
    { id: 'b2', titulo: 'Visitar a loja do Centro', mentalidade: 'executivo', habito: 5, peso: 6 },
  ]);
  assert.equal(junto.length, ACOES_PADRAO.length + 1);
  const pautas = junto.find((a) => /pegar as pautas/i.test(a.titulo));
  assert.equal(pautas.id, 'b1');
  assert.equal(pautas.padrao, false);
  assert.equal(junto[0].mentalidade, 'executivo');
  assert.equal(junto.at(-1).mentalidade, 'ceo');
  assert.equal(jaNoCatalogo(junto, 'VISITAR A LOJA DO CENTRO'), true);
  assert.equal(jaNoCatalogo(junto, 'Visitar a loja do Norte'), false);
});

test('acaoParaGravar: a linha limpa pra tabela', () => {
  assert.deepEqual(acaoParaGravar({ titulo: '  Visitar a loja ', mentalidade: 'DIRETOR', habito: '6', peso: '9', criadoPorId: 'dono' }),
    { titulo: 'Visitar a loja', mentalidade: 'diretor', habito: 6, peso: 6, categoria: 'mentoria', criado_por_id: 'dono' });
  assert.equal(acaoParaGravar({ titulo: 'x', mentalidade: 'nada' }).mentalidade, 'executivo');
  assert.equal(acaoParaGravar({ titulo: 'x' }).habito, null);
});

// ── 🧠 a leitura viva ─────────────────────────────────────────────────────
test('leitura viva: a leitura muda a cada palavra — dizer o nome pesa mais, e no empate vence o que foi escrito por último', () => {
  assert.equal(classificarAcao('Pegar as pautas').mentalidade, 'diretor');
  assert.equal(classificarAcao('Pegar as pautas da reunião de amanhã mentalidade do CEO').mentalidade, 'ceo', 'dizer "mentalidade do CEO" vence as palavras de time');
  assert.equal(classificarAcao('Pegar as pautas da reunião de amanhã mentalidade do CEO, e do executivo').mentalidade, 'executivo', 'empate entre nomes: o último escrito vence');
  const r = classificarAcao('Pegar as pautas da reunião de amanhã mentoria mentalidade do diretor / ceo visão estratégica, metas e organização constante');
  assert.equal(r.mentalidade, 'diretor');
  assert.equal(r.habito, 7);
  assert.equal(r.categoria, 'mentoria', 'disse "mentoria" com todas as letras');
  assert.deepEqual(r.temas, ['visao', 'metas', 'organizacao', 'reuniao', 'constancia']);
  assert.match(r.porqueMentalidade, /"mentalidade do diretor"/);
  assert.ok(r.sinais.length >= 6, 'os sinais reconhecidos ficam à vista');
});

test('leitura viva: "hábito 4" escrito vence a régua; categoria e temas saem do texto', () => {
  const r = classificarAcao('Treinar o time no hábito 4');
  assert.equal(r.habito, 5, 'H4 escrito, mas o diretor vai de 5 a 8: puxado pra 5');
  assert.match(r.porqueHabito, /você escreveu o Hábito 4/);
  assert.equal(classificarAcao('Leitura do capítulo 3').categoria, 'bonus');
  assert.equal(classificarAcao('Visitar a loja do Centro').categoria, 'producao');
  assert.equal(classificarAcao('Revisar a estratégia do trimestre').categoria, 'visao');
  assert.equal(lerTexto('').mentalidade, null);
  assert.ok(TEMAS.length >= 8);
});

test('o roteiro da mentoria: 15 min de leitura, 45 de treinamento e 2h de reunião, encadeados a partir da hora de início', () => {
  assert.deepEqual(ROTEIRO_MENTORIA.map((b) => [b.bloco, b.minutos]), [['leitura', 15], ['treinamento', 45], ['reuniao', 120]]);
  const blocos = montarMentoria({ titulo: 'Mentoria de segunda', mentalidade: 'diretor', horaInicio: '14:00' });
  assert.deepEqual(blocos.map((b) => [b.hora, b.habito, b.categoria]), [['14:00', 8, 'bonus'], ['14:15', 8, 'mentoria'], ['15:00', 7, 'mentoria']]);
  assert.equal(blocos[2].titulo, 'Mentoria de segunda — Reunião (2h): visão estratégica, metas e aplicabilidade');
  assert.deepEqual(montarMentoria({ mentalidade: 'executivo', horaInicio: '23:30' }).map((b) => [b.hora, b.habito]), [['23:30', 2], ['23:45', 5], ['00:30', 5]]);
  assert.equal(montarMentoria({}).length, 3);
});

test('parecidas: o catálogo sugere o que se parece com o que está sendo escrito', () => {
  assert.deepEqual(parecidas(ACOES_PADRAO, 'pegar pautas reunião').map((a) => a.titulo), ['Pegar as pautas da reunião de segunda']);
  assert.ok(!parecidas(ACOES_PADRAO, 'Pegar as pautas da reunião de segunda').some((a) => a.titulo === 'Pegar as pautas da reunião de segunda'), 'igualzinha não é "parecida"');
  assert.deepEqual(parecidas(ACOES_PADRAO, 'xyz'), []);
});
