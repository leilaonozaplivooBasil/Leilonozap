import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import leilaSuporte from '@/assets/leila-suporte.webp';
import useScrollDrift from '@/hooks/useScrollDrift';
import LeilaChat from '@/components/loja/LeilaChat';

// Stack único de botões flutuantes da loja: CompareAQUI (esquerda) e Suporte Leila (direita).
// 📱 MOBILE: precisam acompanhar a rolagem de forma FLUIDA — colados à viewport (fixed),
// subindo junto com o dedo, nunca "parados" num ponto da página. O translateZ(0) força
// compositing na GPU (iOS Safari engasga o fixed durante o recolhimento da barra de URL)
// e o env(safe-area-inset-bottom) mantém os botões acima da home bar do iPhone/PWA.
// PONTO 83 — `posicao="topo"` (usado só na sala de leilão): a Leila sai do rodapé,
// onde ficava entalada entre o campo de CEP/frete e o botão de lance, e vai pro canto
// SUPERIOR-DIREITO. Lá não existe nenhum controle — não cobre frete, CEP nem lance
// em nenhuma largura. Nas demais páginas nada muda (continua no rodapé, com drift).
//
// 🤖 LEILA IA (08/08/2026): o botão NÃO redireciona mais para o WhatsApp. Ele abre
// o chat da Leila (atendente IA oficial) dentro do app, com memória da conversa.
export default function LojaFloatActions({ posicao = 'rodape' }) {
  const noTopo = posicao === 'topo';
  const [chatOpen, setChatOpen] = useState(false);
  const Label = ({ children }) => <span className="text-[9px] sm:text-[10px] text-white font-semibold mt-1 text-center leading-none bg-[#0b1018] rounded-full px-2 py-0.5 whitespace-nowrap">{children}</span>;

  // 🌊 Flutuação magnética com a rolagem (pedido do Gabriel 26/07, TODAS as telas):
  // página descendo → os botões SOBEM; página subindo → eles DESCEM; parou de rolar
  // → assentam de volta. Lógica compartilhada em useScrollDrift.
  const driftCls = useScrollDrift();

  return (
    <>
      {/* 🎯 PONTO 86 — o flutuante do CompareAQUI foi CONSOLIDADO na fileira do bloco
          "Leilões Ativos" (HeroAcoesLeiloes). Aqui sobra apenas a Leila. */}
      {/* 🤖 Leila IA — atendente oficial dentro do app (sem WhatsApp). Animada pra chamar clique. */}
      <style>{`
        @keyframes leilaBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        .leila-bob { animation: leilaBob 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion:reduce){ .leila-bob{animation:none} }
        /* PONTO 83 — ancoragem no topo (sala de leilão): abaixo do cabeçalho da sala,
           acima da conversa. Zero contato com a área de frete/lance no rodapé. */
        .leila-topo { top: calc(16rem + env(safe-area-inset-top, 0px)); }
        @media (min-width: 1024px) { .leila-topo { top: 16.5rem; } }
      `}</style>
      <div className={`${noTopo ? 'leila-topo' : `nz-dock-bottom ${driftCls}`} fixed right-3 sm:right-4 z-50 flex flex-col items-center gap-3`}>
        <button type="button" onClick={() => setChatOpen(true)} title="Fale com a Leila — Atendente IA" className="group flex flex-col items-center">
          <span className="leila-bob relative block">
            {/* anel pulsante verde pra sinalizar que é clicável */}
            <span aria-hidden className="absolute inset-0 rounded-full animate-ping opacity-30 bg-green-400" />
            <span className="relative block w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-green-400 shadow-2xl transition-transform group-hover:scale-110" style={{ boxShadow: '0 10px 28px rgba(34,197,94,.5)', background: 'radial-gradient(circle at 50% 30%, #14324a, #0b1018)' }}>
              <img src={leilaSuporte} alt="Leila — Atendente IA" className="w-full h-full object-cover object-top" loading="lazy" />
            </span>
            {/* selo IA — não é mais WhatsApp */}
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 border-2 grid place-items-center" style={{ borderColor: '#0b1018' }}>
              <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
            </span>
          </span>
          <Label>Fale com a Leila</Label>
        </button>
      </div>
      <LeilaChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}