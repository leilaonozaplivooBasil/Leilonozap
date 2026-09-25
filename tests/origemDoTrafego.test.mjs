// 📣 DE ONDE A PESSOA VEIO — utm / fbclid (25/09/2026).
// Dono: "identifique quantos leads vierem do Meta Ads". Primeiro toque vale;
// sobe com o cadastro; o servidor só aceita o que tem forma conhecida.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { origemDaUrl, ehMetaAds, capturarOrigemDoTrafego, lerOrigemDoTrafego, limparOrigemDoTrafego, CHAVE_ORIGEM } from '../src/lib/origemDoTrafego.js';
import { sanearOrigem } from '../api/_lib/origemDoTrafego.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const memoria = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), _m: m }; };
const AGORA = new Date('2026-09-25T15:00:00Z');

test('a URL do anúncio vira origem; fbclid sozinho já é Meta; sem nada → null', () => {
  const o = origemDaUrl('?utm_source=facebook&utm_medium=cpc&utm_campaign=harley&fbclid=ABC', { referrer: 'https://l.facebook.com/', landing: '/leiloes', agora: AGORA });
  assert.deepEqual(o, { utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'harley', fbclid: 'ABC', referrer: 'https://l.facebook.com/', landing: '/leiloes', em: '2026-09-25T15:00:00.000Z' });
  assert.equal(ehMetaAds(o), true);
  const soFb = origemDaUrl('?fbclid=XYZ', { agora: AGORA });
  assert.equal(soFb.utm_source, 'facebook'); assert.equal(soFb.utm_medium, 'paid'); assert.equal(ehMetaAds(soFb), true);
  assert.equal(ehMetaAds(origemDaUrl('?gclid=1', { agora: AGORA })), false);
  assert.equal(ehMetaAds(origemDaUrl('?utm_source=Instagram', { agora: AGORA })), true);
  assert.equal(origemDaUrl('?tab=catalogo&ref=JOAO'), null, 'link de indicação não é tráfego pago');
  assert.equal(origemDaUrl(''), null);
});

test('o PRIMEIRO toque vale: a segunda visita não sobrescreve; ler/limpar', () => {
  const st = memoria();
  const primeira = capturarOrigemDoTrafego('?utm_source=facebook&utm_campaign=a', { storage: st, agora: AGORA });
  assert.equal(primeira.utm_campaign, 'a');
  const segunda = capturarOrigemDoTrafego('?utm_source=google&gclid=9', { storage: st, agora: AGORA });
  assert.equal(segunda.utm_source, 'facebook', 'quem chegou pelo anúncio continua lead do anúncio');
  assert.equal(lerOrigemDoTrafego(st).utm_campaign, 'a');
  assert.equal(capturarOrigemDoTrafego('', { storage: memoria() }), null, 'sem parâmetro não grava nada');
  st._m.set(CHAVE_ORIGEM, 'lixo'); assert.equal(lerOrigemDoTrafego(st), null, 'valor quebrado não derruba');
  limparOrigemDoTrafego(st); assert.equal(lerOrigemDoTrafego(st), null);
});

test('o servidor só aceita a forma conhecida: chaves da lista, texto curto, e precisa ter fonte', () => {
  assert.deepEqual(sanearOrigem({ utm_source: 'facebook', utm_campaign: 'x', em: '2026-09-25T15:00:00.000Z', lixo: 'não', senha: 'abc' }), { utm_source: 'facebook', utm_campaign: 'x', em: '2026-09-25T15:00:00.000Z' });
  assert.equal(sanearOrigem({ referrer: 'https://x' }), null, 'sem utm_source/fbclid/gclid não é origem');
  assert.equal(sanearOrigem('{"fbclid":"A"}').fbclid, 'A', 'aceita JSON em texto');
  assert.equal(sanearOrigem('lixo'), null); assert.equal(sanearOrigem(null), null); assert.equal(sanearOrigem([1]), null);
  assert.equal(sanearOrigem({ utm_source: 'a'.repeat(500) }).utm_source.length, 200);
  assert.ok(!Number.isNaN(Date.parse(sanearOrigem({ gclid: '1', em: 'não é data' }).em)), 'data inválida vira agora');
});

test('as telas mandam a origem no cadastro e o Layout captura o primeiro toque', () => {
  for (const [arq, chamada] of [['src/pages/Register.jsx', 'publicRegister'], ['src/pages/Register.jsx', 'googleLogin'], ['src/components/common/GuestRegistrationModal.jsx', 'publicRegister'], ['src/pages/Cadastro.jsx', 'registerNetworkUser'], ['src/components/common/LoginModal.jsx', 'googleLogin']]) {
    const S = ler(`../${arq}`);
    assert.ok(S.includes(`invoke('${chamada}', { origem_trafego: lerOrigemDoTrafego(),`), `${arq} não manda a origem em ${chamada}`);
  }
  const L = ler('../src/Layout.jsx');
  assert.match(L, /capturarOrigemDoTrafego\(window\.location\.search, \{ referrer: document\.referrer, landing: window\.location\.pathname \}\)/);
  // a coluna existe no banco (migração aplicada) e o anônimo NÃO a lê (não está na lista pública)
  const arq = readdirSync(new URL('../supabase/migrations/', import.meta.url)).find((f) => f.endsWith('_origem_do_trafego_no_cadastro.sql'));
  assert.ok(arq, 'migração origem_do_trafego_no_cadastro sem arquivo');
  assert.match(readFileSync(new URL(`../supabase/migrations/${arq}`, import.meta.url), 'utf8'), /add column if not exists origem_trafego jsonb/);
  assert.doesNotMatch(ler('../src/api/plataformaAdapter.js'), /origem_trafego/, 'o navegador não lê a origem de volta');
});
