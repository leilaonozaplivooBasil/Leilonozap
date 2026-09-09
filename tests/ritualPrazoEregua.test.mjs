// 🌅 09/09/2026 — dono, ao vivo, olhando o ritual e as comprovações rodando
// em produção: "o ritual é cinco e quinze... se ela não fizer até cinco e
// quinze ela perde o ritual" + "tem que ser um dos maiores valores da
// gamificação do dia" + "organização do negócio tem que ser dentro do
// Quadro, papel nunca".
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RITUAL_INICIO_MIN, RITUAL_FIM_MIN, pesoAutomatico, ehOrganizacaoDoNegocio, horaDeMin,
} from '../src/lib/xgame.js';

test('RITUAL_FIM_MIN: o prazo agora é 05h15, não mais 07h15 — virou corte seco', () => {
  assert.equal(horaDeMin(RITUAL_FIM_MIN), '5h15');
  assert.equal(RITUAL_FIM_MIN, 5 * 60 + 15);
  assert.equal(RITUAL_INICIO_MIN, 4 * 60 + 40, 'a abertura da janela não mudou, só o fim');
});

test('pesoAutomatico: gratidão/ritual sobe pro teto (6) — "um dos maiores valores do dia"', () => {
  assert.equal(pesoAutomatico('Acordar — gratidão e foco no sonho'), 6);
  assert.equal(pesoAutomatico('Gratidão'), 6);
  // continua empatado com o topo de sempre (ação de negócio), nunca acima do teto
  assert.equal(pesoAutomatico('Reunião 1 (45-60 min)'), 6);
});

test('ehOrganizacaoDoNegocio: pega o negócio/planejamento, não a organização do AMBIENTE (essa continua foto real)', () => {
  assert.equal(ehOrganizacaoDoNegocio('Organização do negócio (até 11:30)'), true);
  assert.equal(ehOrganizacaoDoNegocio('Planejamento da semana'), true);
  assert.equal(ehOrganizacaoDoNegocio('Fechamento do dia'), true);
  assert.equal(ehOrganizacaoDoNegocio('Organização do AMBIENTE (até 08:55)'), false, 'ambiente é físico — foto real continua valendo');
  assert.equal(ehOrganizacaoDoNegocio('Reunião 1 (45-60 min)'), false);
});
