// 🔴 PONTO 122 (21/08/2026) — dezenas de telas checavam `role === 'admin'`
// direto, cada uma escrevendo a própria condição, e boa parte esqueceu de
// incluir `super_admin` — o cargo mais alto, o do próprio dono. Resultado
// real: o dono, logado como super_admin, ficava bloqueado em telas que
// deveriam ser dele (`/Financial` foi o caso reportado). Fonte única daqui
// pra frente — todo gate de "qualquer administrador" usa isto, não reescreve
// a condição.
export const ADMIN_ROLES = ['admin', 'super_admin'];
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);
