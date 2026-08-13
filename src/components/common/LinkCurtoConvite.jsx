import React from 'react';
import { Navigate, useParams } from 'react-router-dom';

// 🔗 Rede de segurança do link de convite /c/:cargo (compartilhado no WhatsApp).
// Em produção o /c/:cargo é servido por api/convite.js (meta tags OG + redirect). Se por
// qualquer motivo o navegador receber o index.html nessa URL (rewrite fora do ar,
// cache antigo, deploy defasado), o app ANTES caía no 404 — o usuário via "Página não
// encontrada" ao clicar no link. Agora entra aqui e vai direto pro funil de cadastro.
// 🎯 Cargos com página de vendas dedicada — vão direto pra ela em vez do funil
// genérico /Cadastro. Parceiro (e qualquer outro cargo) não tem página própria,
// então mantém o comportamento antigo.
const DESTINO_DEDICADO = {
  vendedor: '/SejaVendedor',
  licenciado: '/SejaLicenciado',
  parceiro: '/Partners',
};

export default function LinkCurtoConvite() {
  const { cargo } = useParams();
  const busca = new URLSearchParams(window.location.search);
  const ref = busca.get('ref');
  if (!cargo) return <Navigate to="/" replace />;
  const refQS = ref ? `ref=${encodeURIComponent(ref)}` : '';
  const dedicado = DESTINO_DEDICADO[cargo];
  const destino = dedicado
    ? `${dedicado}${refQS ? `?${refQS}` : ''}`
    : `/Cadastro?cargo=${encodeURIComponent(cargo)}${refQS ? `&${refQS}` : ''}`;
  return <Navigate to={destino} replace />;
}