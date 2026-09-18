/**
 * Banca da DICA DA ETAPA — NÃO vai para o bundle do app.
 *
 * Mostra a pílula nas três fases sobre o MESMO fundo do Ritual do Amanhecer
 * (o degradê roxo→laranja do print do dono), porque o problema que ela veio
 * resolver é de CONTRASTE: o texto antigo era 11px a 45% de branco sobre isto.
 *
 * `?vivo=1` roda um contador subindo, pra conferir o salto do número, a troca
 * de cor e o momento em que libera.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import DicaDaEtapa from '@/components/licensing/CentralVendas/DicaDaEtapa';

const FUNDO = 'linear-gradient(170deg, #4c2a63 0%, #6b3a63 45%, #c9736a 78%, #e8a45c 100%)';

function Banca() {
  const vivo = new URLSearchParams(window.location.search).get('vivo') === '1';
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    if (!vivo) return undefined;
    const t = setInterval(() => setSeg((v) => (v >= 72 ? 0 : v + 3)), 700);
    return () => clearInterval(t);
  }, [vivo]);

  const casos = vivo
    ? [{ rotulo: 'subindo', feito: seg, meta: 70, unidade: 's', complemento: 'ou escreve, se preferir' }]
    : [
      { rotulo: 'longe — 12s de 70s', feito: 12, meta: 70, unidade: 's', complemento: 'ou escreve, se preferir' },
      { rotulo: 'perto — o caso do print (61s de 70s)', feito: 61, meta: 70, unidade: 's', complemento: 'ou escreve, se preferir' },
      { rotulo: 'liberado — 70s', feito: 70, meta: 70, unidade: 's', complemento: 'agora é só apertar Continuar' },
      { rotulo: 'escrevendo — 18 de 20 letras', feito: 18, meta: 20, unidade: 'letras', complemento: 'ou grava um áudio' },
    ];

  return (
    <div style={{ background: FUNDO, minHeight: '100vh', padding: 20 }} className="text-white">
      <p className="text-[11px] text-white/45 mb-4">↓ assim era o aviso antigo: 11px, 45% de branco ↓</p>
      <p className="text-[11px] text-white/45 mb-6">fale mais 9s — ou escreva</p>
      <div className="space-y-5 max-w-sm">
        {casos.map((c) => (
          <div key={c.rotulo}>
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1.5">{c.rotulo}</p>
            <DicaDaEtapa feito={c.feito} meta={c.meta} unidade={c.unidade} complemento={c.complemento} />
          </div>
        ))}
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
