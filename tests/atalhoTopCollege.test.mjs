// ⭐ O ícone da Top College no cabeçalho — 23/09/2026
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import {
  DESTINOS_DO_ATALHO, DESTINO_PADRAO, CHAVE_ATALHO, normalizarDestino, rotuloDoDestino, urlDoAtalho,
  mostraAtalho, lerAtalho, gravarAtalho, secaoDaUrl, visaoDaUrl,
} from '../src/lib/atalhoTopCollege.js';
import { visaoDeEntrada } from '../src/lib/capaDasVisoes.js';
import { habitoDeEntrada } from '../src/lib/capaDosHabitos.js';

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
  // 🎴 24/09 (DIR-183) — a fileira das visões virou DOIS estados, igual aos 8
  // Hábitos: PortasDasVisoes (a capa) e BarraDaVisao (a visão aberta). A
  // estrela mudou de casa junto — ela age sobre a visão ABERTA, então mora na
  // barra. A regra que este teste guarda é a mesma.
  const BARRA = ler('../src/components/licensing/CentralVendas/BarraDaVisao.jsx');
  // 🧊 24/09 — a Top College mora colada na logo (Layout, celular E computador); saiu do NavDesktop e do canto do menu mobile
  assert.ok(!NAV.includes('<AtalhoTopCollege'));
  assert.ok(LAYOUT.includes('<AtalhoTopCollege currentUser={currentUser} temaClaro={isPainelClaro} className="ml-1 md:ml-0" />'));
  assert.equal(LAYOUT.split('<AtalhoTopCollege').length - 1, 1, 'um só ícone no cabeçalho');
  assert.ok(ICONE.includes('if (!mostraAtalho(currentUser)) return null;'));
  assert.ok(ICONE.includes('to={urlDoAtalho(destino)}'));
  // sem placa em volta: só o símbolo 3D, do tamanho da logo, com sombra solta
  assert.ok(ICONE.includes('src="/marca/topcollege-3d.webp"'));
  assert.ok(!ICONE.includes("background: 'rgba(255,255,255,0.06)'"));
  assert.ok(!ICONE.includes('rounded-xl'));
  assert.ok(ICONE.includes('className="h-10 w-10 sm:h-11 sm:w-11 object-contain"'));
  assert.ok(ICONE.includes("style={{ filter: temaClaro ? SOMBRA_3D_CLARO : SOMBRA_3D }}"));
  // 🎯 centro visual da logo (ponta do balão embaixo): o símbolo desce 3px e não fica colado
  assert.ok(ICONE.includes('translate-y-[3px] transition-transform duration-200 hover:scale-110'));
  assert.ok(!ICONE.includes("transform: 'translateY"), 'transform em linha engole o hover:scale');
  assert.ok(existsSync(new URL('../public/marca/topcollege-3d.webp', import.meta.url)));
  // 🔄 24/09 — A ÂNCORA MUDOU, A REGRA NÃO. O estado inicial deixou de ser só
  // a URL: agora passa por `habitoDeEntrada`, porque `null` virou um estado de
  // verdade (a CAPA das 8 portas) e existe memória do último hábito. O que
  // este teste guarda continua sendo o mesmo — e é o que o atalho promete:
  // ?secao= ABRE A SEÇÃO, mandando em cima de qualquer memória.
  assert.ok(CRM.includes('habitoDeEntrada({'), 'o estado inicial da seção saiu da régua testável');
  assert.ok(CRM.includes("daUrl: secaoDaUrl(typeof window === 'undefined' ? '' : window.location.search)"));
  assert.ok(CRM.includes('doAparelho: lerUltimoHabito()'));
  // e a precedência é medida, não só lida: a URL vence a memória
  assert.equal(habitoDeEntrada({ daUrl: 'compromisso', doAparelho: 'duplicacao' }), 'compromisso');
  // 🔴 23/09 — o atalho clicado de DENTRO da Top College não remonta nada: os três níveis reagem à URL
  assert.ok(CRM.includes("const s = secaoDaUrl(localizacao.search);\n    if (s) setSecao(s);"));
  assert.ok(METODO.includes("const v = visaoDaUrl(localizacao.search);\n    if (v) setVisao(v);"));
  const LIC = ler('../src/pages/Licensing.jsx');
  assert.ok(LIC.includes("if (VALID_LICENSING_TABS.includes(t)) setActiveTab(t);"));
  assert.ok(LIC.includes("if (VALID_CATALOG_SUBTABS.includes(c)) setCatalogSubTab(c);"));
  assert.ok(LIC.includes("}, [localizacao.search]);"));
  // o estado inicial da VISÃO passou pela mesma régua que o do hábito: a URL
  // manda, depois o aparelho, e null é a capa (visaoDeEntrada, capaDasVisoes.js)
  assert.ok(METODO.includes('visaoDeEntrada({'), 'o estado inicial da visão saiu da régua testável');
  assert.ok(METODO.includes("daUrl: visaoDaUrl(typeof window === 'undefined' ? '' : window.location.search)"));
  assert.ok(METODO.includes('doAparelho: lerUltimaVisao()'));
  assert.equal(visaoDeEntrada({ daUrl: 'quadro', doAparelho: 'lista' }), 'quadro', 'a URL precisa vencer a memória da visão também');
  assert.ok(METODO.includes('if (p?.atalho_destino) setAtalho(gravarAtalho(p.atalho_destino));'));
  assert.ok(METODO.includes('salvarPerfil({ atalho_destino: d })'));
  assert.ok(BARRA.includes('data-teste="fixar-atalho"'));
  assert.ok(BARRA.includes('aria-pressed={ehOAtalho}'));
  assert.ok(METODO.includes('ehOAtalho={atalho === visao}'), 'a barra não sabe mais qual visão é o atalho');
});
