import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;

export default function LicenseeHeader({ referralCode }) {
  const [licensee, setLicensee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLicensee = async () => {
      if (!referralCode) {
        setIsLoading(false);
        return;
      }

      try {
        // Busca o licenciado pelo código de referência
        const users = await AppUser.filter({ referral_code: referralCode });
        
        if (users && users.length > 0) {
          setLicensee(users[0]);
        }
      } catch (error) {
        console.error('Erro ao buscar licenciado:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLicensee();
  }, [referralCode]);

  if (isLoading || !licensee) {
    return null;
  }

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ').filter(p => p);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const firstName = licensee.full_name?.split(' ')[0] || 'Licenciado';

  return (
    <div className="flex items-center justify-center gap-3 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 mb-6 mx-auto w-fit">
      {/* Logo NoZap */}
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 flex-shrink-0">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
          alt="LeilãoNoZap"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Foto do Licenciado */}
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-600 flex-shrink-0 bg-gray-700 flex items-center justify-center">
        {licensee.avatar_url ? (
          <img 
            src={licensee.avatar_url}
            alt={licensee.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-bold text-sm">
            {getInitials(licensee.full_name)}
          </span>
        )}
      </div>

      {/* Nome */}
      <span className="text-white font-medium text-sm sm:text-base">
        LeilãoNoZap | <span className="text-green-400">{firstName}</span>
      </span>
    </div>
  );
}