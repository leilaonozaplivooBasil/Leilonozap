// O X-Pay passou a repartir o FIXO pelo peso (06/09/2026) — e este arquivo
// também carrega o xgame.js inteiro na suíte do node, o que pega import
// esquecido antes de chegar ao navegador.
import test from 'node:test';
import assert from 'node:assert/strict';
import { valoresDasTarefas, reguaDoDia, fixoDoParticipante, PARTICIPANTE_PADRAO, resumoDoDia, PESO_DIA_COMPLETO, pesoDaRotina } from '../src/lib/xgame.js';
import { ROTINA_PADRAO } from '../src/lib/metodo.js';
import { pesoAutomatico } from '../src/lib/xgame.js';

const soma = (m) => Math.round(Object.values(m).reduce((s, v) => s + v, 0) * 100) / 100;
const emanuel = { ...PARTICIPANTE_PADRAO, fixo_mes: 7000, minimo_dia: 3 };

test('fixoDoParticipante: fixo_mes quando existe; senão a verba de produção de sempre', () => {
  assert.equal(fixoDoParticipante(emanuel), 7000);
  assert.equal(fixoDoParticipante({ ...PARTICIPANTE_PADRAO, fixo_mes: null }), 1300);
  assert.equal(fixoDoParticipante({ verba_producao: 900 }), 900);
  assert.equal(fixoDoParticipante({ fixo_mes: 0, verba_producao: 900 }), 0, 'zero é zero, não "sem fixo"');
});

// 🌅 09/09/2026 — dono, ao vivo: "o ritual tem que ser um dos maiores valores
// da gamificação do dia... peso maior." Gratidão subiu de 5 pra 6 (o teto),
// e como o peso do dia é a SOMA de todas as tarefas de produção da Rotina
// Perfeita, 75 virou 76 — cada peso de referência muda 1 ponto, não só o
// ritual. O dia inteiro continua pagando o fixo por inteiro (a soma das
// fatias sempre bate em 100%), só a fatia de cada tarefa que respira.
test('o dia completo é a Rotina Perfeita: 18 tarefas de produção, peso 76 (ritual no teto)', () => {
  assert.equal(PESO_DIA_COMPLETO, 76);
  assert.equal(pesoDaRotina(ROTINA_PADRAO), 76);
  assert.equal(pesoDaRotina([]), 0);
});

test('produção/mentoria/visão repartem os 80% do dia sem-ritual pelo peso contra a Rotina Perfeita (menos o peso do ritual); bônus reparte a verba de bônus; venda vale cheio', () => {
  const tarefas = [
    { id: 'a', peso: 1, categoria: 'producao' }, { id: 'b', peso: 1, categoria: 'mentoria' }, { id: 'c', peso: 2, categoria: 'visao' },
    { id: 'd', peso: 4, categoria: 'bonus' }, { id: 'e', peso: 1, categoria: 'venda' },
  ];
  const v = valoresDasTarefas(tarefas, emanuel);
  // 🌅 13/09/2026 — nenhuma destas tem título de ritual, então não mudam de
  // "balde": só o DENOMINADOR mudou — 76 vira 70 (tira o peso 6 do ritual),
  // e o fixo que elas disputam vira 80% de 7.000 (o ritual já garantiu os
  // outros 20% em separado, ver o teste de baixo). Peso 4 de 70, sobre
  // R$ 5.600 ÷ 24 = R$ 233,33 no dia: 13,33 — nada de um terço do dia.
  assert.equal(soma({ a: v.a, b: v.b, c: v.c }), 13.33);
  assert.equal(v.c, 6.67);
  assert.equal(v.d, 8.33, 'R$ 200 ÷ 24, sozinha no bônus — o ritual não mexe na verba de bônus');
  assert.equal(v.e, 50);
  // com a Rotina Perfeita inteira no dia (ritual incluso), o dia paga por
  // inteiro nos dois baldes — só a soma dos dois separados que pode variar
  // 1 centavo do valor cheio (dois arredondamentos, não um só; o mesmo já
  // acontece entre produção e bônus, que também são baldes separados).
  const rotina = ROTINA_PADRAO.map((r, i) => ({ id: `r${i}`, titulo: r.titulo, peso: pesoAutomatico(r.titulo) }));
  const cheio = valoresDasTarefas(rotina, emanuel);
  const producao = rotina.filter((t) => !/leitura/i.test(t.titulo));
  assert.equal(soma(Object.fromEntries(producao.map((t) => [t.id, cheio[t.id]]))), 291.66);
});

// 🌅 13/09/2026 — dono, ao vivo: "quanto isso pesa no percentual? [...] a
// pessoa não vai ganhar dinheiro só por acordar cedo, mas tem que ganhar um
// valor razoável porque é um peso bom." O ritual sai do teto de peso 1-6 (lá
// nunca chegaria a 20%) e vira sempre 1/5 do dia CHEIO, façam as outras
// tarefas o que fizerem — nem o dia vazio nem o dia cheio mudam essa fatia.
test('o Ritual do Amanhecer vale sempre 20% do dia cheio — nunca a fatia comum de peso', () => {
  const feito = { id: 'r', peso: 6, categoria: 'producao', titulo: 'Acordar — gratidão e foco no sonho' };
  const sozinho = valoresDasTarefas([feito], emanuel);
  assert.equal(sozinho.r, 58.33, '20% de R$ 291,67 — o dia inteiro, não a fatia de peso 6 em 76');
  // com o dia inteiro (ritual + toda a produção) o ritual continua com a
  // MESMA fatia — 20% não é "o que sobra", é fixo por cima de tudo.
  const rotina = ROTINA_PADRAO.map((r, i) => ({ id: `r${i}`, titulo: r.titulo, peso: pesoAutomatico(r.titulo) }));
  const cheio = valoresDasTarefas(rotina, emanuel);
  const idRitual = rotina.findIndex((r) => /gratidao|foco no sonho/i.test(r.titulo));
  assert.equal(cheio[`r${idRitual}`], 58.33);
});

test('resumoDoDia leva a régua do dia (valor, peso de referência, o que falta, em aberto) junto do X-Pay', () => {
  // 🌅 13/09/2026 — a única tarefa do dia É o ritual (título "Gratidão"):
  // ganha 20% do dia inteiro na hora, mesmo sozinha — não a fatia comum de
  // peso 1 em 76. A referência dos OUTROS 80% (produção) fica em 70 (76
  // menos o peso do próprio ritual), e "em aberto" já desconta os 20% que
  // o ritual, sozinho, já garantiu.
  const r = resumoDoDia({ tarefas: [{ id: 'a', peso: 1, categoria: 'producao', hora: '08:00', feito: true, titulo: 'Gratidão' }], agoraMin: 12 * 60, participante: emanuel, hoje: new Date('2026-09-08T12:00:00') });
  assert.equal(r.xpay.valorDia, 291.67);
  assert.equal(r.xpay.pesoReferencia, 70);
  assert.equal(r.xpay.pesoFalta, 70);
  assert.equal(r.xpay.ganho, 58.33, '20% do dia — o ritual, feito, garante a fatia dele inteira');
  assert.equal(r.xpay.emAberto, 233.34, '291,67 − 58,33 do ritual já alocado − 0 de produção (nenhuma outra tarefa no plano)');
  const regua = reguaDoDia([], emanuel);
  assert.equal(regua.valorDia, 291.67);
  assert.equal(regua.pesoFalta, 70, 'sem o peso do ritual (6) na referência dos 80% de produção');
  assert.equal(regua.emAberto, 291.67, 'nada planejado — nem o ritual, nem produção');
  assert.equal(regua.fixo, 7000);
});
