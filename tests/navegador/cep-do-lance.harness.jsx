/**
 * Banca do MODAL DE CEP DO LANCE — NÃO vai para o bundle do app.
 *
 * 28/09/2026: o "Informe seu CEP para calcular o frete antes de dar o lance"
 * era um alert() do navegador. Aqui roda o modal REAL com uma "sala" de mentira
 * que responde como o calcularFreteLance: CEP 20000000 = frete R$ 21,90;
 * 99999999 = CEP não encontrado; 26000000 = cotou, mas falta o número.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import CepDoLanceModal from '@/components/auction/CepDoLanceModal';

window.__continuou = 0;
window.__gravou = null;
window.__fechou = 0;

function Sala() {
  const [status, setStatus] = useState('needs_cep');
  const [frete, setFrete] = useState(0);
  const [aberto, setAberto] = useState(true);
  const [endereco, setEndereco] = useState(null);
  const calcular = (cep) => {
    setStatus('loading');
    setTimeout(() => {
      if (cep === '99999999') { setFrete(0); setStatus('error'); return; }
      setFrete(21.9);
      if (cep === '26000000') { setEndereco({ street: '', number: '', city: 'Nova Iguaçu', state: 'RJ', neighborhood: 'Centro' }); setStatus('needs_address'); return; }
      setStatus('ok');
    }, 250);
  };
  if (!aberto) return <p style={{ color: 'white' }} data-teste="fechado">fechado</p>;
  return (
    <CepDoLanceModal
      acao={{ tipo: 'lance', valor: 127 }}
      status={status}
      freteValor={frete}
      liberado={status === 'ok'}
      cepInicial=""
      enderecoAtual={endereco}
      salvandoEndereco={false}
      onCalcular={calcular}
      onConfirmarEndereco={async (d) => { window.__gravou = d; setStatus('ok'); return true; }}
      onContinuar={() => { window.__continuou += 1; setAberto(false); }}
      onFechar={() => { window.__fechou += 1; setAberto(false); }}
    />
  );
}

createRoot(document.getElementById('raiz')).render(<Sala />);
