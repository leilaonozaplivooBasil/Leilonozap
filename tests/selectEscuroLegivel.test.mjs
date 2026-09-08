// 🕶️ A lista do <select> escuro abria branca com letra branca (08/09/2026).
//
// Reportado pelo Paim no "Encaminhar para Vendedor" do CRM. A caixinha é
// pintada pela página; a LISTA que abre é desenhada pelo sistema, e no Chrome
// do Windows vem clara — com as opções herdando o `text-white` do select.
//
// Estes testes seguram duas coisas: que a regra existe e cobre os fundos
// escuros que a marcação usa hoje, e que ela NÃO vaza para os selects claros.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CSS = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

/** Todo .jsx de src/, recursivo. */
function arquivos(dir, achados = []) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivos(caminho, achados);
    else if (nome.endsWith('.jsx')) achados.push(caminho);
  }
  return achados;
}

const SRC = new URL('../src/', import.meta.url).pathname;
const marcacao = arquivos(SRC).map((f) => readFileSync(f, 'utf8')).join('\n');

test('a regra existe e usa color-scheme, que é o que conserta o controle nativo', () => {
  assert.match(CSS, /color-scheme:\s*dark/);
  assert.match(CSS, /select\.bg-gray-700/);
});

test('há cor explícita de fundo E de texto na option — a rede de segurança', () => {
  const i = CSS.indexOf('select.bg-gray-700 option');
  assert.ok(i > 0, 'sumiu a regra da option');
  const bloco = CSS.slice(i, i + 700);
  assert.match(bloco, /background-color:\s*#[0-9a-f]{6}/i, 'sem fundo, a lista volta a ser branca');
  assert.match(bloco, /color:\s*#[0-9a-f]{6}/i, 'sem cor de texto, a letra volta a sumir');
});

test('TODO fundo escuro usado nos selects do app está coberto', () => {
  // pega o fundo declarado em cada <select ...> da marcação
  const fundos = new Set();
  for (const m of marcacao.matchAll(/<select[\s\S]{0,400}?>/g)) {
    for (const c of m[0].matchAll(/bg-(gray|slate|zinc|neutral)-(700|800|900|950)(\/\d+)?/g)) {
      fundos.add(c[0]);
    }
  }
  assert.ok(fundos.size > 0, 'não achei select escuro nenhum — o teste perdeu o alvo');
  for (const fundo of fundos) {
    const base = fundo.split('/')[0];
    assert.ok(
      CSS.includes(`select.${base}`) || CSS.includes(`select[class*="${base}`),
      `o fundo ${fundo} é usado num select e ficou de fora da regra — a lista dele abre ilegível`,
    );
  }
});

test('a regra NÃO vaza para os selects claros', () => {
  // uma regra em `select` ou `option` solto pintaria de escuro os 44 claros
  const semComentario = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/^\s*select\s*\{/m.test(semComentario), 'regra em `select` solto atinge os claros também');
  assert.ok(!/^\s*option\s*\{/m.test(semComentario), 'regra em `option` solto atinge os claros também');
  assert.ok(!/^\s*select\s+option\s*\{/m.test(semComentario), 'regra em `select option` atinge os claros também');
});

test('o select do "Encaminhar para Vendedor" está entre os cobertos', () => {
  const crm = readFileSync(new URL('../src/components/licensing/CentralVendas/CrmClientesTab.jsx', import.meta.url), 'utf8');
  const i = crm.indexOf('Selecione o Vendedor');
  assert.ok(i > 0, 'o campo sumiu da tela');
  const bloco = crm.slice(i, i + 500);
  const m = bloco.match(/bg-(gray|slate)-(700|800|900|950)/);
  assert.ok(m, 'o select do encaminhamento deixou de ter fundo escuro declarado');
  assert.ok(CSS.includes(`select.${m[0]}`), `${m[0]} ficou de fora da regra`);
});
