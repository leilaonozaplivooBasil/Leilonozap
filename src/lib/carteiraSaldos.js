import { supabase } from '@/api/supabaseClient';

/**
 * 💰 LEITURA SEGURA DAS CARTEIRAS DO USUÁRIO
 *
 * POR QUE ESTE ARQUIVO EXISTE (08/08/2026):
 * As telas liam comissão e saldo de operação numa consulta só
 * (select 'commission_balance,saldo_operacao'). O campo saldo_operacao
 * ainda NÃO existe na tabela do banco — e o banco recusa a consulta INTEIRA
 * quando um campo não existe. Resultado: a comissão real (ex.: R$ 17,56)
 * aparecia como R$ 0,00 no PDV e na compra de estoque.
 *
 * Aqui as duas leituras são SEPARADAS: a comissão sempre chega, e o saldo de
 * operação vem como 0 enquanto o campo não existir — sem derrubar nada.
 * Quando o campo for criado no banco, passa a funcionar sozinho, sem mexer no código.
 */
export async function lerSaldos(userId) {
  if (!userId) return { comissao: 0, operacao: 0 };

  const { data: base } = await supabase
    .from('app_users')
    .select('commission_balance')
    .eq('id', userId)
    .maybeSingle();

  let operacao = 0;
  const { data: op } = await supabase
    .from('app_users')
    .select('saldo_operacao')
    .eq('id', userId)
    .maybeSingle();
  operacao = Number(op?.saldo_operacao) || 0;

  return { comissao: Number(base?.commission_balance) || 0, operacao };
}