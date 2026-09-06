/**
 * A GESTÃO DENTRO DO X-PERFORMANCE: distribuir tarefa com o dinheiro na mão.
 *
 * 🔴 Dono (06/09/2026): "junta o admin do X-Game com o X-Performance. Ali eu
 * boto a tarefa, seleciono o responsável, isso já entra na tarefa do dia
 * dele com quanto equivale em dinheiro dentro do fixo mensal. O sistema tem
 * que me avisar: essa tarefa tem peso x, vale x, e automaticamente vai ser
 * tirado das outras."
 *
 * O que só o navegador mede (banco de mentira, Emanuel a R$ 7.000):
 *   • a prévia diz quanto a tarefa vale E quanto cada outra do dia perde,
 *     ANTES de gravar;
 *   • distribuir grava na tabela do Compromisso da pessoa (origem xperf) e a
 *     lista do dia recalcula na hora; desfazer só o que nasceu aqui;
 *   • mudar o fixo muda o valor do dia em todo lugar;
 *   • dia abaixo do mínimo avisa o que fica em aberto;
 *   • o admin de sempre abre embutido;
 *   • cabe no celular (foto).
 *
 * COMO RODAR
 *   npm i -D playwright        (uma vez; o Chromium já está na máquina)
 *   npm run test:navegador
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SAIDA = process.env.SAIDA_BANCA
  || path.join(tmpdir(), `banca-${path.basename(new URL(import.meta.url).pathname, '.spec.mjs')}`);
const FOTOS = process.env.FOTOS_BANCA || path.join(SAIDA, 'fotos');
const CROMO = process.env.CAMINHO_CHROMIUM
  || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find((c) => existsSync(c));

let chromium = null;
try {
  ({ chromium } = await import('playwright'));
} catch { /* dependência opcional: os casos se marcam como PULADOS */ }

const semNavegador = chromium ? false : 'playwright não instalado — rode: npm i -D playwright';

let navegador; let BASE; let servidor;
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };

async function garantirNavegador() {
  if (navegador) return navegador;
  execFileSync('npx', ['vite', 'build', '--config', path.join(AQUI, 'vite.config.mjs')], {
    cwd: path.join(AQUI, '..', '..'),
    env: { ...process.env, SAIDA_BANCA: SAIDA },
    stdio: 'inherit',
  });
  servidor = createServer((req, res) => {
    const rel = (req.url || '/').split('?')[0];
    const arq = path.join(SAIDA, rel === '/' ? 'performance.html' : decodeURIComponent(rel));
    if (!arq.startsWith(SAIDA) || !existsSync(arq)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(arq)] || 'application/octet-stream' });
    res.end(readFileSync(arq));
  });
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
  BASE = `http://127.0.0.1:${servidor.address().port}/performance.html`;
  navegador = await chromium.launch(CROMO ? { executablePath: CROMO } : {});
  mkdirSync(FOTOS, { recursive: true });
  return navegador;
}

test.after(async () => {
  if (navegador) await navegador.close();
  if (servidor) servidor.close();
});

async function abrir({ celular = false } = {}) {
  const nav = await garantirNavegador();
  const ctx = await nav.newContext(celular
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }
    : { viewport: { width: 1280, height: 900 } });
  const pagina = await ctx.newPage();
  const erros = [];
  pagina.on('pageerror', (e) => erros.push(e.message));
  await pagina.goto(BASE);
  await pagina.locator('[data-teste="gestao"]').waitFor();
  await pagina.locator('[data-teste="pessoa"]').selectOption('emanuel');
  await pagina.locator('[data-teste="tarefas-dia"] li').first().waitFor(); // as tarefas do 08/09 do Emanuel
  return { pagina, ctx, erros };
}

const escritas = (pagina) => pagina.evaluate(() => window.__bancoFalso.escritas);
const texto = async (pagina, sel) => (await pagina.locator(sel).textContent()).replace(/\s+/g, ' ').trim();
const ATE = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

test('PRÉVIA: antes de gravar, diz quanto a tarefa vale e o que cada outra do dia perde', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  assert.equal(await pagina.locator('[data-teste="dia"]').inputValue(), '2026-09-08', 'o dia nasce em "amanhã" (dia útil)');
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(291.67), 'R$ 7.000 ÷ 24 dias de operação');
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li').count(), 3);

  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  // 🪄 o peso nasce sozinho pelo título ("reunião" = ação de negócio, peso 6), com o motivo ao lado
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '6');
  assert.match(await texto(pagina, '[data-teste="peso-motivo"]'), /peso 6 — ação de negócio/);
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  await pagina.locator('[data-teste="peso-auto"]').waitFor(); // mexeu: agora é o seu, com o caminho de volta
  // 📏 o dia completo é a Rotina Perfeita (peso 75): peso 4 vale 4/75 de R$ 291,67 — nada de um terço do dia
  assert.equal(await texto(pagina, '[data-teste="valor-nova"]'), ATE(15.58));
  const aviso = await texto(pagina, '[data-teste="faltam"]');
  assert.match(aviso, /o dia paga R\$ 31,11 de R\$ 291,67/);
  assert.match(aviso, /Rotina Perfeita \(peso 75\) e ainda falta peso 67/);
  assert.equal(await pagina.locator('[data-teste="quedas"]').count(), 0, 'abaixo do dia completo, a tarefa nova não tira das outras');
  assert.deepEqual(await escritas(pagina), [], 'prévia não grava NADA');
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-previa.png'), fullPage: false });
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('DISTRIBUIR: grava na tabela do Compromisso da pessoa (origem xperf) e a lista do dia recalcula na hora; desfazer só o que nasceu aqui', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/vale R\$ 15,58 — as outras do dia foram recalculadas/).waitFor();

  const e = await escritas(pagina);
  assert.equal(e.length, 1);
  assert.equal(e[0].tipo, 'insert');
  assert.equal(e[0].tabela, 'metodo_tarefas');
  const l = e[0].linhas[0];
  assert.equal(l.user_id, 'emanuel');
  assert.equal(l.data, '2026-09-08');
  assert.equal(l.titulo, 'Pegar as pautas da reunião de amanhã');
  assert.equal(l.peso, 4);
  assert.equal(l.categoria, 'producao', 'a categoria é lida do texto: "reunião" é ação de produção');
  assert.equal(l.origem, 'xperf');
  assert.equal(l.criado_por_id, 'dono');
  assert.equal(l.feito, false);

  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 4);
  const linhas = (await pagina.locator('[data-teste="tarefas-dia"] li').allTextContents()).map((s) => s.replace(/\s+/g, ' '));
  assert.match(linhas.find((s) => s.includes('Gratidão')), /R\$ 3,8[89]/, 'a Gratidão (peso 1) vale 1/75 do dia (o centavo da sobra vai pra de maior peso)');
  assert.match(linhas.find((s) => s.includes('pautas')), /peso 4.*R\$ 15,58/);
  assert.equal(await pagina.locator('[data-teste="titulo"]').inputValue(), '', 'o campo limpa pra próxima');

  // só a tarefa distribuída aqui tem o "desfazer"
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li[data-origem="xperf"] button').count(), 1);
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li[data-origem=""] button').count(), 0);
  await pagina.getByRole('button', { name: /desfazer Pegar as pautas/ }).click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 3);
  assert.equal((await escritas(pagina)).at(-1).tipo, 'delete');
  await ctx.close();
});

test('FIXO: o menu suspenso abre o modal da pessoa, e mudar o fixo muda o valor do dia em todo lugar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // quem aparece vem do painel de controle: do executivo ao embaixador — o trainee não entra
  const nomes = await pagina.locator('[data-teste="pessoa-fixo"] option').allTextContents();
  assert.ok(nomes.some((n) => /Carla Souza · Embaixador/.test(n)), nomes.join(' | '));
  assert.ok(nomes.some((n) => /Emanuel Silva · Sócio Executivo/.test(n)), 'a função vem do painel, não do jogo');
  assert.ok(nomes.some((n) => /Luiz Santanna · CEO · sem fixo/.test(n)), 'o CEO sem cadastro no jogo aparece, marcado');
  assert.ok(!nomes.some((n) => /Tiago/.test(n)), 'trainee fica de fora');
  assert.equal(await pagina.locator('[data-teste="fixo-pessoa"]').count(), 0, 'sem a parede de cartões');

  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('emanuel');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.waitFor();
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(291.67));
  // o ciclo do Emanuel: 04/09 teve Gratidão (peso 1) feita e conferida → 1/75 do dia
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /R\$ 19,44\s*ganho/);
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /ter\., 08\/09.*3 tarefas · falta peso 71.*R\$ 15,56/, 'o que está distribuído de hoje em diante');

  await pagina.screenshot({ path: path.join(FOTOS, 'performance-modal.png') });
  await modal.locator('[data-teste="fixo-mes"]').fill('4400');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.tabela, 'xgame_participantes');
  assert.equal(e.linhas[0].fixo_mes, 4400);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('183,33'));
  await pagina.getByRole('button', { name: 'Fechar' }).click();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(183.33), 'a prévia lê o mesmo fixo');
  await ctx.close();
});

test('FIXO: quem não tem cadastro no jogo ganha um ao definir o fixo pela primeira vez', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('dono');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="dono"]');
  await modal.locator('[data-teste="sem-fixo-modal"]').waitFor();
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(54.17), 'até definir, a verba padrão');
  await modal.locator('[data-teste="fixo-mes"]').fill('11000');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.linhas[0].user_id, 'dono');
  assert.equal(e.linhas[0].cargo, 'ceo', 'o cargo do jogo vem do nível do painel');
  assert.equal(e.linhas[0].ativo, true);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('458,33'));
  assert.equal(await modal.locator('[data-teste="sem-fixo-modal"]').count(), 0);
  await ctx.close();
});

test('DIA INCOMPLETO: quem não tem fixo usa a verba de produção; e o aviso diz o que falta pro dia completo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa"]').selectOption('carla');
  await pagina.locator('[data-teste="sem-fixo"]').waitFor();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(54.17), 'R$ 1.300 ÷ 24');
  await pagina.locator('[data-teste="titulo"]').fill('Separar os documentos da reunião');
  await pagina.locator('[data-teste="faltam"]').waitFor();
  const aviso = await texto(pagina, '[data-teste="faltam"]');
  // "reunião" = peso 6; Carla é diretora no jogo (+1, teto 6): 6/75 de 54,17 = 4,33
  assert.match(aviso, /o dia paga R\$ 4,33 de R\$ 54,17/);
  assert.match(aviso, /falta peso 69/);
  await ctx.close();
});

test('ADMIN EMBUTIDO: a gestão do X-GAME de sempre abre dentro do X-Performance', { skip: semNavegador }, async () => {
  const { pagina, ctx, erros } = await abrir();
  await pagina.locator('[data-teste="abrir-admin"]').click();
  await pagina.getByRole('button', { name: /Participantes/ }).first().waitFor();
  await pagina.getByText('Início oficial do ciclo').waitFor();
  assert.deepEqual(erros, []);
  await ctx.close();
});

test('MENTALIDADE: a tarefa nasce com a trilha da pessoa, o peso ganha o acréscimo e o ensinamento vai junto — no banco e na prévia', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // Emanuel é executivo no jogo → a mentalidade nasce na do executivo
  assert.equal(await pagina.locator('[data-teste="mentalidade"]').inputValue(), 'executivo');
  await pagina.locator('[data-teste="titulo"]').fill('Leitura do capítulo 3');
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '4', 'leitura = peso 4 pelo título');
  // 🎯 o Hábito nunca fica em "—": sem palavra que aponte um, vem o típico da mentalidade
  assert.equal(await pagina.locator('[data-teste="habito"]').inputValue(), '2');
  assert.match(await texto(pagina, '[data-teste="habito-motivo"]'), /Hábito típico da Mentalidade do Executivo/);
  await pagina.locator('[data-teste="mentalidade"]').selectOption('diretor');
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '5', 'diretor soma 1');
  assert.match(await texto(pagina, '[data-teste="peso-motivo"]'), /\+ 1 pela Mentalidade do Diretor/);
  // os hábitos oferecidos são os da trilha do diretor (5 a 8)
  const habitos = await pagina.locator('[data-teste="habito"] option').allTextContents();
  assert.deepEqual(habitos.map((h) => h.trim().slice(0, 1)), ['—', '5', '6', '7', '8']);
  await pagina.locator('[data-teste="habito"]').selectOption('6');
  const ens = await texto(pagina, '[data-teste="ensinamento"]');
  assert.match(ens, /Mentalidade do Diretor — multiplicar e medir/);
  assert.match(ens, /O diretor multiplica e mede/);
  assert.match(ens, /Hábito 6 \(Acompanhamento e Fechamento\)/);

  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Tarefa distribuída pra Emanuel/).waitFor();
  const l = (await escritas(pagina)).at(-1).linhas[0];
  assert.equal(l.mentalidade, 'diretor');
  assert.equal(l.habito, 6);
  assert.equal(l.peso, 5);
  assert.match(l.detalhe, /^🎓 Mentalidade do Diretor/);
  assert.match(l.detalhe, /Hábito 6/);
  // a lista do dia mostra a etiqueta da mentalidade
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 4);
  assert.match((await pagina.locator('[data-teste="tarefas-dia"] li').allTextContents()).join(' | '), /diretor · H6/);
  await ctx.close();
});

test('PLANEJAMENTO: o modal avisa quem não gerou o dia, e gera a Rotina Perfeita dele daqui', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // Emanuel não tem tarefa em 07/09 (hoje) → não gerou
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('emanuel');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.locator('[data-teste="planejamento-dia"][data-gerado="nao"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="planejamento-dia"]'), /Não gerou o planejamento de hoje/);
  // o ciclo por mentalidade: as 6 tarefas semeadas são da rotina (sem mentalidade)
  assert.match(await texto(pagina, '[data-teste="por-mentalidade"] [data-mentalidade="rotina"]'), /6 tarefas/);

  await modal.locator('[data-teste="gerar-planejamento"]').click();
  await pagina.getByText(/gerado pra Emanuel Silva: 20 tarefas da Rotina Perfeita/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'insert');
  assert.equal(e.linhas.length, 20, 'a Rotina do Método inteira');
  assert.ok(e.linhas.every((x) => x.user_id === 'emanuel' && x.data === '2026-09-07' && x.peso >= 1 && x.categoria));
  await modal.locator('[data-teste="planejamento-dia"][data-gerado="sim"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="planejamento-dia"]'), /Planejamento de hoje gerado · 20 da rotina/);
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-planejamento.png') });
  await ctx.close();
});

test('CATÁLOGO: a lista do que tem pra fazer, por mentalidade; escolher uma ação preenche título, mentalidade, Hábito e peso', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const grupos = await pagina.locator('[data-teste="catalogo"] optgroup').evaluateAll((els) => els.map((e) => e.label));
  assert.deepEqual(grupos.map((g) => g.split(' — ')[0]), ['Mentalidade do Executivo', 'Mentalidade do Diretor', 'Mentalidade do CEO']);
  assert.ok((await pagina.locator('[data-teste="catalogo"] option').count()) >= 19, 'o catálogo inicial mais a linha vazia');
  const pautas = await pagina.locator('[data-teste="catalogo"] option', { hasText: /Pegar as pautas da reunião de segunda/ }).getAttribute('value');
  await pagina.locator('[data-teste="catalogo"]').selectOption(pautas);
  assert.equal(await pagina.locator('[data-teste="titulo"]').inputValue(), 'Pegar as pautas da reunião de segunda');
  assert.equal(await pagina.locator('[data-teste="mentalidade"]').inputValue(), 'diretor');
  assert.equal(await pagina.locator('[data-teste="habito"]').inputValue(), '7');
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '6');
  // 📏 e o valor coerente: peso 6 de 75 → R$ 23,33 num dia de R$ 291,67 (+ os centavos da sobra, que vão pra de maior peso)
  assert.equal(await texto(pagina, '[data-teste="valor-nova"]'), ATE(23.36));
  assert.match(await texto(pagina, '[data-teste="ensinamento"]'), /Mentalidade do Diretor.*Hábito 7 \(Verificação do Progresso\)/s);
  await ctx.close();
});

test('CATÁLOGO: ação escrita à mão é lida pela régua e pode ser salva no menu; ao distribuir, conta um uso', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="titulo"]').fill('Visitar a loja do Centro');
  assert.match(await texto(pagina, '[data-teste="mentalidade-lida"]'), /Mentalidade do Executivo \(pelo texto: ação da própria mão\)/);
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '6', 'loja = ação de negócio');
  await pagina.locator('[data-teste="salvar-catalogo"]').click();
  await pagina.getByText(/entrou no catálogo \(Mentalidade do Executivo, peso 6\)/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tabela, 'xperf_acoes');
  assert.deepEqual([e.linhas[0].titulo, e.linhas[0].mentalidade, e.linhas[0].habito, e.linhas[0].peso, e.linhas[0].criado_por_id], ['Visitar a loja do Centro', 'executivo', 5, 6, 'dono'], 'visita = Hábito 5, automático');
  // entrou no menu, marcada como sua, e o botão de salvar some (já está lá)
  const opcao = pagina.locator('[data-teste="catalogo"] option', { hasText: /Visitar a loja do Centro/ });
  assert.match(await opcao.textContent(), /· sua$/);
  assert.equal(await pagina.locator('[data-teste="salvar-catalogo"]').count(), 0);
  // distribuir com ela escolhida conta um uso
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Tarefa distribuída pra Emanuel/).waitFor();
  await pagina.waitForFunction(() => window.__bancoFalso.escritas.some((x) => x.tipo === 'update' && x.tabela === 'xperf_acoes'));
  const uso = (await escritas(pagina)).find((x) => x.tipo === 'update' && x.tabela === 'xperf_acoes');
  assert.equal(uso.patch.usos, 1);
  await ctx.close();
});

test('PRONTO: a tarefa sai com "começar às" e "pronto até", e a pessoa vê o prazo na linha', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  assert.equal(await pagina.locator('[data-teste="prazo-dia"]').inputValue(), '2026-09-08', 'o pronto nasce no dia da tarefa');
  assert.equal(await pagina.locator('[data-teste="prazo-hora"]').inputValue(), '18:00');
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="hora-inicio"]').fill('14:00');
  await pagina.locator('[data-teste="prazo-hora"]').fill('17:30');
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Tarefa distribuída pra Emanuel/).waitFor();
  const l = (await escritas(pagina)).at(-1).linhas[0];
  assert.equal(l.hora, '14:00');
  const prazo = await pagina.evaluate((iso) => { const d = new Date(iso); return [d.getDate(), d.getHours(), d.getMinutes()]; }, l.prazo_em);
  assert.deepEqual(prazo, [8, 17, 30], 'pronto até 08/09 17:30, no fuso da pessoa');
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 4);
  assert.match((await pagina.locator('[data-teste="prazo-linha"]').allTextContents()).join(' | '), /pronto até 17:30/);
  await ctx.close();
});

test('FILA DO PRONTO: o pronto da Carla espera o ✔✔; devolver com recado desfaz o pronto e grava o porquê; conferir dá o SIM', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const item = pagina.locator('[data-teste="pronto-item"]');
  assert.equal(await item.count(), 1);
  assert.equal(await item.getAttribute('data-estado'), 'pronto');
  assert.match(await texto(pagina, '[data-teste="pronto-item"]'), /Carla Souza.*Enviar o relatório da loja.*pronto até 18:00/);

  // devolver com recado
  await pagina.locator('[data-teste="devolver"]').click();
  await pagina.locator('[data-teste="recado"]').fill('faltou o print da tela');
  await pagina.locator('[data-teste="devolver-confirmar"]').click();
  await pagina.getByText(/devolvida pra Carla Souza: "faltou o print da tela"/).waitFor();
  let e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'update');
  assert.equal(e.tabela, 'metodo_tarefas');
  assert.deepEqual([e.patch.feito, e.patch.pronto_em, e.patch.conferido, e.patch.devolvida_motivo], [false, null, null, 'faltou o print da tela']);
  await pagina.locator('[data-teste="pronto-item"][data-estado="devolvida"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="pronto-item"]'), /↩ "faltou o print da tela"/);

  // a Carla refez e deu o pronto de novo (no banco); a fila mostra "pronto" e o ✔✔ confere
  await pagina.evaluate(() => { const t = window.__bancoFalso.tabelas.metodo_tarefas.find((x) => x.id === 't6'); Object.assign(t, { feito: true, pronto_em: new Date().toISOString(), devolvida_motivo: null, devolvida_em: null }); });
  await pagina.locator('[data-teste="dia"]').fill('2026-09-09'); // qualquer mudança recarrega as tarefas do ciclo
  await pagina.locator('[data-teste="pronto-item"][data-estado="pronto"]').waitFor();
  await pagina.locator('[data-teste="conferir"]').click();
  await pagina.getByText(/✔✔ conferida: Enviar o relatório da loja/).waitFor();
  e = (await escritas(pagina)).at(-1);
  assert.deepEqual(e.patch, { conferido: true });
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="pronto-item"]').length === 0);
  assert.match(await texto(pagina, '[data-teste="fila-pronto"]'), /1 conferida no ciclo/);
  await ctx.close();
});

test('LEITURA VIVA: a leitura muda a cada palavra — o último nome escrito vence, e os temas viram etiquetas', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const titulo = pagina.locator('[data-teste="titulo"]');
  await titulo.fill('Pegar as pautas');
  assert.match(await texto(pagina, '[data-teste="leitura-mentalidade"]'), /Mentalidade do Diretor · pelo texto: "pautas"/);
  assert.match(await texto(pagina, '[data-teste="leitura-habito"]'), /Hábito 7 · Verificação do Progresso/);
  await titulo.fill('Pegar as pautas da reunião de amanhã mentalidade do CEO');
  assert.match(await texto(pagina, '[data-teste="leitura-mentalidade"]'), /Mentalidade do CEO · pelo texto: "mentalidade do ceo"/, 'não ficou presa na primeira palavra');
  assert.equal(await pagina.locator('[data-teste="mentalidade"]').inputValue(), 'ceo');
  await titulo.fill('Pegar as pautas da reunião de amanhã mentalidade do CEO, e do executivo');
  assert.equal(await pagina.locator('[data-teste="mentalidade"]').inputValue(), 'executivo', 'o último escrito vence o empate');
  await titulo.fill('Pegar as pautas da reunião de amanhã mentoria mentalidade do diretor / ceo visão estratégica, metas e organização constante');
  assert.equal(await pagina.locator('[data-teste="mentalidade"]').inputValue(), 'diretor');
  assert.equal(await pagina.locator('[data-teste="habito"]').inputValue(), '7');
  assert.equal(await pagina.locator('[data-teste="categoria"]').inputValue(), 'mentoria', 'a categoria também é lida do texto');
  assert.deepEqual(await pagina.locator('[data-teste="leitura-tema"]').allTextContents(), ['#visão estratégica', '#metas', '#organização', '#reunião', '#constância']);
  assert.match(await texto(pagina, '[data-teste="ensinamento"]'), /Temas: visão estratégica, metas, organização, reunião, constância\./, 'os temas vão no ensinamento');
  // "parece com": o catálogo sugere a ação parecida, e clicar preenche
  await titulo.fill('pegar pautas reunião');
  await pagina.locator('[data-teste="parece-com"]').waitFor();
  await pagina.locator('[data-teste="parece-com"] button', { hasText: /Pegar as pautas da reunião de segunda/ }).click();
  assert.equal(await titulo.inputValue(), 'Pegar as pautas da reunião de segunda');
  await ctx.close();
});

test('MENTORIA COMPLETA: 15 min de leitura, 45 de treinamento e 2h de reunião viram três tarefas encadeadas no horário', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="titulo"]').fill('Mentoria de segunda com o time');
  await pagina.locator('[data-teste="hora-inicio"]').fill('14:00');
  assert.equal(await pagina.locator('[data-teste="categoria"]').inputValue(), 'mentoria');
  await pagina.locator('[data-teste="mentoria-caixa"]').check();
  const blocos = await pagina.locator('[data-teste="mentoria-blocos"] > span').allTextContents();
  assert.equal(blocos.length, 3);
  assert.match(blocos[0], /^14:00 · Mentoria de segunda com o time — Leitura \(15 min\)/);
  assert.match(blocos[1], /^14:15 · .*Treinamento \(45 min\)/);
  assert.match(blocos[2], /^15:00 · .*Reunião \(2h\): visão estratégica, metas e aplicabilidade/);
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Mentoria distribuída pra Emanuel Silva: 3 blocos, das 14:00 às 15:00/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.linhas.length, 3);
  assert.deepEqual(e.linhas.map((l) => [l.hora, l.habito, l.categoria, l.mentalidade]), [['14:00', 8, 'bonus', 'diretor'], ['14:15', 8, 'mentoria', 'diretor'], ['15:00', 7, 'mentoria', 'diretor']]);
  assert.ok(e.linhas.every((l) => l.origem === 'xperf' && l.prazo_em && /Bloco da mentoria/.test(l.detalhe)));
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 6);
  await ctx.close();
});

test('FAXINA: pra gestão, a pessoa vem primeiro; mentalidades, contas, encontro e quadro ficam dobrados', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const ordem = await pagina.evaluate(() => [...document.querySelectorAll('[data-teste="gestao"], details[data-teste^="dobra-"]')].map((e) => e.getAttribute('data-teste')));
  assert.deepEqual(ordem, ['gestao', 'dobra-diretoria', 'dobra-sobre'], 'embaixo só o que é da diretoria e o "sobre"; o resto foi pro Quadro Geral');
  for (const id of ['diretoria', 'sobre']) {
    assert.equal(await pagina.locator(`details[data-teste="dobra-${id}"]`).evaluate((e) => e.open), false, `${id} devia nascer dobrada`);
  }
  // os quadradões só aparecem pra quem abre
  assert.equal(await pagina.getByText('Mentalidade do CEO', { exact: true }).isVisible(), false);
  await pagina.locator('details[data-teste="dobra-sobre"] summary').click();
  await pagina.getByText('Construir o sistema').waitFor();
  // 🏛️ o grupo: a holding, os quatro pilares-empresa, visão, missão e os 18 valores
  await pagina.getByText('Estamos lendo o jornal de 2044.').waitFor();
  assert.equal(await pagina.locator('[data-teste="pilar"]').count(), 4);
  assert.equal(await pagina.locator('[data-teste="valores"] span').count(), 18);
  assert.match(await texto(pagina, '[data-teste="grupo"]'), /To The Top Corporate — Venture Builder, Venture Capital e Holding Estratégica/);
  await ctx.close();
});

test('FUNÇÃO E EMPRESA: a posição vem do painel de controle e a função do Documento Oficial (Emanuel → COO); pode ser trocada (CFO); a empresa e o "através da" gravam; o dia da função é distribuído de uma vez', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('emanuel');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.locator('[data-teste="funcao-empresa"]').waitFor();
  // a POSIÇÃO é a do painel (Sócio Executivo); a FUNÇÃO o documento sugere pelo nome: Emanuel Alves é o COO (p. 5, 21)
  assert.equal(await texto(pagina, '[data-teste="posicao-painel"]'), 'Sócio Executivo');
  assert.match(await texto(pagina, '[data-teste="funcao-resumo"]'), /COO · Diretor de Operações · Mentalidade do Diretor — entrega estratégia virando execução.*sugerida pelo Documento Oficial/);
  assert.match(await texto(pagina, '[data-teste="cabecalho-pessoa"]'), /Sócio Executivo no painel de controle · função COO/);
  assert.equal(await modal.locator('[data-teste="funcao"]').inputValue(), '', 'sugerida, não escolhida: o menu fica na sugestão');
  assert.match(await modal.locator('[data-teste="funcao"] option').first().textContent(), /sugerida: COO/);
  // o menu separa o Documento Oficial das funções do painel
  assert.deepEqual(await modal.locator('[data-teste="funcao"] optgroup').evaluateAll((els) => els.map((e) => e.label)), ['Documento Oficial', 'Funções de mercado', 'Funções do painel de controle']);
  assert.ok((await modal.locator('[data-teste="funcao"] option').allTextContents()).some((t) => /Diretora de Logística/.test(t)), 'a Logística entrou');
  assert.equal(await modal.locator('[data-teste="dia-funcao"] li').count(), 7, 'o dia do COO: 7 tarefas, com as 2 reuniões de investimento');
  assert.equal(await modal.locator('[data-teste="dia-funcao"] li', { hasText: 'Reunião de investimento' }).count(), 2);

  // o dono decide: ela é a diretora financeira → CFO (o documento não tem CFO; fica dito)
  await modal.locator('[data-teste="funcao"]').selectOption('cfo');
  await pagina.getByText(/painel atualizado/).waitFor();
  assert.equal((await escritas(pagina)).at(-1).linhas[0].funcao_titulo, 'cfo');
  await pagina.waitForFunction(() => /CFO · Diretor Financeiro/.test(document.querySelector('[data-teste="funcao-resumo"]')?.textContent || ''));
  assert.equal(await modal.locator('[data-teste="funcao-oficial"]').getAttribute('data-origem'), 'escolhida');
  assert.match(await texto(pagina, '[data-teste="funcao-oficial"]'), /Não consta no Documento Oficial/);
  await modal.locator('[data-teste="empresa"]').selectOption('leilao_no_zap');
  await modal.locator('[data-teste="empresa-via"]').selectOption('to_the_top');
  await pagina.waitForFunction(() => /Leilão no Zap, através da To The Top Corporate/.test(document.querySelector('[data-teste="funcao-resumo"]')?.textContent || ''));
  const gravadas = (await escritas(pagina)).filter((e) => e.tipo === 'upsert' && e.tabela === 'xgame_participantes').map((e) => e.linhas[0]);
  assert.ok(gravadas.some((l) => l.empresa === 'leilao_no_zap'));
  assert.ok(gravadas.some((l) => l.empresa_via === 'to_the_top'));
  // as cinco do grupo estão no menu, a holding primeiro
  assert.deepEqual((await modal.locator('[data-teste="empresa"] option').allTextContents()).slice(1), ['To The Top Corporate', 'X-EOS', 'Top Tech Digital', 'Leilão no Zap', 'Human Bank']);

  // o dia do CFO, distribuído de uma vez pra hoje
  await modal.locator('[data-teste="gerar-dia-funcao"]').click();
  await pagina.getByText(/CFO · Diretor Financeiro: 4 tarefas do dia distribuídas pra Emanuel Silva/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tabela, 'metodo_tarefas');
  assert.equal(e.linhas.length, 4);
  assert.deepEqual([e.linhas[0].hora, e.linhas[0].mentalidade, e.linhas[0].origem, e.linhas[0].data], ['08:30', 'ceo', 'xperf', '2026-09-07']);
  assert.ok(e.linhas.every((l) => l.prazo_em && /Tarefa da função CFO/.test(l.detalhe)));
  await ctx.close();
});

test('DOCUMENTO OFICIAL NO PAINEL: a função com missão, metas e entregáveis; as cinco camadas com os números dela; o Score Executivo com a linha dos 80% e a escada', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const modal = await abrirQuadroGeral(pagina);
  const oficial = modal.locator('[data-teste="funcao-oficial"]');
  await oficial.waitFor();
  assert.equal(await oficial.getAttribute('data-funcao'), 'coo');
  assert.equal(await oficial.getAttribute('data-origem'), 'documento');
  const t = (await oficial.textContent()).replace(/\s+/g, ' ');
  assert.match(t, /COO · Chief Operating Officer · Diretor de Operações/);
  assert.match(t, /missão: Transformar estratégia em execução\. · dono da execução/);
  assert.match(t, /titular no documento: Emanuel Alves · budget R\$ 7\.000,00\/mês/);
  assert.match(t, /Captação R\$ 150\.000,00 por mês · R\$ 900\.000,00 no ciclo/);
  assert.match(t, /1 ponto de retirada por mês \(6 em 6 meses\)/);
  assert.match(t, /Documento p\. 5, 21/);
  // as cinco camadas: fixo 7.000; carteira = o aporte de set (50 mil) + nada velho demais → R$ 500/mês; pool só quando estiver na Diretoria Operacional; equity 0,5% = R$ 125 mil
  const camadas = modal.locator('[data-teste="modelo-economico"]');
  assert.equal(await texto(pagina, '[data-teste="camada-funcao"]'), 'R$ 7.000,00');
  assert.equal(await texto(pagina, '[data-teste="camada-carteira"]'), 'R$ 500,00/mês');
  assert.match((await camadas.textContent()).replace(/\s+/g, ' '), /carteira construída R\$ 50\.000,00 × 1% a\.m\./);
  assert.equal(await texto(pagina, '[data-teste="camada-pool"]'), '—');
  assert.equal(await texto(pagina, '[data-teste="camada-equity"]'), 'R$ 125.000,00');
  assert.match((await camadas.textContent()).replace(/\s+/g, ' '), /R\$ 100 mi → R\$ 500\.000,00/);
  // camada 5: o Emanuel é Sócio Executivo no painel → 1% sobre a própria estrutura; e a tabela dos 10% está escrita
  assert.equal(await texto(pagina, '[data-teste="camada-governanca"]'), 'Sócio Executivo 1%');
  assert.match((await camadas.textContent()).replace(/\s+/g, ' '), /1% sobre a própria estrutura de negócio \(não é pool\)/);
  assert.match((await camadas.textContent()).replace(/\s+/g, ' '), /os 10% do topo: CEO 3 · Livoo Live 2 · Embaixador 1 · Conselheiros 1 \(pool\) · Fundadores 1 \(pool\) · Diretoria Executiva 0,5 \(pool\) · Diretoria Operacional 0,5 \(pool\) · Sócio Executivo 1 sobre a própria estrutura/);
  // o Score: sem meta ainda → resultado sem dado; sem card no quadro → entregáveis sem dado; a Gratidão feita e a Estudo (bônus) não são H8 nem mentoria
  const score = modal.locator('[data-teste="score-executivo"]');
  await score.waitFor();
  const partes = await score.locator('[data-parte]').allTextContents();
  assert.match(partes[0], /sem dado/);
  assert.match(partes[1], /sem dado/);
  assert.match(partes[4], /100%/, 'organização: o dia 04/09 foi planejado (tarefas da rotina), o único dia passado com tarefa');
  assert.equal(await score.getAttribute('data-score'), '10');
  assert.match((await score.textContent()).replace(/\s+/g, ' '), /faltam 70 pontos pra linha dos 80%/);
  // a escada: sem tarefa de formação no ciclo e sem posição do painel → degrau 1 (Top College + X-EOS); o próximo é a trilha
  assert.equal(await score.getAttribute('data-degrau'), '1');
  assert.match(await modal.locator('[data-teste="escada"] [data-atual="sim"]').textContent(), /1\. Top College \+ X-EOS/);
  assert.match((await score.textContent()).replace(/\s+/g, ' '), /próximo degrau: Mentalidade do Diretor \+ CEO/);
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-pessoa-oficial.png'), fullPage: true });
  // a semana oficial na aba Semana: segunda 9h–12h, as lives, a Conexão Sexta
  await aba(modal, 'semana');
  const rituais = (await texto(pagina, '[data-teste="rituais-semana"]')).replace(/\s+/g, ' ');
  assert.match(rituais, /09\/2026: Estruturação/);
  assert.match(rituais, /▸ Bloco 1 — Formação 09:00–10:00/, 'hoje é segunda: os blocos da manhã estão acesos');
  assert.match(rituais, /▸ Live comercial/);
  assert.match(rituais, /• Conexão Sexta \(opcional\)/);
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-documento-oficial.png'), fullPage: true });
  await ctx.close();
});

test('DESTINO: a demanda pode cair na lista, no quadro dele ou nos dois (ligados); a prioridade vira o prazo do card; repetir até sexta', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // só o quadro, prioridade média → card com prazo em 3 dias, sem tarefa do dia
  await pagina.locator('[data-teste="titulo"]').fill('Fechar a proposta da loja Norte');
  await pagina.locator('[data-teste="destino"]').selectOption('quadro');
  await pagina.locator('[data-teste="prioridade"]').selectOption('media');
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Card no quadro de Emanuel Silva/).waitFor();
  let e = (await escritas(pagina)).at(-1);
  assert.equal(e.tabela, 'metodo_quadro');
  assert.deepEqual([e.linhas[0].user_id, e.linhas[0].coluna, e.linhas[0].prazo, e.linhas[0].virou_tarefa_id, e.linhas[0].responsavel_nome], ['emanuel', 'aberto', '2026-09-11', null, 'Luiz Santanna']);
  assert.ok(!(await escritas(pagina)).some((x) => x.tabela === 'metodo_tarefas'), 'no quadro só, não entra tarefa do dia');

  // os dois: a tarefa do dia E o card, ligado pelo id da tarefa
  await pagina.locator('[data-teste="titulo"]').fill('Visitar a loja do Centro');
  await pagina.locator('[data-teste="destino"]').selectOption('ambos');
  await pagina.locator('[data-teste="prioridade"]').selectOption('alta');
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/Tarefa distribuída pra Emanuel/).waitFor();
  await pagina.waitForFunction(() => window.__bancoFalso.escritas.filter((x) => x.tabela === 'metodo_quadro').length === 2);
  const tudo = await escritas(pagina);
  const tarefa = tudo.filter((x) => x.tabela === 'metodo_tarefas').at(-1);
  const card = tudo.filter((x) => x.tabela === 'metodo_quadro').at(-1);
  assert.equal(card.linhas[0].prazo, '2026-09-08', 'alta = card pro dia');
  assert.ok(card.linhas[0].virou_tarefa_id, 'o card nasce ligado à tarefa');
  assert.equal(tarefa.linhas.length, 1);

  // repetir até sexta: 08/09 (ter) → ter, qua, qui, sex = 4 dias
  await pagina.locator('[data-teste="titulo"]').fill('Ligar pros 20 contatos do dia');
  await pagina.locator('[data-teste="destino"]').selectOption('lista');
  await pagina.locator('[data-teste="repetir-semana"]').check();
  await pagina.locator('[data-teste="distribuir"]').click();
  await pagina.getByText(/4 dias: "Ligar pros 20 contatos do dia" de ter\., 08\/09 a sex\., 11\/09/).waitFor();
  e = (await escritas(pagina)).filter((x) => x.tabela === 'metodo_tarefas').at(-1);
  assert.deepEqual(e.linhas.map((l) => l.data), ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11']);
  assert.ok(e.linhas.every((l) => l.prazo_em));
  await ctx.close();
});

async function abrirQuadroGeral(pagina, pessoa = 'emanuel') {
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption(pessoa);
  const modal = pagina.locator(`[data-teste="modal-pessoa"][data-pessoa="${pessoa}"]`);
  await modal.locator('[data-teste="quadro-geral-topo"]').waitFor();
  return modal;
}
const aba = (modal, id) => modal.locator(`[data-teste="abas-quadro-geral"] [data-aba="${id}"]`).click();

test('QUADRO GERAL: abre do botão ao lado do responsável, com semáforo e WhatsApp no topo, e as seis abas', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  // o botão fica no cartão do Distribuir, junto do responsável (já selecionado: Emanuel)
  await pagina.locator('[data-teste="abrir-quadro-geral"]').click();
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.locator('[data-teste="quadro-geral-topo"]').waitFor();
  assert.deepEqual(await modal.locator('[data-teste="abas-quadro-geral"] [role="tab"]').allTextContents(), ['Pessoa', 'Metas', 'Programa', 'Semana', 'Quadro dele', 'Comprovações', 'Histórico']);
  // 🚪 o caminho pra sociedade veio de baixo pra dentro da pessoa
  assert.match(await texto(pagina, '[data-teste="portoes-pessoa"]'), /Caminho pra sociedade.*0 de 3 portões/s);
  // Emanuel não gerou hoje → amarelo, com o motivo
  await modal.locator('[data-teste="semaforo"][data-cor="amarelo"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="quadro-geral-topo"]'), /não gerou o planejamento de hoje/);
  const wa = await modal.locator('[data-teste="whatsapp"]').getAttribute('href');
  assert.match(wa, /^https:\/\/wa\.me\/5521999991234\?text=/, 'o telefone do painel de controle, com o 55');
  assert.match(decodeURIComponent(wa), /Oi Emanuel/);
  await ctx.close();
});

test('METAS: o modelo da função entra com um toque; progresso sai das tarefas feitas e das vendas pagas; meta de produto', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const modal = await abrirQuadroGeral(pagina);
  await aba(modal, 'metas');
  assert.match(await modal.locator('[data-teste="metas-modelo"]').textContent(), /usar o modelo da função \(Documento Oficial\)/);
  await modal.locator('[data-teste="metas-modelo"]').click();
  await pagina.getByText(/4 metas do modelo entraram/).waitFor();
  await modal.locator('[data-teste="meta"]').first().waitFor();
  const linhas = (await modal.locator('[data-teste="meta"]').allTextContents()).map((t) => t.replace(/\s+/g, ' '));
  assert.equal(linhas.length, 4, 'o COO: captação, reuniões de investimento, pontos de retirada, lojas');
  assert.equal(await modal.locator('[data-teste="meta-oficial"]').count(), 4, 'as quatro são do Documento Oficial');
  // captação: o aporte fechado em 05/09 (R$ 50 mil) de 150 mil — dia 07 é 23% do mês, 33% feito → no ritmo
  assert.match(linhas.find((l) => /Captação de capital/.test(l)), /R\$ 50\.000,00 de .*33% · no ritmo/);
  // reuniões de investimento: nenhuma tarefa de Hábito 5 feita → 0 de 44, atrás do ritmo
  assert.match(linhas.find((l) => /Reuniões de investimento/.test(l)), /0 de .*atrás do ritmo/);
  // meta de produto
  await modal.locator('[data-teste="meta-tipo"]').selectOption('produto');
  await modal.locator('[data-teste="meta-produto"]').fill('Kit Solar');
  await modal.locator('[data-teste="meta-alvo-nova"]').fill('10');
  await modal.locator('[data-teste="meta-adicionar"]').click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="meta"]').length === 5);
  const gravada = (await escritas(pagina)).filter((x) => x.tabela === 'xperf_metas').at(-1).linhas[0];
  assert.deepEqual([gravada.tipo, gravada.chave, gravada.rotulo, gravada.alvo, gravada.user_id, gravada.mes], ['produto', 'produto:kit solar', 'Vender Kit Solar', 10, 'emanuel', '2026-09']);
  // o semáforo agora sabe das metas atrás do ritmo
  await modal.locator('[data-teste="semaforo"][data-cor="vermelho"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="quadro-geral-topo"]'), /meta.* atrás do ritmo/);
  // remover uma
  await modal.getByRole('button', { name: /remover Vender Kit Solar/ }).click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="meta"]').length === 4);
  assert.equal((await escritas(pagina)).at(-1).tipo, 'delete');
  await ctx.close();
});

test('PROGRAMA: sete meses de set/2026 a mar/2027, na mentalidade da pessoa; acrescentar e tirar grava por cima do padrão; pôr no quadro dela vira cards', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const modal = await abrirQuadroGeral(pagina);
  await aba(modal, 'programa');
  await modal.locator('[data-teste="programa-meses"]').waitFor();
  assert.deepEqual(await modal.locator('[data-teste="programa-meses"] button').allTextContents(), ['set/2026', 'out/2026', 'nov/2026', 'dez/2026', 'jan/2027', 'fev/2027', 'mar/2027']);
  // setembro (o mês de hoje) abre: Sonho e Compromisso + a fase oficial do ciclo; diretor (Emanuel é o COO)
  assert.match(await texto(pagina, '[data-teste="aba-programa"]'), /set\/2026 · Sonho e Compromisso · Estruturação/);
  assert.match(await texto(pagina, '[data-teste="aba-programa"]'), /ciclo oficial: formação, estruturação, preparação da Distribuidora/);
  assert.equal(await modal.locator('[data-teste="programa-entregaveis"] li').count(), 2);
  // acrescentar um
  await modal.locator('[data-teste="programa-titulo"]').fill('Abrir a loja do Centro');
  await modal.locator('[data-teste="programa-habito"]').selectOption('5');
  await modal.locator('[data-teste="programa-adicionar"]').click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="programa-entregaveis"] li').length === 3);
  const g = (await escritas(pagina)).filter((x) => x.tabela === 'xperf_programa').at(-1);
  assert.equal(g.tipo, 'upsert');
  assert.equal(g.linhas[0].mes, '2026-09');
  assert.equal(g.linhas[0].entregaveis.length, 7, '2 executivo + 2 diretor + 2 ceo do padrão + o novo');
  assert.ok(g.linhas[0].entregaveis.some((e) => e.titulo === 'Abrir a loja do Centro' && e.mentalidade === 'diretor' && e.habito === 5));
  assert.match(await texto(pagina, '[data-teste="aba-programa"]'), /editado por você/);
  // pôr no quadro dela: 3 cards em xperf_entregaveis, prazo 30/09
  await modal.locator('[data-teste="programa-gerar"]').click();
  await pagina.getByText(/3 entregáveis de set\/2026 no quadro de Emanuel Silva/).waitFor();
  const cards = (await escritas(pagina)).filter((x) => x.tabela === 'xperf_entregaveis').at(-1).linhas;
  assert.deepEqual([cards[0].dono_id, cards[0].coluna, cards[0].prazo, cards[0].trilha], ['emanuel', 'combinado', '2026-09-30', 'diretor']);
  await pagina.waitForFunction(() => [...document.querySelectorAll('[data-teste="programa-entregaveis"] li')].every((li) => /combinado/.test(li.textContent)));
  // tirar um: grava de novo sem ele
  await modal.getByRole('button', { name: /remover Abrir a loja do Centro/ }).click();
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="programa-entregaveis"] li').length === 2);
  await ctx.close();
});

test('SEMANA, QUADRO DELE e HISTÓRICO', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const modal = await abrirQuadroGeral(pagina);
  await aba(modal, 'semana');
  const dias = await modal.locator('[data-teste="dia-semana"]').evaluateAll((els) => els.map((e) => [e.dataset.dia, e.dataset.gerado]));
  assert.equal(dias.length, 7);
  assert.equal(dias[0][0], '2026-09-07', 'começa na segunda');
  assert.deepEqual(dias[1], ['2026-09-08', 'sim'], 'terça tem as três da rotina');
  // o quadro dele: a lista Trabalho com o card e o checklist 1/2; card novo entra na mesa dela
  await aba(modal, 'quadro');
  await modal.locator('[data-teste="quadro-card"]').first().waitFor();
  assert.match(await texto(pagina, '[data-teste="aba-quadro"]'), /Trabalho.*Fechar o contrato da loja Norte.*1\/2/s);
  await modal.locator('[data-teste="quadro-titulo"]').fill('Mapear 5 parcerias');
  await modal.locator('[data-teste="quadro-prazo"]').fill('2026-09-12');
  await modal.locator('[data-teste="quadro-criar"]').click();
  await pagina.getByText(/Card no quadro dela/).waitFor();
  const c = (await escritas(pagina)).filter((x) => x.tabela === 'metodo_quadro').at(-1).linhas[0];
  assert.deepEqual([c.user_id, c.coluna, c.prazo, c.responsavel_nome], ['emanuel', 'aberto', '2026-09-12', 'Luiz Santanna']);
  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="quadro-card"]').length === 2);
  // histórico: nada distribuído pro Emanuel ainda; a Carla tem o pronto
  await aba(modal, 'historico');
  await pagina.getByText(/nada distribuído pra esta pessoa/).waitFor();
  await pagina.getByRole('button', { name: 'Fechar' }).click();
  const carla = await abrirQuadroGeral(pagina, 'carla');
  await aba(carla, 'historico');
  await carla.locator('[data-teste="historico-item"][data-estado="pronto"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="aba-historico"]'), /Enviar o relatório da loja.*pronto até 18:00 · pronto às/s);
  await ctx.close();
});

test('COMPROVAÇÕES: subiram — a fila geral em cima (aprovar / reprovar com motivo) e a aba da pessoa com o radar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  const geral = pagina.locator('[data-teste="comprovacoes-geral"]');
  await geral.waitFor();
  assert.match(await texto(pagina, '[data-teste="comprovacoes-geral"] [data-teste="comprovacoes-pendentes"]'), /1 em análise/);
  const item = geral.locator('[data-teste="comprovacao"][data-status="em_analise"]');
  assert.match((await item.textContent()).replace(/\s+/g, ' '), /Carla Souza.*Story ANTES.*ver o print.*IA: não ficou claro/);
  // reprovar com motivo: a tarefa volta pra pessoa (feito false) com o motivo do gestor
  await item.locator('[data-teste="comp-reprovar"]').click();
  await item.locator('[data-teste="comp-motivo"]').fill('o print é de outro dia');
  await item.locator('[data-teste="comp-reprovar-confirmar"]').click();
  await pagina.getByText(/Reprovada — a tarefa voltou/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tabela, 'metodo_tarefas');
  assert.equal(e.patch.feito, false);
  assert.deepEqual([e.patch.comprovacao.status, e.patch.comprovacao.motivo_gestor], ['reprovada', 'o print é de outro dia']);
  assert.match(await texto(pagina, '[data-teste="comprovacoes-geral"] [data-teste="comprovacoes-pendentes"]'), /nada em análise/);

  // a aba da pessoa: o radar do Emanuel (1 aprovada pela IA)
  await pagina.locator('[data-teste="abrir-quadro-geral"]').click();
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="emanuel"]');
  await modal.locator('[data-teste="quadro-geral-topo"]').waitFor();
  await modal.locator('[data-teste="abas-quadro-geral"] [data-aba="comprovacoes"]').click();
  await modal.locator('[data-teste="comprovacoes-pessoa"]').waitFor();
  assert.match(await texto(pagina, '[data-teste="comprovacoes-radar"]'), /1 aprovada · 0 em análise · 0 reprovadas/);
  await ctx.close();
});

test('CELULAR: a gestão cabe na tela — foto pra julgar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'a tela rolou pro lado');
  await pagina.locator('[data-teste="gestao"]').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-celular.png') });
  await ctx.close();
});
