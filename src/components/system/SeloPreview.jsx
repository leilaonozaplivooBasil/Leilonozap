/* global __BUILD_VERSION__ */
import React from 'react';
import { tipoDeHost, dataDoBuild, HOST_PREVIEW_OFICIAL } from '@/lib/previewInfo';

// 🧪 DIR-42 — O SELO DO PREVIEW: a própria página diz onde você está.
// Verde = link oficial (vivo, sempre a última versão — é ELE que mostra o
// aviso de atualização). Âmbar = foto congelada de um deploy antigo, com o
// atalho de um clique pra voltar pro oficial no MESMO caminho.
// Em produção (leilaonozap.net) nada aparece.
export default function SeloPreview() {
  const tipo = tipoDeHost(typeof window !== 'undefined' ? window.location.hostname : '');
  if (tipo === 'producao') return null;

  const build = dataDoBuild(typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : null);

  if (tipo === 'preview_oficial') {
    return (
      <div className="fixed bottom-2 left-2 z-[9999] px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-semibold shadow-lg pointer-events-none select-none">
        🧪 Preview oficial{build ? ` · build ${build}` : ''}
      </div>
    );
  }

  // 🐛 09/09/2026 — não é SÓ "deploy congelado" mais: pode ser o alias vivo
  // de OUTRA branch (também atualiza, só que não é o link que o dono
  // confere) — por isso o aviso não afirma mais "nunca recebe atualização",
  // só que ESTE link aqui não é o único oficial.
  const destino = `https://${HOST_PREVIEW_OFICIAL}${typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''}`;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold shadow-lg">
      ⚠️ Este NÃO é o link oficial{build ? ` (build ${build})` : ''} — pode ser um deploy congelado ou outra branch. O oficial é sempre este:
      <a href={destino} className="underline font-bold text-amber-950 hover:text-black">
        Ir pro Preview oficial →
      </a>
    </div>
  );
}
