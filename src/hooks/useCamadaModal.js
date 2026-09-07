import React from 'react';
import { abrirCamada, ouvirCamada, temCamadaAberta } from '@/lib/camadaModal';

// 🪟 Os dois lados do registro de camada (ver src/lib/camadaModal.js).
//
// No modal:      useSegurarCamada();            → "estou na frente"
// No flutuante:  const coberto = useCamadaAberta(); → "tem alguém na minha frente?"

/** O modal se registra enquanto estiver montado. */
export function useSegurarCamada(ativo = true) {
  React.useEffect(() => {
    if (!ativo) return undefined;
    return abrirCamada();
  }, [ativo]);
}

/** O flutuante acompanha se existe modal aberto. */
export default function useCamadaAberta() {
  const [aberta, setAberta] = React.useState(temCamadaAberta);
  React.useEffect(() => {
    setAberta(temCamadaAberta());   // pode ter aberto entre o render e o efeito
    return ouvirCamada(setAberta);
  }, []);
  return aberta;
}
