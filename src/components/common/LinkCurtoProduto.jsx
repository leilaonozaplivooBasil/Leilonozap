import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// 🔗 Rede de segurança do link curto de produto /p/:id (compartilhado da Loja Virtual).
// Em produção o /p/:id é servido por api/produto.js (meta tags OG com a foto real +
// redirect). Se o navegador receber o index.html nessa URL, o app antes caía no 404.
// Agora entra aqui e vai direto pra página do produto, preservando o ?ref= do vendedor.
export default function LinkCurtoProduto() {
  const { id } = useParams();
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (!id) return <Navigate to="/Loja-Virtual" replace />;
  const destino = `/CatalogProductDetails?id=${encodeURIComponent(id)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
  return <Navigate to={destino} replace />;
}