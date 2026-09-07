// 🆘 TIRA DÚVIDAS 24h — o atendimento da gamificação (07/09/2026).
//
// O teste que mais importa aqui é o ANTI-DESCOLAMENTO: a ficha de regras que
// vai pro prompt tem que sair das constantes de verdade do X-GAME. Prompt com
// número copiado à mão envelhece calado, e aí a IA passa a ensinar errado com
// autoridade — pior do que não ter atendimento.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  fichaDeRegras, sistemaDoAtendente, validarChamado, normalizarTipo,
  normalizarPrioridade, tituloDoChamado, viraTrabalho, TIPOS, LIMITE_PERGUNTA,
} from '../src/lib/tiraDuvidas.js';
import { RESUMO_MIN, TRAVA_SEM_ESTUDO, TOKEN_MAX, APLICABILIDADE_MAX, CICLO_DIAS_UTEIS, cotacaoDoDia } from '../src/lib/xgame.js';

const ROTA = fs.readFileSync(new URL('../api/functions/tiraDuvidas.js', import.meta.url), 'utf8');
const WIDGET = fs.readFileSync(new URL('../src/components/licensing/TiraDuvidas.jsx', import.meta.url), 'utf8');
const AUDIO = fs.readFileSync(new URL('../api/functions/transcreverAudio.js', import.meta.url), 'utf8');

const br = (n) => Number(n).toFixed(2).replace('.', ',');

// os comentários deste projeto EXPLICAM os números ("jurando que são 400",
// "a tentação era três abas") — e é isso que se quer ler lá. As checagens
// abaixo são sobre o CÓDIGO, então o comentário sai antes.
const semComentarios = (fonte) => fonte
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

// ── a ficha sai dos números reais, não de memória ────────────────────
test('a ficha de regras carrega os valores de verdade do X-GAME', () => {
  const f = fichaDeRegras();
  assert.ok(f.includes(`${RESUMO_MIN} caracteres`), 'o mínimo do resumo');
  assert.ok(f.includes(br(TRAVA_SEM_ESTUDO)), 'a trava do estudo');
  assert.ok(f.includes(br(TOKEN_MAX)), 'o teto do Human Token');
  assert.ok(f.includes(br(APLICABILIDADE_MAX)), 'o teto da Aplicabilidade');
  assert.ok(f.includes(`${CICLO_DIAS_UTEIS} dias úteis`), 'o tamanho do ciclo');
  assert.ok(f.includes(br(cotacaoDoDia(1))) && f.includes(br(cotacaoDoDia(CICLO_DIAS_UTEIS))), 'as pontas da cotação');
});

test('a ficha diz que 400 é MÍNIMO — o mal-entendido que gerou o chamado do Paim', () => {
  assert.match(fichaDeRegras(), /MÍNIMO, não limite/);
});

test('nenhum número do X-GAME está escrito à mão no arquivo do atendimento', () => {
  const fonte = fs.readFileSync(new URL('../src/lib/tiraDuvidas.js', import.meta.url), 'utf8');
  // se alguém colar "17,77" ou "400" direto no texto, o descolamento volta
  const corpo = semComentarios(fonte).replace(/^import[\s\S]*?from '\.\/xgame\.js';/m, '');
  for (const proibido of ['17,77', '22,22', '12,22', '0,80']) {
    assert.ok(!corpo.includes(proibido), `"${proibido}" está escrito à mão — tem que vir da constante`);
  }
  assert.ok(!/\b400\b/.test(corpo), '400 está escrito à mão — tem que vir de RESUMO_MIN');
});

test('o sistema do atendente carrega a ficha inteira dentro dele', () => {
  assert.ok(sistemaDoAtendente().includes(fichaDeRegras()));
});

// ── as duas regras de conduta que justificam o agente existir ────────
test('o atendente é proibido de inventar e de prometer conserto', () => {
  const s = sistemaDoAtendente();
  assert.match(s, /NUNCA invente/);
  assert.match(s, /NUNCA prometa correção nem prazo/);
  assert.match(s, /NUNCA peça senha/);
});

// ── classificação: a IA propõe, o sistema decide o vocabulário ───────
test('normalizarTipo aceita só os tipos da casa; qualquer invenção vira dúvida', () => {
  for (const t of TIPOS) assert.equal(normalizarTipo(t), t);
  assert.equal(normalizarTipo('BUG'), 'bug');
  assert.equal(normalizarTipo('reclamacao'), 'duvida');
  assert.equal(normalizarTipo(null), 'duvida');
});

test('normalizarPrioridade segura a faixa 1-5; fora dela vira o meio', () => {
  assert.equal(normalizarPrioridade(1), 1);
  assert.equal(normalizarPrioridade(5), 5);
  assert.equal(normalizarPrioridade(0), 3);
  assert.equal(normalizarPrioridade(9), 3);
  assert.equal(normalizarPrioridade('alta'), 3);
  assert.equal(normalizarPrioridade(2.4), 2);
});

test('só bug/erro/correção/otimização viram trabalho — dúvida respondida encerra', () => {
  assert.equal(viraTrabalho('duvida'), false);
  for (const t of ['bug', 'erro', 'correcao', 'otimizacao']) assert.equal(viraTrabalho(t), true, t);
  assert.equal(viraTrabalho('qualquer coisa'), false);
});

// ── o chamado ────────────────────────────────────────────────────────
test('chamado vazio não sobe; só imagem sobe; texto gigante é barrado', () => {
  assert.equal(validarChamado({ pergunta: '   ' }).valido, false);
  assert.equal(validarChamado({ pergunta: '', imagemUrl: 'https://x/y.png' }).valido, true);
  assert.equal(validarChamado({ pergunta: 'o botão não acende' }).valido, true);
  assert.equal(validarChamado({ pergunta: 'a'.repeat(LIMITE_PERGUNTA + 1) }).valido, false);
});

test('tituloDoChamado: usa o da IA, corta o comprido, e cai na pergunta quando vem vazio', () => {
  assert.equal(tituloDoChamado('Botão de concluir travado', 'qualquer'), 'Botão de concluir travado');
  assert.equal(tituloDoChamado('', 'o botão não acende'), 'o botão não acende');
  assert.equal(tituloDoChamado('x'.repeat(200), 'p').length, 90);
  assert.equal(tituloDoChamado('', 'y'.repeat(200)).length, 90);
  assert.equal(tituloDoChamado('  dois   espaços  ', 'p'), 'dois espaços');
});

// ── a rota ───────────────────────────────────────────────────────────
test('a rota usa a ficha compartilhada, não um prompt próprio', () => {
  assert.match(ROTA, /sistemaDoAtendente\(\)/);
  assert.ok(!ROTA.includes('Você é o TIRA DÚVIDAS'), 'a rota tem prompt próprio — o texto tem que morar num lugar só');
});

test('o relato NÃO se perde quando a IA falha — grava do mesmo jeito', () => {
  // três saídas de falha (sem chave, erro do SDK, recusa/sem saída) e todas
  // passam por gravar() antes de responder
  const semGravar = ROTA.split('return res.status(200).json({')
    .filter((t) => t.includes("ia: false"))
    .filter((t, i, todos) => !ROTA.slice(0, ROTA.indexOf(t)).includes('await gravar('));
  assert.equal(semGravar.length, 0, 'existe caminho de falha que responde sem gravar o chamado');
  assert.equal((ROTA.match(/await gravar\(/g) || []).length, 4, 'os 3 caminhos de falha + o caminho feliz');
});

test('a rota tem health check separado de "tem chave"', () => {
  assert.match(ROTA, /req\.method === 'GET'/);
  assert.match(ROTA, /tem_chave/);
});

// ── o microfone ──────────────────────────────────────────────────────
test('a rota de áudio lê a chave do ambiente OU do cofre — troca sem redeploy', () => {
  assert.match(AUDIO, /chaveDe\('OPENAI_API_KEY', 'openai_api_key'\)/);
});

test('sem chave, a rota de áudio diz que está indisponível em vez de estourar', () => {
  assert.match(AUDIO, /disponivel: false/);
  assert.match(AUDIO, /req\.method === 'GET'/);
});

test('o áudio tem teto de tamanho, cortado ANTES de encher a memória', () => {
  assert.match(AUDIO, /25 \* 1024 \* 1024/);
  assert.match(AUDIO, /total > LIMITE_BYTES/);
});

test('a tela só desenha o microfone se a rota disser que dá — nada de botão que falha', () => {
  assert.match(WIDGET, /setTemMicrofone\(!!j\?\.disponivel\)/);
  assert.match(WIDGET, /\{temMicrofone && \(/);
});

test('o áudio vira TEXTO NO CAMPO, pra pessoa conferir antes de mandar', () => {
  assert.match(WIDGET, /setTexto\(\(t\) => \(t \? `\$\{t\} \$\{j\.texto\}` : j\.texto\)/);
});

test('um campo só: a pessoa conta o problema, quem classifica é a IA', () => {
  // se alguém trouxer as abas "perguntar / reportar bug / sugerir", este cai
  assert.equal((WIDGET.match(/data-teste="tira-duvidas-texto"/g) || []).length, 1);
  assert.ok(!/reportar bug|Tabs|TabsTrigger/i.test(semComentarios(WIDGET)), 'apareceu escolha de categoria na mão do usuário');
});
