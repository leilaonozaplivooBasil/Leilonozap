/**
 * Banca de testes do carrossel de ofertas — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (02/09/2026)
 * "No preview não consigo clicar nos produtos em oferta."
 *
 * O carrossel ganhou arrastar e setas, e o arrasto chamava `setPointerCapture`
 * no `pointerdown`. Com captura ativa O NAVEGADOR ENTREGA O `click` A QUEM
 * CAPTUROU, e não ao card: nenhum produto abria. Nenhum teste de texto pegaria
 * isso — só um navegador de verdade pega.
 *
 * Esta página monta o COMPONENTE REAL (não uma imitação) com produtos de
 * mentira, sem banco e sem rede. tests/navegador/carrossel.spec.mjs a dirige.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
// o CSS REAL do app: sem Tailwind, 'overflow-x-auto' e 'pointer-events-none' não
// existem, e a banca testaria uma faixa que não é a que o cliente vê
import '@/index.css';
import OfertasRelampago from '@/components/loja/OfertasRelampago';

// 12 produtos: o mesmo que o carrossel mostra na home. Foto de 1x1 transparente
// só para ter `image_urls` — aqui o que se testa é o gesto, não a imagem.
const FOTO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PRODUTOS = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i}`,
  description: `Produto ${i}`,
  price_catalog: 10 + i,
  // um com preço de referência que se sustenta, para conferir que o selo aparece
  market_value: i === 3 ? 40 : null,
  image_urls: [FOTO],
  quantity: 5,
  quantity_sold: i,
}));

function Banca() {
  const [aberto, setAberto] = React.useState(null);
  return (
    <MemoryRouter>
      {/* o que o teste lê para saber se o clique chegou no card */}
      <div data-teste="produto-aberto">{aberto || ''}</div>
      <OfertasRelampago
        products={PRODUTOS}
        onOpenDetails={(p) => setAberto(p.id)}
        totalProdutosTexto="mais de 200 produtos"
      />
    </MemoryRouter>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
