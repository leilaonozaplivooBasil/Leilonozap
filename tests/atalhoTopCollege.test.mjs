// ⭐ O ícone da Top College no cabeçalho — 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  DESTINOS_DO_ATALHO, DESTINO_PADRAO, CHAVE_ATALHO, normalizarDestino, rotuloDoDestino, urlDoAtalho,
  mostraAtalho, lerAtalho, gravarAtalho, secaoDaUrl, visaoDaUrl,
} from '../src/lib/atalhoTopCollege.js';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const memoria = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };

test('os cinco destinos são as visões do Compromisso, e o padrão é a Jornada', () => {
  assert.deepEqual(DESTINOS_DO_ATALHO.map((d) => d.id), ['jornada', 'lista', 'quadro', 'mapa', 'demandas']);
  assert.equal(DESTINO_PADRAO, 'jornada');
  assert.equal(normalizarDestino('quadro'), 'quadro');
  assert.equal(normalizarDestino(' Mapa '), 'mapa');
  for (const ruim of [null, undefined, '', 'sonho', 'compromisso', 'x']) assert.equal(normalizarDestino(ruim), 'jornada', String(ruim));
  assert.equal(rotuloDoDestino('demandas'), 'Demandas');
  assert.equal(rotuloDoDestino('inventado'), 'Jornada');
});

test('a URL leva à Central → Compromisso → a visão escolhida; destino inválido cai na Jornada', () => {
  assert.equal(urlDoAtalho('quadro'), '/Licensing?tab=catalogo&catalogTab=catalogo-crm&secao=compromisso&visao=quadro');
  assert.equal(urlDoAtalho(undefined), '/Licensing?tab=catalogo&catalogTab=catalogo-crm&secao=compromisso&visao=jornada');
  assert.equal(urlDoAtalho('sonho'), urlDoAtalho('jornada'));
});

test('só quem está logado vê o ícone', () => {
  assert.equal(mostraAtalho({ email: 'a@b.c' }), true);
  assert.equal(mostraAtalho({ email: '' }), false);
  assert.equal(mostraAtalho({}), false);
  assert.equal(mostraAtalho(null), false);
});

test('o aparelho guarda o destino; sem storage ou com lixo, vale o padrão', () => {
  const s = memoria();
  assert.equal(lerAtalho(s), 'jornada');
  assert.equal(gravarAtalho('mapa', s), 'mapa');
  assert.equal(s.getItem(CHAVE_ATALHO), 'mapa');
  assert.equal(lerAtalho(s), 'mapa');
  assert.equal(gravarAtalho('inventado', s), 'jornada');
  assert.equal(lerAtalho(s), 'jornada');
  const quebrado = { getItem: () => { throw new Error('sem storage'); }, setItem: () => { throw new Error('sem storage'); } };
  assert.equal(lerAtalho(quebrado), 'jornada');
  assert.equal(gravarAtalho('lista', quebrado), 'lista');
});

test('a URL só abre seção e visão que existem; o resto vira null (a tela decide o padrão dela)', () => {
  assert.equal(secaoDaUrl('?tab=catalogo&secao=compromisso&visao=quadro'), 'compromisso');
  assert.equal(secaoDaUrl('?secao=Contato'), 'contato');
  assert.equal(secaoDaUrl('?secao=admin'), null);
  assert.equal(secaoDaUrl(''), null);
  assert.equal(secaoDaUrl(null), null);
  assert.equal(visaoDaUrl('?visao=quadro'), 'quadro');
  assert.equal(visaoDaUrl('?visao=jornada'), 'jornada');
  assert.equal(visaoDaUrl('?visao=sonho'), null);
  assert.equal(visaoDaUrl('?tab=catalogo'), null);
});

test('o ícone está no cabeçalho (desktop e celular), a URL abre a seção e a visão, e a estrela grava aparelho + perfil', () => {
  const NAV = ler('../src/components/nav/NavDesktop.jsx');
  const LAYOUT = ler('../src/Layout.jsx');
  const ICONE = ler('../src/components/nav/AtalhoTopCollege.jsx');
  const CRM = ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx');
  const METODO = ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx');
  const FAIXA = ler('../src/components/licensing/CentralVendas/FaixaVisao.jsx');
  // 🧊 24/09 — a Top College mora colada na logo (Layout, celular E computador); saiu do NavDesktop e do canto do menu mobile
  assert.ok(!NAV.includes('<AtalhoTopCollege'));
  assert.ok(LAYOUT.includes('<AtalhoTopCollege currentUser={currentUser} temaClaro={isPainelClaro} className="-ml-1 md:-ml-2" />'));
  assert.equal(LAYOUT.split('<AtalhoTopCollege').length - 1, 1, 'um só ícone no cabeçalho');
  assert.ok(ICONE.includes('if (!mostraAtalho(currentUser)) return null;'));
  assert.ok(ICONE.includes('to={urlDoAtalho(destino)}'));
  // sem placa em volta: só o símbolo 3D, do tamanho da logo, com sombra solta
  assert.ok(ICONE.includes('src="/marca/topcollege-3d.webp"'));
  assert.ok(!ICONE.includes("background: 'rgba(255,255,255,0.06)'"));
  assert.ok(!ICONE.includes('rounded-xl'));
  assert.ok(ICONE.includes('className="h-10 w-10 sm:h-11 sm:w-11 object-contain"'));
  assert.ok(ICONE.includes("style={{ filter: temaClaro ? SOMBRA_3D_CLARO : SOMBRA_3D }}"));
  assert.ok(existsSync(new URL('../public/marca/topcollege-3d.webp', import.meta.url)));
  assert.ok(CRM.includes("useState(() => secaoDaUrl(typeof window === 'undefined' ? '' : window.location.search))"));
  // 🔴 23/09 — o atalho clicado de DENTRO da Top College não remonta nada: os três níveis reagem à URL
  assert.ok(CRM.includes("const s = secaoDaUrl(localizacao.search);\n    if (s) setSecao(s);"));
  assert.ok(METODO.includes("const v = visaoDaUrl(localizacao.search);\n    if (v) setVisao(v);"));
  const LIC = ler('../src/pages/Licensing.jsx');
  assert.ok(LIC.includes("if (VALID_LICENSING_TABS.includes(t)) setActiveTab(t);"));
  assert.ok(LIC.includes("if (VALID_CATALOG_SUBTABS.includes(c)) setCatalogSubTab(c);"));
  assert.ok(LIC.includes("}, [localizacao.search]);"));
  assert.ok(METODO.includes("useState(() => visaoDaUrl(typeof window === 'undefined' ? '' : window.location.search) || 'jornada')"));
  assert.ok(METODO.includes('if (p?.atalho_destino) setAtalho(gravarAtalho(p.atalho_destino));'));
  assert.ok(METODO.includes('salvarPerfil({ atalho_destino: d })'));
  assert.ok(FAIXA.includes('data-teste="fixar-atalho"'));
  assert.ok(FAIXA.includes('const ehOAtalho = Boolean(onAtalho) && atalho === visao;'));
});
