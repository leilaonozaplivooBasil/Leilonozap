// 🖐️ ARRASTAR A TAREFA PARA REORGANIZAR (09/09/2026).
//
// Dono: "as tarefas podem também agora conter um botão de arrastar para que
// possamos reorganizá-las arrastando para cima ou para baixo de forma fluida".
//
// ═══════════════════════════════════════════════════════════════════════════
// 🔴 POR QUE ARRASTAR REMARCA A HORA — a decisão, e o teste que a defende
// ═══════════════════════════════════════════════════════════════════════════
// A leitura óbvia do pedido é "arrastar livre, sem mexer na hora". Isso
// RECRIARIA o bug do #312: `estadoDasTarefas` calcula a janela de cada tarefa
// como "da hora dela até a hora da PRÓXIMA DA LISTA", então lista fora de ordem
// cronológica marca como PERDIDA uma tarefa que está acontecendo agora — e isso
// mexe em X-Pay e na zeragem do dia.
//
// Então arrastar REMARCA: a tarefa recebe a hora do lugar onde foi solta. O
// último teste deste arquivo é o que amarra as duas coisas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horaEntre, ordenarPorHora, estadoDasTarefas, ESTADOS } from '../src/lib/xgame.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('🖐️ solta entre duas: pega o meio, arredondado em 5 min', () => {
  assert.equal(horaEntre('09:00', '09:40'), '09:20');
  // 5 em 5 porque número quebrado não é o que a pessoa espera ver: o meio de
  // 09:00 e 09:35 é 09:17:30, e o que aparece na tela é 09:20.
  // (Escrevi 09:15 na primeira versão — conta minha errada, não do código.)
  assert.equal(horaEntre('09:00', '09:35'), '09:20');
});

test('solta no topo: 15 min antes da primeira', () => {
  assert.equal(horaEntre(null, '07:15'), '07:00');
});

test('solta no fim: 15 min depois da última', () => {
  assert.equal(horaEntre('22:00', null), '22:15');
});

test('⚠️ o dia não estoura nas pontas', () => {
  // Sem grampo, soltar no topo do dia daria hora negativa e no fim passaria de
  // 23:59 — e `minutos()` devolveria coisa que o motor lê como fora do dia.
  assert.equal(horaEntre(null, '00:05'), '00:00');
  assert.equal(horaEntre('23:55', null), '23:59');
});

test('⚠️ vizinhas coladas: cola na de cima em vez de inventar minuto', () => {
  // Não há minuto livre entre 09:00 e 09:01. Empate de hora é resolvido por
  // `ordem` (ordenarPorHora desempata por ela), e a tela grava `ordem` da de
  // cima + 1 — então a posição escolhida é respeitada mesmo sem minuto livre.
  assert.equal(horaEntre('09:00', '09:01'), '09:00');
  // ⚠️ E o caso que realmente prova a guarda, achado na verificação por
  // mutação: sem ela, o meio de 09:03 e 09:04 arredonda para 09:05 — DEPOIS da
  // vizinha de baixo. A tarefa cairia abaixo do lugar onde foi solta. O par
  // 09:00/09:01 não expunha isso (arredonda pra 09:00 por acaso), e por isso a
  // primeira versão deste teste passava verde com a guarda removida.
  assert.equal(horaEntre('09:03', '09:04'), '09:03');
  assert.equal(horaEntre('09:08', '09:09'), '09:08');
});

test('sem vizinha com hora: não inventa horário', () => {
  assert.equal(horaEntre(null, null), null);
  assert.equal(horaEntre('', ''), null);
});

test('🔴 depois de arrastar, a lista continua cronológica e o motor não mente', () => {
  // Este é o teste que justifica a decisão de remarcar a hora. Simula o pior
  // caso: alguém pega a de 22:00 e solta lá em cima, entre a de 07:15 e a de
  // 09:00. Se a hora NÃO mudasse, a lista ficaria fora de ordem e a de 09:00
  // (com a de 22:00 na frente) voltaria a ser marcada PERDIDA.
  const dia = [
    { id: 'a', hora: '07:15', ordem: 435 },
    { id: 'b', hora: '09:00', ordem: 540 },
    { id: 'c', hora: '22:00', ordem: 1320 },
  ];
  const nova = horaEntre('07:15', '09:00');
  assert.equal(nova, '08:10');

  const depoisDoArrasto = ordenarPorHora(
    dia.map((t) => (t.id === 'c' ? { ...t, hora: nova, ordem: 8 * 60 + 10 } : t)),
  );
  assert.deepEqual(depoisDoArrasto.map((t) => t.hora), ['07:15', '08:10', '09:00']);

  // às 09h10 a de 09:00 está na janela dela — e continua AGORA, não PERDIDO
  const b = estadoDasTarefas(depoisDoArrasto, 9 * 60 + 10).find((t) => t.id === 'b');
  assert.equal(
    b.estado.id,
    ESTADOS.AGORA.id,
    'arrastar voltou a bagunçar a ordem — é o bug do #312 de volta, tirando X-Pay',
  );
});

test('🔴 a tela grava a hora nova, não só reordena na memória', () => {
  assert.match(
    CRM,
    /update\(\{ hora: nova, ordem \}\)\.eq\('id', movida\.id\)/,
    'o arrasto parou de gravar — a tarefa volta pro lugar antigo ao recarregar',
  );
  assert.match(
    CRM,
    /setTarefas\(antes\)/,
    'sem desfazer no erro, a tela mostra a tarefa movida e o banco fica com a hora velha',
  );
});

test('⚠️ só o punho arrasta, e tarefa sem hora não arrasta', () => {
  assert.match(
    CRM,
    /isDragDisabled=\{!t\.hora\}/,
    'tarefa sem hora fica fora da Jornada de propósito — arrastar ali inventaria horário',
  );
  assert.match(
    CRM,
    /\{\.\.\.\(t\.hora \? arrasto\.dragHandleProps : \{\}\)\}/,
    'o punho perdeu o dragHandleProps, ou a linha inteira virou arrastável — no celular isso transforma rolar a lista em arrasto sem querer',
  );
  assert.doesNotMatch(
    CRM,
    /\{\.\.\.arrasto\.draggableProps\}\s*\{\.\.\.arrasto\.dragHandleProps\}/,
    'a linha inteira voltou a ser o punho',
  );
});

test('🔴 e o arrasto não faz conta de índice global', () => {
  // A primeira versão desta função recebia (lista, de, para) e casava índice
  // local do período com índice global da lista. O arrasto cruza períodos
  // (manhã → tarde), e essa é exatamente a conta que gerou o bug de hoje.
  // `horaEntre` recebe só as duas vizinhas: não há índice pra errar.
  assert.equal(horaEntre.length, 2, 'horaEntre voltou a receber índices');
  assert.match(CRM, /horaEntre\(acima\?\.hora \|\| null, abaixo\?\.hora \|\| null\)/);
});
