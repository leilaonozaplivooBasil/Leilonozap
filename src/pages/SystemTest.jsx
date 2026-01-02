import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SystemTest() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('ProtecaoCriacao'));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Redirecionando...</p>
    </div>
  );
}