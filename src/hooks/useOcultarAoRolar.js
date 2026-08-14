import React from 'react';

// 👋 SAI DA FRENTE ENQUANTO A PESSOA ROLA (padrão iFood/Shopee/Mercado Livre).
// Botão flutuante fixo sempre acaba passando por cima de algum conteúdo em algum
// ponto da rolagem — cobria o "Quero começar" do Lucre e o texto legal do Como
// Funciona (auditoria 14/08/2026). Em vez de tirar o atendimento de páginas, ele
// desaparece suave DURANTE a rolagem e volta quando o usuário para de rolar:
// navegação 100% limpa e a Leila continua disponível em todo o site.
//
// Uso: const rolando = useOcultarAoRolar(); → aplicar opacidade/pointer-events.
// `pausado` (ex.: chat aberto) desliga o comportamento.
export default function useOcultarAoRolar(pausado = false, msParaVoltar = 550) {
  const [rolando, setRolando] = React.useState(false);

  React.useEffect(() => {
    if (pausado) { setRolando(false); return; }
    let ultimoY = window.scrollY;
    let voltar = null;
    const onScroll = () => {
      const y = window.scrollY;
      // rolagens minúsculas (tremida do dedo, ajuste de layout) não escondem nada
      if (Math.abs(y - ultimoY) > 6) setRolando(true);
      ultimoY = y;
      clearTimeout(voltar);
      voltar = setTimeout(() => setRolando(false), msParaVoltar);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    // 📱 Voltar de outro app / trocar de aba: garante que a Leila reapareça
    const reaparecer = () => setRolando(false);
    window.addEventListener('focus', reaparecer);
    document.addEventListener('visibilitychange', reaparecer);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focus', reaparecer);
      document.removeEventListener('visibilitychange', reaparecer);
      clearTimeout(voltar);
    };
  }, [pausado, msParaVoltar]);

  return rolando;
}