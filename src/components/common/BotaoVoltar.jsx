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

  // 📱 CORREÇÃO (18/08/2026): a navegação lateral (NavegacaoLateralGlobal) só
  // existe no DESKTOP ("hidden md:block") — no celular ela nunca aparece, então
  // sem este botão o usuário ficava sem NENHUMA saída na tela (bug reportado:
  // "não conseguimos voltar quando clica"). Volta a desenhar, mas só no
  // celular (md:hidden abaixo): no desktop a lateral continua sendo a saída.
  if (temBarraDoPainel) return null;

  // 🎨 Botão só de ícone (18/08/2026): mesmo tamanho/forma dos outros ícones do
  // cabeçalho (w-9 h-9 rounded-xl) — a pílula com texto "← Voltar" destoava do
  // resto do topo. Fica compacto e alinhado com o quadradinho do carrinho ao lado.
  const cor = tema === 'claro'
    ? 'bg-nz-cinza-fundo border-nz-borda text-nz-tinta-fraca hover:text-nz-verde hover:border-green-500/40'
    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white';

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label={texto}
      title={texto}
      className={`md:hidden w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${cor} ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}