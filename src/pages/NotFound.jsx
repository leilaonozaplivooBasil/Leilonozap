import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";

const AppUser = base44.entities.AppUser;

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [licensee, setLicensee] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const checkPath = async () => {
      const path = location.pathname;
      
      // Verifica se é um link de vendedor /s/nome
      if (path.startsWith('/s/') || path.startsWith('/S/')) {
        const parts = path.split('/');
        // parts[0] is "", parts[1] is "s", parts[2] is slug
        const slug = parts[2]?.toLowerCase();
        
        if (slug) {
          console.log('🔍 Detectado link de vendedor na 404:', slug);
          
          try {
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
              setIsRedirecting(true);

              // Salva o código de referência na sessão para tracking
              const refCode = licenseeUser.referral_code || licenseeUser.id;
              sessionStorage.setItem('referralCode', refCode);
              sessionStorage.setItem('catalogLicenseeSlug', slug);
              sessionStorage.setItem('catalogLicenseeName', licenseeUser.full_name);
              
              // Redireciona para o Catalog
              setTimeout(() => {
                window.location.href = '/Catalog';
              }, 1500);
              return;
            } else {
              console.warn('⚠️ Licenciado não encontrado para slug:', slug);
            }
          } catch (err) {
            console.error('❌ Erro ao buscar licenciado:', err);
          }
        }
      }
      
      setIsChecking(false);
    };

    checkPath();
  }, [location.pathname]);

  if (isRedirecting && licensee) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full overflow-hidden bg-green-600 flex items-center justify-center shadow-lg shadow-green-900/50 border-4 border-green-500/30">
            {licensee.avatar_url ? (
              <img 
                src={licensee.avatar_url} 
                alt={licensee.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {licensee.full_name?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {licensee.full_name}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium mb-6">
            <span>Vendedor Verificado</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-green-500" />
            <p>Acessando catálogo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-300 mb-6">Página não encontrada</h2>
      <p className="text-gray-400 max-w-md mb-8">
        O link que você acessou pode estar incorreto ou a página foi removida.
      </p>
      <Button 
        onClick={() => navigate('/')}
        className="bg-green-600 hover:bg-green-700 text-white gap-2"
      >
        <Home className="w-4 h-4" />
        Voltar para o Início
      </Button>
    </div>
  );
}