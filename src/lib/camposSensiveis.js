/**
 * 🔐 camposSensiveis — LGPD, fase 2, ETAPA 1 (28/09/2026, "pode ir" do dono).
 *
 * Testado como visitante sem login em 27/09: estas cinco tabelas entregavam a
 * qualquer um, só com a chave publicável do site:
 *   • lojas parceiras ........ a SENHA das 4 lojas, em texto puro
 *   • códigos da Collection .. o código de acesso, com e-mail e WhatsApp
 *   • pedidos de saque ....... chave PIX e e-mail de quem pediu
 *   • despesas ............... dado de PIX / cartão de quem recebe
 *   • vendas ................. CPF do comprador
 *
 * A partir da migração `lgpd_etapa_1`, visitante e usuário comum leem só as
 * colunas de COLUNAS_PUBLICAS. O adaptador (src/api/plataformaAdapter.js) pede
 * exatamente essas — `select('*')` viraria "permission denied" na tela.
 *
 * Quem é admin continua vendo tudo o que precisa para trabalhar (chave PIX para
 * pagar o saque, código para entregar ao cliente…): depois da leitura normal, o
 * adaptador busca SÓ os campos de DEVOLVIDOS_AO_ADMIN, pelo servidor
 * (api/functions/lerCamposSensiveis.js), que exige crachá de sessão VÁLIDO —
 * sem o modo "só anota" das outras rotas.
 *
 * A senha das lojas não volta para ninguém: nenhuma tela faz login com ela
 * (conferido em 28/09 — só o cadastro de lojas grava). Ela passa a ser guardada
 * criptografada.
 *
 * ⚠️ Este arquivo é lido pelo NAVEGADOR e pela ROTA. Coluna nova numa destas
 * tabelas precisa entrar em COLUNAS_PUBLICAS (e no GRANT da migração) para
 * aparecer na tela.
 */

/** Colunas que visitante e usuário comum NÃO leem mais. */
export const CAMPOS_SENSIVEIS = {
  stores: ['store_password', 'raw_base44'],
  luxury_access_codes: ['code', 'email', 'whatsapp', 'person_name', 'raw_base44'],
  withdrawal_requests: ['pix_key', 'user_email'],
  financial_expenses: ['pix_or_card_info', 'raw_base44'],
  catalog_sales: ['buyer_cpf'],
};

/** O que o admin recebe de volta pelo servidor. Senha de loja: ninguém. */
export const DEVOLVIDOS_AO_ADMIN = {
  stores: [],
  luxury_access_codes: ['code', 'email', 'whatsapp', 'person_name'],
  withdrawal_requests: ['pix_key', 'user_email'],
  financial_expenses: ['pix_or_card_info'],
  catalog_sales: ['buyer_cpf'],
};

/** Quem recebe os campos de volta. Mesma régua de src/lib/roles.js (ADMIN_ROLES). */
export const PAPEIS_QUE_VEEM = ['admin', 'super_admin', 'admin_financeiro'];

/** Colunas liberadas, na ordem do banco (conferidas em information_schema, 28/09/2026). */
export const COLUNAS_PUBLICAS = {
  stores: 'id,base44_id,address,can_create_arremate_devolucoes,can_create_direto_fabrica,can_create_sai_de_baixo,cnpj,created_by,created_by_id,created_date,distribution_channels,email,is_sample,logo_url,notes,owner_name,phone,product_types,status,store_login,store_name,updated_date,created_at,updated_at',
  luxury_access_codes: 'id,base44_id,created_by,created_by_id,created_date,is_active,is_sample,is_single_use,is_used,label,updated_date,used_at,used_by_user_id,created_at,updated_at',
  withdrawal_requests: 'id,base44_id,raw_base44,created_at,updated_at,user_id,user_name,valor,pix_tipo,status,reject_reason,requested_at,reviewed_at,mp_transfer_id',
  financial_expenses: 'id,base44_id,amount,amount_paid,category,company,created_by,created_by_id,created_date,description,due_date,expense_type,installment_current,installment_total,interest_amount,is_sample,notes,payment_date,payment_method,payment_status,recurring_day,total_amount,updated_date,created_at,updated_at,cost_center,recurring_group_id,payment_account',
  catalog_sales: 'id,base44_id,raw_base44,created_at,updated_at,buyer_id,buyer_email,buyer_name,seller_id,product_id,product_title,product_image,sale_price,total_amount,quantity,status,payment_method,tracking_code,commission_total,created_date,mp_payment_id,pix_qr,pix_qr_base64,pix_ticket_url,stripe_session_id,stripe_payment_intent,kind,adesao_level,carrier,source,operator_id,buyer_phone,delivered_at,shipped_at,buyer_address,buyer_cep,items_json,store_slug,fulfillment_status,linha,livoo_order_id,coupon_code,discount_amount,recuperacao_toque1_em,recuperacao_toque2_em',
};

/** A tabela tem campo guardado? */
export const ehTabelaProtegida = (tabela) => Object.prototype.hasOwnProperty.call(CAMPOS_SENSIVEIS, tabela);

/** O que pedir no `select(...)` para esta tabela. */
export const colunasPublicasDe = (tabela) => COLUNAS_PUBLICAS[tabela] || '*';

/** Pode ver os campos guardados? (o SERVIDOR confere de novo, pelo banco) */
export const podeVerSensiveis = (usuario) => PAPEIS_QUE_VEEM.includes(usuario?.role);

/**
 * O filtro usa alguma coluna guardada? Filtrar por ela como visitante é
 * "permission denied" — o banco não deixa nem COMPARAR sem poder LER.
 * Aceita o filtro já traduzido para o nome da coluna.
 */
export function filtroUsaCampoSensivel(tabela, filtro) {
  const campos = CAMPOS_SENSIVEIS[tabela];
  if (!campos || !filtro || typeof filtro !== 'object') return false;
  return Object.keys(filtro).some((k) => campos.includes(k));
}

/** Junta os campos devolvidos pelo servidor às linhas já lidas (por id). */
export function juntarCampos(linhas, extras) {
  if (!Array.isArray(linhas) || !Array.isArray(extras) || extras.length === 0) return linhas;
  const porId = new Map(extras.map((e) => [String(e.id), e]));
  return linhas.map((l) => {
    const e = porId.get(String(l?.id));
    return e ? { ...l, ...e } : l;
  });
}
