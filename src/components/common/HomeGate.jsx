import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasSession } from '@/lib/session';

/**
 * HomeGate — decide o que a rota "/" mostra, no padrão de mercado:
 *  • visitante (sem sessão) → Recepção (children)
 *  • usuário logado         → vai direto pros Leilões
 *
 * A checagem é síncrona (localStorage), então não existe flash da Recepção
 * antes do redirecionamento.
 */
export default function HomeGate({ children }) {
  if (hasSession()) {
    return <Navigate to={`/leiloes${window.location.search}`} replace />;
  }
  return children;
}