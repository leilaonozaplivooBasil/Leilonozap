// 🔴 O erro em inglês na cara do cliente (15/09/2026).
//
// Print do dono: a Leila, num chat de ATENDIMENTO, respondeu
//     "Functions are blocked - app owner lacks backend functions capability"
// Texto da plataforma Base44 avisando que a conta perdeu backend functions —
// repassado cru porque a rota fazia `res.json(resultado)` sem olhar, e a tela
// procurava `response || reply || message` e achava a frase de erro.
//
// A trava aqui é de reconhecimento POSITIVO: resposta é `response`/`reply`, e
// nada mais. Procurar palavras de erro conhecidas seria frágil — bastaria a
// plataforma trocar o texto pra voltar a vazar.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respostaDaLeila, FRASE_INDISPONIVEL } from '../api/_lib/respostaDaLeila.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('o que o cliente pode ver', () => {
  test('resposta de verdade passa inteira', () => {
    // A forma que a function Deno devolve quando deu certo (entry.ts:98).
    const r = respostaDaLeila({
      status: 'success',
      conversation_id: 'conv_123',
      response: 'Oi! O leilão do PlayStation encerra dia 29 🙂',
    });
    assert.equal(r.status, 'success');
    assert.equal(r.response, 'Oi! O leilão do PlayStation encerra dia 29 🙂');
    assert.equal(r.conversation_id, 'conv_123');
  });

  test('🔴 O CASO REAL: o erro da plataforma NUNCA vira resposta', () => {
    const r = respostaDaLeila({
      message: 'Functions are blocked - app owner lacks backend functions capability',
    });
    assert.equal(r.status, 'indisponivel');
    assert.equal(r.response, FRASE_INDISPONIVEL);
    assert.ok(!/Functions are blocked/i.test(r.response), 'vazou o texto da plataforma');
    // guardado pro log, fora do que a tela mostra
    assert.match(r.motivo_tecnico, /Functions are blocked/);
  });

  test('a frase que o cliente lê está em português e não acusa ninguém', () => {
    assert.match(FRASE_INDISPONIVEL, /manuten/i);
    assert.ok(!/[Ee]rror|[Ff]ailed|capability|backend/.test(FRASE_INDISPONIVEL),
      'a frase do cliente tem palavra de infraestrutura');
  });

  test('erro em `error` também não vaza', () => {
    const r = respostaDaLeila({ error: 'Internal Server Error (500)' });
    assert.equal(r.response, FRASE_INDISPONIVEL);
    assert.match(r.motivo_tecnico, /Internal Server Error/);
  });

  test('corpo vazio, null e lixo caem na mesma frase, sem lançar', () => {
    for (const entrada of [null, undefined, {}, '', 0, [], 'texto solto']) {
      const r = respostaDaLeila(entrada);
      assert.equal(r.status, 'indisponivel', `entrada: ${JSON.stringify(entrada)}`);
      assert.equal(r.response, FRASE_INDISPONIVEL);
    }
  });

  test('`response` vazio ou só espaço NÃO é resposta', () => {
    // Ausência de resposta com outro disfarce: se passasse, o cliente veria
    // uma bolha em branco e acharia que a Leila ignorou ele.
    for (const vazio of ['', '   ', '\n\t ']) {
      assert.equal(respostaDaLeila({ status: 'success', response: vazio }).status, 'indisponivel');
    }
  });

  test('texto técnico é cortado — log não é depósito', () => {
    const r = respostaDaLeila({ error: 'x'.repeat(5000) });
    assert.ok(r.motivo_tecnico.length <= 300, `veio com ${r.motivo_tecnico.length}`);
  });

  test('`motivo_tecnico` nunca aparece quando deu certo', () => {
    const r = respostaDaLeila({ response: 'tudo certo', error: 'ruído antigo' });
    assert.equal(r.status, 'success');
    assert.equal(r.motivo_tecnico, undefined);
  });

  test('um texto de erro que NINGUÉM previu também é barrado', () => {
    // A prova de que a trava é positiva: inventei uma mensagem que não existe
    // em lista nenhuma. Tem que ser barrada do mesmo jeito.
    const r = respostaDaLeila({ message: 'Quota exceeded for tier: hobby-2027' });
    assert.equal(r.response, FRASE_INDISPONIVEL);
  });
});

describe('a rota está de fato usando a trava', () => {
  const rota = ler('../api/functions/leilaChat.js');

  test('não existe mais repasse do JSON cru', () => {
    assert.ok(!/res\.status\(200\)\.json\(resultado\)/.test(rota),
      'voltou a repassar a resposta crua do runtime');
    // Toda saída da rota passa pela trava — inclusive agora que a resposta
    // nasce aqui dentro (api/_lib/leilaAtendente.js) em vez de vir de fora.
    assert.match(rota, /respostaDaLeila\(/);
  });

  test('a falha da ponte também passa pela trava', () => {
    assert.match(rota, /json\(respostaDaLeila\(null\)\)/);
  });

  test('o conversation_id volta pra tela — é o que segura o histórico', () => {
    // LeilaChat.jsx só grava a conversa no localStorage quando este campo
    // volta na resposta. Sem ele, trocar de página apaga o histórico visual.
    //
    // 🔴 O `user_id` do corpo NÃO entra mais aqui, e isso é de propósito: a
    // identidade passou a sair do crachá assinado (ver leilaAtendente.test.mjs).
    // Enquanto esta rota era ponte pro Base44, repassá-lo era o conserto; agora
    // que ela mesma lê saldo e pedidos, repassá-lo seria o buraco.
    assert.match(rota, /conversation_id: conversationId/);
  });
});
