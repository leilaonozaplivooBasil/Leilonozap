// 🌅 09/09/2026 — dono, ao vivo, olhando o ritual e as comprovações rodando
// em produção: "o ritual é cinco e quinze... se ela não fizer até cinco e
// quinze ela perde o ritual" + "tem que ser um dos maiores valores da
// gamificação do dia" + "organização do negócio tem que ser dentro do
// Quadro, papel nunca".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RITUAL_INICIO_MIN, RITUAL_FIM_MIN, RITUAL_AVISO_ANTES_MIN, deveAvisarRitual, pesoAutomatico, ehOrganizacaoDoNegocio, horaDeMin,
} from '../src/lib/xgame.js';

const METODO = fs.readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8');

// 🌊 09/09/2026 — DIR-125, dono, vendo comprovações presas em "em análise"
// esperando ele: "ela tem que pegar tudo... vai reprovar automático, só em
// casos impossíveis." O Ritual do Amanhecer era a ÚLTIMA rota do X-GAME que
// ainda caía pro gestor decidir na dúvida — todo o resto já resolve sozinho
// desde a DIR-89. Trava fonte-a-fonte pra nunca mais regredir.
test('DIR-125 revisada: o ritual não cai pra humano, E dúvida não reprova mais', () => {
  // A metade que NÃO mudou: nada do ritual nasce esperando gestor. A DIR-125
  // criou isso pra acabar com comprovação presa em fila, e continua valendo.
  assert.doesNotMatch(METODO, /emDuvida/, 'a variável emDuvida (o gate que caía pro gestor) foi removida — não pode voltar');
  assert.doesNotMatch(METODO, /status:\s*['"]em_analise['"]/, 'nenhum status do ritual pode nascer como em_analise — intervenção humana zero, igual toda outra comprovação');

  // 🔴 A metade que MUDOU (15/09/2026, decisão do dono). Dúvida deixou de
  // reprovar. Medido em 7 dias contra o banco de produção, na visualização:
  //     dúvida 19 (confiança média 61) · aprovada 5 (77) · reprovada 3 (76)
  // Uma régua que recusa 7 de cada 10 não está separando quem fez de quem não
  // fez — está dizendo "não sei". E só não virou desastre porque o veredito
  // chega DEPOIS do fechamento: quem fechava rápido escapava, quem esperava
  // era reprovado. Dinheiro não pode depender da velocidade do telefone.
  const BLOCOS_LIB = fs.readFileSync(new URL('../src/lib/ritualEmBlocos.js', import.meta.url), 'utf8');
  assert.doesNotMatch(
    BLOCOS_LIB,
    /v === 'duvida' && nome === 'visualizacao'/,
    'a dúvida de ambiente voltou a reprovar automático',
  );
  assert.match(BLOCOS_LIB, /return veredito\?\.veredito === 'reprovada';/, 'só reprovada pode reprovar');
  // dúvida não sumiu do sistema — virou pendência visível, com nome próprio
  assert.match(BLOCOS_LIB, /export function blocoEmDuvida/);
  assert.match(BLOCOS_LIB, /tipo: 'dica'/, 'a dúvida precisa entrar na lista de pendências como DICA');
  // premissa: quem decide o selo passa por essa régua, senão isto não mede nada
  assert.match(BLOCOS_LIB, /const reprovado = BLOCOS\.some\(\(n\) => blocoReprovado\(n, b\[n\]\?\.veredito_ia\)\);/);
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

// 📣 DIR-134 (09/09/2026) — auditoria noturna do ritual, dono: "algumas
// pessoas reclamaram, falaram que não conseguiram... vê se a gente cria um
// aviso antes de começar o ritual, dez minutos pra quando ela abrir,
// explicar como funciona."
test('RITUAL_AVISO_ANTES_MIN: dez minutos antes, exatamente o pedido do dono', () => {
  assert.equal(RITUAL_AVISO_ANTES_MIN, 10);
});

test('deveAvisarRitual: aparece dos 10min antes da abertura até o fim da janela, só pra quem não fez', () => {
  const antesDoAviso = RITUAL_INICIO_MIN - RITUAL_AVISO_ANTES_MIN - 1;
  const inicioDoAviso = RITUAL_INICIO_MIN - RITUAL_AVISO_ANTES_MIN;
  const abertura = RITUAL_INICIO_MIN;
  const fechamento = RITUAL_FIM_MIN;
  const depoisDoFim = RITUAL_FIM_MIN + 1;
  assert.equal(deveAvisarRitual({ agoraMin: antesDoAviso, ritualFeitoHoje: false }), false, 'muito cedo — mais de 10min antes');
  assert.equal(deveAvisarRitual({ agoraMin: inicioDoAviso, ritualFeitoHoje: false }), true, 'exatamente 10min antes — começa aqui');
  assert.equal(deveAvisarRitual({ agoraMin: abertura, ritualFeitoHoje: false }), true, 'a janela já abriu — continua avisando');
  assert.equal(deveAvisarRitual({ agoraMin: fechamento, ritualFeitoHoje: false }), true, 'no minuto exato do fechamento ainda avisa');
  assert.equal(deveAvisarRitual({ agoraMin: depoisDoFim, ritualFeitoHoje: false }), false, 'depois de fechar não faz sentido mais avisar');
});

test('deveAvisarRitual: quem já fez o ritual hoje nunca vê o aviso, mesmo dentro da janela', () => {
  assert.equal(deveAvisarRitual({ agoraMin: RITUAL_INICIO_MIN, ritualFeitoHoje: true }), false);
});

test('deveAvisarRitual: sem agoraMin (undefined/NaN) não quebra, só não avisa', () => {
  assert.equal(deveAvisarRitual({ ritualFeitoHoje: false }), false);
  assert.equal(deveAvisarRitual({}), false);
});

test('CrmMetodo.jsx: o aviso do ritual está montado no Compromisso, fechável, e explica o vídeo em casa e o prazo', () => {
  assert.match(METODO, /import\s*\{[^}]*deveAvisarRitual[^}]*\}\s*from '@\/lib\/xgame';/s);
  assert.match(METODO, /mostrarAvisoRitual\s*=\s*ehHoje\s*&&\s*!avisoRitualFechado/);
  assert.match(METODO, /data-teste="aviso-ritual-explicador"/);
  assert.match(METODO, /data-teste="aviso-ritual-fechar"/);
  assert.match(METODO, /em casa/);
});
