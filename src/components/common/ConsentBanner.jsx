import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import LegalTermsModal from './LegalTermsModal';

const CONSENT_KEY = 'lnz_consent_accepted';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(CONSENT_KEY);
    if (!accepted) {
      // Pequeno delay para não bloquear o carregamento inicial da página
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setAccepting(true);
    setTimeout(() => {
      localStorage.setItem(CONSENT_KEY, 'true');
      setVisible(false);
      setAccepting(false);
    }, 400);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay sutil */}
      <div
        className="fixed inset-0 z-[2990] pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 40%)' }}
      />

      {/* Banner */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[3000] px-4 pb-4 pt-0"
        style={{
          animation: accepting
            ? 'consentSlideOut 0.4s ease-in forwards'
            : 'consentSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <div
          className="max-w-4xl mx-auto rounded-2xl p-5 sm:p-6"
          style={{
            background: 'rgba(10, 14, 23, 0.97)',
            border: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.08)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Ícone */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm mb-1">
                Sua privacidade é importante para nós 🔒
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Usamos seus dados para fornecer nossos serviços de leilão. Ao continuar, você concorda com nossa{' '}
                <button
                  onClick={() => setShowPrivacy(true)}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors font-medium"
                >
                  Política de Privacidade
                </button>{' '}
                e nossos{' '}
                <button
                  onClick={() => setShowTerms(true)}
                  className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors font-medium"
                >
                  Termos de Uso
                </button>
                , em conformidade com a LGPD (Lei nº 13.709/2018).
              </p>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-semibold text-white text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #059669, #065f46)',
                  boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
                  minWidth: '120px',
                }}
              >
                {accepting ? '✓ Aceito!' : 'Aceitar e continuar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modais inline (abre antes de aceitar, para o usuário ler) */}
      {showPrivacy && <PrivacyPolicyModal onClose={() => setShowPrivacy(false)} />}
      {showTerms && <LegalTermsModal onClose={() => setShowTerms(false)} />}

      <style>{`
        @keyframes consentSlideIn {
          0% { transform: translateY(120%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes consentSlideOut {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(120%); opacity: 0; }
        }
      `}</style>
    </>
  );
}
