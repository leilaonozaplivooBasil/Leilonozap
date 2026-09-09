// 🪙 DIR-113 (09/09/2026) — dono: "tem que aparecer quanto pesou na moeda...
// deixar até o desenho da moeda, com fatia de pizza, e a cor de acordo com
// cada fatia — bronze, prata, até o diamante." Este arquivo prova a conta
// PURA por trás do desenho: cada fatia é o valor real que `tokenDoCiclo()`
// já calcula (nunca reinventado aqui), e a marca de liga cai exatamente onde
// LIGAS diz que ela cai.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fatiasDaMoeda, marcasDeLiga, ORDEM_COMPONENTES, COMPONENTE_INFO } from '../src/lib/moedaPizza.js';
import { TOKEN_MAX, LIGAS, tokenDoCiclo, pesosDoPerfil, MVM_MAX } from '../src/lib/xgame.js';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');

test('fatiasDaMoeda: a soma das fatias + o que falta sempre fecha o TOKEN_MAX', () => {
  const componentes = { mvm: 7.58, producao: 1.2, realtime: 3.0, bonus: 4.0, vendas: 1.0 };
  const { fatias, conquistado, restante, max } = fatiasDaMoeda(componentes, TOKEN_MAX);
  const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
  assert.equal(Math.round((somaFatias) * 100) / 100, Math.round(conquistado * 100) / 100);
  assert.equal(Math.round((conquistado + restante) * 100) / 100, max);
});

test('fatiasDaMoeda: cada fatia sabe seu início e fim no anel, em sequência sem sobreposição', () => {
  const componentes = { mvm: 5, producao: 1, realtime: 2, bonus: 3, vendas: 0.5 };
  const { fatias } = fatiasDaMoeda(componentes, TOKEN_MAX);
  for (let i = 1; i < fatias.length; i++) {
    assert.equal(fatias[i].inicio, fatias[i - 1].fim, `a fatia "${fatias[i].k}" tem que começar exatamente onde a anterior terminou`);
  }
  assert.equal(fatias[0].inicio, 0);
});

test('fatiasDaMoeda: o MvM é sempre PROPORCIONAL à própria média da votação — a fatia dele não pode distorcer isso', () => {
  // 🗳️ dono: "o MvM só é a média do valor mental, a média da votação, só
  // isso." Prova via a MESMA conta oficial (tokenDoCiclo): o componente do
  // MvM tem que sair numericamente igual a `pesos.mvm * (votação / MVM_MAX)`
  // — nunca outro fator (real time, tarefa atrasada) disfarçado de MvM.
  //
  // 🏆 DIR-115 — antes da repesagem, `pesos.mvm` era sempre MVM_MAX (10), e
  // a fatia batia 1:1 com a nota crua. Depois, o perfil 'estrategico' tem
  // `pesos.mvm = 6,67` (o MvM virou PORTÃO, não a maior fatia) — a fatia
  // ainda é proporcional, só que na escala do peso, não mais 1:1. Só o
  // perfil 'comercial' manteve o peso cheio, então SÓ ele ainda bate 1:1.
  const mediaVotacao = 7.58;
  const rEstrategico = tokenDoCiclo({ diasCiclo: [], hojeResumo: {}, mvmVotacao: mediaVotacao, perfil: 'estrategico', vendasReais: 0 });
  const pesoMvmEstrategico = pesosDoPerfil('estrategico').mvm;
  const esperadoEstrategico = Math.round((pesoMvmEstrategico * (mediaVotacao / MVM_MAX)) * 100) / 100;
  assert.equal(rEstrategico.componentes.mvm, esperadoEstrategico, 'a fatia do MvM tem que ser exatamente peso × (votação / MVM_MAX), nunca a nota crua sem escala');
  const { fatias } = fatiasDaMoeda(rEstrategico.componentes, TOKEN_MAX);
  const fatiaMvm = fatias.find((f) => f.k === 'mvm');
  assert.equal(fatiaMvm.valor, esperadoEstrategico);

  const rComercial = tokenDoCiclo({ diasCiclo: [], hojeResumo: {}, mvmVotacao: mediaVotacao, perfil: 'comercial', vendasReais: 0 });
  assert.equal(pesosDoPerfil('comercial').mvm, MVM_MAX, 'só o comercial manteve o peso cheio do MvM — fora da repesagem DIR-115');
  assert.equal(rComercial.componentes.mvm, mediaVotacao, 'com peso = MVM_MAX, a fatia AINDA bate 1:1 com a nota crua da votação');
});

test('fatiasDaMoeda: sem nenhum componente, tudo fica "restante" (cinza) — nunca quebra', () => {
  const { fatias, conquistado, restante } = fatiasDaMoeda({}, TOKEN_MAX);
  assert.ok(fatias.every((f) => f.valor === 0));
  assert.equal(conquistado, 0);
  assert.equal(restante, TOKEN_MAX);
});

test('fatiasDaMoeda: token acima do teto (bug em outro lugar) não estoura o desenho — trava em 100% conquistado', () => {
  const { conquistado, restante } = fatiasDaMoeda({ mvm: 999 }, TOKEN_MAX);
  assert.equal(conquistado, TOKEN_MAX);
  assert.equal(restante, 0);
});

// 🐛 09/09/2026 — achado na auditoria: o teste acima só provava
// `conquistado`/`restante` — nunca `fatia.inicio`/`fatia.fim`, que são os
// números que MoedaPizza.jsx usa DE VERDADE pra desenhar (strokeDasharray/
// strokeDashoffset). Antes da correção, um componente gigante (aqui, MvM
// sozinho passando do teto) fazia toda fatia SEGUINTE nascer e terminar
// além de TOKEN_MAX — no desenho, isso é uma fatia além de 360°,
// sobrepondo cores no início do círculo.
test('fatiasDaMoeda: nenhuma fatia (inicio/fim) passa do teto, mesmo com um componente sozinho estourando', () => {
  const { fatias } = fatiasDaMoeda({ mvm: 999, producao: 5, realtime: 5, bonus: 5, vendas: 5 }, TOKEN_MAX);
  for (const f of fatias) {
    assert.ok(f.inicio <= TOKEN_MAX, `${f.k}.inicio (${f.inicio}) não pode passar do teto`);
    assert.ok(f.fim <= TOKEN_MAX, `${f.k}.fim (${f.fim}) não pode passar do teto`);
    assert.ok(f.fim >= f.inicio, `${f.k}: fim tem que vir depois (ou igual) do início`);
  }
  // as fatias que vêm DEPOIS do estouro (producao em diante) ficam
  // "achatadas" no próprio teto — nascem e terminam no mesmo ponto, não
  // desenham porção nenhuma do anel.
  const producao = fatias.find((f) => f.k === 'producao');
  assert.equal(producao.inicio, TOKEN_MAX);
  assert.equal(producao.fim, TOKEN_MAX);
});

test('ORDEM_COMPONENTES/COMPONENTE_INFO: todo componente do Human Token tem cor e rótulo — nenhuma fatia muda sozinha', () => {
  for (const k of ORDEM_COMPONENTES) {
    assert.ok(COMPONENTE_INFO[k], `falta a info visual do componente "${k}"`);
    assert.match(COMPONENTE_INFO[k].cor, /^#[0-9A-Fa-f]{6}$/, `a cor de "${k}" precisa ser um hex válido`);
  }
  // as 5 cores são todas diferentes — senão duas fatias ficam indistinguíveis
  const cores = ORDEM_COMPONENTES.map((k) => COMPONENTE_INFO[k].cor);
  assert.equal(new Set(cores).size, cores.length, 'duas fatias com a mesma cor confundem mais do que ajudam');
});

test('marcasDeLiga: bronze/prata/ouro/platina caem exatamente nos limiares oficiais de LIGAS (DIR-115)', () => {
  const marcas = marcasDeLiga(LIGAS, TOKEN_MAX);
  const porId = Object.fromEntries(marcas.map((m) => [m.id, m]));
  assert.equal(porId.prata.posicao, 6.66 / TOKEN_MAX);
  assert.equal(porId.ouro.posicao, 12.22 / TOKEN_MAX);
  assert.equal(porId.platina.posicao, 17.78 / TOKEN_MAX);
  // bronze começa em 0 — não é uma "marca de corte" no anel, é o próprio início
  assert.ok(!porId.bronze, 'bronze (min 0) não é uma marca de corte — é de onde o anel começa');
});

test('marcasDeLiga: cada marca vem em ordem crescente de posição no anel', () => {
  const marcas = marcasDeLiga(LIGAS, TOKEN_MAX);
  for (let i = 1; i < marcas.length; i++) {
    assert.ok(marcas[i].posicao > marcas[i - 1].posicao);
  }
});

test('CrmMetodo.jsx: a moeda em fatias usa OS MESMOS dados já calculados do ciclo — nada reinventado na tela', () => {
  assert.match(METODO, /import MoedaPizza from '@\/components\/licensing\/CentralVendas\/MoedaPizza'/);
  assert.match(
    METODO,
    /<MoedaPizza componentes=\{ciclo\.componentes\} total=\{ciclo\.total\} max=\{TOKEN_MAX\} liga=\{ciclo\.liga\}/,
    // 🎖️ DIR-115 — `ciclo.liga` já sai de `ligaComPortoesDoCiclo` (calculada
    // uma vez no useMemo do ciclo, com os portões de caráter/vendas) —
    // recalcular `ligaDoToken(ciclo.total)` aqui de novo ignoraria os portões.
    'a tela não pode calcular a liga de novo (e sem portão) — só repassar ciclo.liga, já gated',
  );
});

test('XGameVisaoExecutiva.jsx: "sua posição" também desenha a moeda, com os componentes já calculados no ranking', () => {
  const EXECUTIVA = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/XGameVisaoExecutiva.jsx', import.meta.url), 'utf8');
  assert.match(EXECUTIVA, /import MoedaPizza from '\.\/MoedaPizza'/);
  assert.match(EXECUTIVA, /const \{ total: tokenBruto, componentes, vendasFeitas \} = tokenDoCiclo\(/, 'precisa guardar os componentes E vendasFeitas retornados por tokenDoCiclo, não só o total');
  assert.match(EXECUTIVA, /componentes,\s*\n\s*mvm: mvmDoVoto,\s*\n\s*vendasFeitas,/, 'os componentes e vendasFeitas têm que sobreviver no objeto da linha (não descartados) — vendasFeitas alimenta o portão da Platina');
  assert.match(
    EXECUTIVA,
    /<MoedaPizza componentes=\{meuLinha\.componentes\} total=\{meuLinha\.token\} max=\{TOKEN_MAX\} liga=\{ligaComPortoesDoCiclo\(meuLinha\.token, \{ mvmVotacao: meuLinha\.mvm, vendasFeitas: meuLinha\.vendasFeitas \}\)\}/,
    // 🎖️ DIR-115 — a liga da própria pessoa também respeita os portões de
    // caráter/vendas: sem isso, "sua posição" podia mostrar Platina que a
    // liga oficial (ranking/tabela) já nega pelos mesmos portões.
    'a Visão Executiva não pode calcular a liga sem portão — precisa de ligaComPortoesDoCiclo, não ligaDoToken cru',
  );
});

// 🪙 09/09/2026 — dono, vendo a página renderizada: "você duplicou duas
// vezes a moeda." A moeda em pages/XGame.jsx (DIR-113.2) e a de
// XGameVisaoExecutiva (embutida na MESMA página, seção "Sua posição no
// ciclo") mostravam os MESMOS ciclo.componentes da MESMA pessoa duas vezes
// na mesma tela. A direta saiu — só a da XGameVisaoExecutiva embutida fica.
test('pages/XGame.jsx: NÃO desenha a moeda diretamente — só a XGameVisaoExecutiva embutida, pra não duplicar', () => {
  const XGAME = fs.readFileSync(new URL('../src/pages/XGame.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(
    XGAME,
    /import MoedaPizza from/,
    'a página não pode mais importar MoedaPizza diretamente — isso é o que causava a moeda duplicada que o dono reportou',
  );
  assert.match(XGAME, /import XGameVisaoExecutiva from/, 'a moeda "sua posição" continua vindo de dentro da XGameVisaoExecutiva embutida na página');
});

// 🩹 DIR-113.2 — dono, direto: "se o MVM dele é sete, vai aparecer sete, não
// sete ponto setenta e cinco e nove em cima." O card "MvM do Dia" mostrava
// GRANDE o número AUTOMÁTICO (mvm_dia) e escondia pequeno o da votação — o
// único que conta pra moeda. Prova de que o número grande agora É o oficial,
// nas DUAS telas que têm esse card (CrmMetodo e a página /XGame).
test('CrmMetodo.jsx e pages/XGame.jsx: o card de MvM mostra GRANDE o oficial (votação), não o automático', () => {
  const XGAME = fs.readFileSync(new URL('../src/pages/XGame.jsx', import.meta.url), 'utf8');
  assert.match(METODO, /MvM \(oficial\) ⓘ/, 'CrmMetodo.jsx: o título do card precisa deixar claro que este é o oficial');
  assert.match(METODO, /\{recebido\.media !== null \? fmtToken\(recebido\.media\) : '—'\}/, 'CrmMetodo.jsx: o número GRANDE tem que ser a votação (recebido.media), não xgame.mvm_dia');
  assert.match(XGAME, /titulo="MvM \(oficial\)" valor=\{recebido\.media !== null \? fmt2\(recebido\.media\) : '—'\}/, 'pages/XGame.jsx: o número GRANDE tem que ser a votação (recebido.media), não resumo.mvm_dia');
});

// 🩹 DIR-113.1 — a trava (TRAVA_SEM_DIAMANTE/TRAVA_SEM_ESTUDO, xgame.js) pode
// segurar o TOTAL exibido abaixo da soma crua dos componentes (a pessoa fez
// por merecer mais, mas uma trava prende o número). Sem isso, o desenho
// mostraria fatias somando mais do que o número no centro da moeda.
test('fatiasDaMoeda: com um total já TRAVADO (abaixo da soma crua), as fatias truncam no mesmo lugar — nunca discordam do número central', () => {
  const componentesSemTrava = { mvm: 10, producao: 1.5, realtime: 3.67, bonus: 5.55, vendas: 1.5 }; // soma 22.22
  const totalTravado = 17.77; // TRAVA_SEM_ESTUDO
  const { fatias, conquistado, restante } = fatiasDaMoeda(componentesSemTrava, TOKEN_MAX, totalTravado);
  const somaFatias = fatias.reduce((s, f) => s + f.valor, 0);
  assert.equal(Math.round(somaFatias * 100) / 100, totalTravado, 'as fatias não podem somar mais do que o total travado');
  assert.equal(Math.round(conquistado * 100) / 100, totalTravado);
  assert.equal(Math.round((conquistado + restante) * 100) / 100, TOKEN_MAX);
  // mvm(10) + producao(1.5) + realtime(3.67) = 15.17 cabem inteiros; bônus
  // (5.55) só cabe até completar 17.77 (mais 2.6) — o resto dele, e vendas
  // inteiro, ficam de fora (é exatamente esse "de fora" que a trava segura)
  const porK = Object.fromEntries(fatias.map((f) => [f.k, f.valor]));
  assert.equal(porK.mvm, 10);
  assert.equal(porK.producao, 1.5);
  assert.equal(porK.realtime, 3.67);
  assert.equal(Math.round(porK.bonus * 100) / 100, 2.6);
  assert.equal(porK.vendas, 0);
});

test('fatiasDaMoeda: sem passar totalConquistado, continua somando cru (compatível com quem já chamava sem o 3º argumento)', () => {
  const componentes = { mvm: 5, producao: 1, realtime: 2, bonus: 3, vendas: 0.5 };
  const { conquistado } = fatiasDaMoeda(componentes, TOKEN_MAX);
  assert.equal(conquistado, 11.5);
});

