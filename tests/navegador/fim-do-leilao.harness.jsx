/**
 * Banca do SELETOR DE DURAÇÃO DE VERDADE — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (17/09/2026)
 * Quatro relógios saíram com 72h quando o pedido era 48h. O seletor está
 * certo; o que faltava era mostrar em que DIA aquilo cai. Um teste que lê o
 * arquivo prova que a linha existe no código — não prova que ela aparece na
 * tela, nem que muda quando o operador troca a duração. Aqui roda o
 * `PriceSection` REAL, com estado real, e o Select real do Radix.
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import PriceSection from '@/components/admin/PriceSection';

function Banca() {
  const [formData, setFormData] = useState({
    starting_price: '100',
    increment: '5.00',
    buy_now_price: '',
    duration: '172800', // 2 dias (48h) — o que o operador queria
  });
  const onInputChange = (campo, valor) => setFormData((anterior) => ({ ...anterior, [campo]: valor }));
  return (
    <div style={{ padding: 24 }}>
      <PriceSection formData={formData} onInputChange={onInputChange} />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
