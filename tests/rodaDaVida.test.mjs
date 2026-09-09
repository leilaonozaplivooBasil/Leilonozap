// 🎡 A RODA DA VIDA (DIR-112, 09/09/2026) — dono: "quando eu falei a roda,
// pra ele tem que ser quase dez em tudo, pra transformar numa roda... pra a
// vida andar." A prova de que a curva realmente fecha um CÍRCULO quando o
// desempenho é uniforme e alto, e "amassa" quando um eixo fica pra trás.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pontosDaRoda, pontoDoEixo, redondezDaRoda, faixaDaRoda } from '../src/lib/rodaDaVida.js';

const dist = ([x, y]) => Math.sqrt(x * x + y * y);

test('pontosDaRoda: tudo em 100% fecha (quase) um círculo de raio 1', () => {
  const eixos = [{ atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 100 }];
  const pontos = pontosDaRoda(eixos);
  assert.ok(pontos.length > 0);
  // Catmull-Rom por cima de pontos de um círculo não é um círculo perfeito
  // (bulge natural da spline), mas fica bem mais perto de um círculo do que
  // o pentágono de lados retos que existia antes — a folga aqui é generosa
  // o bastante pra provar "quase roda", não pra exigir perfeição geométrica.
  for (const p of pontos) assert.ok(dist(p) > 0.94 && dist(p) <= 1.0001, `ponto a ${dist(p)} do centro deveria estar perto do raio 1`);
});

test('pontosDaRoda: com menos de 3 eixos não desenha nada (roda não existe)', () => {
  assert.deepEqual(pontosDaRoda([{ atual: 100 }, { atual: 100 }]), []);
});

test('pontosDaRoda: um eixo fraco amassa a curva pra dentro só daquele lado', () => {
  const cheios = [{ atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 100 }];
  const comFraco = [{ atual: 100 }, { atual: 20 }, { atual: 100 }, { atual: 100 }, { atual: 100 }];
  const rCheio = pontosDaRoda(cheios).map(dist);
  const rFraco = pontosDaRoda(comFraco).map(dist);
  // a curva com o eixo fraco tem pontos visivelmente mais perto do centro
  assert.ok(Math.min(...rFraco) < Math.min(...rCheio) - 0.3);
  // mas o lado oposto ao eixo fraco continua perto do raio cheio
  assert.ok(Math.max(...rFraco) > 0.9);
});

test('pontoDoEixo: o vértice de cada eixo fica exatamente no seu próprio raio', () => {
  const eixos = [{ atual: 50 }, { atual: 100 }, { atual: 0 }];
  assert.ok(Math.abs(dist(pontoDoEixo(eixos, 0)) - 0.5) < 1e-9);
  assert.ok(Math.abs(dist(pontoDoEixo(eixos, 1)) - 1) < 1e-9);
  assert.ok(Math.abs(dist(pontoDoEixo(eixos, 2)) - 0) < 1e-9);
});

test('redondezDaRoda: 1 quando tudo em 100%, 0 quando tudo em 0', () => {
  assert.equal(redondezDaRoda([{ atual: 100 }, { atual: 100 }, { atual: 100 }]), 1);
  assert.equal(redondezDaRoda([{ atual: 0 }, { atual: 0 }, { atual: 0 }]), 0);
  assert.equal(redondezDaRoda([]), 0);
});

test('redondezDaRoda: desigual pesa menos que uniforme, mesmo com a mesma média', () => {
  const uniforme = redondezDaRoda([{ atual: 80 }, { atual: 80 }, { atual: 80 }, { atual: 80 }, { atual: 80 }]);
  const desigual = redondezDaRoda([{ atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 100 }, { atual: 20 }]);
  assert.ok(uniforme > desigual);
});

test('redondezDaRoda: cheia e uniforme pesa mais que murcha e uniforme', () => {
  const cheia = redondezDaRoda([{ atual: 90 }, { atual: 90 }, { atual: 90 }]);
  const murcha = redondezDaRoda([{ atual: 20 }, { atual: 20 }, { atual: 20 }]);
  assert.ok(cheia > murcha);
});

test('faixaDaRoda: cobre os 4 patamares, do murcho ao girando', () => {
  assert.equal(faixaDaRoda(0).id, 'murcha');
  assert.equal(faixaDaRoda(0.4).id, 'torta');
  assert.equal(faixaDaRoda(0.7).id, 'quase');
  assert.equal(faixaDaRoda(0.9).id, 'girando');
});
