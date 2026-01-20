import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

const AppUser = base44.entities.AppUser;

/**
 * Esta página serve como intermediária para links bonitos do tipo /s/elyon
 * Ela busca o licenciado pelo nickname/slug e redireciona para o Catalog
 * salvando o ref code na sessão para tracking de comissões
 */
export default function CatalogStore() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [licensee, setLicensee] = useState(null);

  useEffect(() => {
    const loadLicenseeBySlug = async () => {
      try {
        // Pega o slug da URL (ex: /s/elyon -> slug = "elyon")
        const pathParts = location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1]?.toLowerCase();

        if (!slug || slug === 's') {
          // Se não tem slug, vai pro catálogo normal
          navigate('/Catalog', { replace: true });
          return;
        }

        console.log('🔍 Buscando licenciado pelo slug:', slug);

        // Busca todos os usuários que são licenciados de catálogo
        const users = await AppUser.list('-created_date', 500);
        
        // Procura pelo nickname ou primeiro nome
        const licenseeUser = users.find(u => {
          if (!u.career_levels?.includes('licenciado_catalogo')) return false;
          
          // Verifica se o nickname bate
          const userNickname = (u.nickname || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');
          
          if (userNickname === slug) return true;
          
          // Verifica se o primeiro nome bate
          const firstName = (u.full_name?.split(' ')[0] || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');
          
          return firstName === slug;
        });

        if (licenseeUser) {
          console.log('✅ Licenciado encontrado:', licenseeUser.full_name);
          setLicensee(licenseeUser);

          // Salva o código de referência na sessão para tracking
          const refCode = licenseeUser.referral_code || licenseeUser.id;
          sessionStorage.setItem('referralCode', refCode);
          sessionStorage.setItem('catalogLicenseeSlug', slug);
          sessionStorage.setItem('catalogLicenseeName', licenseeUser.full_name);
          
          console.log('💾 Código de referência salvo:', refCode);

          // Redireciona para o Catalog mantendo a URL bonita
          // O Catalog vai ler o referralCode da sessão
          setTimeout(() => {
            navigate('/Catalog', { replace: true });
          }, 800);

        } else {
          console.warn('⚠️ Licenciado não encontrado para slug:', slug);
          setError(`Vendedor "${slug}" não encontrado`);
          
          // Redireciona para o catálogo normal após 2s
          setTimeout(() => {
            navigate('/Catalog', { replace: true });
          }, 2000);
        }

      } catch (err) {
        console.error('❌ Erro ao buscar licenciado:', err);
        setError('Erro ao carregar. Redirecionando...');
        setTimeout(() => {
          navigate('/Catalog', { replace: true });
        }, 1500);
      } finally {
        setIsLoading(false);
      }
    };

    loadLicenseeBySlug();
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        {isLoading ? (
          <>
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
              alt="Leilão NoZap"
              className="h-20 w-auto mx-auto mb-6 animate-pulse"
            />
            <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-400">Carregando catálogo...</p>
          </>
        ) : error ? (
          <>
            <div className="text-5xl mb-4">😕</div>
            <p className="text-yellow-400 text-lg mb-2">{error}</p>
            <p className="text-gray-500 text-sm">Redirecionando para o catálogo...</p>
          </>
        ) : licensee ? (
          <>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden bg-green-600 flex items-center justify-center">
              {licensee.avatar_url ? (
                <img 
                  src={licensee.avatar_url} 
                  alt={licensee.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {licensee.full_name?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <p className="text-white text-lg font-semibold mb-1">
              {licensee.full_name}
            </p>
            <p className="text-green-400 text-sm mb-4">Vendedor Verificado ✓</p>
            <Loader2 className="w-6 h-6 animate-spin text-green-500 mx-auto" />
            <p className="text-gray-500 text-sm mt-2">Abrindo catálogo...</p>
          </>
        ) : null}
      </div>
    </div>
  );
}