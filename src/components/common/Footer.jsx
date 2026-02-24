import React, { useState, useEffect } from 'react';
import { ChevronDown, Mail, MapPin, Phone, MessageCircle, Facebook, Instagram, Youtube, Linkedin, Twitter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LogoTransparent from '@/assets/logo-transparent.png';

export default function Footer() {
  const [footerSettings, setFooterSettings] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const defaultFooter = {
    address: 'Av. das Américas, 3500 - Barra da Tijuca, Rio de Janeiro - RJ, 22640-102',
    email: 'relacionamento@leilaonozap.com',
    phone: '',
    whatsapp: '',
    is_active: true
  };

  useEffect(() => {
    // Cache de 10 minutos para footer (raramente muda)
    const cached = sessionStorage.getItem('footer_settings_cache');
    const cacheTime = sessionStorage.getItem('footer_settings_cache_time');
    if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 600000) {
      setFooterSettings(JSON.parse(cached));
      setIsLoading(false);
      return;
    }
    loadFooterSettings();
  }, []);

  const loadFooterSettings = async () => {
    try {
      const settings = await base44.entities.FooterSettings.list("-created_date", 1);
      const data = settings && settings.length > 0 ? settings[0] : defaultFooter;
      setFooterSettings(data);
      sessionStorage.setItem('footer_settings_cache', JSON.stringify(data));
      sessionStorage.setItem('footer_settings_cache_time', Date.now().toString());
    } catch (error) {
      setFooterSettings(defaultFooter);
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
    <footer className="text-gray-300" style={{ background: 'rgba(10, 15, 28, 0.65)', backdropFilter: 'blur(24px) saturate(1.5)', WebkitBackdropFilter: 'blur(24px) saturate(1.5)', borderTop: '1px solid rgba(16, 185, 129, 0.08)' }}>
      {/* Seção Expandível */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header do Footer - Sempre Visível */}
        <div
          className="py-6 flex items-center justify-between cursor-pointer hover:text-white transition-colors duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-4">
            <img
              src={LogoTransparent}
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
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  title={social.name}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ) : null;
            })}

            {/* Botão Expandir */}
            <button
              className="ml-4 p-2 rounded-full transition-all duration-300 hover:bg-white/5"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Conteúdo Expandível */}
        {isExpanded && (
          <div className="border-t border-gray-700 py-8 space-y-8 animate-in fade-in duration-300">

            {/* Sobre Nós */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Sobre Nós</h3>
              <div className="space-y-3 text-sm">
                <p className="text-gray-400">Leilão NoZap - Leilões Presenciais e Online</p>
                <p className="text-gray-400">Plataforma de leilões online com sistema 100% seguro e transparente</p>
              </div>
            </div>

            {/* Informações de Contato */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">Informações de Contato</h3>
              <div className="space-y-3">
                {footerSettings.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-400">{footerSettings.address}</p>
                  </div>
                )}

                {footerSettings.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <a
                      href={`mailto:${footerSettings.email}`}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
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
                      className="text-sm text-gray-400 hover:text-white transition-colors"
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
                      className="text-sm text-gray-400 hover:text-white transition-colors"
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
      <div className="border-t border-gray-700 bg-gray-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2026 Leilão NoZap. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}