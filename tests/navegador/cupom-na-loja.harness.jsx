/**
 * Banca do CUPOM NO CHECKOUT DA LOJA — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (22/09/2026)
 * A Verônica pediu um cupom pra um cliente. Ao conferir o caminho, o campo
 * "Aplicar cupom" desta tela estava `disabled` no código: o cliente digitava,
 * clicava em Aplicar e NADA acontecia. Nem erro, nem aviso. Quem precisasse de
 * cupom tinha que descobrir sozinho que só funcionava pelo carrinho.
 *
 * E tem um segundo buraco, mais caro, que esta banca guarda: o servidor
 * (createMPPix) engole cupom inválido de propósito — "ignora, cobra cheio" —
 * pra não derrubar a compra. Se a tela não conferir o veredito que voltou, ela
 * mostra "−R$ 20,46 aplicado" e o cliente recebe um PIX do valor INTEIRO, calada.
 * É o mesmo desenho que já mordeu o Passaporte antes ("a tela prometia desconto,
 * a cobrança vinha com R$ 1,00").
 *
 * Aqui roda a tela REAL. Teste de classe CSS não serviria: o que importa é se o
 * clique produz alguma coisa e se o número que sobra na tela é o que o servidor
 * realmente vai cobrar.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import CatalogCheckout2 from '@/pages/CatalogCheckout2';

const PRECO = 87.25;
const DESCONTO = 20.46;

const USUARIO = {
  id: 'u-ronilson', full_name: 'Cliente Teste', email: 'cliente@teste.com',
  phone: '21999990000', cpf: '12345678909', role: 'user',
  address_street: 'Rua Teste', address_number: '100', address_complement: '',
  address_neighborhood: 'Centro', address_city: 'Rio de Janeiro',
  address_state: 'RJ', address_zip_code: '20000-000',
};
localStorage.setItem('currentUser', JSON.stringify(USUARIO));

window.__bancoFalso = { tabelas: {}, escritas: [] };
window.__entidadesFalsas = {
  Product: [{
    id: 'p1', description: 'Secador de cabelo', price_catalog: PRECO,
    quantity: 5, catalog_active: true, image_urls: [],
  }],
};

// 🎟️ Espelha a regra real da RPC `aplicar_cupom` no que esta tela exercita:
// código certo → desconto; qualquer outro → motivo legível.
window.__rpcFalso = {
  aplicar_cupom: ({ _code, _subtotal }) => {
    const code = String(_code || '').trim().toUpperCase();
    if (code === 'RONILSON2046') {
      if (Number(_subtotal) < 80) return { valido: false, motivo: 'Pedido mínimo de R$ 80.00' };
      return { valido: true, desconto: DESCONTO, total_final: Number(_subtotal) - DESCONTO, code };
    }
    if (code === 'BEMVINDO10') return { valido: false, motivo: 'Cupom expirado' };
    return { valido: false, motivo: 'Cupom inválido' };
  },
};

// A banca escolhe o que o servidor responde: `window.__servidorAceitaCupom`
//   true  → createMPPix aplicou (devolve coupon_code + desconto_cupom)
//   false → createMPPix ENGOLIU o cupom e vai cobrar cheio
window.__servidorAceitaCupom = true;
window.__plataformaFalsa.respostas = {
  createMPPix: (corpo) => {
    const pediu = corpo?.coupon_code || null;
    const valeu = pediu && window.__servidorAceitaCupom;
    return {
      success: true,
      sale_id: 's1',
      amount: valeu ? PRECO - DESCONTO : PRECO,
      amount_products: valeu ? PRECO - DESCONTO : PRECO,
      shipping: 0,
      payment_id: '123',
      status: 'pending',
      passaporte_desconto: 0,
      coupon_code: valeu ? pediu : null,
      desconto_cupom: valeu ? DESCONTO : 0,
      pix_code: '00020126',
      qr_code_base64: null,
      ticket_url: null,
    };
  },
  checkPaymentStatus: { success: true, status: 'pending' },
};

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <CatalogCheckout2 />
    <Toaster richColors position="top-center" />
  </MemoryRouter>,
);
