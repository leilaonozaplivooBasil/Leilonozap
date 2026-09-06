import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELENCO, APAGADO, PASSO_DO_ELENCO,
  personagemDaTarefa, elencoDaParada, coresDo,
} from '../src/lib/elencoJornada.js';

// ─── quem combina com a tarefa ───────────────────────────────────────────────

test('reunião e apresentação trazem O CLIENTE — é com ele que se reúne', () => {
  assert.equal(personagemDaTarefa('Reunião com o time do Sul'), 'cliente');
  assert.equal(personagemDaTarefa('Apresentação do plano'), 'cliente');
  assert.equal(personagemDaTarefa('Ligar para o Marcos'), 'cliente');
});

test('time e duplicação trazem O DUPLICADO — é o Hábito 8 na tela', () => {
  assert.equal(personagemDaTarefa('Duplicar o método com a Ana'), 'duplicado');
  assert.equal(personagemDaTarefa('Formar novo líder'), 'duplicado');
});

test('gestão e verificação trazem A DIRETORA', () => {
  assert.equal(personagemDaTarefa('Verificação do progresso'), 'diretora');
  assert.equal(personagemDaTarefa('Planejamento financeiro'), 'diretora');
});

test('mentoria e estudo trazem O MENTOR', () => {
  assert.equal(personagemDaTarefa('Mentoria do diretor'), 'mentor');
  assert.equal(personagemDaTarefa('Leitura de 20 páginas'), 'mentor');
});

test('sem casar com nada é O EXECUTIVO — o dono do dia, não um resto', () => {
  assert.equal(personagemDaTarefa('Academia'), 'executivo');
  assert.equal(personagemDaTarefa(''), 'executivo');
  assert.equal(personagemDaTarefa(null), 'executivo');
});

test('acento não muda quem aparece (o dono digita com e sem)', () => {
  assert.equal(personagemDaTarefa('REUNIÃO'), personagemDaTarefa('reuniao'));
  assert.equal(personagemDaTarefa('Verificação'), personagemDaTarefa('verificacao'));
});

test('a ordem das regras é decidida, não acidental: "reunião com o time" é do CLIENTE', () => {
  // casa com as duas listas; a primeira vence, e a primeira é o cliente —
  // porque a cena que a pessoa vê é uma reunião, não a formação de um líder.
  assert.equal(personagemDaTarefa('Reunião com o time'), 'cliente');
});

// ─── quem aparece em qual parada ─────────────────────────────────────────────

test('a parada do MOMENTO sempre tem alguém acenando — é o convite pro clique', () => {
  // mesmo num índice que a regra do espaçamento descartaria
  const r = elencoDaParada({ indice: 1, titulo: 'Academia', atual: true });
  assert.deepEqual(r, { chave: 'executivo', pose: 'acena', apagado: false });
});

test('o mapa NÃO fica lotado: aparece de PASSO_DO_ELENCO em PASSO_DO_ELENCO', () => {
  const aparece = [];
  for (let i = 0; i < 12; i += 1) {
    if (elencoDaParada({ indice: i, titulo: 'Academia', feito: true })) aparece.push(i);
  }
  assert.deepEqual(aparece, [0, 3, 6, 9]);
  assert.equal(aparece.length, Math.ceil(12 / PASSO_DO_ELENCO));
});

test('parada feita = boneco EM COR, de pé', () => {
  const r = elencoDaParada({ indice: 3, titulo: 'Academia', feito: true });
  assert.equal(r.pose, 'parado');
  assert.equal(r.apagado, false);
});

test('parada ainda travada COCHILA e sai apagada — o desenho conta o estado', () => {
  const r = elencoDaParada({ indice: 3, titulo: 'Academia', feito: false });
  assert.equal(r.pose, 'dorme');
  assert.equal(r.apagado, true);
});

test('índice inválido não desenha ninguém (nunca quebra a trilha)', () => {
  assert.equal(elencoDaParada({ indice: -1, titulo: 'x', feito: true }), null);
  assert.equal(elencoDaParada({ indice: 1.5, titulo: 'x', feito: true }), null);
  assert.equal(elencoDaParada({ indice: undefined, titulo: 'x', feito: true }), null);
});

// ─── as cores ────────────────────────────────────────────────────────────────

test('apagado troca a COR mas mantém a identidade (barba, óculos, cabelo longo)', () => {
  const mentor = coresDo('mentor', true);
  assert.equal(mentor.terno, APAGADO.terno, 'o terno tem que ficar cinza');
  assert.equal(mentor.pele, APAGADO.pele);
  assert.equal(mentor.barba, true, 'a barba é quem ele é — não se apaga');
  assert.equal(mentor.oculos, true);
  assert.equal(coresDo('diretora', true).cabeloLongo, true);
});

test('em cor, ninguém sai cinza', () => {
  for (const chave of Object.keys(ELENCO)) {
    assert.notEqual(coresDo(chave, false).terno, APAGADO.terno, `${chave} saiu apagado sem pedir`);
  }
});

test('chave desconhecida cai no Executivo, sem quebrar a tela', () => {
  assert.equal(coresDo('fulano').nome, ELENCO.executivo.nome);
});

test('o elenco todo é distinguível: cinco ternos diferentes', () => {
  const ternos = new Set(Object.values(ELENCO).map((c) => c.terno));
  assert.equal(ternos.size, Object.keys(ELENCO).length, 'dois personagens com o mesmo terno viram o mesmo boneco');
});
