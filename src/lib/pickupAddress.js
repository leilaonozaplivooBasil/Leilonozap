// Endereço de retirada (CD) — fonte única: o CADASTRO do distribuidor (galpão de Bangu).
// Todos os produtos saem do CD dentro do plano de negócio; as lojas são comissionadas.
// Se o galpão mudar, basta atualizar o endereço do distribuidor que o checkout acompanha.
import { supabase } from '@/api/supabaseClient';

// Fallback (último endereço conhecido) caso a busca falhe.
export const DEFAULT_PICKUP_ADDRESS = 'Estrada do Pontal, 6500 - Recreio dos Bandeirantes, Rio de Janeiro - RJ, 22790877';

export async function fetchPickupAddress() {
  try {
    const { data } = await supabase
      .from('app_users')
      .select('address_street,address_number,address_neighborhood,address_city,address_state,address_zip_code')
      .eq('primary_career_level', 'distribuidor')
      .not('address_street', 'is', null)
      .limit(1);
    const a = data && data[0];
    if (!a || !a.address_street) return DEFAULT_PICKUP_ADDRESS;
    const cep = a.address_zip_code ? String(a.address_zip_code).replace(/(\d{5})(\d{3})/, '$1-$2') : '';
    return [
      `${a.address_street}${a.address_number ? ', ' + a.address_number : ''}`,
      a.address_neighborhood,
      `${a.address_city || 'Rio de Janeiro'}${a.address_state ? ' - ' + a.address_state : ''}`,
      cep,
    ].filter(Boolean).join(' - ');
  } catch {
    return DEFAULT_PICKUP_ADDRESS;
  }
}
