// 🌅 09/09/2026 — dono, ao vivo, olhando o ritual e as comprovações rodando
// em produção: "o ritual é cinco e quinze... se ela não fizer até cinco e
// quinze ela perde o ritual" + "tem que ser um dos maiores valores da
// gamificação do dia" + "organização do negócio tem que ser dentro do
// Quadro, papel nunca".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RITUAL_INICIO_MIN, RITUAL_FIM_MIN, pesoAutomatico, ehOrganizacaoDoNegocio, horaDeMin,
} from '../src/lib/xgame.js';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');

// 🌊 09/09/2026 — DIR-125, dono, vendo comprovações presas em "em análise"
// esperando ele: "ela tem que pegar tudo... vai reprovar automático, só em
// casos impossíveis." O Ritual do Amanhecer era a ÚLTIMA rota do X-GAME que
// ainda caía pro gestor decidir na dúvida — todo o resto já resolve sozinho
// desde a DIR-89. Trava fonte-a-fonte pra nunca mais regredir.
test('DIR-125: o Ritual do Amanhecer NUNCA mais grava status "em_analise" — dúvida de ambiente vira reprova automática', () => {
  assert.doesNotMatch(METODO, /emDuvida/, 'a variável emDuvida (o gate que caía pro gestor) foi removida — não pode voltar');
  assert.doesNotMatch(METODO, /status:\s*['"]em_analise['"]/, 'nenhum status do ritual pode nascer como em_analise — intervenção humana zero, igual toda outra comprovação');
  assert.match(
    METODO,
    /vereditoAmbiente\?\.veredito === 'reprovada' \|\| vereditoAmbiente\?\.veredito === 'duvida'/,
    'ambiente claramente errado E ambiente em dúvida têm que cair na MESMA rota automática (reprovar) — nenhuma delas pode virar uma fila de espera',
  );
});

test('RITUAL_FIM_MIN: o prazo agora é 05h15, não mais 07h15 — virou corte seco', () => {
  assert.equal(horaDeMin(RITUAL_FIM_MIN), '5h30');
  assert.equal(RITUAL_FIM_MIN, 5 * 60 + 30);
  assert.equal(RITUAL_INICIO_MIN, 4 * 60 + 40, 'a abertura da janela não mudou, só o fim');
});

// 🕐 09/09/2026 — DIR-125, mesmo dono, revendo a régua nova (dúvida de
// ambiente vira reprova automática, não punição definitiva): "quinze
// minutos final é pouco tempo... vamos deixar trinta — dá tempo da pessoa
// acordar e ficar meio lenta." A tarefa é agendada pra 05:00 (o horário
// oficial da gratidão); o dono mede a janela a partir daí, não da abertura
// antecipada (4h40, intocada).
test('RITUAL_FIM_MIN: DIR-125 — trinta minutos a partir das 05:00 (a hora agendada da gratidão), não mais quinze', () => {
  const HORA_AGENDADA = 5 * 60;
  assert.equal(RITUAL_FIM_MIN - HORA_AGENDADA, 30);
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
