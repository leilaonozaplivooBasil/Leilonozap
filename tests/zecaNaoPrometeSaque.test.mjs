/**
 * 💸 O ZECA NÃO PROMETE SAQUE — porque saque não existe.
 *
 * 🔴 ACONTECEU EM PRODUÇÃO, NO WHATSAPP (20/09/2026)
 *
 * Cliente: "Se eu depositar o dinheiro e não conseguir arrematar, consigo sacar?"
 * Zeca:    "Se seu lance for superado, o valor total volta pra sua carteira, mais
 *           um bônus de 10% que fica disponível pra usar na Loja Virtual."
 *          "O bônus é só pra compras, mas o valor original que voltou pra sua
 *           carteira você pode sacar normalmente."
 *
 * DUAS COISAS ERRADAS, E A SEGUNDA É GRAVE:
 *
 * 1. O bônus NÃO nasce de ter o lance superado. Ele nasce do DEPÓSITO de R$ 100+
 *    (`PCT_PASSAPORTE = 10`, `DEPOSITO_MINIMO = 100` em api/_lib/passaporteCoupon.js),
 *    nasce BLOQUEADO com `saldo_restante: 0`, e vai sendo liberado conforme a
 *    pessoa dá lance. O conhecimento do Zeca afirmava a versão errada por escrito.
 *
 * 2. 🔴 NÃO EXISTE SAQUE do saldo de lances. `api/functions/requestWithdrawal.js`
 *    lê SÓ `commission_balance` — nunca toca em `saldo_disponivel`, que é onde o
 *    depósito cai e pra onde o lance superado volta. E `withdrawal_requests` tem
 *    ZERO linhas na história da plataforma.
 *
 *    Sobre saque o conhecimento não dizia NADA. Diante do silêncio o modelo
 *    inventou a resposta mais simpática — que é a pior possível, porque faz a
 *    pessoa depositar achando que pode se arrepender.
 *
 * Estes testes existem pra que o silêncio não volte, e pra que a frase errada não
 * seja reescrita por engano.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROUTER = readFileSync(
  new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url),
  'utf8',
);

describe('o conhecimento do Zeca sobre o dinheiro do cliente', () => {
  test('🔴 diz, com todas as letras, que não existe saque', () => {
    assert.match(ROUTER, /NÃO EXISTE SAQUE DO SALDO DA CARTEIRA DE LANCES/);
    assert.match(ROUTER, /sem saque, sem PIX de volta, sem estorno/i);
  });

  test('🔴 separa "voltar pra carteira" de "receber de volta"', () => {
    // Foi exatamente aqui que o Zeca escorregou: acertou que o valor volta pra
    // carteira e concluiu sozinho que dava pra sacar.
    assert.ok(
      ROUTER.includes('"Voltar pra carteira" NÃO é "receber de volta"'),
      'sumiu a frase que separa as duas coisas',
    );
  });

  test('🔴 a frase errada do bônus não está mais escrita', () => {
    // A frase original: "se for superado, volta tudo + bônus de 10%".
    assert.ok(
      !/superado,\s*\n?\s*volta tudo \+ bônus de 10%/.test(ROUTER),
      'a frase que ensinou o erro voltou pro conhecimento',
    );
  });

  test('🔴 o bônus é ensinado como vindo do DEPÓSITO, e nascendo bloqueado', () => {
    assert.match(ROUTER, /Nasce do DEPÓSITO de R\$ 100 ou mais/);
    assert.match(ROUTER, /NÃO nasce de ter o lance superado/);
    assert.match(ROUTER, /Nasce BLOQUEADO/);
  });

  test('🔴 em lugar nenhum o conhecimento oferece saque', () => {
    // O contraponto: de nada adianta a proibição se outra linha, mais adiante,
    // oferecer saque. Varre o arquivo inteiro.
    const promete = ROUTER.split('\n')
      .filter((l) => /\b(pode|poderá|consegue|d[áa] para|d[áa] pra)\s+(sacar|resgatar|estornar)/i.test(l));
    assert.deepEqual(promete, [], `oferece saque em: ${promete.join(' | ')}`);
  });

  test('o conhecimento do bônus bate com o código que o cria', () => {
    // Se alguém mudar PCT ou o mínimo no código e esquecer do Zeca, ele passa a
    // mentir de novo — em número, que é pior.
    const cupom = readFileSync(new URL('../api/_lib/passaporteCoupon.js', import.meta.url), 'utf8');
    assert.match(cupom, /PCT_PASSAPORTE\s*=\s*10\b/, 'o percentual mudou no código');
    assert.match(cupom, /DEPOSITO_MINIMO\s*=\s*100\b/, 'o depósito mínimo mudou no código');
  });

  test('🔴 requestWithdrawal continua sem tocar no saldo de lances', () => {
    // A razão de a regra existir. Se um dia o saque passar a alcançar
    // `saldo_disponivel`, esta prova quebra e alguém REVISA o texto do Zeca em
    // vez de deixá-lo desatualizado na direção perigosa.
    const rota = readFileSync(new URL('../api/functions/requestWithdrawal.js', import.meta.url), 'utf8');
    const semComentario = rota.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    assert.ok(
      !/saldo_disponivel/.test(semComentario),
      'o saque passou a alcançar saldo_disponivel — reveja o que o Zeca responde',
    );
  });
});
