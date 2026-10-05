/**
 * Banca dos DOCUMENTOS DO PARCEIRO DE COMPRA — NÃO vai para o bundle do app.
 *
 * 02/10/2026: a diretoria mudou os números e os textos na véspera de uma
 * apresentação (sem a linha dos 5%, "até 2,15% (verificar consultor)", cotas a
 * partir de 30 mil, 30 dias, 12 a 36 meses). Aqui renderizam os documentos
 * REAIS (memorando, valuation, ciclo) para a captura de conferência.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import ParceiroMemorando from '@/components/parceiro/painel/ParceiroMemorando';
import ParceiroValuation from '@/components/parceiro/painel/ParceiroValuation';
import ParceiroCiclo from '@/components/parceiro/ParceiroCiclo';

function Bloco({ nome, titulo, children }) {
  return (
    <section data-teste={nome} style={{ background: '#0A0A0B', color: '#F5F5F4', padding: '24px 32px', maxWidth: 900, margin: '0 auto 24px' }}>
      <p style={{ color: '#C9A55C', font: '700 11px/1 system-ui', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 16px' }}>{titulo}</p>
      {children}
    </section>
  );
}

createRoot(document.getElementById('raiz')).render(
  <MemoryRouter>
    <Bloco nome="memorando" titulo="Investment Memorandum"><ParceiroMemorando /></Bloco>
    <Bloco nome="valuation" titulo="Valuation"><ParceiroValuation /></Bloco>
    <Bloco nome="ciclo" titulo="Ciclo operacional (apresentação)"><ParceiroCiclo /></Bloco>
  </MemoryRouter>,
);
