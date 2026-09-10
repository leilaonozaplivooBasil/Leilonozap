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
