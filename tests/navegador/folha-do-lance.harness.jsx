/**
 * Banca da folha de lance — NÃO vai para o bundle da loja.
 *
 * 🔴 POR QUE ISTO EXISTE (15/09/2026)
 * Beatriz, com print: "não consigo ver a tela completa para dar o lance".
 *
 * Reproduz a sala do leilão no que importa para este defeito, com o COMPONENTE
 * REAL (BidPopover):
 *   • container de altura travada (100dvh - 56px) com overflow hidden
 *   • um miolo alto, que é o que empurrava o rodapé para fora da tela
 *   • o rodapé com `backdrop-filter: blur(12px)` — o detalhe que prendia a
 *     folha `position: fixed` dentro dele
 *
 * A TESTEMUNHA: ao lado da folha real vai um `position: fixed` comum, dentro
 * do MESMO rodapé. Ele PRECISA sair contido (é assim que o navegador funciona);
 * a folha real, por sair em portal, NÃO pode. Sem essa testemunha, um teste
 * verde poderia significar só "o Chromium desta máquina não faz containment".
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import BidPopover from '@/components/auction/BidPopover';

function Banca() {
  return (
    <div
      data-parte="pagina"
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100dvh - 56px)', overflow: 'hidden', background: '#0A1611',
      }}
    >
      {/* o miolo: alto de propósito, como o chat cheio. min-height: 0 é o que
          permite ele encolher — é a segunda metade do conserto. */}
      <div
        data-parte="miolo"
        style={{ flexGrow: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ height: 2000, background: 'linear-gradient(#123, #0A1611)' }} />
      </div>

      {/* o rodapé REAL da sala: flex-shrink 0 + backdrop-filter */}
      <footer
        data-parte="rodape"
        style={{
          flexShrink: 0,
          background: 'rgba(10, 22, 17, 0.96)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(46, 157, 99, 0.18)',
          padding: 12,
        }}
      >
        {/* 🧪 testemunha: fixed comum, no mesmo rodapé */}
        <div data-parte="testemunha" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />

        <BidPopover
          minBid={11}
          increment={2}
          freteValor={22.97}
          isFirstBid={false}
          onEscolher={(v) => { window.__escolhido = v; }}
        />
      </footer>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
