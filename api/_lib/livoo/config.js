// Livoo Connect v2 — config do parceiro (Leilão NoZap). Secrets SÓ no backend.
// Sem LIVOO_PARTNER_SECRET → modo SANDBOX (fluxo completo p/ demo, ids sintéticos).
export const livooConfig = {
  // base já inclui /connect/v1 (ex.: https://app.livoolive.com.br/connect/v1)
  base: (process.env.LIVOO_CONNECT_BASE || 'https://app.livoolive.com.br/connect/v1').replace(/\/$/, ''),
  partnerId: process.env.LIVOO_PARTNER_ID || 'leilao-nozap',
  partnerSecret: process.env.LIVOO_PARTNER_SECRET || '',   // sk_...  (S2S Bearer)
  webhookSecret: process.env.LIVOO_WEBHOOK_SECRET || '',   // whsec_... (valida webhook)
  // base do player/host pro embed em sandbox (produção vem nos host_url/embed_url da própria Livoo)
  appBase: process.env.LIVOO_APP_BASE || 'https://app.livoolive.com.br',
};
export const livooConfigured = livooConfig.partnerSecret.length > 0;
