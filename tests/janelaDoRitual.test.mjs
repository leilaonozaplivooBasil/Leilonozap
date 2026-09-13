// 🌅 13/09/2026 — dono, ao vivo: "quem está participando de fato na
// votação... não tem o direito de mudar o horário do ritual. Mas quem está
// fora da mentoria pode botar o horário que vai acordar — ela ganha no
// horário que ela definir." Depois, mais preciso: "nem todo mundo que tem
// fixo, gamificado, está na mentoria... quem está fora da mentoria não tem
// necessidade de votar, mas pode votar se é da diretoria executiva... mas
// não é votado nunca." O mesmo `podeSerVotado`/`aceita_ser_votado` que já
// decide quem entra no MvM decide também qual janela do ritual vale — não
// é uma régua nova, é a MESMA aplicada num lugar novo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { janelaDoRitual, minDeHora, RITUAL_INICIO_MIN, RITUAL_FIM_MIN } from '../src/lib/xgame.js';

test('minDeHora: "HH:MM" vira minutos desde 00:00', () => {
  assert.equal(minDeHora('05:00'), 5 * 60);
  assert.equal(minDeHora('06:10'), 6 * 60 + 10);
  assert.equal(minDeHora('23:59'), 23 * 60 + 59);
  assert.equal(minDeHora(''), null);
  assert.equal(minDeHora(null), null);
  assert.equal(minDeHora('lixo'), null);
});

test('janelaDoRitual: quem vota/é votado (mentoria) usa SEMPRE a janela fixa da casa — nunca a que ela escolher', () => {
  assert.deepEqual(janelaDoRitual({ votavel: true, horaTarefa: '06:00' }), { inicioMin: RITUAL_INICIO_MIN, fimMin: RITUAL_FIM_MIN });
  // ausência de `votavel` é a régua de sempre — nunca afrouxa por engano
  assert.deepEqual(janelaDoRitual({ horaTarefa: '06:00' }), { inicioMin: RITUAL_INICIO_MIN, fimMin: RITUAL_FIM_MIN });
  assert.deepEqual(janelaDoRitual(), { inicioMin: RITUAL_INICIO_MIN, fimMin: RITUAL_FIM_MIN });
});

test('janelaDoRitual: quem tem fixo fora da mentoria (a distribuidora, o Flávio) define o PRÓPRIO horário', () => {
  // ela escolheu acordar às 06:00 — a janela vira ao redor DELA, com a
  // mesma folga de sempre (20min antes, 30min depois de 05:00 → 04:40–05:30).
  const j = janelaDoRitual({ votavel: false, horaTarefa: '06:00' });
  assert.equal(j.inicioMin, 6 * 60 - 20);
  assert.equal(j.fimMin, 6 * 60 + 30);
});

test('janelaDoRitual: sem horário definido, mesmo fora da mentoria, cai na régua fixa (nunca sem janela nenhuma)', () => {
  assert.deepEqual(janelaDoRitual({ votavel: false, horaTarefa: null }), { inicioMin: RITUAL_INICIO_MIN, fimMin: RITUAL_FIM_MIN });
  assert.deepEqual(janelaDoRitual({ votavel: false }), { inicioMin: RITUAL_INICIO_MIN, fimMin: RITUAL_FIM_MIN });
});
