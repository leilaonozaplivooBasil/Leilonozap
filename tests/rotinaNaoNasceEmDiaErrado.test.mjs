// 🗓️ "HOJE É DOMINGO" — DIR-166.6 (20/09/2026).
//
// Dono, testando num domingo, escolhendo "segunda, terça, quarta e quinta"
// pra uma tarefa nova: "hoje é domingo e ele está colocando uma tarefa
// que eu só falei que era terça, quarta e quinta... ele não está pegando
// o dia. Então, se hoje é domingo, ele tem que botar hoje é domingo...
// tem que chegar todo dia e falar bom dia, hoje é segunda, hoje é terça,
// hoje é quarta, hoje é quinta, ele tem que puxar, pra ficar sincronizado
// com a tarefa... com o horário de Brasília."
//
// Achado (auditoria direta no banco, `metodo_perfil`/`metodo_tarefas` do
// dono): a data "hoje" já é calculada certo, sempre em America/Sao_Paulo
// (`dataISO`, DIR-129/DIR-59) — 20/09/2026 é mesmo domingo. O bug não era
// de fuso horário. "Nova tarefa do dia" (o campo do topo) SEMPRE criava a
// tarefa de HOJE, mesmo quando os dias escolhidos no seletor (DIR-166.2)
// não incluíam hoje — uma contradição: escolher "só seg-qui" e a tarefa
// nascer no domingo mesmo assim, porque só o item da ROTINA (pro futuro)
// respeitava `dias_semana`; a instância de HOJE nascia sempre, sem passar
// pelo filtro.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));

test('itemValeNoDia é importado de rotinaPessoal.js — mesma régua usada em gerarTarefasDaRotina', () => {
  assert.match(CRM, /itemValeNoDia,?\s*\}\s*from\s*'@\/lib\/rotinaPessoal'/);
});

test('addTarefa calcula o dia da semana de HOJE a partir de `dia` (Brasília), não de new Date() puro', () => {
  assert.match(CRM, /const diaSemanaHoje = new Date\(`\$\{dia\}T12:00:00`\)\.getDay\(\);/);
});

test('quando os dias escolhidos NÃO incluem hoje, a tarefa de hoje não nasce — só grava na rotina, pro futuro', () => {
  const ini = CRM.indexOf('const addTarefa = async () => {');
  assert.ok(ini > 0, 'premissa: addTarefa existe');
  const trecho = CRM.slice(ini, ini + 1200);
  assert.match(trecho, /if \(repetirNovaTarefa && diasNovaTarefa && !itemValeNoDia\(\{ dias_semana: diasNovaTarefa \}, diaSemanaHoje\)\) \{/);
  // dentro do bloco: grava na rotina (evitando duplicar se já existir) e
  // PÁRA — nunca chega no MetodoTarefa.create logo abaixo, que é o que
  // criaria a tarefa fantasma de hoje.
  const iniBloco = trecho.indexOf('if (repetirNovaTarefa && diasNovaTarefa');
  const fimBloco = trecho.indexOf('\n    }', iniBloco);
  const bloco = trecho.slice(iniBloco, fimBloco);
  assert.match(bloco, /if \(!estaNaRotina\(novaTarefa\.hora \|\| '', novaTarefa\.titulo\)\) \{/);
  assert.match(bloco, /await gravarRotina\(incluirNaRotina\(rotina, \{ hora: novaTarefa\.hora \|\| '', titulo: novaTarefa\.titulo, dias_semana: diasNovaTarefa \}\)\);/);
  assert.match(bloco, /return;/);
});

test('quando não tem restrição de dias (ou o dia escolhido inclui hoje), a tarefa de hoje continua nascendo normal', () => {
  // regra pura: sem dias_semana (null), itemValeNoDia sempre diz "vale" —
  // então o `if` do bloco novo nunca entra, e o fluxo de sempre (criar a
  // tarefa de hoje) continua intacto. Coberto pela suíte de
  // rotinaPessoal.test.mjs (itemValeNoDia); aqui só confirma que o `if`
  // exige AMBOS repetirNovaTarefa E diasNovaTarefa antes de checar o dia.
  assert.match(CRM, /if \(repetirNovaTarefa && diasNovaTarefa && !itemValeNoDia/);
});
