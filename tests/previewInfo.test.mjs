// previewInfo — a régua de "qual página é esta" (DIR-42).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { tipoDeHost, dataDoBuild, HOST_PREVIEW_OFICIAL } from '../src/lib/previewInfo.js';

describe('tipoDeHost', () => {
  test('alias com -git- é o preview oficial (vivo)', () => {
    assert.equal(tipoDeHost(HOST_PREVIEW_OFICIAL), 'preview_oficial');
    assert.equal(tipoDeHost('leilonozap-git-main-leilaapp-s-projects.vercel.app'), 'preview_oficial');
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
