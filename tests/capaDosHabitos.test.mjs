/**
 * 🎴 A CAPA DOS 8 HÁBITOS — os dois estados (24/09/2026)
 *
 * Dono: "quando eu clicar no Sonho, o quadro do Compromisso, Lista, Contato,
 * Apresentação, Acompanhamento, Verificação e Duplicação precisa sumir... a
 * ideia funciona igual a lupa da loja virtual quando eu procuro um produto...
 * eu quero algo tudo muito limpo e muito fluido, porque eu estou sentindo
 * muita informação."
 *
 * 🔴 A CAUSA, achada no código ANTES de mexer: `secaoAtiva` era
 * `secao || (isSuperAdmin ? 'verificacao' : 'acompanhamento')`. Esse `||`
 * garantia que NUNCA existisse "nenhum hábito aberto" — então a grade das 8
 * portas e o conteúdo de um hábito conviviam sempre. A página era menu e mesa
 * de trabalho ao mesmo tempo, o tempo todo.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ORDEM_DOS_HABITOS, habitoValido, vizinhosDoHabito, numeroDoHabito,
  habitoDeEntrada, lerUltimoHabito, gravarUltimoHabito, CHAVE_ULTIMO_HABITO,
} from '../src/lib/capaDosHabitos.js';
import { CICLO_DO_XGAME, proximoPassoDoCiclo } from '../src/lib/cicloDoXGame.js';
import { semComentarios } from './_ajuda.mjs';

const PAGINA = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmClientesTab.jsx', import.meta.url), 'utf8'));
const PORTAS = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/PortasDosHabitos.jsx', import.meta.url), 'utf8'));
const BARRA = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/BarraDoHabito.jsx', import.meta.url), 'utf8'));

// memória de mentira, pra não depender de navegador
const aparelho = () => {
  const dentro = new Map();
  return {
    getItem: (k) => (dentro.has(k) ? dentro.get(k) : null),
    setItem: (k, v) => dentro.set(k, String(v)),
    removeItem: (k) => dentro.delete(k),
    _dentro: dentro,
  };
};

test('🔴 existe um estado "nenhum hábito aberto" — é ele que apaga a grade', () => {
  // é ESTA linha que resolve o pedido inteiro: sem `null` possível, os blocos
  // `secaoAtiva === 'x'` sempre acham um dono e o conteúdo nunca some
  assert.match(PAGINA, /const secaoAtiva = secao;/, 'voltou o `||` que impedia a capa de existir');
  assert.match(PAGINA, /const naCapa = !secao;/);
  assert.ok(!/const secaoAtiva = secao \|\|/.test(PAGINA), 'o fallback pra um hábito padrão voltou');
});

test('a grade só existe na capa; a barra ‹ › só existe no hábito aberto', () => {
  assert.match(PAGINA, /\{naCapa && \(\s*\n\s*<div className="mb-8 sm:mb-12">\s*\n\s*<PortasDosHabitos/);
  assert.match(PAGINA, /\{!naCapa && \(\s*\n\s*<div className="mb-5 sm:mb-7">\s*\n\s*<BarraDoHabito/);
  // e a faixa do brandbook do hábito também some na capa
  assert.match(PAGINA, /\{!naCapa && \(<>/);
  // o desenho do ciclo é o contrário: só na capa
  assert.match(PAGINA, /\{naCapa && \(\s*\n\s*<div className="mt-2 mb-4">\s*\n\s*<CicloDoXGame \/>/);
});

test('o ‹ › dá a VOLTA — o 8 leva ao 1 e o 1 leva ao 8', () => {
  // um seletor que apaga na ponta faz a pessoa achar que travou; e no método
  // o ciclo realmente recomeça
  assert.deepEqual(vizinhosDoHabito('sonho'), { anterior: 'duplicacao', proximo: 'compromisso' });
  assert.deepEqual(vizinhosDoHabito('duplicacao'), { anterior: 'verificacao', proximo: 'sonho' });
  for (const id of ORDEM_DOS_HABITOS) {
    const { anterior, proximo } = vizinhosDoHabito(id);
    assert.ok(habitoValido(anterior) && habitoValido(proximo), `${id} ficou sem vizinho`);
  }
});

test('id inválido não inventa hábito nem quebra a barra', () => {
  for (const lixo of ['xpto', '', null, undefined, 0, {}]) {
    assert.equal(habitoValido(lixo), null);
    assert.deepEqual(vizinhosDoHabito(lixo), { anterior: null, proximo: null });
    assert.equal(numeroDoHabito(lixo), 0);
  }
  assert.equal(numeroDoHabito('contato'), 4);
});

test('🚪 onde a página abre: URL, depois memória, depois a capa', () => {
  // o dono escolheu "lembra o último hábito" com o custo na mesa: o
  // Compromisso é a tela do dia a dia, e a capa como porta fixa custaria um
  // clique a mais TODA manhã, pra sempre
  assert.equal(habitoDeEntrada({ daUrl: 'lista', doAparelho: 'sonho' }), 'lista', 'um link compartilhado tem que mandar');
  assert.equal(habitoDeEntrada({ daUrl: null, doAparelho: 'compromisso' }), 'compromisso');
  assert.equal(habitoDeEntrada({ daUrl: 'xpto', doAparelho: 'compromisso' }), 'compromisso', 'URL inválida cai pra memória, não pro vazio');
  assert.equal(habitoDeEntrada({}), null, 'primeira vez tem que ser a CAPA — é onde se aprende o método');
});

test('voltar pra capa APAGA a memória', () => {
  // quem voltou pra capa quis sair do hábito; reabrir a página não pode
  // arrastá-la de volta pra dentro dele
  const ap = aparelho();
  gravarUltimoHabito('contato', ap);
  assert.equal(lerUltimoHabito(ap), 'contato');
  gravarUltimoHabito(null, ap);
  assert.equal(lerUltimoHabito(ap), null);
  assert.equal(ap._dentro.has(CHAVE_ULTIMO_HABITO), false, 'a chave ficou no aparelho com valor velho');
});

test('memória com lixo não abre um hábito que não existe', () => {
  const ap = aparelho();
  ap.setItem(CHAVE_ULTIMO_HABITO, 'habito-que-nao-existe');
  assert.equal(lerUltimoHabito(ap), null);
  assert.equal(habitoDeEntrada({ doAparelho: lerUltimoHabito(ap) }), null);
});

test('aparelho sem storage não derruba a tela', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); }, removeItem() { throw new Error('bloqueado'); } };
  assert.equal(lerUltimoHabito(quebrado), null);
  assert.equal(gravarUltimoHabito('sonho', quebrado), 'sonho');
});

test('🔄 o desenho do ciclo fecha o círculo', () => {
  // era a coisa que a tela antiga nunca dizia: as pessoas viam oito portas
  // soltas e o X-Game como um placar à parte
  assert.equal(CICLO_DO_XGAME.length, 6);
  assert.equal(proximoPassoDoCiclo('volta').id, 'sonho', 'o último passo tem que voltar ao primeiro');
  assert.equal(proximoPassoDoCiclo('xpto'), null);
  for (const p of CICLO_DO_XGAME) {
    assert.ok(p.titulo && p.texto && p.ondeMora, `o passo ${p.id} está incompleto`);
  }
});

test('🔴 o nome do hábito não pode aparecer cortado na porta', () => {
  // medido na banca: com `truncate` saía "Acompanha…" e "dos 8 Hábitos do …";
  // com o ícone ao lado, "Acompanhamento" quebrava no meio ("Acompanhame /
  // nto"). O ícone subiu pra cima e o nome ficou com o cartão inteiro.
  const i = PORTAS.indexOf('{nome}');
  assert.ok(i > 0, 'sumiu o nome do hábito da porta');
  const linhaDoNome = PORTAS.slice(PORTAS.lastIndexOf('<span', i), i);
  assert.ok(!linhaDoNome.includes('truncate'), 'o nome do hábito voltou a ser cortado com reticências');
  assert.ok(linhaDoNome.includes('break-words'), 'sem break-words, um nome maior escapa do cartão');
  // o ícone tem que estar ACIMA do texto, não ao lado: é o que libera a largura
  assert.ok(PORTAS.indexOf('<Icone') < PORTAS.indexOf("{String(n).padStart(2, '0')}"), 'o ícone voltou pro lado do texto');
  assert.ok(!/flex items-start gap-3/.test(PORTAS), 'voltou o arranjo lado-a-lado que espremia o nome');
});

test('a barra do hábito tem três coisas, e só três', () => {
  // um quarto elemento aqui seria recriar, em miniatura, o problema que esta
  // tela veio resolver
  for (const marca of ['voltar-aos-habitos', 'habito-anterior', 'habito-proximo']) {
    assert.ok(BARRA.includes(`data-teste="${marca}"`), `sumiu ${marca}`);
  }
  assert.equal((BARRA.match(/<button/g) || []).length, 3, 'a barra ganhou (ou perdeu) botão');
  assert.match(BARRA, /\{String\(numero\)\.padStart\(2, '0'\)\} \/ \{String\(total\)\.padStart\(2, '0'\)\}/,
    'sumiu o "03 / 08" — é ele que diz que existem oito, agora que as outras sete saíram da tela');
});
