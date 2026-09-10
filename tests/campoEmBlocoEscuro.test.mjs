// 🌑 CAMPO BRANCO DENTRO DE BLOCO ESCURO (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTE TESTE EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Dono, com print, na fila de comprovações: "o filtro está com fundo branco".
//
// A causa não era o filtro. É a regra de tema claro do painel
// (`body[data-painel-nav] main input/textarea/select`), que pinta TODO campo
// de branco dentro da main — com `!important`, então nenhuma classe do
// componente ganha dela. Quem mora num bloco escuro nasce branco.
//
// A casa já tinha a saída de emergência (`.nz-escuro`), só que ela cobria
// apenas `input`. `select` e `textarea` continuavam brancos.
//
// 🔴 E `select` escuro exige DUAS coisas, não uma — lição que já custou dois
// consertos (#273 e a lista da votação MvM): a caixinha fica escura, mas a
// LISTA que abre é desenhada pelo sistema operacional. Sem fundo opaco nas
// <option> ela cai no branco padrão e o texto branco some. `color-scheme`
// resolve no Chrome/Edge do Mac; o fundo nas <option> resolve no Windows e no
// Linux, que ignoram a dica. Só uma das duas conserta em metade das máquinas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const CSS = ler('../src/index.css');

// O bloco da saída de emergência, isolado: da regra que a explica até o fim
// das regras de <option>. Comparar contra o arquivo inteiro casaria com as
// regras do `.xeos-palco`, que são outras.
const trecho = (de, ate) => {
  const i = CSS.indexOf(de);
  assert.ok(i > 0, `sumiu do index.css: ${de}`);
  const f = CSS.indexOf(ate, i);
  assert.ok(f > i, `sumiu do index.css: ${ate}`);
  return CSS.slice(i, f + ate.length);
};
const SAIDA = trecho('body[data-painel-nav] main .nz-escuro input', 'optgroup { background-color: #1F2937 !important; color: #F4F4F4 !important; }');

test('🔴 a regra que causa o problema continua lá — é a premissa de tudo', () => {
  // Se um dia ela sumir, o `.nz-escuro` vira ruído e este teste é o aviso.
  assert.match(CSS, /body\[data-painel-nav\] main input,[\s\S]{0,120}background-color: #FFFFFF !important/,
    'a regra de tema claro mudou — reveja se o .nz-escuro ainda é necessário');
});

// A DECLARAÇÃO de fundo, isolada — do primeiro seletor até a chave que fecha.
// ⚠️ Conferir os três campos no bloco inteiro NÃO servia: as regras de
// `color-scheme` e de `option` logo abaixo também citam `.nz-escuro select`,
// e a assertiva passava verde mesmo com o select fora do fundo escuro. Foi
// uma mutação que sobreviveu que mostrou isso.
const REGRA_FUNDO = (() => {
  const i = CSS.indexOf('body[data-painel-nav] main .nz-escuro input,');
  assert.ok(i > 0, 'sumiu a saída de emergência do painel-nav');
  return CSS.slice(i, CSS.indexOf('}', i) + 1);
})();

test('🔴 a saída de emergência cobre os TRÊS tipos de campo', () => {
  assert.match(REGRA_FUNDO, /background-color: #1f2937 !important/, 'premissa: é esta a regra que devolve o fundo escuro');
  ['input', 'textarea', 'select'].forEach((campo) => {
    assert.match(REGRA_FUNDO, new RegExp(`\\.nz-escuro ${campo}[,\\s]`),
      `${campo} ficou de fora do fundo escuro — ele nasce branco dentro de bloco escuro`);
  });
});

test('🔴 e o select escuro leva as DUAS defesas da lista, não uma', () => {
  assert.match(SAIDA, /color-scheme: dark/, 'sem color-scheme: a lista abre branca no Chrome/Edge do Mac');
  assert.match(SAIDA, /option[\s\S]{0,160}background-color: #1F2937 !important/, 'sem fundo nas <option>: a lista abre branca no Windows e no Linux');
  assert.match(SAIDA, /optgroup/, 'o optgroup ficou de fora e volta a abrir branco');
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔴 A SEGUNDA VOLTA, NO MESMO DIA
// ═══════════════════════════════════════════════════════════════════════════
// Horas depois do conserto acima, o dono mandou print da tela do LAUDO: o menu
// de escolher a pessoa abria com a lista branca e a letra branca.
//
// A causa fui eu. Eu tinha escrito no index.css que "select escuro exige as
// DUAS defesas" e então prendi a regra a `.nz-painel` e `body[data-painel-nav]`
// — e a Licensing, onde o laudo mora, NÃO TEM nenhum dos dois. Consertei onde
// tinha sido reclamado e deixei a classe do problema de pé.
//
// Terceira volta do mesmo bug (#273, a votação MvM, o laudo) e segunda vez que
// ele sobrevive por "consertou aqui". Estes testes trancam as duas pontas.

test('🔴 A DEFESA DA LISTA VALE SEM CONTEXTO — em QUALQUER bloco escuro', () => {
  // O teste que faltava. Enquanto a regra exigia `.nz-painel` ou
  // `data-painel-nav` pra valer, ela não alcançava a tela do laudo — e nada
  // acusava, porque o teste antigo só olhava o bloco onde ela já existia.
  const solta = (re) => {
    const linhas = CSS.split('\n').filter((l) => re.test(l));
    return linhas.some((l) => !/nz-painel|data-painel-nav/.test(l));
  };
  assert.ok(solta(/^\.nz-escuro select \{[^}]*color-scheme: dark/),
    'o color-scheme voltou a depender de contexto — a lista abre branca fora do painel-nav');
  assert.ok(solta(/^\.nz-escuro select option/),
    'o fundo das <option> voltou a depender de contexto — branco no branco fora do painel-nav');
});

test('⚠️ e a defesa cobre option E optgroup, sem contexto', () => {
  // ⚠️ A âncora precisa da quebra de linha: sem ela, `indexOf` casa com o
  // `.nz-escuro select {` que está DENTRO de
  // `body[data-painel-nav] main .nz-escuro select { … }`, algumas linhas
  // acima — e o teste passa a medir a regra errada. Foi o que aconteceu na
  // primeira execução: o CSS estava certo e o teste é que pescava errado.
  const i = CSS.indexOf('\n.nz-escuro select {');
  assert.ok(i > 0, 'a regra solta (sem contexto) do select escuro sumiu');
  const bloco = CSS.slice(i, i + 260);
  assert.match(bloco, /optgroup/, 'o optgroup ficou de fora e volta a abrir branco');
  assert.match(bloco, /#1F2937/, 'sumiu o fundo escuro das opções');
  assert.match(bloco, /#F4F4F4/, 'sumiu a cor do texto das opções');
});

test('🔴 CINTO E SUSPENSÓRIO: os três selects carregam a classe da casa', () => {
  // `lista-escura` (index.css) já existia e 6 selects do app a usavam. Os
  // selects novos do laudo e da fila nasceram sem ela. Ter as duas defesas
  // significa que remover o `nz-escuro` do container um dia não traz o bug
  // de volta — e vice-versa.
  const laudo = ler('../src/components/licensing/CentralVendas/PainelLaudo.jsx');
  const pessoa = /data-teste="laudo-pessoa"/;
  const dia = /data-teste="laudo-dia"/;
  assert.match(laudo, pessoa, 'premissa: o menu de pessoa existe');
  assert.match(laudo, dia, 'premissa: o menu de dia existe');
  (laudo.match(/<select[\s\S]{0,400}?data-teste="laudo-(pessoa|dia)"/g) || []).forEach((bloco) => {
    assert.match(bloco, /lista-escura/, `select do laudo sem lista-escura: ${bloco.slice(0, 60)}`);
  });
  const fila = ler('../src/components/licensing/CentralVendas/Comprovacoes.jsx');
  const filtro = (fila.match(/<select[\s\S]{0,400}?data-teste="comprovacoes-filtro-data"/g) || [])[0];
  assert.ok(filtro, 'premissa: o filtro de data da fila existe');
  assert.match(filtro, /lista-escura/, 'o filtro de data da fila perdeu a lista-escura');
});

test('⚠️ a classe da casa continua fazendo as duas coisas', () => {
  // Se alguém esvaziar `lista-escura`, o cinto arrebenta em silêncio e só
  // sobra o suspensório.
  // ⚠️ Os seletores são exigidos POR INTEIRO. Antes eu fatiava a partir de
  // `indexOf('select.lista-escura')` e conferia se `#1F2937` aparecia por
  // perto — e uma mutação que renomeava a regra para `select.lista-escuraX`
  // passava verde, porque o nome antigo continuava sendo prefixo do novo e a
  // cor continuava logo abaixo. O teste media vizinhança, não o alvo.
  assert.match(CSS, /select\.lista-escura \{[^}]*color-scheme: dark/, 'lista-escura parou de declarar color-scheme');
  assert.match(CSS, /select\.lista-escura option,\s*\n\s*select\.lista-escura optgroup \{[^}]*#1F2937/,
    'lista-escura parou de pintar as opções (ou o seletor foi renomeado)');
});

test('⚠️ o placeholder também precisa voltar a ser legível', () => {
  // Sem isto ele herda a cor de tinta escura do tema claro e some no escuro.
  // Os DOIS contextos, porque são duas regras diferentes e cada uma vale numa
  // parte do app: conferir só uma deixava a outra apagar sem ninguém ver.
  assert.match(CSS, /\.nz-painel \.nz-escuro input::placeholder/, 'o placeholder some no bloco escuro do .nz-painel');
  assert.match(CSS, /body\[data-painel-nav\] main \.nz-escuro input::placeholder/, 'o placeholder some no bloco escuro do painel-nav');
});

test('🔴 os dois painéis do laudo se declaram blocos escuros', () => {
  // A regra existe; o que faz ela valer é a marca no componente.
  const fila = ler('../src/components/licensing/CentralVendas/Comprovacoes.jsx');
  assert.match(fila, /className="nz-escuro space-y-2"/, 'a fila de comprovações perdeu a marca — a busca volta a nascer branca');
  const laudo = ler('../src/components/licensing/CentralVendas/PainelLaudo.jsx');
  assert.match(laudo, /className="nz-escuro /, 'a tela só-laudo perdeu a marca — os dois menus voltam a nascer brancos');
});
