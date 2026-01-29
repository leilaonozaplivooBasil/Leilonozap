import React, { useState, useEffect } from 'react';
import { ChevronDown, Mail, MapPin, Phone, MessageCircle, Facebook, Instagram, Youtube, Linkedin, Twitter, Sun, Moon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/components/system/ThemeContext';

export default function Footer() {
  const { theme, toggleTheme } = useTheme();
  const [footerSettings, setFooterSettings] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFooterSettings();
  }, []);

  const loadFooterSettings = async () => {
    try {
      const settings = await base44.entities.FooterSettings.list("-created_date", 1);
      if (settings && settings.length > 0) {
        setFooterSettings(settings[0]);
      } else {
        // Valores padrão se não encontrar
        setFooterSettings({
          address: 'Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102',
          email: 'relacionamento@leilaonozap.com',
          phone: '',
          whatsapp: '',
          is_active: true
        });
      }
    } catch (error) {
      console.error('Erro ao carregar footer:', error);
      setFooterSettings({
        address: 'Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102',
        email: 'relacionamento@leilaonozap.com',
        phone: '',
        whatsapp: '',
        is_active: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !footerSettings) {
    return null;
  }

  const socialLinks = [
    { icon: Facebook, url: footerSettings.facebook_url, name: 'Facebook' },
    { icon: Instagram, url: footerSettings.instagram_url, name: 'Instagram' },
    { icon: Youtube, url: footerSettings.youtube_url, name: 'YouTube' },
    { icon: Linkedin, url: footerSettings.linkedin_url, name: 'LinkedIn' },
    { icon: Twitter, url: footerSettings.twitter_url, name: 'Twitter' }
  ];

  return (
    <footer className="theme-footer bg-gray-800 dark:bg-gray-800 light:bg-white border-t border-gray-700 dark:border-gray-700 light:border-gray-200 text-gray-300 dark:text-gray-300 light:text-gray-700">
      {/* Seção Expandível */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header do Footer - Sempre Visível */}
        <div 
          className="py-6 flex items-center justify-between cursor-pointer hover:text-white transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
              alt="Leilão NoZap"
              className="h-8 w-auto"
            />
          </div>

          {/* Ícones Sociais */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return social.url ? (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-700 light:bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 light:hover:bg-gray-300 flex items-center justify-center transition-colors"
                  title={social.name}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ) : null;
            })}

            {/* Botão de Tema */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-gray-700 dark:bg-gray-700 light:bg-gray-200 hover:bg-gray-600 dark:hover:bg-gray-600 light:hover:bg-gray-300 flex items-center justify-center transition-colors"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-700" />
              )}
            </button>

            {/* Botão Expandir */}
            <button 
              className="ml-4 p-2 hover:bg-gray-700 rounded-full transition-colors"
            >
              <ChevronDown 
                className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Conteúdo Expandível */}
        {isExpanded && (
          <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200 py-8 space-y-8 animate-in fade-in duration-300">
            
            {/* Sobre Nós */}
            <div>
              <h3 className="text-white dark:text-white light:text-gray-900 font-bold text-lg mb-4">Sobre Nós</h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-400 dark:text-gray-400 light:text-gray-600">Leilão NoZap - Leilões Presenciais e Online</p>
                <p className="text-gray-400 dark:text-gray-400 light:text-gray-600">Plataforma de leilões online com sistema 100% seguro e transparente</p>
              </div>
            </div>

            {/* Informações de Contato */}
            <div>
              <h3 className="text-white dark:text-white light:text-gray-900 font-bold text-lg mb-4">Informações de Contato</h3>
              <div className="space-y-3">
                {footerSettings.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600">{footerSettings.address}</p>
                  </div>
                )}
                
                {footerSettings.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <a 
                      href={`mailto:${footerSettings.email}`}
                      className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 transition-colors"
                    >
                      {footerSettings.email}
                    </a>
                  </div>
                )}

                {footerSettings.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <a 
                      href={`tel:${footerSettings.phone}`}
                      className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 transition-colors"
                    >
                      {footerSettings.phone}
                    </a>
                  </div>
                )}

                {footerSettings.whatsapp && (
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <a 
                      href={`https://wa.me/${footerSettings.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-400 dark:text-gray-400 light:text-gray-600 hover:text-white dark:hover:text-white light:hover:text-gray-900 transition-colors"
                    >
                      {footerSettings.whatsapp}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-700 dark:border-gray-700 light:border-gray-200 bg-gray-900 dark:bg-gray-900 light:bg-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-500 light:text-gray-600">
            © 2026 Leilão NoZap. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}