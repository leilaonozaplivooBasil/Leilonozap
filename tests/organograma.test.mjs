// 🏢 ORGANOGRAMA — 30/09/2026
// A árvore da própria pessoa (ela no topo, a operação dela abaixo) já existia
// dentro do Painel do Distribuidor, mas sem porta de entrada. O dono pediu um
// atalho no menu e só o ícone no painel, com um nome empresarial — nada que
// soe a multinível. Nome escolhido: Organograma.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('o atalho Organograma entra na grade do menu, só para quem está logado, antes de Favoritos', () => {
  const M = ler('../src/lib/menuAtalhos.js');
  assert.ok(M.includes('import { ShoppingCart, Gavel, Heart, User as UserIcon, Network } from "lucide-react";'));
  const linha = 'atalhos.push({ key: "organograma", rotulo: "Organograma", icon: Network, target: { to: "/painel?tab=rede" } });';
  assert.ok(M.includes(linha));
  const posVisitante = M.indexOf('if (!logado) return atalhos;');
  const posOrg = M.indexOf(linha);
  const posFav = M.indexOf('key: "favoritos"');
  assert.ok(posVisitante > -1 && posOrg > posVisitante, 'visitante não vê');
  assert.ok(posFav > posOrg, 'vem antes de Favoritos');
});

test('o nome é empresarial: nenhuma tela do painel da pessoa diz "Minha Árvore" ou "árvore genealógica"', () => {
  for (const f of ['../src/pages/PainelDistribuidor.jsx', '../src/components/painel/MinhaArvoreRede.jsx']) {
    const S = ler(f);
    assert.ok(!/Minha [ÁA]rvore/.test(S), `${f} ainda diz Minha Árvore`);
    assert.ok(!/[áÁ]rvore [gG]eneal/.test(S), `${f} ainda diz árvore genealógica`);
  }
  const P = ler('../src/pages/PainelDistribuidor.jsx');
  assert.equal((P.match(/label: 'Organograma', icon: Network/g) || []).length, 2, 'as duas listas de abas');
  assert.ok(P.includes('<h1 className="text-2xl font-black mb-1">Organograma</h1>'));
});

test('no painel entra só o ícone (sem botão grande), e ao tocar abre a aba cujo nome aparece na barra', () => {
  const P = ler('../src/pages/PainelDistribuidor.jsx');
  assert.ok(P.includes('data-teste="painel-organograma"'));
  assert.ok(P.includes('aria-label="Organograma"'));
  assert.ok(P.includes("onClick={() => setTab('rede')}"));
  assert.ok(P.includes('<Network className="w-5 h-5" />'));
  assert.ok(!P.includes('>Organograma</button>'), 'sem rótulo escrito no botão: só o ícone');
  assert.ok(P.includes("useState(() => new URLSearchParams(window.location.search).get('tab') || 'visao')"), '?tab=rede do atalho abre direto');
});
