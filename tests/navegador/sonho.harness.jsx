/**
 * Banca do "Adicionar ao quadro dos sonhos" — NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (06/09/2026)
 * Dono: "quero mais uma forma: copiar e colar a imagem — no celular fica
 * ainda mais foda; e o buscador precisa puxar do Google igual o Google".
 * Monta o modal real com a plataforma de mentira (tests/navegador/falso) e
 * guarda o que o modal manda pro quadro (onAdicionar).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import CrmSonhoModal from '@/components/licensing/CentralVendas/CrmSonhoModal';

function Banca() {
  const [adicionados, setAdicionados] = React.useState([]);
  return (
    <>
      <CrmSonhoModal aberto horizonteInicial="curto" onFechar={() => {}} onAdicionar={async (itens) => setAdicionados((l) => [...l, ...itens])} />
      <Toaster position="top-center" />
      <span data-teste="adicionados" style={{ position: 'fixed', left: -9999 }}>{JSON.stringify(adicionados)}</span>
    </>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
