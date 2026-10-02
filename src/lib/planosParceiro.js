// planosParceiro — fonte ÚNICA dos PLANOS DE PARCEIRO DE COMPRA (DIR-25,
// 30/08/2026). Antes viviam hardcoded só em PartnerPlanActivation.jsx; agora
// a ativação e o cadastro de interesse do CRM leem a MESMA lista — mudar um
// plano é mudar aqui, e as duas telas seguem juntas.
//
// 🔴 02/10/2026 — decisão da diretoria (Luciano, véspera da apresentação):
//   • cotas só A PARTIR DE R$ 30 MIL: os planos Visionário (5 mil) e Sócios de
//     Ouro (15 mil) saíram da oferta. Quem já contratou nesses planos continua
//     com o próprio contrato (o painel lê a taxa e o aporte do contrato dele).
//   • a participação deixou de ser "3% ao mês" e passou a "até 2,15%
//     (verificar consultor)", escrita assim onde a taxa aparecer.
//   • o prazo de repasses passou a "de 12 a 36 meses".
// Ponto de restauração: branch restauracao/parceiro-antes-luciano-2026-10-02.

/** A participação mensal oferecida — número e a forma de escrever. */
export const TAXA_PARCEIRO = Object.freeze({
  pct: 2.15,
  rotulo: 'até 2,15% (verificar consultor)',
  rotuloMensal: 'até 2,15% ao mês (verificar consultor)',
});

/** O prazo de repasses oferecido. */
export const PRAZO_PARCEIRO = Object.freeze({
  minMeses: 12,
  maxMeses: 36,
  rotulo: 'de 12 a 36 meses',
});

export const PLANOS_PARCEIRO = [
  {
    id: 3,
    name: 'Plano Elite',
    minInvestment: 30000,
    expectedReturn: TAXA_PARCEIRO.pct,
    duration: PRAZO_PARCEIRO.maxMeses,
    description: 'Acesso a todas as oportunidades da operação.',
  },
  {
    id: 4,
    name: 'Plano Personalizado',
    minInvestment: 0,
    expectedReturn: TAXA_PARCEIRO.pct,
    duration: PRAZO_PARCEIRO.maxMeses,
    description: 'Defina valores personalizados para este parceiro.',
    isCustom: true,
  },
];
