import { useEffect, useState } from 'react';

// ⏳ Contagem regressiva até o horário do leilão.
// Mobile pausa timers em background: além do setInterval, recalcula em
// visibilitychange e focus — voltar do banco/app mostra o tempo certo na hora.
export default function useContagemLeilao(dataLeilao) {
  const [restante, setRestante] = useState(() => calcular(dataLeilao));

  useEffect(() => {
    const atualizar = () => setRestante(calcular(dataLeilao));
    atualizar();
    const id = setInterval(atualizar, 1000);
    window.addEventListener('visibilitychange', atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener('visibilitychange', atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, [dataLeilao]);

  return restante;
}

function calcular(dataLeilao) {
  if (!dataLeilao) return { texto: '—', encerrado: false, hoje: false };
  const alvo = new Date(dataLeilao).getTime();
  if (isNaN(alvo)) return { texto: '—', encerrado: false, hoje: false };
  const ms = alvo - Date.now();
  const hoje = new Date(dataLeilao).toDateString() === new Date().toDateString();
  if (ms <= 0) return { texto: 'Leilão encerrado', encerrado: true, hoje };

  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const texto = d > 0 ? `em ${d}d ${h}h ${m}min` : `em ${h}h ${m}min ${seg}s`;
  return { texto, encerrado: false, hoje };
}