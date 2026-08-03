import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// 🔗 Rede de segurança do link de convite /c/:cargo (compartilhado no WhatsApp).
// Em produção o /c/:cargo é servido por api/convite.js (meta tags OG + redirect). Se por
// qualquer motivo o navegador receber o index.html nessa URL (rewrite fora do ar,
// cache antigo, deploy defasado), o app ANTES caía no 404 — o usuário via "Página não
// encontrada" ao clicar no link. Agora entra aqui e vai direto pro funil de cadastro.
export default function LinkCurtoConvite() {
  const { cargo } = useParams();
  const busca = new URLSearchParams(window.location.search);
  const ref = busca.get('ref');
  if (!cargo) return <Navigate to="/" replace />;
  const destino = `/Cadastro?cargo=${encodeURIComponent(cargo)}${ref ? `&ref=${encodeURIComponent(ref)}` : ''}`;
  return <Navigate to={destino} replace />;
}