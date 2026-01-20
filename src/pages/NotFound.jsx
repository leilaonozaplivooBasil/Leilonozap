import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const handleRedirect = async () => {
      const path = window.location.pathname;

      // Verifica se é uma rota de catálogo curto: /s/nome
      if (path.startsWith('/s/')) {
        const slug = path.replace('/s/', '').toLowerCase();

        if (slug) {
          try {
            // Busca usuário pelo nickname (slug)
            const users = await base44.entities.AppUser.list('-created_date', 500);
            
            const targetUser = users.find(u => {
                const userSlug = (u.nickname || u.full_name?.split(' ')[0] || '')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '')
                    .replace(/[^a-z0-9]/g, '');
                return userSlug === slug && u.career_levels?.includes('licenciado_catalogo');
            });

            if (targetUser) {
              const refCode = targetUser.referral_code || targetUser.id;
              console.log(`✅ Redirecionando ${slug} para código ${refCode}`);
              
              // Redireciona para o catálogo com o ref code correto
              window.location.href = `/Catalog?ref=${refCode}`;
              return;
            }
          } catch (error) {
            console.error('Erro ao resolver link curto:', error);
          }
        }
      }

      // Se não for rota /s/ ou não encontrar usuário, mostra 404 real
      setIsRedirecting(false);
    };

    handleRedirect();
  }, [navigate]);

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-white">Buscando catálogo...</h2>
        <p className="text-gray-400 text-sm mt-2">Aguarde um momento</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold text-green-500 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-white mb-4">Página não encontrada</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        O link que você tentou acessar não existe ou foi movido.
      </p>
      <button 
        onClick={() => window.location.href = '/'}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        Voltar para o Início
      </button>
    </div>
  );
}