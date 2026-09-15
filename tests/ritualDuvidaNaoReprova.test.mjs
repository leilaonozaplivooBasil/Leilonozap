// 🌅 A corrida que decidia o ritual pelo relógio — e a régua que a tornava cara.
//
// ══════════════════════════════════════════════════════════════════════════
// O RELATO (15/09/2026)
// ══════════════════════════════════════════════════════════════════════════
// Beatriz, 05:08: "Fiz tudo mas disse que tinha algo pendente que ficaria na
// tarefa, mas não aparece nada". Luciano, 05:25: "O meu ficou igual".
//
// O que os dados de produção mostraram, medindo o intervalo entre o último
// bloco gravado e o fechamento do ritual:
//
//     paim      1,0s → dúvida da IA chegou DEPOIS  → aprovado
//     Ribeiro   6,2s → dúvida da IA chegou DEPOIS  → aprovado
//     Eloha     6,3s → dúvida da IA chegou DEPOIS  → aprovado
//     Elenice   7,6s → dúvida da IA chegou DEPOIS  → aprovado
//     Beatriz  35,4s → dúvida da IA chegou A TEMPO → PARCIAL
//
// Cinco pessoas, a mesma dúvida, dois resultados. A IA julga DEPOIS de
// propósito (ninguém espera às 5h da manhã), mas `concluirRitual` congelava o
// selo com o que por acaso já tinha chegado — e nada recalculava depois.
// O ritual vale 20% do dia (DIR-142): era dinheiro decidido por latência.
//
// ══════════════════════════════════════════════════════════════════════════
// E A RÉGUA, QUE ERA O PROBLEMA MAIOR
// ══════════════════════════════════════════════════════════════════════════
// Consertar só a corrida teria PIORADO tudo. Medido em 7 dias, na visualização:
//
//     dúvida ..... 19  (confiança média 61)
//     aprovada ....  5  (confiança média 77)
//     reprovada ...  3  (confiança média 76)
//
// Com DIR-125 ("dúvida na visualização = reprovação"), tornar o resultado
// determinístico reprovaria ~70% dos rituais. A corrida vinha funcionando como
// anistia acidental. Decisão do dono, 15/09: dúvida não reprova mais — vira
// DICA visível. Só `reprovada` reprova.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  comBloco, seloDoRitual, statusDoRitual, pendenciasDoRitual,
  blocoReprovado, blocoEmDuvida,
} from '../src/lib/ritualEmBlocos.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

/** Um ritual inteiro entregue, com vídeo — o caso de todo mundo em 15/09. */
const ritualCompletoCom = (vereditoVisual) => {
  let c = comBloco(comBloco(null, 'acordei', { veredito_ia: { veredito: 'aprovada' } }), 'gratidao', {});
  return comBloco(c, 'visualizacao', {
    video_path: 'cofre/v.webm', video_seg: 123,
    ...(vereditoVisual ? { veredito_ia: vereditoVisual } : {}),
  });
};

describe('a régua nova: dúvida não reprova', () => {
  test('🔴 O CASO DA BEATRIZ: três blocos, vídeo, dúvida na visualização → APROVADO', () => {
    const dela = ritualCompletoCom({ veredito: 'duvida', confianca: 62, motivo: 'só aparece seu rosto e uma parede branca' });
    assert.equal(statusDoRitual(dela), 'aprovada_ritual');
    assert.equal(seloDoRitual(dela), 'brilhante');
  });

  test('e a dúvida não some: vira DICA na lista de pendências', () => {
    const dela = ritualCompletoCom({ veredito: 'duvida', motivo: 'o cômodo não aparece' });
    const p = pendenciasDoRitual(dela);
    assert.equal(p.length, 1);
    assert.equal(p[0].tipo, 'dica');
    assert.match(p[0].o_que, /o cômodo não aparece/, 'o motivo da IA precisa chegar inteiro na pessoa');
  });

  test('o texto da dica diz que o ritual CONTOU — senão a pessoa lê como perda', () => {
    // Foi exatamente a leitura da Beatriz: "disse que tinha algo pendente".
    const p = pendenciasDoRitual(ritualCompletoCom({ veredito: 'duvida', motivo: 'x' }));
    assert.match(p[0].o_que, /contou normalmente/);
    assert.ok(!/reprovad|falhou|errado/i.test(p[0].o_que), 'a dica está acusando a pessoa');
  });

  test('`reprovada` continua reprovando — a trava não foi desligada', () => {
    const reprovado = ritualCompletoCom({ veredito: 'reprovada', confianca: 76, motivo: 'isso é a rua' });
    assert.equal(statusDoRitual(reprovado), 'ritual_parcial');
    assert.equal(seloDoRitual(reprovado), 'parcial');
  });

  test('os três estados da IA não se confundem', () => {
    assert.equal(blocoReprovado('visualizacao', { veredito: 'reprovada' }), true);
    assert.equal(blocoReprovado('visualizacao', { veredito: 'duvida' }), false);
    assert.equal(blocoEmDuvida({ veredito: 'duvida' }), true);
    assert.equal(blocoEmDuvida({ veredito: 'reprovada' }), false);
    // IA fora do ar é o terceiro estado (DIR-146) e não é nenhum dos dois
    assert.equal(blocoReprovado('visualizacao', { ia_indisponivel: true }), false);
    assert.equal(blocoEmDuvida({ ia_indisponivel: true, veredito: 'duvida' }), false);
  });

  test('bloco que faltou continua sendo pendência de verdade, não dica', () => {
    const doisBlocos = comBloco(comBloco(null, 'acordei', {}), 'gratidao', {});
    const p = pendenciasDoRitual(doisBlocos);
    assert.ok(p.some((x) => /não foi entregue/.test(x.o_que)));
    assert.ok(!p.some((x) => x.tipo === 'dica'), 'faltar bloco virou "dica"');
    assert.equal(statusDoRitual(doisBlocos), 'ritual_parcial');
  });
});

// Réplica do efeito da corrida, para provar o conserto e não só descrevê-lo.
// `fecharRitual` congela; `vereditoAtrasado` é o que o conserto passou a fazer.
const fecharRitual = (c) => ({ ...c, status: statusDoRitual(c), valido: statusDoRitual(c) === 'aprovada_ritual', pendencias: pendenciasDoRitual(c) });
const vereditoAtrasado = (fechado, bloco, veredito) => {
  const marcada = comBloco(fechado, bloco, { ...(fechado.blocos?.[bloco] || {}), veredito_ia: veredito });
  const jaFechado = ['aprovada_ritual', 'ritual_parcial', 'ritual_pendente_ia'].includes(fechado.status);
  if (!jaFechado) return marcada;
  const status = statusDoRitual(marcada);
  return { ...marcada, status, valido: status === 'aprovada_ritual', pendencias: pendenciasDoRitual(marcada) };
};

describe('a corrida: o resultado para de depender do relógio', () => {
  test('🔴 fechar RÁPIDO e fechar DEVAGAR dão o mesmo resultado', () => {
    // devagar: o veredito já estava lá quando ela concluiu (caso Beatriz)
    const devagar = fecharRitual(ritualCompletoCom({ veredito: 'reprovada', motivo: 'isso é a rua' }));
    // rápido: concluiu antes, o veredito chegou depois (caso paim)
    const rapido = vereditoAtrasado(fecharRitual(ritualCompletoCom(null)), 'visualizacao', { veredito: 'reprovada', motivo: 'isso é a rua' });

    assert.equal(devagar.status, rapido.status, 'o relógio ainda decide o selo');
    assert.equal(devagar.valido, rapido.valido, 'o relógio ainda decide o ponto');
    assert.equal(devagar.status, 'ritual_parcial');
  });

  test('o veredito atrasado também CONSERTA quem foi reprovado por engano', () => {
    // Luciano: a IA aprovou a visualização dele DEPOIS do lacre, e nada
    // recalculava — o registro ficou dizendo "aprovada" e "parcial" ao mesmo tempo.
    const selado = fecharRitual(ritualCompletoCom({ veredito: 'reprovada', motivo: 'não deu pra ver' }));
    assert.equal(selado.valido, false);
    const revisto = vereditoAtrasado(selado, 'visualizacao', { veredito: 'aprovada', confianca: 82 });
    assert.equal(revisto.status, 'aprovada_ritual');
    assert.equal(revisto.valido, true);
    assert.deepEqual(revisto.pendencias, [], 'a pendência velha sobreviveu ao conserto');
  });

  test('ritual EM ANDAMENTO não é recalculado — quem fecha é o fechamento', () => {
    const emAndamento = { ...ritualCompletoCom(null), status: 'ritual_em_andamento', valido: false };
    const depois = vereditoAtrasado(emAndamento, 'visualizacao', { veredito: 'reprovada' });
    assert.equal(depois.status, 'ritual_em_andamento', 'o recálculo invadiu um ritual que ainda não acabou');
  });

  test('🔴 A PENDÊNCIA FANTASMA: recalcular limpa o que não vale mais', () => {
    // Caso Ribeiro: aprovado, carregando pendência de um salvamento anterior.
    const comFantasma = { ...fecharRitual(ritualCompletoCom(null)), pendencias: [{ bloco: 'visualizacao', o_que: 'texto velho que não vale mais' }] };
    const revisto = vereditoAtrasado(comFantasma, 'visualizacao', { veredito: 'aprovada' });
    assert.deepEqual(revisto.pendencias, []);
  });
});

describe('a fiação no código', () => {
  const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

  test('o veredito atrasado recalcula status, valido, feito e pendências', () => {
    assert.match(CRM, /const jaFechado = \['aprovada_ritual', 'ritual_parcial', 'ritual_pendente_ia'\]\.includes\(atual\.status\)/);
    assert.match(CRM, /valido: status === 'aprovada_ritual'/);
    assert.match(CRM, /pendencias: pendenciasDoRitual\(marcada\)/);
    assert.match(CRM, /feito: refeita\.valido/, 'o recálculo não estava marcando a tarefa como feita');
  });

  test('🔴 a pendência aparece NA TAREFA — a promessa do toast passa a ser verdade', () => {
    // O toast promete "o que faltou está anotado na tarefa" desde 10/09. Tudo
    // que a linha da tarefa desenhava estava atrás de `t.feito && valido`, e um
    // ritual parcial tem os dois falsos: não aparecia NADA.
    assert.match(CRM, /data-teste="pendencia-na-tarefa"/);
    // 🔴 A CONDIÇÃO TEM QUE SER EXATAMENTE ESTA — nada de `t.feito` junto.
    // Um ritual parcial tem `feito: false` e `valido: false`: qualquer uma das
    // duas na porta faz o aviso sumir justo para quem precisa dele. Foi assim
    // que a tarefa da Beatriz ficou uma caixinha vazia.
    assert.match(CRM, /\{\(t\.comprovacao\?\.pendencias\?\.length > 0\) && \(/);
    assert.ok(!/t\.feito[^\n]*pendencias/.test(CRM),
      'o aviso de pendência voltou a depender de a tarefa estar feita');
  });

  test('dica e pendência são ditas com palavras diferentes', () => {
    // A frase é montada com interpolação no meio ("...dicas`} pra próxima"),
    // então casa-se cada metade, não a frase corrida.
    assert.match(CRM, /'uma dica'/);
    assert.match(CRM, /pra próxima/);
    assert.match(CRM, /'ficou 1 pendência'/);
    assert.match(CRM, /pendências/);
    // e o que separa os dois é o tipo, não o texto
    assert.match(CRM, /\.every\(\(x\) => x\.tipo === 'dica'\)/);
  });
});
