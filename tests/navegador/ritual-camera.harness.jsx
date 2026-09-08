import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameRitualAmanhecer from '@/components/licensing/CentralVendas/XGameRitualAmanhecer';

createRoot(document.getElementById('raiz')).render(
  <XGameRitualAmanhecer
    nome="Ana"
    sonhos={[]}
    onFechar={() => {}}
    onConcluir={(dados) => { window.__concluido = dados; }}
  />,
);
