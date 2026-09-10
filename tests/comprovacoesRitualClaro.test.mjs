// 🩹 DIR-125 — A PASTILHA DO RITUAL NÃO PODE FICAR EM BRANCO (09/09/2026).
//
// O PEDIDO (dono, olhando a fila de comprovações): "a informação do ritual
// tem que ficar mais clara, ritual feito ou aprovado pela IA ou gravou o
// vídeo, mandou áudio, tem que ficar mais claro... tem que ter mais
// comunicação aí."
//
// A CAUSA: `concluirRitual` (CrmMetodo.jsx) grava `status: 'aprovada_ritual'`
// pro Ritual do Amanhecer — um valor que nunca tinha entrado no dicionário
// ROTULO/COR deste painel, então a pastilha ficava sem rótulo e sem cor.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PAINEL = readFileSync(new URL('../src/components/licensing/CentralVendas/Comprovacoes.jsx', import.meta.url), 'utf8');
const METODO = readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');

test('statusDaComp devolve o status gravado de verdade, sem reinterpretar — "aprovada_ritual" passa direto', () => {
  assert.match(PAINEL, /statusDaComp = \(c\) => c\?\.status \|\| \(c\?\.valido \? 'aprovada_ia' : 'reprovada'\)/, 'o status gravado sempre vence — só cai no fallback quando não existe');
});

test('🔒 todo status que concluirRitual grava tem rótulo E cor no painel de comprovações', () => {
  // 🔴 10/09 — DE ONDE VÊM OS STATUS MUDOU, E O TESTE TEVE QUE IR ATRÁS.
  // O fechamento do ritual passou a gravar `status: statusFinal`, uma
  // variável — varrer só os literais de CrmMetodo deixaria de enxergar
  // `aprovada_ritual` e `ritual_parcial`, e a varredura passaria VERDE sobre
  // um conjunto vazio. Agora lê os dois lugares: os literais que sobraram no
  // CrmMetodo e os que `statusDoRitual` decide, em ritualEmBlocos.js.
  const BLOCOS_LIB = readFileSync(new URL('../src/lib/ritualEmBlocos.js', import.meta.url), 'utf8');
  const doFechamento = BLOCOS_LIB.slice(BLOCOS_LIB.indexOf('export function statusDoRitual'));
  const statusGravados = [
    ...[...METODO.matchAll(/status:\s*'([a-z_]+)'/g)].map((m) => m[1]),
    ...[...doFechamento.matchAll(/return '([a-z_]+)'/g)].map((m) => m[1]),
    ...[...METODO.matchAll(/\.status = '([a-z_]+)'/g)].map((m) => m[1]),
  ];
  assert.ok(statusGravados.includes('aprovada_ritual'), 'o teste em si perdeu a referência — ninguém grava mais aprovada_ritual?');
  assert.ok(statusGravados.includes('ritual_parcial'), 'o ritual pela metade sumiu do vocabulário');
  assert.ok(statusGravados.includes('ritual_em_andamento'), 'o ritual em andamento sumiu do vocabulário');
  const rotuloInicio = PAINEL.indexOf('const ROTULO = {');
  const rotuloFim = PAINEL.indexOf('};', rotuloInicio);
  const rotulo = PAINEL.slice(rotuloInicio, rotuloFim);
  const corInicio = PAINEL.indexOf('const COR = {');
  const corFim = PAINEL.indexOf('};', corInicio);
  const cor = PAINEL.slice(corInicio, corFim);
  for (const status of new Set(statusGravados)) {
    assert.match(rotulo, new RegExp(`\\b${status}:`), `status "${status}" sem rótulo — a pastilha fica em branco`);
    assert.match(cor, new RegExp(`\\b${status}:`), `status "${status}" sem cor — a pastilha fica sem destaque`);
  }
});

test('a pastilha do ritual tem um rótulo de verdade, não a chave crua', () => {
  assert.match(PAINEL, /aprovada_ritual: 'ritual aprovado'/);
});

// ── comunicação de como o ritual foi entregue ──
test('a linha avisa quando a gratidão veio em ÁUDIO, com a duração, sem tocar o áudio (privacidade continua)', () => {
  assert.match(PAINEL, /c\.entrada_gratidao === 'audio'/);
  assert.match(PAINEL, /gratidão em áudio/);
  // 🔒 nunca pode virar um botão de tocar — isso é do dono do áudio, só
  assert.ok(!/OuvirGratidao/.test(PAINEL), 'o aviso de áudio não pode virar um play — o áudio é só de quem gravou');
});

test('quando o ritual não teve nem vídeo nem áudio, a linha diz isso explicitamente (não fica muda)', () => {
  assert.match(PAINEL, /só por texto, sem vídeo nem áudio/);
});

test('o texto de verdade que a pessoa entregou (entrega) aparece na linha, entre aspas', () => {
  assert.match(PAINEL, /c\.entrega &&/);
  assert.match(PAINEL, /\{c\.entrega\}/);
});
