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
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(318.18), 'R$ 7.000 ÷ 22 dias úteis');
  assert.equal(await pagina.locator('[data-teste="tarefas-dia"] li').count(), 3);

  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  // 🪄 o peso nasce sozinho pelo título ("reunião" = ação de negócio, peso 6), com o motivo ao lado
  assert.equal(await pagina.locator('[data-teste="peso"]').inputValue(), '6');
  assert.match(await texto(pagina, '[data-teste="peso-motivo"]'), /peso 6 — ação de negócio/);
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  await pagina.locator('[data-teste="peso-auto"]').waitFor(); // mexeu: agora é o seu, com o caminho de volta
  // 📏 o dia completo é a Rotina Perfeita (peso 75): peso 4 vale 4/75 de R$ 318,18 — nada de um terço do dia
  assert.equal(await texto(pagina, '[data-teste="valor-nova"]'), ATE(16.98));
  const aviso = await texto(pagina, '[data-teste="faltam"]');
  assert.match(aviso, /o dia paga R\$ 33,94 de R\$ 318,18/);
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
  await pagina.getByText(/vale R\$ 16,98 — as outras do dia foram recalculadas/).waitFor();

  const e = await escritas(pagina);
  assert.equal(e.length, 1);
  assert.equal(e[0].tipo, 'insert');
  assert.equal(e[0].tabela, 'metodo_tarefas');
  const l = e[0].linhas[0];
  assert.equal(l.user_id, 'emanuel');
  assert.equal(l.data, '2026-09-08');
  assert.equal(l.titulo, 'Pegar as pautas da reunião de amanhã');
  assert.equal(l.peso, 4);
  assert.equal(l.categoria, 'mentoria');
  assert.equal(l.origem, 'xperf');
  assert.equal(l.criado_por_id, 'dono');
  assert.equal(l.feito, false);

  await pagina.waitForFunction(() => document.querySelectorAll('[data-teste="tarefas-dia"] li').length === 4);
  const linhas = (await pagina.locator('[data-teste="tarefas-dia"] li').allTextContents()).map((s) => s.replace(/\s+/g, ' '));
  assert.match(linhas.find((s) => s.includes('Gratidão')), /R\$ 4,24/, 'a Gratidão (peso 1) vale 1/75 do dia');
  assert.match(linhas.find((s) => s.includes('pautas')), /peso 4.*R\$ 16,98/);
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
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(318.18));
  // o ciclo do Emanuel: 04/09 teve Gratidão (peso 1) feita e conferida → 1/75 do dia
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /R\$ 4,24\s*ganho/);
  assert.match((await modal.textContent()).replace(/\s+/g, ' '), /ter\., 08\/09.*3 tarefas · falta peso 71.*R\$ 16,97/, 'o que está distribuído de hoje em diante');

  await pagina.screenshot({ path: path.join(FOTOS, 'performance-modal.png') });
  await modal.locator('[data-teste="fixo-mes"]').fill('4400');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.tabela, 'xgame_participantes');
  assert.equal(e.linhas[0].fixo_mes, 4400);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('200,00'));
  await pagina.getByRole('button', { name: 'Fechar' }).click();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(200), 'a prévia lê o mesmo fixo');
  await ctx.close();
});

test('FIXO: quem não tem cadastro no jogo ganha um ao definir o fixo pela primeira vez', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa-fixo"]').selectOption('dono');
  const modal = pagina.locator('[data-teste="modal-pessoa"][data-pessoa="dono"]');
  await modal.locator('[data-teste="sem-fixo-modal"]').waitFor();
  assert.equal((await modal.locator('[data-teste="valor-dia-pessoa"]').textContent()).trim(), ATE(59.09), 'até definir, a verba padrão');
  await modal.locator('[data-teste="fixo-mes"]').fill('11000');
  await modal.locator('[data-teste="fixo-mes"]').blur();
  await pagina.getByText(/fixo atualizado/).waitFor();
  const e = (await escritas(pagina)).at(-1);
  assert.equal(e.tipo, 'upsert');
  assert.equal(e.linhas[0].user_id, 'dono');
  assert.equal(e.linhas[0].cargo, 'ceo', 'o cargo do jogo vem do nível do painel');
  assert.equal(e.linhas[0].ativo, true);
  await pagina.waitForFunction(() => document.querySelector('[data-teste="modal-pessoa"] [data-teste="valor-dia-pessoa"]').textContent.includes('500,00'));
  assert.equal(await modal.locator('[data-teste="sem-fixo-modal"]').count(), 0);
  await ctx.close();
});

test('DIA INCOMPLETO: quem não tem fixo usa a verba de produção; e o aviso diz o que falta pro dia completo', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir();
  await pagina.locator('[data-teste="pessoa"]').selectOption('carla');
  await pagina.locator('[data-teste="sem-fixo"]').waitFor();
  assert.equal(await texto(pagina, '[data-teste="valor-dia"]'), ATE(59.09), 'R$ 1.300 ÷ 22');
  await pagina.locator('[data-teste="titulo"]').fill('Separar os documentos da reunião');
  await pagina.locator('[data-teste="faltam"]').waitFor();
  const aviso = await texto(pagina, '[data-teste="faltam"]');
  // "reunião" = peso 6; Carla é diretora no jogo (+1, teto 6): 6/75 de 59,09 = 4,73
  assert.match(aviso, /o dia paga R\$ 4,73 de R\$ 59,09/);
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
  // o ciclo por mentalidade: as 5 tarefas semeadas são da rotina (sem mentalidade)
  assert.match(await texto(pagina, '[data-teste="por-mentalidade"] [data-mentalidade="rotina"]'), /5 tarefas/);

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
  // 📏 e o valor coerente: peso 6 de 75 → R$ 25,45 num dia de R$ 318,18 (+ o centavo da sobra, que vai pra de maior peso)
  assert.equal(await texto(pagina, '[data-teste="valor-nova"]'), ATE(25.46));
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
  assert.deepEqual([e.linhas[0].titulo, e.linhas[0].mentalidade, e.linhas[0].peso, e.linhas[0].criado_por_id], ['Visitar a loja do Centro', 'executivo', 6, 'dono']);
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

test('CELULAR: a gestão cabe na tela — foto pra julgar', { skip: semNavegador }, async () => {
  const { pagina, ctx } = await abrir({ celular: true });
  await pagina.locator('[data-teste="titulo"]').fill('Pegar as pautas da reunião de amanhã');
  await pagina.locator('[data-teste="peso"]').selectOption('4');
  assert.equal(await pagina.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'a tela rolou pro lado');
  await pagina.locator('[data-teste="gestao"]').scrollIntoViewIfNeeded();
  await pagina.screenshot({ path: path.join(FOTOS, 'performance-celular.png') });
  await ctx.close();
});
