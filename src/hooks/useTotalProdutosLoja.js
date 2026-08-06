import { useEffect, useState } from 'react';
import { supabase } from '@/api/supabaseClient';

/**
 * 📦 useTotalProdutosLoja — total REAL de produtos da Loja Virtual.
 *
 * Antes o cartão mostrava products.length, que é só a 1ª página carregada
 * (240) — número errado. Aqui a contagem vem do banco (head + count exact),
 * sem trazer os registros, e conta apenas produtos publicados com estoque.
 *
 * Retorna null enquanto carrega (quem chama não mostra número nenhum).
 */
export default function useTotalProdutosLoja() {
  const [total, setTotal] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { count } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('catalog_active', true)
          .gt('quantity', 0);
        if (alive && typeof count === 'number') setTotal(count);
      } catch (_) { /* sem contagem: o texto simplesmente não aparece */ }
    })();
    return () => { alive = false; };
  }, []);

  return total;
}

/** "mais de 1.100 produtos" — arredonda a centena PARA BAIXO. */
export function textoTotalProdutos(total) {
  if (!total || total < 100) return null;
  const centena = Math.floor(total / 100) * 100;
  return `mais de ${centena.toLocaleString('pt-BR')} produtos`;
}