import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LicensorCRM() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a nova página unificada
    navigate(createPageUrl('Licensing'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Redirecionando...</p>
    </div>
  );
}