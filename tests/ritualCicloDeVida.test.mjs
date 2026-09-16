// 🌅 16/09/2026 — O CICLO DE VIDA DO REGISTRO DO RITUAL.
//
// Dois defeitos diferentes davam no MESMO sintoma: "entreguei tudo e não
// contou". Medidos no banco de produção, 41 rituais desde 10/09, 36 com os
// três blocos entregues — e 5 deles (14%) presos em `ritual_em_andamento`:
//
//   A) REABRIR REBAIXAVA. `ritualRetomavel` devolvia false pra ritual completo,
//      então a tela abria DO ZERO; regravar o bloco 1 zerava o `valido` de um
//      ritual já aprovado. Sophia, 15/09: bloco 1 gravado às 10:35:17 e bloco 3
//      às 10:30:00 — bloco 1 depois do bloco 3 só acontece assim.
//
//   B) NADA FECHAVA. Sem prazo, sem varredura: quem entregava os três blocos e
//      não apertava o botão ficava `em_andamento` para sempre, com
//      `valido: false` — e `valido` decide ponto e dinheiro.
//      Elenice (14/09), Iara (14/09) e ELOHA (16/09).
//
// E em 3 dos 5, `feito` DIVERGIA do registro: tarefa com ✓ e comprovação
// dizendo "pela metade", porque os dois eram escritos por caminhos diferentes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  ritualRetomavel, ritualEsperandoFechamento, fimDaEntrega, fechamentoDoRitual,
  statusDoRitual, RITUAL_MINUTOS_PARA_CONCLUIR,
} from '../src/lib/ritualEmBlocos.js';

const semComentarios = (f) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

const bloco = (quando, extra = {}) => ({ quando, ...extra });
const ritual = ({ status = 'ritual_em_andamento', video = true, veredito = 'aprovada', dia = '2026-09-16', abertoEm = '2026-09-16T09:00:00.000Z' } = {}) => ({
  tipo: 'ritual', status, aberto_dia: dia, aberto_em: abertoEm,
  blocos: {
    acordei: bloco('2026-09-16T09:01:00.000Z', { veredito_ia: { veredito: 'aprovada' } }),
    gratidao: bloco('2026-09-16T09:03:00.000Z'),
    visualizacao: bloco('2026-09-16T09:06:00.000Z', { ...(video ? { video_path: 'x' } : {}), veredito_ia: { veredito } }),
  },
});

// ─── A) reabrir não manda refazer, e não rebaixa ───────────────────────────

test('ritual COMPLETO do dia continua retomável — antes mandava começar do bloco 1', () => {
  assert.equal(ritualRetomavel(ritual({ status: 'aprovada_ritual' }), '2026-09-16'), true);
});

test('o ritual de ontem continua sem ressuscitar no de hoje', () => {
  assert.equal(ritualRetomavel(ritual({ status: 'aprovada_ritual' }), '2026-09-17'), false);
});

test('ritual sem bloco nenhum não é retomável — não há o que retomar', () => {
  assert.equal(ritualRetomavel({ tipo: 'ritual', aberto_dia: '2026-09-16' }, '2026-09-16'), false);
});

test('🔴 gravar bloco num ritual JÁ FECHADO recalcula em vez de zerar o valido', () => {
  // é o conserto no gravador: sem ele, `nova.valido = false` era incondicional
  assert.match(CRM, /const jaFechado = \['aprovada_ritual', 'ritual_parcial', 'ritual_pendente_ia'\]\.includes\(base\.status\)/);
  assert.match(CRM, /if \(jaFechado\) \{\s*Object\.assign\(nova, fechamentoDoRitual\(nova\)\);/);
});

// ─── B) o que foi entregue e não foi fechado ───────────────────────────────

test('três blocos + em andamento = esperando fechamento', () => {
  assert.equal(ritualEsperandoFechamento(ritual()), true);
});

test('ritual já fechado não é reprocessado', () => {
  for (const status of ['aprovada_ritual', 'ritual_parcial', 'ritual_pendente_ia', 'reprovada']) {
    assert.equal(ritualEsperandoFechamento(ritual({ status })), false, status);
  }
});

test('faltando bloco não fecha sozinho — quem não terminou não ganha carimbo', () => {
  const meio = ritual();
  delete meio.blocos.visualizacao;
  assert.equal(ritualEsperandoFechamento(meio), false);
});

test('comprovação que não é ritual nunca entra nessa varredura', () => {
  assert.equal(ritualEsperandoFechamento({ ...ritual(), tipo: 'foto' }), false);
  assert.equal(ritualEsperandoFechamento(null), false);
});

test('o fim da entrega é o ÚLTIMO bloco gravado, não o primeiro', () => {
  assert.equal(fimDaEntrega(ritual()), '2026-09-16T09:06:00.000Z');
});

test('fim da entrega aguenta ritual reaberto (bloco 1 gravado depois do 3)', () => {
  // o caso da Sophia, ao pé da letra
  const reaberto = ritual();
  reaberto.blocos.acordei.quando = '2026-09-16T09:35:17.000Z';
  assert.equal(fimDaEntrega(reaberto), '2026-09-16T09:35:17.000Z');
});

test('sem bloco nenhum o fim da entrega é nulo, não a data de hoje', () => {
  assert.equal(fimDaEntrega({ tipo: 'ritual', blocos: {} }), null);
});

// ─── o fechamento em si ────────────────────────────────────────────────────

test('fechar o entregue dá o mesmo veredito da régua — aprovado com vídeo', () => {
  const f = fechamentoDoRitual(ritual(), { automatico: true });
  assert.equal(f.status, 'aprovada_ritual');
  assert.equal(f.valido, true);
  assert.equal(f.veredito_ia.veredito, 'aprovada');
});

test('dúvida não impede o fechamento automático — vira dica (DIR-125 revista)', () => {
  const f = fechamentoDoRitual(ritual({ veredito: 'duvida' }));
  assert.equal(f.valido, true);
  assert.equal(f.pendencias[0].tipo, 'dica');
});

test('🔴 quem foi REPROVADO de verdade continua reprovado ao fechar sozinho', () => {
  const f = fechamentoDoRitual(ritual({ veredito: 'reprovada' }), { automatico: true });
  assert.equal(f.status, 'ritual_parcial');
  assert.equal(f.valido, false);
  assert.equal(f.veredito_ia.veredito, 'reprovada');
});

test('o fechamento automático fica MARCADO — o laudo precisa saber que ninguém apertou', () => {
  const f = fechamentoDoRitual(ritual(), { automatico: true });
  assert.ok(f.fechamento_automatico?.quando);
  assert.equal(f.fechamento_automatico.fim_da_entrega, '2026-09-16T09:06:00.000Z');
  // e o fechamento pelo BOTÃO não carrega essa marca
  assert.equal(fechamentoDoRitual(ritual()).fechamento_automatico, undefined);
});

test('fechar concorda com statusDoRitual — as duas portas não podem divergir', () => {
  for (const veredito of ['aprovada', 'duvida', 'reprovada']) {
    for (const video of [true, false]) {
      const c = ritual({ veredito, video });
      assert.equal(fechamentoDoRitual(c).status, statusDoRitual(c), `${veredito}/${video}`);
    }
  }
});

// ─── a fiação na tela ──────────────────────────────────────────────────────

test('o prazo do fechamento automático é julgado pelo FIM DA ENTREGA', () => {
  // julgar pelo relógio de agora cobraria da pessoa o tempo que o registro
  // passou parado por um defeito nosso — e ele pode ficar parado por dias
  assert.match(CRM, /ritualExpirado\(\{ abertoEm: t\.comprovacao\?\.aberto_em, agora: fimEntrega \? Date\.parse\(fimEntrega\) : Date\.now\(\) \}\)/);
});

test('quem estourou o cronômetro durante a entrega fecha PARCIAL, não aprovado', () => {
  assert.match(CRM, /\? \{ status: 'ritual_parcial', valido: false/);
  assert.ok(CRM.includes(`Passou dos ${'${RITUAL_MINUTOS_PARA_CONCLUIR}'} minutos do ritual.`));
});

test('a varredura roda uma vez por tarefa e só depois do dia carregar', () => {
  assert.match(CRM, /if \(!uid \|\| diaLido !== dia\) return;/);
  assert.match(CRM, /ritualJaFechadoSozinho\.current\.has\(t\.id\)/);
  assert.match(CRM, /ritualJaFechadoSozinho\.current\.add\(t\.id\)/);
  // se a gravação falhar, a trava solta pra próxima carga tentar de novo
  assert.match(CRM, /\.catch\(\(\) => ritualJaFechadoSozinho\.current\.delete\(t\.id\)\)/);
});

test('🔴 `feito` do ritual sai de `valido` nos dois caminhos de gravação', () => {
  // era escrito por caminhos diferentes e ninguém reconciliava: em 3 dos 5
  // registros presos a tarefa mostrava ✓ e o registro dizia "pela metade"
  // contar ocorrências não serve: tirar o `feito` de um caminho ainda deixa
  // duas do outro (a gravação e o setTarefas). Cada caminho é conferido a dedo.
  assert.match(CRM, /MetodoTarefa\.update\(t\.id, \{ feito: !!nova\.valido, comprovacao: nova \}\)/,
    'o gravador de bloco voltou a escrever a comprovação sem reconciliar o `feito`');
  assert.match(CRM, /MetodoTarefa\.update\(t\.id, \{ feito: !!fechada\.valido, comprovacao: fechada \}\)/,
    'o fechamento automático voltou a escrever sem reconciliar o `feito`');
  // e o estado da tela acompanha, senão a ✓ só volta ao certo no F5
  assert.match(CRM, /\{ \.\.\.x, feito: !!nova\.valido, comprovacao: nova \}/);
  assert.match(CRM, /\{ \.\.\.x, feito: !!fechada\.valido, comprovacao: fechada \}/);
});
