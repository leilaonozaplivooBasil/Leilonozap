import React from 'react';
import MyStoreTab from '@/components/licensing/MyStoreTab';
import StoreShareLinkCard from '@/components/licensing/StoreShareLinkCard';

// 🏪 PONTO 85 — "Admin" para quem NÃO é admin da plataforma: a administração da
// loja da própria pessoa. Reúne o que já existia (nome + foto da loja) com o
// link da loja virtual dela pra compartilhar — "é a loja dele, é tudo".
// Tema claro (isSaiDeBaixo) porque o Painel de Alavancagem é branco.
export default function MinhaLojaAdmin({ user }) {
  const storeLink = user?.referral_code
    ? `https://leilaonozap.net/Loja-Virtual?ref=${user.referral_code}`
    : null;

  return (
    <div className="space-y-4">
      <MyStoreTab user={user} isSaiDeBaixo />
      {storeLink && <StoreShareLinkCard storeLink={storeLink} isSaiDeBaixo />}
    </div>
  );
}