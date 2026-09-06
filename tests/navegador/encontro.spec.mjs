/**
 * O ENCONTRO DA MENTALIDADE e o PAINEL CORPORATIVO no navegador.
 *
 * 🔴 Dono (06/09/2026): "um lugar estratégico pras mentorias de segunda,
 * junto com os 8 Hábitos: a apresentação da reunião com o tópico; uma IA pra
 * eu digitar as pautas e gerar o tópico; cronômetro de 15 de leitura, 45 de
 * treinamento e 2 horas de reunião; e conforme a reunião acontece as pautas
 * viram demanda pra cada um, no painel de cada um, numa visão executiva".
 * E: "dentro de cada um, o painel corporativo: metas, as demandas recebidas
 * (do encontro, do CEO, dos diretores), e dali ele agenda no seu quadro nos
 * seus horários; todo mundo vê todo mundo".
 *
 * O que só o navegador mede (banco de mentira, segunda 07/09/2026):
 *   • sem IA, o tópico sai pela régua local — e com a IA de mentira, sai dela;
 *   • o cronômetro grava no banco a cada começar/pausar/próximo;
 *   • direcionar cria a demanda RECEBIDA no painel da pessoa, ligada ao encontro;
 *   • a apresentação em tela cheia anda com as setas;
 *   • no painel, agendar vira tarefa do dia + card do quadro, com o rastro;
 *   • o CEO manda demanda daqui; o Emanuel (sem gestão) só agenda e devolve.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA || path.join(tmpdir(), 'banca-encontro');
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { /* opcional */ }
const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], { cwd: path.join(AQUI, '..', '..'), env: { ...process.env, SAIDA_BANCA: SAIDA }, stdio: 'inherit' });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'encontro.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/encontro.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}
test.after(async () => { if (navegador) await navegador.close(); if (servidor) servidor.close(); });

async function abrir({ celular = false, comoEmanuel = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE + (comoEmanuel ? '#emanuel' : ''));
  await pagina.locator('[data-teste="painel-corporativo"]').waitFor();
  if (!comoEmanuel) await pagina.locator('[data-teste="encontro"]').waitFor();
  return { pagina, ctx, erros };
}
const escritas = (pagina) => pagina.evaluate(() => window.__bancoFalso.escritas);
const texto = async (pagina, sel) => (await pagina.locator(sel).first().textContent()).replace(/\s+/g, ' ').trim();
const PAUTAS = 'Abrir o ponto de retirada de Jacarepaguá\nTráfego do Ranking está caro\nFechar o caixa de agosto';

test('ENCONTRO: abre na segunda de hoje, com a fase do ciclo, o cronômetro pronto e as pautas vazias', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.match(await texto(pagina, '[data-teste="encontro-titulo"]'), /segunda-feira, 07\/09 é hoje/);
  assert.match(await texto(pagina, '[data-teste="encontro"]'), /Estruturação/);
  const cron = pagina.locator('[data-teste="cronometro"]');
  assert.equal(await cron.getAttribute('data-rodando'), 'nao');
  assert.equal(await texto(pagina, '[data-teste="tempo-bloco"]'), '15:00');
  assert.match(await texto(pagina, '[data-teste="comecar"]'), /começar: leitura \(15 min\)/);
  assert.match(await texto(pagina, '[data-teste="topico"]'), /Digite as pautas e gere o tópico/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('TÓPICO: sem IA conectada, as pautas viram tópico pela régua local — leitura do Hábito do mês, 3 tópicos somando 120 min, responsável sugerido pela função; e grava no encontro', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pautas-texto"]').fill(PAUTAS);
  await pagina.locator('[data-teste="gerar-topico"]').click();
  await pagina.getByText(/IA não conectada — o tópico saiu pela régua da casa/).waitFor();
  await pagina.locator('[data-teste="topico-item"]').first().waitFor();
  assert.equal(await pagina.locator('[data-teste="topico-item"]').count(), 3);
  assert.match(await texto(pagina, '[data-teste="topico-leitura"]'), /Hábito 1 — Sonho/);
  assert.match(await texto(pagina, '[data-teste="topico-reuniao"]'), /3 tópicos/);
  assert.match(await texto(pagina, '[data-teste="topico-item"]'), /40 min/);
  const g = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_encontros').at(-1);
  assert.equal(g.tipo, 'upsert');
  assert.deepEqual([g.linhas[0].data, g.linhas[0].roteiro_origem, g.linhas[0].pautas, g.linhas[0].roteiro.reuniao.topicos.length], ['2026-09-07', 'local', PAUTAS, 3]);
  // a IA de mentira registrou a chamada com o prompt (as pautas e a sala foram)
  const chamada = await pagina.evaluate(() => window.__plataformaFalsa.chamadas.find((c) => c.tipo === 'llm'));
  assert.match(chamada.prompt, /1\. Abrir o ponto de retirada de Jacarepaguá/);
  assert.match(chamada.prompt, /Na sala: .*Emanuel Silva \(COO\)/);
  assert.ok(chamada.schema);
  // direcionar: o tráfego do Ranking sugere o CMO — o Jean (Diretor Operacional no painel, CMO pelo documento)
  const linhas = pagina.locator('[data-teste="linha-demanda"]');
  assert.equal(await linhas.count(), 3);
  assert.equal(await linhas.nth(1).locator('[data-teste="demanda-pessoa"]').inputValue(), 'jean');
  assert.match(await linhas.nth(1).locator('[data-teste="demanda-pessoa"] option[value="jean"]').textContent(), /Jean Aranha · CMO \(sugerido\)/);
  assert.equal(await linhas.nth(0).locator('[data-teste="demanda-pessoa"]').inputValue(), 'emanuel', 'ponto de retirada → COO → Emanuel');
  assert.equal(await linhas.nth(0).locator('[data-teste="demanda-prazo"]').inputValue(), '2026-09-11', 'até sexta');
  await ctx.close();
});

test('TÓPICO PELA IA: quando a IA responde, o tópico é dela (tema, leitura, tópicos) e fica marcado "gerado pela IA"', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.evaluate(() => {
    window.__iaFalsa = () => ({
      tema: 'Capital e execução', abertura: 'Hoje é dia de fechar o que abriu.',
      leitura: { titulo: 'Compromisso', trecho: 'Disciplina faz você continuar.', perguntas: ['Onde eu parei?'], aplicacao: 'Uma ação hoje.' },
      treinamento: { tema: 'Reunião de investimento em 20 minutos', objetivo: 'Sair com o script', passos: ['Abrir', 'Perguntar', 'Fechar'], pratica: 'Em dupla.' },
      reuniao: { topicos: [
        { titulo: 'Ponto de retirada de Jacarepaguá', objetivo: 'Assinar o contrato', decisao: 'Emanuel fecha até sexta', minutos: 60, mentalidade: 'diretor', habito: 6, responsavel_funcao: 'coo', demanda: 'Assinar o contrato do ponto de Jacarepaguá' },
        { titulo: 'Tráfego do Ranking', objetivo: 'CPC abaixo de R$ 1', decisao: 'cortar os anúncios que não convertem', minutos: 60, mentalidade: 'diretor', habito: 7, responsavel_funcao: 'cmo', demanda: 'Cortar o CPC do Ranking pra R$ 0,70' },
      ] },
      fechamento: 'Combinado é combinado.',
    });
  });
  await pagina.locator('[data-teste="pautas-texto"]').fill('Ponto de retirada de Jacarepaguá\nTráfego do Ranking');
  await pagina.locator('[data-teste="gerar-topico"]').click();
  await pagina.getByText(/Tópico gerado pela IA: 2 tópicos/).waitFor();
  assert.match(await texto(pagina, '[data-teste="topico"]'), /Capital e execução/);
  assert.match(await texto(pagina, '[data-teste="topico-treinamento"]'), /Reunião de investimento em 20 minutos/);
  assert.match(await texto(pagina, '[data-teste="topico-item"]'), /Ponto de retirada de Jacarepaguá · 60 min · Diretor · H6/);
  assert.match(await texto(pagina, '[data-teste="pautas"]'), /tópico atual: gerado pela IA/);
  const g = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_encontros').at(-1);
  assert.equal(g.linhas[0].roteiro_origem, 'ia');
  assert.equal(await pagina.locator('[data-teste="linha-demanda"]').first().locator('[data-teste="demanda-titulo"]').inputValue(), 'Assinar o contrato do ponto de Jacarepaguá');
  await ctx.close();
});

test('CRONÔMETRO: começar grava o bloco rodando; pausar guarda; próximo abre o treinamento — o estado vive no banco', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="comecar"]').click();
  await pagina.locator('[data-teste="cronometro"][data-rodando="sim"][data-bloco="leitura"]').waitFor();
  let g = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_encontros').at(-1);
  assert.equal(g.linhas[0].cronometro.atual, 'leitura');
  assert.ok(g.linhas[0].cronometro.blocos.leitura.inicio);
  await pagina.waitForTimeout(1200);
  assert.match(await texto(pagina, '[data-teste="tempo-bloco"]'), /^14:5[0-9]$/, 'está contando pra baixo');
  await pagina.locator('[data-teste="pausar"]').click();
  await pagina.locator('[data-teste="cronometro"][data-rodando="nao"]').waitFor();
  g = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_encontros').at(-1);
  assert.equal(g.linhas[0].cronometro.blocos.leitura.inicio, null);
  assert.ok(g.linhas[0].cronometro.blocos.leitura.acumulado >= 1);
  assert.match(await texto(pagina, '[data-teste="comecar"]'), /retomar leitura/);
  await pagina.locator('[data-teste="proximo"]').click();
  await pagina.locator('[data-teste="cronometro"][data-rodando="sim"][data-bloco="treinamento"]').waitFor();
  assert.equal(await pagina.locator('[data-teste="blocos"] [data-bloco="leitura"]').getAttribute('data-feito'), 'sim');
  assert.match(await texto(pagina, '[data-teste="tempo-bloco"]'), /^4[45]:/);
  await ctx.close();
});

test('DIRECIONAR: a demanda cai RECEBIDA no Painel Corporativo da pessoa, ligada ao encontro, até sexta 18h; a visão executiva mostra "sem agendar"; a demanda que surgiu na hora também', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pautas-texto"]').fill(PAUTAS);
  await pagina.locator('[data-teste="gerar-topico"]').click();
  await pagina.locator('[data-teste="linha-demanda"]').first().waitFor();
  const primeira = pagina.locator('[data-teste="linha-demanda"]').first();
  await primeira.locator('[data-teste="demanda-direcionar"]').click();
  await pagina.getByText(/No Painel Corporativo de Emanuel: "Abrir o ponto de retirada de Jacarepaguá"/).waitFor();
  const d = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_demandas').at(-1);
  assert.equal(d.tipo, 'insert');
  const enc = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_encontros').at(-1).linhas[0];
  assert.deepEqual([d.linhas[0].pessoa_id, d.linhas[0].status, d.linhas[0].origem, d.linhas[0].encontro_id, String(d.linhas[0].prazo_em).slice(0, 10), d.linhas[0].criado_por_id], ['emanuel', 'recebida', 'encontro', enc.id, '2026-09-11', 'dono']);
  assert.match(d.linhas[0].detalhe, /Mentalidade do/);
  // a visão executiva: Emanuel 0 de 1, sem agendar
  await pagina.locator('[data-teste="producao-pessoas"] [data-pessoa="emanuel"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="producao-pessoas"] [data-pessoa="emanuel"]'), /Emanuel Silva.*0\/1 · 1 sem agendar.*recebida — sem agendar/);
  assert.match(await texto(pagina, '[data-teste="producao-total"]'), /0 de 1/);
  // e a linha marca quem levou
  assert.match(await primeira.textContent(), /Emanuel/);
  // a demanda que surgiu na hora
  await pagina.locator('[data-teste="livre-titulo"]').fill('Mandar a proposta pro fornecedor da lista nova');
  await pagina.locator('[data-teste="livre-pessoa"]').selectOption('carla');
  await pagina.locator('[data-teste="livre-direcionar"]').click();
  await pagina.getByText(/No Painel Corporativo de Carla: "Mandar a proposta pro fornecedor da lista nova"/).waitFor();
  assert.match(await texto(pagina, '[data-teste="producao-total"]'), /0 de 2/);
  // ⤵ e o painel corporativo (logo abaixo, como dono) já vê: escolhe o Emanuel
  await pagina.locator('[data-teste="painel-pessoa"]').selectOption('emanuel');
  await pagina.locator('[data-teste="demanda-recebida"]').first().waitFor();
  const recebidas = await pagina.locator('[data-teste="demanda-recebida"]').allTextContents();
  assert.ok(recebidas.some((t) => /Abrir o ponto de retirada de Jacarepaguá/.test(t) && /do encontro de segunda/.test(t)));
  await ctx.close();
});

test('APRESENTAR: a tela cheia abre na capa, anda com a seta, mostra o bloco e o tempo, e fecha no ESC', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pautas-texto"]').fill(PAUTAS);
  await pagina.locator('[data-teste="gerar-topico"]').click();
  await pagina.locator('[data-teste="topico-item"]').first().waitFor();
  await pagina.locator('[data-teste="apresentar"]').click();
  const ap = pagina.locator('[data-teste="apresentacao"]');
  await ap.waitFor();
  assert.equal(await ap.getAttribute('data-slide'), 'capa');
  assert.match(await texto(pagina, '[data-teste="slide-titulo"]'), /Encontro da Mentalidade/);
  await pagina.keyboard.press('ArrowRight');
  await pagina.keyboard.press('ArrowRight');
  await pagina.locator('[data-teste="apresentacao"][data-slide="leitura"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="slide-titulo"]'), /Hábito 1 — Sonho/);
  await pagina.locator('[data-teste="slide-proximo"]').click();
  await pagina.locator('[data-teste="apresentacao"][data-slide="treinamento"]').waitFor();
  await pagina.locator('[data-teste="slide-proximo"]').click();
  await pagina.locator('[data-teste="apresentacao"][data-slide="topico-0"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="slide-titulo"]'), /1\. Abrir o ponto de retirada de Jacarepaguá/);
  await pagina.screenshot({ path: path.join(FOTOS, 'encontro-apresentacao.png') });
  await pagina.keyboard.press('Escape');
  await ap.waitFor({ state: 'detached' });
  await ctx.close();
});

test('PAINEL CORPORATIVO (gestão): metas, a demanda recebida do CEO, agendar no dia e no quadro com o rastro; mandar demanda daqui; a semana de todo mundo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="painel-pessoa"]').selectOption('emanuel');
  await pagina.locator('[data-teste="painel-corporativo"][data-pessoa="emanuel"] [data-teste="demanda-recebida"]').waitFor();
  const painel = pagina.locator('[data-teste="painel-corporativo"]');
  assert.match(await texto(pagina, '[data-teste="painel-metas"]'), /Reuniões de investimento.*0 \/ 44/);
  const d = painel.locator('[data-teste="demanda-recebida"][data-id="d1"]');
  assert.match(await d.textContent(), /Mandar a proposta pro ponto de retirada de Jacarepaguá.*do CEO · Luiz Santanna/);
  await d.locator('[data-teste="agendar"]').click();
  await d.locator('[data-teste="agendar-form"]').waitFor();
  assert.equal(await d.locator('[data-teste="agendar-dia"]').inputValue(), '2026-09-08', 'amanhã, por padrão');
  await d.locator('[data-teste="agendar-hora"]').fill('10:30');
  await d.locator('[data-teste="agendar-confirmar"]').click();
  await pagina.getByText(/agendada pra ter\., 08\/09 às 10:30 e no quadro/).waitFor();
  const esc = await escritas(pagina);
  const t = esc.filter((e) => e.tabela === 'metodo_tarefas' && e.tipo === 'insert').at(-1).linhas[0];
  assert.deepEqual([t.user_id, t.data, t.hora, t.origem, t.demanda_id, t.titulo, t.categoria, t.mentalidade, t.habito], ['emanuel', '2026-09-08', '10:30', 'xperf', 'd1', 'Mandar a proposta pro ponto de retirada de Jacarepaguá', 'mentoria', 'diretor', 6]);
  const c = esc.filter((e) => e.tabela === 'metodo_quadro' && e.tipo === 'insert').at(-1).linhas[0];
  assert.deepEqual([c.user_id, c.coluna, c.prazo, c.virou_tarefa_id, c.demanda_id, c.responsavel_nome], ['emanuel', 'aberto', '2026-09-11', t.id, 'd1', 'Luiz Santanna']);
  const u = esc.filter((e) => e.tabela === 'xperf_demandas' && e.tipo === 'update').at(-1).patch;
  assert.deepEqual([u.status, u.agendada_para, u.hora, u.tarefa_id, u.card_id], ['agendada', '2026-09-08', '10:30', t.id, c.id]);
  await painel.locator('[data-teste="demanda-andamento"]').first().waitFor();
  assert.match(await texto(pagina, '[data-teste="andamento"]'), /agendada · 08\/09 10:30.*Mandar a proposta/);
  // o CEO manda uma demanda daqui pra Carla
  await painel.locator('[data-teste="nova-demanda-titulo"]').fill('Preparar a live de quinta');
  await painel.locator('[data-teste="nova-demanda-pessoa"]').selectOption('carla');
  await painel.locator('[data-teste="nova-demanda-mandar"]').click();
  await pagina.getByText(/Demanda no painel de Carla: "Preparar a live de quinta"/).waitFor();
  const nova = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_demandas' && e.tipo === 'insert').at(-1).linhas[0];
  assert.deepEqual([nova.pessoa_id, nova.origem, nova.status, String(nova.prazo_em).slice(0, 10)], ['carla', 'ceo', 'recebida', '2026-09-11']);
  // a semana de todo mundo: Emanuel e Carla
  await painel.locator('[data-teste="todos-pessoa"][data-pessoa="carla"]').waitFor();
  const todos = (await texto(pagina, '[data-teste="painel-todos"]'));
  assert.match(todos, /Carla Souza.*1\/2/, 'a conferida de sexta passada + a nova sem agendar');
  assert.match(todos, /Emanuel Silva.*0\/1/);
  await pagina.screenshot({ path: path.join(FOTOS, 'painel-corporativo.png'), fullPage: true });
  await ctx.close();
});

test('PAINEL CORPORATIVO (a própria pessoa): o Emanuel vê o dele, agenda só no dia, devolve com motivo — e não manda demanda', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir({ comoEmanuel: true });
  const painel = pagina.locator('[data-teste="painel-corporativo"]');
  await painel.locator('[data-teste="demanda-recebida"]').waitFor();
  assert.equal(await painel.getAttribute('data-pessoa'), 'emanuel');
  assert.equal(await painel.locator('[data-teste="mandar-demanda"]').count(), 0, 'Sócio Executivo não manda demanda');
  assert.equal(await painel.locator('[data-teste="encontro"]').count(), 0);
  const d = painel.locator('[data-teste="demanda-recebida"][data-id="d1"]');
  // devolver com motivo
  await d.locator('[data-teste="devolver"]').click();
  await d.locator('[data-teste="devolver-motivo"]').fill('a proposta já foi enviada na sexta');
  await d.locator('[data-teste="devolver-confirmar"]').click();
  await pagina.getByText(/Devolvida: "Mandar a proposta/).waitFor();
  const u = (await escritas(pagina)).filter((e) => e.tabela === 'xperf_demandas' && e.tipo === 'update').at(-1).patch;
  assert.deepEqual([u.status, u.devolvida_motivo], ['devolvida', 'a proposta já foi enviada na sexta']);
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="demanda-recebida"]').length === 0);
  assert.match(await texto(pagina, '[data-teste="painel-demandas"]'), /1 devolvida/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('CELULAR: o encontro e o painel cabem na tela — foto pra julgar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.locator('[data-teste="pautas-texto"]').fill(PAUTAS);
  await pagina.locator('[data-teste="gerar-topico"]').click();
  await pagina.locator('[data-teste="topico-item"]').first().waitFor();
  const larguraDoc = await pagina.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(larguraDoc <= 390 + 2, `a página não pode rolar de lado (largura ${larguraDoc})`);
  await pagina.screenshot({ path: path.join(FOTOS, 'encontro-celular.png'), fullPage: true });
  await ctx.close();
});

test('PERFORMANCE (sem administração): a visão executiva de todo mundo — quem planejou, quem produziu, o semáforo — e clicar na pessoa abre o painel dela', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.locator('[data-teste="visao-linha"]').first().waitFor();
  assert.match(await texto(pagina, '[data-teste="visao-resumo"]'), /planejaram hoje\s*1 de 4.*produziram na semana\s*2 de 4.*demandas concluídas\s*1 de 2 · 50%/);
  const linhas = pagina.locator('[data-teste="visao-linha"]');
  assert.deepEqual(await linhas.evaluateAll((els) => els.map((e) => [e.dataset.pessoa, e.dataset.cor, e.dataset.produziu])), [
    ['emanuel', 'amarelo', 'sim'], // planejou e fez 1/2, mas tem demanda sem agendar
    ['carla', 'verde', 'sim'],     // dia vazio hoje; a demanda dela já foi conferida
    ['jean', 'verde', 'nao'],      // dia vazio, nada feito: não fez
    ['dono', 'verde', 'nao'],      // o CEO também está no time — e também não fez
  ]);
  assert.match(await linhas.nth(0).textContent(), /Emanuel Silva.*planejou · 2\/3 feitas.*1 sem agendar.*fez/);
  assert.match(await linhas.nth(2).textContent(), /Jean Aranha.*dia vazio.*não fez/);
  await linhas.nth(1).click();
  await pagina.locator('[data-teste="painel-corporativo"][data-pessoa="carla"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="painel-corporativo"]'), /Carla Souza/);
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('X-PERFORMANCE: os 8 Hábitos do time, hoje — quem fez com o detalhe, quem não fez com o motivo; semana e mês; clicar no chip abre o painel', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  const oito = pagina.locator('[data-teste="oito-habitos"]');
  await oito.locator('[data-teste="habito"]').first().waitFor();
  assert.equal(await oito.locator('[data-teste="habito"]').count(), 8);
  assert.equal(await pagina.locator('[data-teste="performance-equipe"]').getAttribute('data-periodo'), 'hoje');
  const cartao = (n) => oito.locator(`[data-teste="habito"][data-n="${n}"]`);
  const txt = async (n) => (await cartao(n).textContent()).replace(/\s+/g, ' ');
  // 1 Sonho: o Emanuel tem 2 sonhos; os outros não têm quadro
  assert.match(await txt(1), /1\. Sonho.*1 de 4.*2 sonhos no time.*Emanuel\s*· 2 sonhos no quadro · gratidão 1×.*não fez/);
  assert.match(await txt(1), /Carla\s*· sem quadro/);
  // 2 Compromisso: só o Emanuel acordou (story das 05:15)
  assert.match(await txt(2), /2\. Compromisso.*1 de 4.*Emanuel\s*· acordou · rotina/);
  // 4 Contato: 2 contatos do Emanuel (1 agendado)
  assert.match(await txt(4), /4\. Contato e Convite.*2 contatos no time.*Emanuel\s*· 2 contatos · 1 agendado/);
  // 6 Fechamento: Emanuel fechou R$ 50 mil de captação; Carla vendeu R$ 1.200; Jean e Luiz não venderam
  assert.match(await txt(6), /6\. Acompanhamento e Fechamento.*R\$ 51\.200,00 no time.*Emanuel\s*· 1 captação · R\$ 50\.000,00.*Carla\s*· 1 venda · R\$ 1\.200,00.*não fez.*Jean\s*· não vendeu/);
  // o resumo
  assert.match((await pagina.locator('[data-teste="oito-resumo"]').textContent()).replace(/\s+/g, ' '), /acordaram\s*1 de 4.*contatos feitos\s*2.*venderam ou fecharam\s*2 de 4/);
  // a tabela por pessoa mostra os hábitos de cada um
  assert.match((await pagina.locator('[data-teste="visao-linha"][data-pessoa="emanuel"]').textContent()).replace(/\s+/g, ' '), /Emanuel Silva.*[5-8]\/8/);
  // semana: o rótulo muda e o Compromisso vira "acordou X de Y dias"
  await pagina.locator('[data-teste="periodo"] [data-periodo="semana"]').click();
  await pagina.locator('[data-teste="performance-equipe"][data-periodo="semana"]').waitFor();
  await pagina.waitForFunction(() => /acordou 1 de 1 dia/.test(document.querySelector('[data-teste="habito"][data-n="2"]')?.textContent || ''));
  await pagina.locator('[data-teste="periodo"] [data-periodo="mes"]').click();
  await pagina.locator('[data-teste="performance-equipe"][data-periodo="mes"]').waitFor();
  assert.match((await oito.textContent()).replace(/\s+/g, ' '), /este mês/);
  // clicar no chip da Carla abre o painel dela
  await cartao(6).locator('[data-teste="chip"]', { hasText: 'Carla' }).first().click();
  await pagina.locator('[data-teste="painel-corporativo"][data-pessoa="carla"]').waitFor();
  await pagina.screenshot({ path: path.join(FOTOS, 'xperformance-oito-habitos.png'), fullPage: true });
  assert.deepEqual(erros, []);
  await ctx.close();
});
