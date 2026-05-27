import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as UserEntity } from "@/entities/User";

// ESTE ARQUIVO É UMA CÓPIA DE SEGURANÇA DA LÓGICA DE ENTRADA PERFEITA.
// NÃO ALTERAR SEM AUTORIZAÇÃO EXPLÍCITA.

export default function LayoutProtection({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);  // SEMPRE começa true = SEMPRE mostra "Seja bem-vindo" primeiro
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    // Manifest injection
    const manifest = {
      name: "Leilão NoZap",
      short_name: "LeilãoNoZap",
      description: "Leilões de produtos de arremate, devolução e mostruário, direto no WhatsApp.",
      start_url: "/",
      display: "standalone",
      background_color: "#111827",
      theme_color: "#16a34a",
      icons: [
        {
          src: "https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG",
          sizes: "192x192",
          type: "image/png"
        }
      ]
    };
    const manifestString = JSON.stringify(manifest);
    const manifestDataUrl = `data:application/manifest+json;charset=utf-8,${encodeURIComponent(manifestString)}`;
    
    let link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    link.href = manifestDataUrl;

    // SOLUÇÃO BURRA QUE FUNCIONA: 2 segundos para Landing, imediato para resto
    const delay = currentPageName === "Landing" ? 2000 : 500; // Landing = 2s, resto = 0.5s
    
    const timer = setTimeout(async () => {
      try {
        const user = await UserEntity.me();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
        const hasEntered = sessionStorage.getItem('hasEnteredAsGuest');
        if (!hasEntered && currentPageName !== "Landing") {
          navigate(createPageUrl("Landing"), { replace: true });
          return;
        }
      }
      setIsCheckingAuth(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [location, currentPageName, navigate]);
  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // SEMPRE mostra "Seja bem-vindo" primeiro
  if (isCheckingAuth) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-[5000]">
        <div className="text-center">
           <img 
              src="https://gezvviyegtxytnwjkrjv.supabase.co/storage/v1/object/public/public-assets/public/68d536db3c26ff51f79c4137/fadb71d8a_3097A240-8136-4C1B-9127-A8020978248D.PNG"
              alt="Leilão NoZap"
              className="w-24 h-24 mx-auto mb-4 rounded-full shadow-2xl border-2 border-green-500/30 animate-pulse"
            />
          <p className="text-lg text-gray-300 tracking-wider">Seja bem-vindo...</p>
        </div>
      </div>
    );
  }

  // O resto do componente (navegação, etc.)
  return <div />;
}