/**
 * Banca da CAPA DO VÍDEO — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * A régua pura (capaDoVideo.js) é provada sem navegador. O que ela NÃO prova é
 * a metade que decodifica: abrir o arquivo, procurar o instante, desenhar no
 * canvas e ler os pixels de volta. Isso só um navegador de verdade responde.
 *
 * Não há ffmpeg nem arquivo de vídeo nesta máquina, então a banca GRAVA o
 * vídeo na hora, com MediaRecorder: meio segundo preto e depois claro — que é
 * exatamente o defeito que o dono descreveu ("o primeiro frame costuma ser
 * tudo preto"). `?claro=1` grava o mesmo vídeo começando já claro.
 */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { olharOComeco } from '@/lib/olharOVideo';
import { recadoDaCapa } from '@/lib/capaDoVideo';

const PRETO_ATE_MS = 600;
const TOTAL_MS = 1600;

/** grava um webm: preto no começo (ou não) e claro depois */
function gravar({ comecaClaro }) {
  return new Promise((ok, falhou) => {
    const tela = document.createElement('canvas');
    tela.width = 320; tela.height = 180;
    const pincel = tela.getContext('2d');
    const fluxo = tela.captureStream(30);
    const gravador = new MediaRecorder(fluxo, { mimeType: 'video/webm' });
    const pedacos = [];
    gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data); };
    gravador.onstop = () => ok(new Blob(pedacos, { type: 'video/webm' }));
    gravador.onerror = falhou;

    const inicio = performance.now();
    const desenhar = () => {
      const passou = performance.now() - inicio;
      const escuro = !comecaClaro && passou < PRETO_ATE_MS;
      pincel.fillStyle = escuro ? '#000000' : '#e8f5d0';
      pincel.fillRect(0, 0, tela.width, tela.height);
      if (passou < TOTAL_MS) requestAnimationFrame(desenhar);
      else gravador.stop();
    };
    gravador.start();
    requestAnimationFrame(desenhar);
  });
}

function Banca() {
  const [estado, setEstado] = useState(null);
  useEffect(() => {
    const comecaClaro = new URLSearchParams(window.location.search).get('claro') === '1';
    (async () => {
      try {
        const blob = await gravar({ comecaClaro });
        // 🔎 mede o que o navegador diz de duração ANTES da análise: é isso que
        // decide se o contorno da duração infinita é exercido ou é decoração
        const cru = await new Promise((ok) => {
          const u = URL.createObjectURL(blob);
          const v = document.createElement('video');
          v.preload = 'auto'; v.muted = true; v.src = u;
          v.onloadedmetadata = () => { ok(v.duration); URL.revokeObjectURL(u); };
          v.onerror = () => { ok('erro'); URL.revokeObjectURL(u); };
          setTimeout(() => ok('tempo'), 5000);
        });
        const capa = await olharOComeco(blob);
        setEstado({ ...capa, duracaoCrua: String(cru), recado: capa.olhou ? recadoDaCapa(capa) : '' });
      } catch (e) {
        setEstado({ erro: String(e?.message || e) });
      }
    })();
  }, []);

  if (!estado) return <p data-teste="estado">gravando…</p>;
  return (
    <div style={{ padding: 24 }}>
      <p data-teste="estado">pronto</p>
      <pre data-teste="resultado">{JSON.stringify(estado, null, 2)}</pre>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
