// O catálogo de ações (06/09/2026): "o sistema identifica a mentalidade e o
// peso da ação; me dá a lista do que tem pra fazer; e o que eu colocar eu
// posso adicionar no menu".
import test from 'node:test';
import assert from 'node:assert/strict';
import { classificarAcao, ACOES_PADRAO, catalogoJunto, jaNoCatalogo, acaoParaGravar } from '../src/lib/catalogoAcoes.js';

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
  // "cobrar" é acompanhamento (6) — e o diretor vai de 5 a 8
  assert.equal(classificarAcao('Cobrar o time pelos contatos do dia').habito, 6);
  // "contato" é Hábito 4, mas o diretor vai de 5 a 8: cai no 5 (o mais perto)
  assert.equal(classificarAcao('Puxar o time nos contatos do dia').habito, 5);
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
