import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// 🔗 Rede de segurança do link curto /l/:id (o link compartilhado no WhatsApp).
// Em produção o /l/:id é servido por api/leilao.js (meta tags OG + redirect). Se por
// qualquer motivo o navegador receber o index.html nessa URL (rewrite fora do ar,
// cache antigo, deploy defasado), o app ANTES caía no 404 — o usuário tinha que
// clicar em "Início" na mão. Agora entra aqui e vai direto pra sala do leilão.
export default function LinkCurtoLeilao() {
  const { id } = useParams();
  const busca = new URLSearchParams(window.location.search);
  const ref = busca.get('ref');
  if (!id) return <Navigate to="/leiloes" replace />;
  const destino = `/AuctionRoom?id=${encodeURIComponent(id)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
  return <Navigate to={destino} replace />;
}