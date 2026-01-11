// CreateAuctionV2 - Versão melhorada do CreateAuction
// Por enquanto, redireciona para CreateAuction para evitar duplicação
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function CreateAuctionV2() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para CreateAuction (a página principal)
    navigate(createPageUrl("CreateAuction"));
  }, [navigate]);

  return null;
}