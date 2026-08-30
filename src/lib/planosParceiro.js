// planosParceiro — fonte ÚNICA dos PLANOS DE PARCEIRO DE COMPRA (DIR-25,
// 30/08/2026). Antes viviam hardcoded só em PartnerPlanActivation.jsx; agora
// a ativação e o cadastro de interesse do CRM leem a MESMA lista — mudar um
// plano é mudar aqui, e as duas telas seguem juntas.
// Números oficiais: 3% ao mês, 60 meses, investimento mínimo por plano.
export const PLANOS_PARCEIRO = [
  {
    id: 1,
    name: 'Plano Visionário',
    minInvestment: 5000,
    expectedReturn: 3,
    duration: 60,
    description: 'Ideal para quem está começando. Produtos de alta liquidez e demanda garantida.',
  },
  {
    id: 2,
    name: 'Plano Sócios de Ouro',
    minInvestment: 15000,
    expectedReturn: 3,
    duration: 60,
    description: 'Para parceiros que buscam maior retorno com segurança.',
  },
  {
    id: 3,
    name: 'Plano Elite',
    minInvestment: 30000,
    expectedReturn: 3,
    duration: 60,
    description: 'Máximo retorno com acesso a todas as oportunidades.',
  },
  {
    id: 4,
    name: 'Plano Personalizado',
    minInvestment: 0,
    expectedReturn: 3,
    duration: 60,
    description: 'Defina valores personalizados para este parceiro.',
    isCustom: true,
  },
];
