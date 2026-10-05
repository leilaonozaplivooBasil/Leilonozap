/**
 * Banca da RETIRADA DIGITAL — NÃO vai para o bundle. 30/09/2026.
 * As telas reais (Balcão, Registrar, Comprovante, cartão do cliente) com a
 * rota retiradaNaLoja falsa, que responde no formato do servidor.
 *   ?tela=balcao | cliente | cliente-retirado | arremates
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import '@/index.css';
import BalcaoRetiradas from '@/pages/BalcaoRetiradas';
import CodigoDeRetirada from '@/components/retirada/CodigoDeRetirada';
import MyWinnings from '@/pages/MyWinnings';

const tela = new URLSearchParams(window.location.search).get('tela') || 'balcao';
const ASS = (() => { const c = document.createElement('canvas'); c.width = 340; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 340, 120); x.strokeStyle = '#111827'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(30, 80); x.bezierCurveTo(70, 20, 110, 110, 150, 60); x.bezierCurveTo(180, 30, 210, 90, 250, 55); x.lineTo(300, 70); x.stroke(); return c.toDataURL('image/png'); })();
const PEDIDOS = [
  { id: 'p-relogio', numero: 'LZ42C79347', produto: 'Relógio Masculino Automático Skeleton', comprador: 'Ana Souza', pagoEm: new Date(Date.now() - 2 * 86400000).toISOString(), arremate: false, retirada: null },
  { id: 'p-iphone', numero: 'AR35853A9C', produto: 'Apple iPhone 17 512GB 48MP 5G - Preto', comprador: 'Carlos Lima', pagoEm: new Date(Date.now() - 5 * 86400000).toISOString(), arremate: true, retirada: null },
  { id: 'p-secador', numero: 'LZ69D6BD34', produto: 'Secador de Cabelo Light Ceramic', comprador: 'Paula Reis', pagoEm: new Date(Date.now() - 1 * 86400000).toISOString(), arremate: false, retirada: { local: 'Escritório', atendente: 'Beatriz Sant\'anna', retiradoEm: new Date(Date.now() - 3 * 3600000).toISOString() } },
];
window.__plataformaFalsa.respostas.retiradaNaLoja = (c) => {
  if (c.acao === 'balcao') return { success: true, pedidos: PEDIDOS };
  if (c.acao === 'porCodigo') return c.codigo === '482913' ? { success: true, pedido: PEDIDOS[0] } : { success: false, error: 'Nenhum pedido de retirada com este código' };
  if (c.acao === 'registrar') return { success: true, retiradoEm: new Date().toISOString(), pedido: 'LZ42C79347' };
  if (c.acao === 'meus' && tela === 'arremates') return { success: true, pedidos: [{ saleId: 'venda-ar', auctionId: 'leilao-iphone', retirado: false, codigo: '731 204'.replace(' ', '') }] };
  if (c.acao === 'meus') return { success: true, pedidos: tela === 'cliente-retirado' ? [{ saleId: 'p-relogio', retirado: true, local: 'Ponto de Retirada Bangu', retiradoEm: new Date(Date.now() - 3600000).toISOString() }] : [{ saleId: 'p-relogio', retirado: false, codigo: '482913' }] };
  if (c.acao === 'ver') return { success: true, comprovante: { sale_id: 'p-secador', pedido: 'LZ69D6BD34', produto: 'Secador de Cabelo Light Ceramic', comprador: 'Paula Reis', retirado_em: PEDIDOS[2].retirada.retiradoEm, local: 'escritorio', localRotulo: 'Escritório', quem: 'terceiro', terceiro_nome: 'Marcos Reis', terceiro_doc4: '4471', com_codigo: true, atendente_nome: 'Beatriz Sant\'anna', termo_versao: 'provisorio-30-09-2026', termo_texto: 'Declaro que retirei pessoalmente, ou por pessoa autorizada por mim, o(s) produto(s) do pedido #LZ69D6BD34 no Leilão NoZap, que conferi o(s) produto(s) no ato da retirada e que o(s) recebi em perfeito estado.', assinatura: ASS, foto_url: null } };
  return { success: false };
};

if (tela === 'arremates') {
  localStorage.setItem('currentUser', JSON.stringify({ id: 'cli', full_name: 'Cliente Teste', email: 'c@teste.com', role: 'user' }));
  window.__entidadesFalsas = { Auction: [
    { id: 'leilao-iphone', title: 'Apple iPhone 17 512GB 48MP 5G - Preto', winner_id: 'cli', status: 'sold', order_status: 'paid', current_price: 1250, image_urls: [], updated_date: new Date().toISOString() },
    { id: 'leilao-ps5', title: 'PS5 Slim', winner_id: 'cli', status: 'sold', order_status: 'paid', current_price: 2100, image_urls: [], updated_date: new Date().toISOString() },
  ] };
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    {tela === 'balcao' && <BalcaoRetiradas />}
    {tela === 'arremates' && <MyWinnings />}
    {tela.startsWith('cliente') && (
      <div style={{ padding: 16, maxWidth: 420 }}>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-white font-semibold">Relógio Masculino Automático Skeleton</p>
          <p className="text-xs text-gray-400">Pedido #LZ42C79347 · Retirada na loja · Pago</p>
          <CodigoDeRetirada saleId="p-relogio" />
        </div>
      </div>
    )}
    <Toaster />
  </MemoryRouter>,
);
