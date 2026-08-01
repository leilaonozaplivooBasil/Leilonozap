import React, { useEffect, useState } from 'react';
import TermoAdesaoModal from '@/components/legal/TermoAdesaoModal';
import { registrarAceiteTermo } from '@/lib/termoAdesao';
import { EVENTO_TERMO, executarAcaoPendente, descartarAcaoPendente } from '@/lib/termoGate';

/**
 * PONTO 70 — Ouvinte global do gate do termo (montado uma vez no Layout).
 * Abre o termo quando alguma tela sinaliza intenção de compra sem aceite,
 * registra o aceite e só então executa a ação que ficou pendente.
 */
export default function TermoGateGlobal() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_TERMO, abrir);
    return () => window.removeEventListener(EVENTO_TERMO, abrir);
  }, []);

  if (!aberto) return null;

  const usuarioAtual = () => {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { return null; }
  };

  return (
    <TermoAdesaoModal
      textoConfirmar="Concordo e Continuar"
      onAccept={async () => {
        setAberto(false);
        await registrarAceiteTermo(usuarioAtual());
        executarAcaoPendente();
      }}
      onClose={() => { setAberto(false); descartarAcaoPendente(); }}
    />
  );
}