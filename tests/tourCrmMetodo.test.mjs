// 🖐️ 09/09/2026 — achado na auditoria pré-publicação: `CrmMetodo.jsx` teve
// um conflito de merge de verdade entre o Hábito 3/4 (DIR-111.x) e a
// integração do TourGuiado (outra sessão, em paralelo) — a resolução ficou
// boa, mas não existia nenhuma rede de segurança automatizada travando os
// alvos do tour deste arquivo, ao contrário da Esteira de Captação
// (tests/tourTransparenciaEsteira.test.mjs), que já tem a checagem
// "todo alvo do tour tem um elemento correspondente na tela". Este arquivo
// fecha essa lacuna pros 6 tours de CrmMetodo.jsx (sonho/compromisso/
// lista/contato/apresentação/duplicação) — exatamente o arquivo que teve
// o conflito.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
// 🧭 "nav-habitos" (a barra de navegação entre Hábitos) é renderizada pelo
// componente PAI, não por CrmMetodo.jsx — o TourGuiado procura o alvo no
// DOM inteiro em tempo de execução, não só dentro deste arquivo. Por isso
// a checagem olha os dois arquivos, não só o de CrmMetodo.
const CLIENTES_TAB = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmClientesTab.jsx', import.meta.url), 'utf8');
const TELA = `${METODO}\n${CLIENTES_TAB}`;

const PASSOS = ['PASSOS_TOUR_METODO', 'PASSOS_TOUR_SONHO', 'PASSOS_TOUR_LISTA', 'PASSOS_TOUR_CONTATO', 'PASSOS_TOUR_APRESENTACAO', 'PASSOS_TOUR_DUPLICACAO'];

for (const nomeConst of PASSOS) {
  test(`CrmMetodo.jsx: todo alvo de ${nomeConst} tem um elemento data-teste correspondente na tela`, () => {
    const inicio = METODO.indexOf(`const ${nomeConst} = [`);
    assert.ok(inicio >= 0, `${nomeConst} precisa existir no arquivo`);
    // cada bloco de passos termina em "];" no início da linha, antes da próxima declaração
    const fim = METODO.indexOf('\n];', inicio);
    assert.ok(fim > inicio, `não achei o fechamento de ${nomeConst}`);
    const trecho = METODO.slice(inicio, fim);
    const alvos = [...trecho.matchAll(/alvo:\s*'([^']+)'/g)].map((m) => m[1]);
    assert.ok(alvos.length >= 3, `${nomeConst} tem poucos passos pra ensinar o hábito inteiro`);
    for (const alvo of alvos) {
      assert.match(TELA, new RegExp(`data-teste="${alvo}"`), `o alvo "${alvo}" de ${nomeConst} não tem elemento correspondente em CrmMetodo.jsx nem em CrmClientesTab.jsx — provável sobra de um merge`);
    }
  });
}

test('CrmMetodo.jsx: PASSOS_POR_PAINEL cobre exatamente os painéis que têm tour próprio', () => {
  const inicio = METODO.indexOf('const PASSOS_POR_PAINEL = {');
  const fim = METODO.indexOf('\n};', inicio);
  const trecho = METODO.slice(inicio, fim);
  for (const nomeConst of PASSOS) {
    assert.match(trecho, new RegExp(nomeConst), `${nomeConst} existe mas não está mapeado em PASSOS_POR_PAINEL — o botão "Como funciona" nunca abriria esse tour`);
  }
});
