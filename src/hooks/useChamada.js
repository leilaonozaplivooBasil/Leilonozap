// 📣 PONTO 69 — contagem viva do Modo Chamada.
// Recalcula a cada segundo E ao voltar do background (visibilitychange + focus),
// porque no celular o setInterval congela quando o app sai da tela.
import { useState, useEffect, useCallback } from 'react';
import { emChamada, msAteAbertura, formatarContagem } from '@/lib/modoChamada';

export default function useChamada(auction) {
  const calcular = useCallback(() => ({
    chamada: emChamada(auction),
    label: formatarContagem(msAteAbertura(auction)),
  }), [auction?.modo_chamada, auction?.data_abertura_lances]);

  const [estado, setEstado] = useState(calcular);

  useEffect(() => {
    let timer = null;
    const atualizar = () => {
      const novo = calcular();
      setEstado((prev) => (prev.chamada === novo.chamada && prev.label === novo.label ? prev : novo));
      // já abriu → para o tick (nada mais muda)
      if (!novo.chamada && timer) { clearInterval(timer); timer = null; }
    };

    atualizar();
    if (!auction?.modo_chamada) return undefined;

    timer = setInterval(atualizar, 1000);
    const onVisibilidade = () => { if (!document.hidden) atualizar(); };
    document.addEventListener('visibilitychange', onVisibilidade);
    window.addEventListener('focus', atualizar);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilidade);
      window.removeEventListener('focus', atualizar);
    };
  }, [calcular, auction?.modo_chamada]);

  return {
    emChamada: estado.chamada,
    label: estado.label,
    preLancamento: !!auction?.modo_chamada,
  };
}