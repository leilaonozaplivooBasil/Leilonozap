// 🕐 A TAREFA NOVA ENTRA NO HORÁRIO — OS CAMINHOS QUE O #312 NÃO PEGOU
// (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO, EM VÍDEO
// ═══════════════════════════════════════════════════════════════════════════
// Dono, gravando a tela: cria "teste de 9:15 da manhã", dá a hora, e a tarefa
// aparece DEPOIS da de 10:30 — no fim do bloco da manhã. Ele arrasta pro
// lugar, e o toast responde "Movida para as 09:00" em vez de 09:15.
//
// 🔴 O #312 (09/09) consertou exatamente isto — no DistribuirTarefa. E passou
// reto por DOIS outros caminhos que criam tarefa:
//   • CrmMetodo.jsx:1346    o campo "nova tarefa do dia" da lista
//   • QuadroCompromisso.jsx:887  o card do quadro que também vira tarefa
// Os dois mandavam `ordemTarefa: <tamanho da lista>` — o fim da fila, sempre.
//
// E havia um terceiro, diferente: dar hora a uma tarefa que nasceu SEM hora
// trocava o campo com um `.map()`, que preserva a POSIÇÃO. A tela só voltava
// ao normal recarregando a página.
//
// Consertar tela por tela deixaria o buraco aberto pra próxima tela. A conta
// passou a morar em `planoDeEntrada`, onde a linha é montada.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planoDeEntrada } from '../src/lib/destinos.js';
import { ordenarPorHora } from '../src/lib/xgame.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

const base = { origem: 'lista', userId: 'u1', dataISO: '2026-09-10' };

test('🕐 a ordem sai da HORA, não do tamanho da lista', () => {
  // 11 tarefas no dia: antes, a nova nascia com ordem 11 — o fim da fila.
  const { tarefa } = planoDeEntrada({ ...base, titulo: 'teste de 9:15 da manhã', hora: '09:15', ordemTarefa: 11 });
  assert.equal(tarefa.ordem, 9 * 60 + 15, 'a tarefa voltou a nascer no fim da fila, ignorando a hora escolhida');
  assert.equal(tarefa.hora, '09:15');
});

test('🔴 o caso exato do vídeo: 09:15 entra ENTRE a de 08:30 e a de 09:30', () => {
  // A manhã que estava na tela do dono, na ordem em que estava.
  const doDia = [
    { id: 'a', hora: '08:30', titulo: 'Releitura de código', ordem: 8 * 60 + 30 },
    { id: 'b', hora: '09:30', titulo: 'Atendimento e resolução de problemas tech', ordem: 9 * 60 + 30 },
    { id: 'c', hora: '10:00', titulo: 'Gratidão', ordem: 10 * 60 },
    { id: 'd', hora: '10:30', titulo: 'Organização do negócio', ordem: 10 * 60 + 30 },
  ];
  const { tarefa } = planoDeEntrada({ ...base, titulo: 'teste de 9:15 da manhã', hora: '09:15', ordemTarefa: doDia.length });
  const lista = ordenarPorHora([...doDia, { id: 'nova', ...tarefa }]);
  assert.deepEqual(
    lista.map((t) => t.hora),
    ['08:30', '09:15', '09:30', '10:00', '10:30'],
    'a tarefa nova voltou a cair no fim da manhã — é o vídeo do dono de novo',
  );
  assert.equal(lista[1].id, 'nova', 'ela tem que ser a SEGUNDA da manhã, sem ninguém arrastar nada');
});

test('⚠️ sem hora, a reserva vale — e as sem-hora mantêm a ordem de criação', () => {
  // `ordemTarefa` não sumiu: ela ainda decide entre as tarefas SEM hora, pra
  // elas ficarem na ordem em que a pessoa criou. É seguro porque
  // `ordenarPorHora` nunca compara a ordem de uma sem-hora com a de uma
  // com-hora — sem hora vai pro fim do dia por outro caminho.
  const primeira = planoDeEntrada({ ...base, titulo: 'sem hora 1', hora: null, ordemTarefa: 5 }).tarefa;
  const segunda = planoDeEntrada({ ...base, titulo: 'sem hora 2', hora: null, ordemTarefa: 6 }).tarefa;
  assert.equal(primeira.ordem, 5);
  assert.equal(segunda.ordem, 6);
  const lista = ordenarPorHora([
    { id: 's2', ...segunda }, { id: 's1', ...primeira },
    { id: 'comHora', hora: '14:00', ordem: 14 * 60 },
  ]);
  assert.deepEqual(lista.map((t) => t.id), ['comHora', 's1', 's2'], 'a sem-hora subiu pro meio do dia ou trocou de ordem entre si');
});

test('⚠️ hora inválida cai na reserva, não vira ordem 0', () => {
  // Ordem 0 poria a tarefa ANTES de tudo — meia-noite. `horaValida` já
  // devolve null aqui, e a reserva é quem assume.
  assert.equal(planoDeEntrada({ ...base, titulo: 'x', hora: '99:99', ordemTarefa: 7 }).tarefa.ordem, 7);
  assert.equal(planoDeEntrada({ ...base, titulo: 'x', hora: 'amanhã cedo', ordemTarefa: 7 }).tarefa.ordem, 7);
});

test('🔴 dar hora a uma tarefa REORDENA a lista, não só troca o campo', () => {
  // O `.map()` sozinho preserva a posição: a tarefa recebia 09:15 e continuava
  // desenhada depois da de 10:30 até alguém recarregar a página.
  assert.match(
    CRM,
    /setTarefas\(\(prev\) => ordenarPorHora\(prev\.map\(\(x\) => \(x\.id === t\.id \? \{ \.\.\.x, titulo, hora, ordem \} : x\)\)\)\)/,
    'editar a hora voltou a não reordenar — a tarefa fica no lugar velho até recarregar',
  );
});

test('🔴 e grava a `ordem` nova junto com a hora', () => {
  // Sem isto a tarefa carrega pra sempre a ordem que ganhou quando nasceu sem
  // hora (2000, o fim do dia), e todo empate de horário desempata errado.
  assert.match(
    CRM,
    /MetodoTarefa\.update\(t\.id, \{ titulo, hora, ordem \}\)/,
    'a ordem parou de ser gravada na edição — o desempate volta a usar o número velho',
  );
  assert.match(CRM, /const ordem = ordemPelaHoraDoDia\(hora\);/, 'a ordem da edição deixou de sair da hora');
});

test('🔴 nenhuma tela decide a ordem por conta própria', () => {
  // A trava que impede o #312 de se repetir numa terceira tela: quem monta a
  // linha é `planoDeEntrada`, e é lá que a hora vira ordem.
  const destinos = semComentarios(ler('../src/lib/destinos.js'));
  assert.match(destinos, /ordem: ordemDaHora\(h, ordemTarefa\)/, 'a linha da tarefa voltou a gravar a ordem crua de quem chamou');
  const quadro = semComentarios(ler('../src/components/licensing/CentralVendas/QuadroCompromisso.jsx'));
  for (const [nome, src] of [['CrmMetodo', CRM], ['QuadroCompromisso', quadro]]) {
    assert.doesNotMatch(src, /ordem: tarefas(DoDia)?\.length/, `${nome} voltou a gravar ordem própria pela contagem da lista`);
  }
});
