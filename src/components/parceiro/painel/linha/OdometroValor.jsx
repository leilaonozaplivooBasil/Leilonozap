import React from 'react';

// 🔢 ODÔMETRO — o valor sobe de 0 até o alvo UMA vez, ao entrar na tela, e para.
// ⚖️ Não incrementa em tempo real de propósito: valor subindo sozinho passa a
// ideia de dinheiro já devido. Aqui é só a entrada do número previsto.
const brl = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v || 0);

export default function OdometroValor({ valor = 0, className = '' }) {
  const [mostrado, setMostrado] = React.useState(valor);

  React.useEffect(() => {
    const reduz = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduz || !valor) {
      setMostrado(valor);
      return;
    }
    let raf;
    const inicio = performance.now();
    const DUR = 1200;
    const passo = (agora) => {
      const t = Math.min(1, (agora - inicio) / DUR);
      const eased = 1 - Math.pow(1 - t, 3); // easing out
      setMostrado(valor * eased);
      if (t < 1) raf = requestAnimationFrame(passo);
    };
    setMostrado(0);
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [valor]);

  // tabular-nums evita a largura "pulando" enquanto os dígitos correm
  return (
    <span className={`font-mono tabular-nums ${className}`}>{brl(mostrado)}</span>
  );
}