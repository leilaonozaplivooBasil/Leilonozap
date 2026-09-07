// 🎓 O GUIA DO X-GAME como página da plataforma (07/09/2026).
//
// O guia da versão anterior tinha "17,77" e "400 caracteres" escritos à mão.
// Material de aula errado ensina errado com autoridade — e ninguém revisa um
// guia quando muda uma constante. Aqui os números vêm de xgame.js, e é isso
// que estes testes seguram.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  AULAS, PERGUNTAS, DICIONARIO, HABITOS, CORES_DA_TAREFA, FAIXAS,
  ENDERECOS, COTACAO_DIA_1, COTACAO_ULTIMO, progressoDasAulas,
} from '../src/lib/guiaXGame.js';
import { RESUMO_MIN, TRAVA_SEM_ESTUDO, CICLO_DIAS_UTEIS, FAIXAS_TOKEN, cotacaoDoDia } from '../src/lib/xgame.js';

const TELA = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/GuiaXGame.jsx', import.meta.url), 'utf8');
const ABAS = fs.readFileSync(new URL('../src/lib/licensingTabs.js', import.meta.url), 'utf8');
const PAGINA = fs.readFileSync(new URL('../src/pages/Licensing.jsx', import.meta.url), 'utf8');

const texto = JSON.stringify({ AULAS, PERGUNTAS, DICIONARIO });
const LETRAS_NA_TELA = TELA.match(/\{ id: '[pmg]', rotulo: 'A'/g) || [];
const br = (n) => Number(n).toFixed(2).replace('.', ',');

// ── conteúdo íntegro ─────────────────────────────────────────────────
test('as 8 aulas existem, numeradas e sem id repetido', () => {
  assert.equal(AULAS.length, 8);
  assert.deepEqual(AULAS.map((a) => a.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(AULAS.map((a) => a.id)).size, 8);
});

test('toda aula tem título e resumo — nenhuma casca vazia', () => {
  for (const a of AULAS) {
    assert.ok(a.titulo?.trim(), `aula ${a.n} sem título`);
    assert.ok(a.resumo?.trim(), `aula ${a.n} sem resumo`);
  }
});

test('toda aula tem conteúdo de verdade além do resumo', () => {
  for (const a of AULAS) {
    const tem = a.passos?.length || a.caixas?.length || a.numeros?.length || a.checklist?.length || a.habitos || a.cores;
    assert.ok(tem, `aula ${a.n} ("${a.titulo}") não tem nada dentro`);
  }
});

test('os 8 hábitos estão completos e o Hábito 2 é o destacado', () => {
  assert.equal(HABITOS.length, 8);
  assert.deepEqual(HABITOS.filter((h) => h.destaque).map((h) => h.n), [2]);
  for (const h of HABITOS) assert.ok(h.nome && h.frase, `hábito ${h.n} incompleto`);
});

test('as quatro cores da tarefa estão lá, cada uma explicada', () => {
  assert.deepEqual(CORES_DA_TAREFA.map((c) => c.rotulo), ['AGORA', 'FEITO', 'ATRASADO', 'PERDIDO']);
  for (const c of CORES_DA_TAREFA) assert.ok(c.o_que_e && /^#[0-9a-f]{6}$/i.test(c.cor));
});

test('perguntas e dicionário têm par completo', () => {
  assert.ok(PERGUNTAS.length >= 8);
  for (const q of PERGUNTAS) assert.ok(q.p?.trim() && q.r?.trim());
  for (const d of DICIONARIO) assert.ok(d.palavra?.trim() && d.significa?.trim());
});

// ── os números vêm da fonte, não da memória ──────────────────────────
test('as faixas da moeda saem de FAIXAS_TOKEN, com o intervalo calculado', () => {
  assert.equal(FAIXAS.length, FAIXAS_TOKEN.length);
  assert.deepEqual(FAIXAS.map((f) => f.label), ['BRONZE', 'PRATA', 'OURO']);
  assert.equal(FAIXAS.find((f) => f.id === 'prata').intervalo, '6,66 a 17,77');
  assert.equal(FAIXAS.find((f) => f.id === 'ouro').intervalo, '17,78 ou mais');
});

test('a cotação das pontas vem de cotacaoDoDia, não de um número solto', () => {
  assert.equal(COTACAO_DIA_1, cotacaoDoDia(1));
  assert.equal(COTACAO_ULTIMO, cotacaoDoDia(CICLO_DIAS_UTEIS));
});

test('o guia repete os valores certos do X-GAME', () => {
  assert.ok(texto.includes(String(RESUMO_MIN)), 'o mínimo do resumo');
  assert.ok(texto.includes(br(TRAVA_SEM_ESTUDO)), 'a trava do estudo');
  assert.ok(texto.includes(String(CICLO_DIAS_UTEIS)), 'o tamanho do ciclo');
});

test('nenhum número do X-GAME está chumbado no arquivo do guia', () => {
  const fonte = fs.readFileSync(new URL('../src/lib/guiaXGame.js', import.meta.url), 'utf8');
  const corpo = fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/^import[\s\S]*?from '\.\/xgame\.js';/m, '');
  for (const proibido of ['17,77', '22,22', '12,22', '0,80', '1,00']) {
    assert.ok(!corpo.includes(proibido), `"${proibido}" chumbado — tem que vir da constante`);
  }
  assert.ok(!/\b400\b/.test(corpo), '400 chumbado — tem que vir de RESUMO_MIN');
});

test('a aula da comprovação explica que o mínimo é MÍNIMO — o caso do Paim', () => {
  const aula = AULAS.find((a) => a.id === 'comprovar');
  const tudo = JSON.stringify(aula);
  assert.ok(tudo.includes('mínimo, não o limite'), 'não explica que 400 é piso, não teto');
  assert.ok(PERGUNTAS.some((q) => /não acende/i.test(q.p)), 'falta a pergunta do botão que não acende');
});

// ── progresso ────────────────────────────────────────────────────────
test('progressoDasAulas conta só o que existe e ignora id inventado', () => {
  assert.deepEqual(progressoDasAulas([]), { feitas: 0, total: 8, pct: 0 });
  assert.deepEqual(progressoDasAulas(AULAS.map((a) => a.id)), { feitas: 8, total: 8, pct: 100 });
  assert.equal(progressoDasAulas(['entrar', 'nao-existe']).feitas, 1);
  assert.equal(progressoDasAulas(['entrar', 'habitos']).pct, 25);
});

// ── a página existe de verdade ───────────────────────────────────────
test('a seção "Como jogar" está registrada na Top College e ligada na tela', () => {
  assert.match(ABAS, /value: 'catalogo-guia', label: 'Como jogar'/);
  assert.match(PAGINA, /'catalogo-guia'/);
  assert.match(PAGINA, /<GuiaXGame currentUser=\{user\} \/>/);
  assert.match(PAGINA, /import GuiaXGame from/);
});

test('o Tira Dúvidas fica no HERO, antes das aulas', () => {
  const posDuvidas = TELA.indexOf('<TiraDuvidas');
  const posAulas = TELA.indexOf('{AULAS.map(');
  assert.ok(posDuvidas > 0 && posAulas > 0, 'faltou uma das duas peças');
  assert.ok(posDuvidas < posAulas, 'o campo de perguntar ficou depois do guia — quem travou tem que procurar');
});

test('o tamanho da letra é botão à vista e fica salvo no aparelho', () => {
  assert.match(TELA, /data-teste=\{`letra-\$\{l\.id\}`\}/);
  assert.equal(LETRAS_NA_TELA.length, 3, 'as três opções de tamanho de letra');
  assert.match(TELA, /gravar\(CHAVE_LETRA, letra\)/);
});

test('uma aula aberta por vez — nada de paredão de texto', () => {
  assert.match(TELA, /aberta=\{aberta === a\.id\}/);
  assert.match(TELA, /onAbrir\(aberta \? null : aula\.id\)/);
});

test('o guia NÃO vira tarefa do Método — ordem explícita do dono', () => {
  assert.ok(!/metodo_tarefas|xgame_diario|criarTarefa|gerarJornada/i.test(TELA), 'a tela do guia está escrevendo no Método');
  assert.ok(!/pontos|Human Token do dia/i.test(TELA.replace(/\/\*[\s\S]*?\*\//g, '')), 'o guia está tentando pontuar alguém');
});
