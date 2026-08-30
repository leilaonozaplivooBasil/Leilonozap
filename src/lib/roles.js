// 🔴 PONTO 122 (21/08/2026) — dezenas de telas checavam `role === 'admin'`
// direto, cada uma escrevendo a própria condição, e boa parte esqueceu de
// incluir `super_admin` — o cargo mais alto, o do próprio dono. Resultado
// real: o dono, logado como super_admin, ficava bloqueado em telas que
// deveriam ser dele (`/Financial` foi o caso reportado). Fonte única daqui
// pra frente — todo gate de "qualquer administrador" usa isto, não reescreve
// a condição.
// 💼 DIR-32 (30/08/2026) — 'admin_financeiro': a permissão do CFO/controller.
// Vê todos os painéis (incluindo Financeiro, custo e margem — é a função
// dele), mas NÃO gere usuários (isso já é exclusivo do super_admin em todos
// os fluxos de escrita). A matriz completa de quem vê o quê está em
// src/lib/visibilidadePorPapel.js.
export const ADMIN_ROLES = ['admin', 'super_admin', 'admin_financeiro'];
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
