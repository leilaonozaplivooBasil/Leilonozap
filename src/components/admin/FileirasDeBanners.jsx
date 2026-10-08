import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Layers } from 'lucide-react';

// 🗂️ As três fileiras de banners do Painel de Mídia (08/10/2026).
// Dono: "uma fileira pro leilão, uma pra loja e uma unificada. Leilão e Loja
// podem estar ativas ao mesmo tempo; ligar a Unificada desliga as outras duas."
// As regras vivem em src/lib/fileirasDeBanners.js — aqui só se desenha e se avisa.

const LINHAS = [
  { chave: 'home', titulo: 'Leilão', desc: 'Banners do topo da página de leilões.' },
  { chave: 'catalog', titulo: 'Loja', desc: 'Banners do topo da Loja Virtual.' },
  { chave: 'unificado', titulo: 'Unificada', desc: 'O mesmo conjunto de banners no Leilão e na Loja. Ligar esta desliga as duas de cima.' },
];

export default function FileirasDeBanners({ fileiras, contagens = {}, onLigar, desabilitado = false }) {
  return (
    <section
      aria-label="Fileiras de banners"
      data-teste="fileiras-de-banners"
      className="mt-8 rounded-xl border border-white/10 bg-gray-800/60 p-4"
    >
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-300" />
        <h2 className="text-lg font-bold text-white">Quais fileiras estão no ar</h2>
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-3">
        Leilão e Loja podem ficar ligadas juntas, cada uma com os seus banners. Ligando a Unificada, as duas páginas passam a mostrar
        o mesmo conjunto e as outras duas fileiras ficam desligadas. Os banners de uma fileira desligada ficam guardados.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {LINHAS.map((l) => {
          const ligada = !!fileiras?.[l.chave];
          const n = contagens[l.chave] ?? 0;
          return (
            <div
              key={l.chave}
              data-fileira={l.chave}
              data-ligada={ligada ? 'sim' : 'nao'}
              className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${ligada ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 bg-gray-900/40'}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{l.titulo}</p>
                <p className={`text-[11px] font-semibold mt-0.5 ${ligada ? 'text-emerald-300' : 'text-gray-500'}`}>
                  {ligada ? 'No ar' : 'Desligada'} · {n} {n === 1 ? 'banner' : 'banners'}
                </p>
                <p className="text-[11px] text-gray-400 mt-1 leading-snug">{l.desc}</p>
              </div>
              <Switch
                checked={ligada}
                disabled={desabilitado}
                aria-label={`Fileira ${l.titulo}`}
                onCheckedChange={(v) => onLigar(l.chave, v)}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
