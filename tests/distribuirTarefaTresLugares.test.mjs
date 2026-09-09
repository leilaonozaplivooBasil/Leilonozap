// 🎯 DIR-130 (09/09/2026) — dono: "já estava entrando automático na jornada
// e não entrou, precisa entrar. No quadro, tá? Na lista e na jornada. Tudo
// automático." E: "eu mandei essas duas notificações aí, a pessoa ficou com
// dificuldade de receber, só apareceu no quadro."
//
// Antes, o gestor escolhia "destino" (lista OU quadro OU os dois) — uma
// tarefa distribuída só com "quadro" nunca entrava na Jornada; só com
// "lista" nunca virava card. Agora não existe mais escolha: toda
// distribuição sempre grava nos três (metodo_tarefas, metodo_quadro e
// xgame_mensagens) — a prova é textual porque `distribuir()` é uma closure
// interna, não uma função pura exportável sem reescrever o componente.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ARQ = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/DistribuirTarefa.jsx', import.meta.url), 'utf8');

test('DistribuirTarefa.jsx: o seletor de destino (lista/quadro/ambos) não existe mais', () => {
  assert.ok(!/const \[destino, setDestino\]/.test(ARQ), 'destino ainda é estado — a escolha deveria ter sumido');
  assert.ok(!/<option value="quadro">quadro dele<\/option>/.test(ARQ), 'o <select> de destino ainda está na tela');
});

test('DistribuirTarefa.jsx: distribuir() sempre insere em metodo_tarefas, sem condicional de destino', () => {
  const inicio = ARQ.indexOf('const distribuir = async ()');
  const fimMentoria = ARQ.indexOf('const conteudo =');
  const corpo = ARQ.slice(inicio, fimMentoria);
  assert.match(corpo, /supabase\.from\('metodo_tarefas'\)\.insert\(linhas\)\.select\(\)/);
  assert.ok(!/if \(destino === 'quadro'\)/.test(corpo), 'ainda existe o atalho "só quadro, sem tarefa do dia"');
  assert.ok(!/if \(destino === 'ambos'\)/.test(corpo), 'o card do quadro ainda está condicionado a "ambos"');
});

test('DistribuirTarefa.jsx: o card do quadro (metodo_quadro) sempre nasce, ligado à tarefa', () => {
  const inicio = ARQ.indexOf('const distribuir = async ()');
  const fimMentoria = ARQ.indexOf('const conteudo =');
  const corpo = ARQ.slice(inicio, fimMentoria);
  assert.match(corpo, /supabase\.from\('metodo_quadro'\)\.insert\(cardDaDemanda\(primeira\?\.id \|\| null\)\)/);
});

test('DistribuirTarefa.jsx: toda distribuição acende o sino (xgame_mensagens, tipo demanda) — não fica só no quadro', () => {
  const inicio = ARQ.indexOf('const distribuir = async ()');
  const fimMentoria = ARQ.indexOf('const conteudo =');
  const corpo = ARQ.slice(inicio, fimMentoria);
  assert.match(corpo, /supabase\.from\('xgame_mensagens'\)\.insert\(\{/);
  assert.match(corpo, /tipo:\s*'demanda'/);
  assert.match(corpo, /destino_tipo:\s*'pessoa',\s*destino_id:\s*pessoa/);
});

test('DistribuirTarefa.jsx: o horário vira opcional/flexível, não "começar às" obrigatório', () => {
  assert.ok(!/começar às/.test(ARQ), 'a copy antiga "começar às" ainda sugere horário fixo obrigatório');
  assert.match(ARQ, /horário \(opcional\)/);
});

test('CrmMetodo.jsx: o sino de notificações está montado na tela do Compromisso', () => {
  const CRM = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');
  assert.match(CRM, /import SinoNotificacoes from '@\/components\/common\/SinoNotificacoes';/);
  assert.match(CRM, /<SinoNotificacoes currentUser=\{currentUser\} \/>/);
});
