// 🌅 O RITUAL EM TRÊS BLOCOS — as regras, sem tela.
//
// Cada assertiva aqui prende uma decisão tomada em 10/09 a partir do banco:
// não é teste de "a função devolve o que ela devolve", é teste de "o caso da
// Iara não acontece de novo".

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCOS, RITUAL_MINUTOS_PARA_CONCLUIR, prazoDoRitual, segundosRestantes, ritualExpirado,
  textoDoPrazo, blocosFeitos, proximoBloco, ritualCompleto, pendenciasDoRitual,
  seloDoRitual, statusDoRitual, comBloco, ritualRetomavel, blocoReprovado,
} from '../src/lib/ritualEmBlocos.js';

const T0 = Date.parse('2026-09-11T08:00:00Z'); // 05:00 em Brasília
const emMin = (n) => T0 + n * 60000;

// ───────────────────────────────────────────────────────────────────────────
test('REB-1 · quem nunca abriu NÃO está atrasado', () => {
  // 🔴 `Number(null)` é 0, e 0 + 30min é 1970: sem a guarda, todo ritual que
  // ninguém abriu nasceria expirado — e a tela diria "acabou o tempo" pra
  // quem não começou.
  assert.equal(prazoDoRitual(null), null);
  assert.equal(prazoDoRitual(undefined), null);
  assert.equal(prazoDoRitual(''), null);
  assert.equal(segundosRestantes({ abertoEm: null, agora: T0 }), null);
  assert.equal(ritualExpirado({ abertoEm: null, agora: T0 }), false);
  assert.equal(ritualExpirado({}), false);
});

test('REB-2 · o caso da Iara: 4 minutos de atraso deixam de perder o ritual', () => {
  // Em 10/09 ela concluiu 05:34:12 e perdeu — o prazo era 05:30, seco no
  // relógio. Abrindo 05:28 (dentro da janela), o cronômetro lhe dá até 05:58.
  const abriu = '2026-09-11T08:28:00Z'; // 05:28 BRT
  const concluiu = Date.parse('2026-09-11T08:34:12Z'); // 05:34:12 BRT
  assert.equal(ritualExpirado({ abertoEm: abriu, agora: concluiu }), false, 'a Iara perderia de novo');
  // e continua havendo prazo: 30min depois da abertura, acabou
  assert.equal(ritualExpirado({ abertoEm: abriu, agora: Date.parse('2026-09-11T08:58:01Z') }), true);
});

test('REB-3 · o cronômetro vale 30 minutos, contados da abertura', () => {
  assert.equal(RITUAL_MINUTOS_PARA_CONCLUIR, 30);
  assert.equal(prazoDoRitual(new Date(T0).toISOString()), emMin(30));
  assert.equal(segundosRestantes({ abertoEm: new Date(T0).toISOString(), agora: emMin(10) }), 20 * 60);
  // nunca negativo — a tela mostraria "faltam -120s"
  assert.equal(segundosRestantes({ abertoEm: new Date(T0).toISOString(), agora: emMin(45) }), 0);
});

test('REB-4 · o prazo é dito na unidade que a pessoa entende', () => {
  assert.equal(textoDoPrazo(1200), 'faltam 20min');
  assert.equal(textoDoPrazo(47), 'faltam 47s');
  assert.equal(textoDoPrazo(0), 'acabou o tempo');
  assert.equal(textoDoPrazo(null), '');
  // 61s não pode virar "faltam 1min" pra baixo e sumir um segundo
  assert.equal(textoDoPrazo(61), 'faltam 2min');
});

// ───────────────────────────────────────────────────────────────────────────
test('REB-5 · um bloco novo NUNCA leva embora os anteriores', () => {
  // é a promessa do dono: "se o telefone morrer no bloco 3, os blocos 1 e 2
  // já estão em casa". Merge, nunca substituição.
  let c = comBloco(null, 'acordei', { print_url: 'p1' });
  c = comBloco(c, 'gratidao', { audio_seg: 40 });
  c = comBloco(c, 'visualizacao', { video_path: 'v1' });
  assert.deepEqual(blocosFeitos(c), ['acordei', 'gratidao', 'visualizacao']);
  assert.equal(c.blocos.acordei.print_url, 'p1', 'o bloco 1 sumiu quando o 3 chegou');
  assert.equal(c.blocos.gratidao.audio_seg, 40, 'o bloco 2 sumiu quando o 3 chegou');
  // campos de fora dos blocos sobrevivem
  const comExtra = comBloco({ aberto_em: 'x', tipo: 'ritual' }, 'acordei', {});
  assert.equal(comExtra.aberto_em, 'x');
  // 🔴 bloco desconhecido não pode ser GRAVADO. Conferir só o
  // `blocosFeitos` mediria a vizinhança: ele filtra por BLOCOS e devolveria
  // [] mesmo com a chave lixo escrita e viajando pro banco pra sempre.
  const lixo = comBloco({ tipo: 'ritual' }, 'inexistente', { x: 1 });
  assert.deepEqual(Object.keys(lixo.blocos || {}), [], 'gravou um bloco que não existe');
  assert.deepEqual(blocosFeitos(lixo), []);
});

test('REB-6 · a ordem dos blocos e o "onde eu parei"', () => {
  assert.deepEqual([...BLOCOS], ['acordei', 'gratidao', 'visualizacao']);
  assert.equal(proximoBloco(null), 'acordei');
  assert.equal(proximoBloco(comBloco(null, 'acordei', {})), 'gratidao');
  const dois = comBloco(comBloco(null, 'acordei', {}), 'gratidao', {});
  assert.equal(proximoBloco(dois), 'visualizacao');
  assert.equal(ritualCompleto(dois), false);
  assert.equal(proximoBloco(comBloco(dois, 'visualizacao', {})), null);
  assert.equal(ritualCompleto(comBloco(dois, 'visualizacao', {})), true);
});

// ───────────────────────────────────────────────────────────────────────────
test('REB-7 · o que ficou pendente é dito com todas as letras', () => {
  // 🔴 O pedido: "se ele fez alguma coisa errada, a plataforma precisa
  // sinalizar". Nenhum dos 7 reprovados de 09 e 10/09 consegue reler o motivo
  // — era um toast que sumia.
  const so1 = comBloco(null, 'acordei', {});
  const p = pendenciasDoRitual(so1).map((x) => x.o_que);
  assert.ok(p.some((t) => /Gratidão não foi entregue/.test(t)), p.join(' | '));
  assert.ok(p.some((t) => /Visualização não foi entregue/.test(t)), p.join(' | '));
  assert.ok(!p.some((t) => /Acordei não foi entregue/.test(t)), 'acusou pendência de bloco entregue');

  // visualização SEM vídeo é pendência própria — o bloco vale, o selo não
  const semVideo = comBloco(comBloco(so1, 'gratidao', {}), 'visualizacao', { video_seg: 130 });
  const pv = pendenciasDoRitual(semVideo).map((x) => x.o_que);
  assert.equal(pendenciasDoRitual(semVideo).length, 1, pv.join(' | '));
  assert.ok(/sem o vídeo/.test(pv[0]) && /BRILHANTE/.test(pv[0]), pv[0]);

  // reprovação da IA entra na mesma lista, com o motivo dela
  const reprovado = comBloco(null, 'acordei', { veredito_ia: { veredito: 'reprovada', motivo: 'print de outro dia' } });
  assert.ok(pendenciasDoRitual(reprovado).some((x) => /print de outro dia/.test(x.o_que)));

  // completo e com vídeo: nada pendente
  const cheio = comBloco(comBloco(comBloco(null, 'acordei', {}), 'gratidao', {}), 'visualizacao', { video_path: 'v' });
  assert.deepEqual(pendenciasDoRitual(cheio), []);
});

// ───────────────────────────────────────────────────────────────────────────
test('REB-8 · o selo: BRILHANTE ainda exige o vídeo (DIR-89 não mudou)', () => {
  const tres = (viz) => comBloco(comBloco(comBloco(null, 'acordei', {}), 'gratidao', {}), 'visualizacao', viz);
  assert.equal(seloDoRitual(null), 'nenhum');
  assert.equal(seloDoRitual(comBloco(null, 'acordei', {})), 'parcial');
  assert.equal(seloDoRitual(tres({ video_seg: 130 })), 'completo', 'sem vídeo não pode ser BRILHANTE');
  assert.equal(seloDoRitual(tres({ video_path: 'v', video_seg: 130 })), 'brilhante');
  // um bloco reprovado pela IA derruba o ritual inteiro pra parcial
  const comReprova = comBloco(tres({ video_path: 'v' }), 'acordei', { veredito_ia: { veredito: 'reprovada', motivo: 'x' } });
  assert.equal(seloDoRitual(comReprova), 'parcial');
  // 🔴 DIR-125 vale SÓ pra visualização: dúvida sobre o AMBIENTE reprova
  // automático (decisão do dono), dúvida sobre o PRINT não.
  const duvidaNoPrint = comBloco(tres({ video_path: 'v' }), 'acordei', { veredito_ia: { veredito: 'duvida', motivo: 'sem data visível' } });
  assert.equal(seloDoRitual(duvidaNoPrint), 'brilhante', 'dúvida no print do bom dia não pode reprovar');
  const duvidaNoAmbiente = comBloco(tres({ video_path: 'v' }), 'visualizacao', { video_path: 'v', veredito_ia: { veredito: 'duvida', motivo: 'não dá pra ver o cômodo' } });
  assert.equal(seloDoRitual(duvidaNoAmbiente), 'parcial', 'DIR-125: dúvida de ambiente reprova automático');
  assert.equal(blocoReprovado('visualizacao', { veredito: 'duvida' }), true);
  assert.equal(blocoReprovado('acordei', { veredito: 'duvida' }), false);
  assert.equal(blocoReprovado('acordei', { veredito: 'aprovada' }), false);
  assert.equal(blocoReprovado('visualizacao', undefined), false);
});

test('REB-9 · o status que vai pro registro sai do selo', () => {
  const tres = (viz) => comBloco(comBloco(comBloco(null, 'acordei', {}), 'gratidao', {}), 'visualizacao', viz);
  assert.equal(statusDoRitual(tres({ video_path: 'v' })), 'aprovada_ritual');
  assert.equal(statusDoRitual(tres({})), 'aprovada_ritual', 'sem vídeo ainda aprova (DIR-89)');
  assert.equal(statusDoRitual(comBloco(null, 'acordei', {})), 'ritual_parcial');
  assert.equal(statusDoRitual(null), 'reprovada');
});

// ───────────────────────────────────────────────────────────────────────────
test('REB-10 · retomar só o ritual de HOJE, e só se sobrou bloco', () => {
  const meio = { ...comBloco(null, 'acordei', {}), aberto_dia: '2026-09-11' };
  assert.equal(ritualRetomavel(meio, '2026-09-11'), true);
  assert.equal(ritualRetomavel(meio, '2026-09-12'), false, 'o ritual de ontem ressuscitou');
  // completo não se retoma
  const cheio = { ...comBloco(comBloco(meio, 'gratidao', {}), 'visualizacao', {}), aberto_dia: '2026-09-11' };
  assert.equal(ritualRetomavel(cheio, '2026-09-11'), false);
  // sem bloco nenhum não há o que retomar
  assert.equal(ritualRetomavel({ tipo: 'ritual', aberto_dia: '2026-09-11' }, '2026-09-11'), false);
  // outro tipo de comprovação nunca é ritual retomável
  assert.equal(ritualRetomavel({ ...meio, tipo: 'foto' }, '2026-09-11'), false);

  // 🔴 o dia lido é `aberto_dia` (Brasília), não um pedaço de `aberto_em`
  // (que é UTC). Um ritual aberto 21h em Brasília tem aberto_em no dia
  // seguinte em UTC — fatiar `aberto_em` diria o dia errado.
  const noite = { ...comBloco(null, 'acordei', {}), aberto_dia: '2026-09-11', aberto_em: '2026-09-12T00:30:00Z' };
  assert.equal(ritualRetomavel(noite, '2026-09-11'), true, 'o dia veio do aberto_em (UTC) em vez do aberto_dia');
});
