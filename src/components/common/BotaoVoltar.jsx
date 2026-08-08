import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

// ↩️ BOTÃO VOLTAR ÚNICO DO SISTEMA (FASE 3).
// Antes cada tela tinha o seu (ou nenhum): umas com "← Voltar" simples, outras
// com "← Voltar ao Painel" de outro estilo, e várias sem saída nenhuma.
// Pílula discreta, toque mínimo de 44px, funciona no tema claro e no escuro.
//
// Volta para a página anterior. Quando não houver histórico (link direto,
// abrir do WhatsApp, PWA recém-aberto), cai no destino de segurança.
export default function BotaoVoltar({ texto = 'Voltar', destino = '/', tema = 'escuro', className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();

  // 🧭 BOTÃO REDUNDANTE SOME (08/08/2026): quando a barra do painel está na
  // tela, ela já é a navegação — um "Voltar" ao lado dela é botão sobrando.
  // A barra deixa uma marca no documento ao aparecer; aqui só observamos essa
  // marca. Abrindo a MESMA tela por link direto (WhatsApp, PWA, URL colada)
  // não há barra nenhuma — e o Voltar continua aparecendo, senão a pessoa
  // fica sem saída.
  const [temBarraDoPainel, setTemBarraDoPainel] = React.useState(false);
  React.useEffect(() => {
    const ler = () => setTemBarraDoPainel(!!document.body.dataset.painelNav);
    ler();
    const observador = new MutationObserver(ler);
    observador.observe(document.body, { attributes: true, attributeFilter: ['data-painel-nav'] });
    return () => observador.disconnect();
  }, []);

  // 🐞 CAUSA-RAIZ DO "VOLTAR QUE NÃO VOLTA" (08/08/2026):
  // a checagem era window.history.length > 1 — que conta o histórico do NAVEGADOR
  // inteiro (abas anteriores, editor, links de fora). Como quase sempre é > 1, o
  // botão chamava navigate(-1) e voltava para uma página FORA do app — no
  // preview/iframe e no PWA isso não mostra mudança nenhuma: parece que o clique
  // morreu. Agora usamos a chave de navegação do próprio app: quando a pessoa
  // ENTROU direto pela URL (link do WhatsApp, PWA recém-aberto), a chave é
  // 'default' — não há para onde voltar dentro do app, então vai pro destino.
  const voltar = () => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate(destino);
  };

  // 🚫 DECISÃO DO DONO (08/08/2026): o sistema NÃO tem mais botão "Voltar" em
  // tela nenhuma. A saída é sempre a navegação persistente (barra do painel no
  // topo / lateral). Desligar aqui, num lugar só, garante o padrão em TODAS as
  // telas de uma vez — sem risco de sobrar uma esquecida. O componente segue no
  // projeto (as telas continuam podendo chamá-lo) apenas não desenha nada.
  return null;

  // eslint-disable-next-line no-unreachable
  if (temBarraDoPainel) return null;

  const cor = tema === 'claro'
    ? 'bg-white border-nz-borda text-gray-600 hover:bg-nz-cinza-fundo hover:text-nz-verde'
    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white';

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label={texto}
      className={`inline-flex h-11 items-center gap-2 px-4 rounded-full border text-sm font-medium transition-colors ${cor} ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {texto}
    </button>
  );
}