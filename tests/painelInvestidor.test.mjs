// 📈 PAINEL DO INVESTIDOR — DIR-190 (30/09/2026)
// Dono: "a visão geral tem que ser foda, contemplar tudo, dividido por área, em
// tempo real, com mapa do Brasil". E: "tira o lucro dali e põe no setor
// financeiro numa aba". Estes testes travam a arquitetura: UMA regra no banco,
// function só para admin, página só para admin, uso de saldo nunca somado com
// entrada, histórico importado à parte, mapa pelo DDD, lucro na aba do Financeiro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(p, import.meta.url), 'utf8'));
const SQL = readFileSync(new URL('../supabase/migrations/20260930160000_painel_investidor.sql', import.meta.url), 'utf8');

test('a regra mora no banco: painel_investidor separa entrada (gateway) de uso de saldo e classifica por área', () => {
  assert.ok(SQL.includes('create or replace function public.painel_investidor(_dias integer default 30)'));
  assert.ok(SQL.includes("_gateway text[] := array['pix_mp','credit_card_mp','pix','card_stripe','credit_card'];"));
  assert.ok(SQL.includes("where status = any(_pagos) and payment_method = any(_gateway)"), 'entrada = pago no gateway');
  assert.ok(SQL.includes("payment_method = 'saldo' and kind = 'arremate'"), 'uso de saldo em arremates, separado');
  assert.ok(SQL.includes("when _kind = 'produto' and _source = 'nexus' then 'nexus'"), 'histórico importado à parte');
  assert.ok(SQL.includes("'aguardando_pagamento', (select jsonb_build_object('n', count(*), 'valor_nominal'"), 'arremates não pagos ficam fora do caixa');
  assert.ok(SQL.includes("painel_ddd_uf(substring(regexp_replace(coalesce(phone, ''), '\\D', '', 'g') from '^(?:55)?(\\d{2})'))"), 'mapa pelo DDD');
  assert.ok(SQL.includes("when _ddd in ('21','22','24') then 'RJ'") && SQL.includes("when _ddd in ('11','12','13','14','15','16','17','18','19') then 'SP'"));
  assert.ok(SQL.includes('revoke all on function public.painel_investidor(integer) from public, anon, authenticated;'));
  assert.ok(SQL.includes('grant execute on function public.painel_investidor(integer) to service_role;'));
});

test('a function só responde a admin/super_admin e chama a RPC com o período', () => {
  const F = ler('../api/functions/painelInvestidor.js');
  assert.ok(F.includes("exigirSessao(req, userId, 'painelInvestidor')"));
  assert.ok(F.includes("if (!ator || !['admin', 'super_admin'].includes(ator.role)) return res.status(403)"));
  assert.ok(F.includes("sb('rpc/painel_investidor', { method: 'POST', body: JSON.stringify({ _dias: dias }) })"));
});

test('a página é só de admin, tem período, KPIs, entrada por área, fluxo do depósito, funil, leilão, mapa e cadastros por dia', () => {
  const C = ler('../src/pages.config.jsx');
  assert.ok(C.includes("const PainelInvestidor = React.lazy(() => import('./pages/PainelInvestidor'));"));
  assert.ok(/"PainelInvestidor": \(\) => \(\s*<RequireRole allowedRoles=\{\['admin', 'super_admin'\]\} fallbackRoute="Home">\s*<PainelInvestidor \/>/.test(C));
  const P = ler('../src/pages/PainelInvestidor.jsx');
  assert.ok(P.includes("useSecureRole(ADMIN_ROLES, 'Home')"));
  assert.ok(P.includes("plataforma.functions.invoke('painelInvestidor', { user_id: user.id, dias })"));
  for (const m of ['investidor-periodos', 'investidor-kpis', 'investidor-entrada', 'investidor-fluxo', 'investidor-funil', 'investidor-compras', 'investidor-leilao', 'investidor-mapa', 'investidor-cadastros', 'investidor-ultimos']) {
    assert.ok(P.includes(`teste="${m}"`), `falta ${m}`);
  }
  assert.ok(P.includes('const INTERVALO_SEG = 20;') && P.includes('setInterval(() => carregar(true), INTERVALO_SEG * 1000)'), 'ao vivo, a cada 20 s');
  assert.ok(P.includes("document.addEventListener('visibilitychange', aoVoltar)"), 'recalcula ao voltar para a aba');
  assert.ok(P.includes('onClick={() => carregar(true, true)}') && P.includes("{atualizando ? 'Atualizando…' : 'Atualizar agora'}"), 'botão com resposta visível');
  assert.ok(P.includes('toast.success(`Atualizado às ${hora('), 'confirma a atualização manual');
  assert.ok(P.includes("if (!painel) setErro("), 'falha não derruba os últimos números');
  assert.ok(!P.includes('depositsTotal + purchasesTotal') && !P.includes('depositado + '), 'entrada e uso de saldo não se somam');
});

test('o mapa do Brasil usa os contornos do @svg-maps/brazil, pinta por quantidade e é clicável', () => {
  const M = ler('../src/components/investidor/MapaBrasil.jsx');
  assert.ok(M.includes("import brazil from '@svg-maps/brazil';"));
  assert.ok(M.includes('brazil.locations.map((l) =>'));
  assert.ok(M.includes('Math.sqrt(v / maximo)'), 'raiz quadrada: o Rio não apaga o resto');
  assert.ok(M.includes('onClick={() => onSelecionar?.(uf)}'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.dependencies['@svg-maps/brazil'], 'pacote do mapa nas dependências');
});

test('o lucro do dia saiu da Visão Geral e vive na aba "Lucro do dia" do Setor Financeiro; a Visão Geral ganha a porta do painel', () => {
  const N = ler('../src/pages/NetworkOverview.jsx');
  assert.ok(!N.includes('<PainelLucroDiario'), 'o painel de lucro ainda está na Visão Geral');
  assert.ok(N.includes('data-teste="botao-painel-investidor"') && N.includes('to="/PainelInvestidor"'));
  const F = ler('../src/pages/Financial.jsx');
  assert.ok(F.includes('import LucroDoDiaTab from "@/components/financial/LucroDoDiaTab";'));
  assert.ok(F.includes('setActiveTab("lucro")') && F.includes('Lucro do dia'));
  assert.ok(F.includes('{activeTab === "lucro" ? (\n          <LucroDoDiaTab />'));
  const L = ler('../src/components/financial/LucroDoDiaTab.jsx');
  assert.ok(L.includes('<PainelLucroDiario') && L.includes("isPaga(s) && isDinheiroReal(s) && isPosMarco(s)"), 'mesma regra de dinheiro real');
});

// 👥 DIR-191 — perfil: homens e mulheres (estimado pelo nome), por onde chegaram, idade em aberto; mapa maior no desktop
test('perfil: sexo estimado pelo nome e canal de origem calculados no banco, só para service_role', () => {
  const P = readFileSync(new URL('../supabase/migrations/20260930170000_painel_investidor_perfil.sql', import.meta.url), 'utf8');
  assert.ok(P.includes('create or replace function public.painel_genero(_nome text)'));
  assert.ok(P.includes("if n like '%a' then return 'feminino'; end if;"));
  assert.ok(P.includes("'metodo', 'estimado pelo primeiro nome'"), 'a tela precisa dizer que é estimativa');
  assert.ok(P.includes("create or replace function public.painel_canal(_origem jsonb, _referred_by_id text)"));
  assert.ok(P.includes("when _origem->>'referrer' ilike '%instagram%'") && P.includes("ilike '%whatsapp%'") && P.includes("ilike '%facebook%'"));
  assert.ok(P.includes("return jsonb_build_object('genero', genero, 'canais', canais, 'idade', null);"), 'idade não é inventada');
  assert.ok(P.includes('grant execute on function public.painel_investidor_perfil(integer) to service_role;'));
  const F = ler('../api/functions/painelInvestidor.js');
  assert.ok(F.includes("sb('rpc/painel_investidor_perfil', { method: 'POST', body: JSON.stringify({ _dias: dias }) })"));
  assert.ok(F.includes('painel.perfil = rp.ok ? await rp.json().catch(() => null) : null;'), 'perfil é best-effort');
});

test('a página mostra as pizzas de sexo e de canal, explica a idade em aberto e dá ao mapa 3/5 da largura no desktop', () => {
  const Pg = ler('../src/pages/PainelInvestidor.jsx');
  for (const m of ['investidor-perfil', 'investidor-genero', 'investidor-canais', 'investidor-idade']) assert.ok(Pg.includes(`teste="${m}"`), `falta ${m}`);
  assert.ok(Pg.includes('<PieChart>') && Pg.includes('<Pie data={fatiasGenero}') && Pg.includes('<Pie data={canais}'));
  assert.ok(Pg.includes('Ainda não coletamos data de nascimento.'));
  assert.ok(Pg.includes('<div className="lg:col-span-3">\n              <Secao icon={MapPin}'), 'o mapa ocupava 1/5 da largura no desktop');
  assert.ok(Pg.includes('<div className="grid sm:grid-cols-3 gap-4">\n                  <div className="sm:col-span-2">'), 'o mapa ocupa 2/3 da seção');
});
