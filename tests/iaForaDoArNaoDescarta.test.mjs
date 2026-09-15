// 🚨 DIR-146 (14/09/2026) — INCIDENTE: o gateway de IA (Vercel AI Gateway)
// ficou sem crédito (HTTP 402) numa madrugada inteira. Duas coisas
// aconteceram ao mesmo tempo, e as duas custaram dinheiro de gente que
// trabalhou de verdade:
//
//   1. Tarefa NORMAL (foto/print): a tentativa "sumia sem deixar marca" —
//      nem gravava no banco. A Eloá tomou banho gelado, mandou a foto, a IA
//      não respondeu, e não sobrou NENHUM registro. Zero ponto, zero prova.
//   2. Ritual do Amanhecer: o bloco de visualização (o vídeo) virou
//      "reprovado" só porque a IA não respondeu — a mesma régua de dúvida
//      que DIR-125 usa de propósito pra ambiente ruim (carro/academia/
//      escritório) tratou "a IA nunca olhou" como se fosse "a IA não gostou".
//
// A régua pura (ritualEmBlocos.js) tem os testes REB-11/REB-12. Aqui ficam
// as promessas que só a TELA (CrmMetodo.jsx) e a FILA DO GESTOR (XGameAdmin,
// Comprovacoes.jsx) podem quebrar.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const CRM = ler('src/components/licensing/CentralVendas/CrmMetodo.jsx');
const ADMIN = ler('src/components/licensing/XGameAdmin.jsx');
const COMP = ler('src/components/licensing/CentralVendas/Comprovacoes.jsx');
const LAUDO = ler('src/lib/relatorioComprovacoes.js');

test('DIR-146-1 · tarefa normal: IA fora do ar SALVA a comprovação como pendente_ia, não descarta', () => {
  const ini = CRM.indexOf(`if (decisao.acao === 'ia_fora')`);
  assert.ok(ini > 0, 'premissa: o ramo ia_fora existe');
  const fim = CRM.indexOf(`if (decisao.acao === 'pedir_justificativa')`, ini);
  const ramo = CRM.slice(ini, fim);
  assert.match(ramo, /status: 'pendente_ia'/, 'o ramo ia_fora parou de gravar status pendente_ia');
  assert.match(ramo, /valido: false/, 'pendente_ia não pode nascer com crédito automático — IA fora não vira aprovação sozinha');
  assert.match(ramo, /await plataforma\.entities\.MetodoTarefa\.update\(t\.id, \{ comprovacao: comprovacaoPendente \}\)/, 'a tentativa voltou a sumir sem gravar no banco');
  assert.match(ramo, /ia_indisponivel: true/);
  assert.ok(!/NÃO foi descartada, tenta de novo em 1 minuto\. Sem a IA conferir, a tarefa não conclui\./.test(ramo), 'o aviso antigo ("sem gravar nada") voltou');
});

test('DIR-146-2 · a comprovação pendente_ia NUNCA vira "imagem já usada" no reenvio', () => {
  // hash/print da MESMA foto reenviada não pode travar por reciclagem — ela
  // é o mesmo envio genuíno, não uma foto antiga reaproveitada.
  assert.match(CRM, /filter\(\(c\) => c && c\.status !== 'pendente_ia'\)/, 'o filtro que tira pendente_ia do anti-reuso sumiu');
});

test('DIR-146-3 · o ritual honesto: "pendente_ia" não é "pela metade" nem falso "completo"', () => {
  assert.match(CRM, /selo === 'pendente_ia'/, 'o fechamento do ritual não distingue mais o selo pendente_ia');
  assert.match(CRM, /iaIndisponivel: statusFinal === 'ritual_pendente_ia'/, 'o rastro do laudo parou de marcar ia_indisponivel no ritual pendente');
});

test('DIR-146-4 · a fila do gestor (XGameAdmin) enxerga pendente_ia/ritual_pendente_ia e deixa aprovar', () => {
  assert.match(ADMIN, /const PENDENTES_IA = \['pendente_ia', 'ritual_pendente_ia'\];/);
  assert.match(ADMIN, /\[\['pendente_ia', /, 'sumiu a aba de IA fora do ar na fila');
  assert.match(ADMIN, /\(s === 'em_analise' \|\| PENDENTES_IA\.includes\(s\)\)/, 'o botão Aprovar parou de valer pra pendente_ia');
});

test('DIR-146-5 · a fila que o dono vê todo dia (Comprovacoes.jsx) tem a mesma régua', () => {
  assert.match(COMP, /const PENDENTES_IA = \['pendente_ia', 'ritual_pendente_ia'\];/);
  assert.match(COMP, /\(s === 'em_analise' \|\| PENDENTES_IA\.includes\(s\)\)/, 'o botão aprovar desta fila parou de valer pra pendente_ia');
  assert.match(COMP, /pendente_ia: 'IA fora do ar/, 'a fila perdeu o rótulo de pendente_ia — cairia em "reprovada" à toa');
});

test('DIR-146-6 · o laudo (defesa de quem reclama) não confunde pendente_ia com reprovada', () => {
  assert.match(LAUDO, /pendente_ia: 'aguardando revisão \(IA fora do ar\)'/);
  assert.match(LAUDO, /ritual_pendente_ia: 'ritual aguardando revisão \(IA fora do ar\)'/);
  assert.match(LAUDO, /EM_ANALISE = new Set\(\['em_analise', 'ritual_em_andamento', 'pendente_ia', 'ritual_pendente_ia'\]\)/, 'pendente_ia parou de contar como "em análise" no eixo negadas/aceitas');
});
