import React, { useEffect } from 'react';

import ParceiroAbertura from '@/components/parceiro/ParceiroAbertura';
import ParceiroTracao from '@/components/parceiro/ParceiroTracao';
import ParceiroOrigens from '@/components/parceiro/ParceiroOrigens';
import ParceiroCuradoria from '@/components/parceiro/ParceiroCuradoria';
import ParceiroRelacaoEouNaoE from '@/components/parceiro/ParceiroRelacaoEouNaoE';
import ParceiroCiclo from '@/components/parceiro/ParceiroCiclo';
import ParceiroVitrineOperacao from '@/components/parceiro/ParceiroVitrineOperacao';
import ParceiroCanaisVenda from '@/components/parceiro/ParceiroCanaisVenda';
import ParceiroBoard from '@/components/parceiro/ParceiroBoard';
import ParceiroFormalizacao from '@/components/parceiro/ParceiroFormalizacao';
import ParceiroCTA from '@/components/parceiro/ParceiroCTA';
import ParceiroDisclaimer from '@/components/parceiro/ParceiroDisclaimer';
import ParceiroExportarPDF from '@/components/parceiro/ParceiroExportarPDF';

// 📄 A APRESENTAÇÃO EM SI — os doze blocos do memorando, na ordem, e mais nada.
//
// Este arquivo existe porque a mesma apresentação passou a ter DUAS portas:
//   • /Partners — porta com cadastro + ciência (o caminho de quem vem de fora);
//   • /ApresentacaoParceiro — link estável de uso interno, sem porta.
//
// Ela não podia ser copiada de uma para a outra. É documento de captação privada,
// com texto de cláusula e números que a Leila revisa um a um: duas cópias viram,
// no primeiro ajuste, duas versões diferentes do mesmo memorando circulando. Aqui
// existe uma só — quem quiser mudar conteúdo mexe nos blocos, e as duas portas
// mostram a mesma coisa no mesmo instante.
//
// O que fica de fora daqui de propósito: quem pode entrar. Porta é assunto de cada
// página; este componente só monta a apresentação para quem já chegou.
//
// 🖤 As marcas no <body>:
//   `pc-tema`  — tema preto desta apresentação (alcança rodapé e flutuantes, que
//                vivem no Layout, sem tocar em componente global).
//   `pc-papel` — marca da versão impressa (bloco @media print em src/index.css).
//                Separada de `pc-tema` porque o tema preto também veste o painel do
//                parceiro, o cadastro e a porta de acesso, e as regras de impressão
//                escondem botão, imagem decorativa e bloco de carregamento — nessas
//                telas comeriam conteúdo real.
export default function ParceiroApresentacao({ onSolicitarAcesso, onAcessarPainel }) {
  useEffect(() => {
    document.body.classList.add('pc-tema', 'pc-papel');
    return () => document.body.classList.remove('pc-tema', 'pc-papel');
  }, []);

  const acessar = onAcessarPainel || onSolicitarAcesso;

  return (
    <>
      <div className="min-h-screen bg-pc-preto">
        <ParceiroAbertura onSolicitarAcesso={onSolicitarAcesso} />
        <ParceiroTracao />
        <ParceiroOrigens />
        <ParceiroCuradoria />
        <ParceiroRelacaoEouNaoE />
        <ParceiroCiclo />
        <ParceiroVitrineOperacao />
        <ParceiroCanaisVenda />
        <ParceiroBoard />
        <ParceiroFormalizacao />
        <ParceiroCTA onSolicitarAcesso={onSolicitarAcesso} onAcessarPainel={acessar} />
        <ParceiroDisclaimer />
      </div>

      {/* Fica FORA da div acima de propósito: é botão de tela, não conteúdo da
          apresentação — some no PDF (regra .pc-exportar-pdf em @media print). */}
      <ParceiroExportarPDF />
    </>
  );
}
