// previewInfo — a régua de "qual página é esta" (DIR-42).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tipoDeHost, dataDoBuild, HOST_PREVIEW_OFICIAL } from '../src/lib/previewInfo.js';

describe('tipoDeHost', () => {
  test('só o host EXATO de HOST_PREVIEW_OFICIAL é o preview oficial', () => {
    assert.equal(tipoDeHost(HOST_PREVIEW_OFICIAL), 'preview_oficial');
  });
  // 🐛 09/09/2026 — achado ao vivo: duas branches (xgame-visual-polish e
  // claude/project-structure-analysis-r1prad) rodando em paralelo, cada uma
  // com seu próprio alias "-git-", e as DUAS mostravam o selo verde — a
  // régua antiga só conferia "-git-" no nome, não comparava com o host
  // oficial de verdade. O dono confiava cegamente no selo verde ("só
  // trabalho nele") e foi parar na branch errada sem perceber nada de
  // errado na tela. Trava que isso nunca mais aconteça: QUALQUER alias
  // "-git-" que não seja EXATAMENTE o oficial cai no aviso âmbar.
  test('alias "-git-" de OUTRA branch NÃO é o preview oficial — mesmo padrão de nome, host diferente', () => {
    assert.equal(tipoDeHost('leilonozap-git-main-leilaapp-s-projects.vercel.app'), 'deploy_congelado');
    assert.equal(tipoDeHost('leilonozap-git-xgame-visual-polish-leilaapp-s-projects.vercel.app'), 'deploy_congelado');
  });
  test('deploy congelado: vercel.app SEM -git- (as URLs que perdiam o dono)', () => {
    assert.equal(tipoDeHost('leilonozap-q6kte8jlx-leilaapp-s-projects.vercel.app'), 'deploy_congelado');
    assert.equal(tipoDeHost('leilonozap-nj2my05ky-leilaapp-s-projects.vercel.app'), 'deploy_congelado');
  });
  test('produção e dev ficam sem selo', () => {
    assert.equal(tipoDeHost('leilaonozap.net'), 'producao');
    assert.equal(tipoDeHost('www.leilaonozap.net'), 'producao');
    assert.equal(tipoDeHost('localhost'), 'producao');
  });
});

describe('dataDoBuild', () => {
  test('timestamp vira DD/MM HH:mm; lixo vira null', () => {
    assert.match(String(dataDoBuild('1788276474787')), /^\d{2}\/\d{2},? \d{2}:\d{2}$/);
    assert.equal(dataDoBuild('dev'), null);
    assert.equal(dataDoBuild(null), null);
  });
});
