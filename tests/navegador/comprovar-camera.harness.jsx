import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import XGameComprovarModal from '@/components/licensing/CentralVendas/XGameComprovarModal';

createRoot(document.getElementById('raiz')).render(
  <XGameComprovarModal
    tarefa={{ hora: '19:00', titulo: 'Leitura do dia' }}
    tipo="aprendizado"
    enviando={false}
    erro={null}
    pergunta={null}
    onFechar={() => {}}
    onComprovar={() => {}}
  />,
);
