import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ParceiroContratoTexto from './ParceiroContratoTexto';

// 📄 Leitura do Contrato de Parceria + baixar/compartilhar o PDF.
// Mesma chamada de servidor de antes (generateContractPDF) e mesmo tratamento
// de base64 → blob → Web Share/download. Nada de lógica alterado.
export default function ParceiroContratoModal({ dadosPdf, onVoltar }) {
  const gerarBlob = async () => {
    const response = await base44.functions.invoke('generateContractPDF', {
      format: 'base64',
      ...dadosPdf,
    });
    const pdfBase64 = response?.data?.pdf_base64 || response?.pdf_base64;
    if (!pdfBase64) throw new Error('PDF não gerado');

    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const byteCharacters = atob(base64Data);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArray[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteArray], { type: 'application/pdf' });
  };

  const baixar = async () => {
    try {
      toast.info('Gerando PDF do contrato...');
      const blob = await gerarBlob();
      const blobUrl = URL.createObjectURL(blob);

      // Mobile: tenta compartilhar o arquivo antes de cair no download
      if (navigator.share) {
        try {
          const file = new File([blob], 'Contrato_Parceria_LeilaoNoZap.pdf', { type: 'application/pdf' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Contrato de Parceria' });
            toast.success('PDF compartilhado!');
            URL.revokeObjectURL(blobUrl);
            return;
          }
        } catch (shareErr) {
          // usuário cancelou — segue para o download
        }
      }

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'Contrato_Parceria_LeilaoNoZap.pdf';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        a.remove();
      }, 200);
      toast.success('Contrato PDF baixado!');
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      toast.error('Erro ao gerar PDF: ' + error.message);
    }
  };

  const compartilhar = async () => {
    try {
      toast.info('Gerando PDF para compartilhar...');
      const blob = await gerarBlob();
      const file = new File([blob], 'Contrato_Parceria_LeilaoNoZap.pdf', { type: 'application/pdf' });

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ files: [file], title: 'Contrato de Parceria' });
        toast.success('PDF compartilhado!');
      } else {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        toast.info('PDF aberto em nova aba!');
      }
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('Erro: ' + error.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="text-center mb-4">
        <img src="/brand/icon-3d.webp" alt="Leilão NoZap" className="h-16 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-green-400">CONTRATO DE PARCERIA COMERCIAL</h3>
        <p className="text-gray-400 text-sm">Leia atentamente antes de prosseguir</p>
      </div>

      <ScrollArea className="h-[50vh] bg-gray-800 rounded-lg border border-gray-700 p-4">
        <ParceiroContratoTexto />
      </ScrollArea>

      <div className="flex gap-3">
        <Button onClick={onVoltar} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4">
          Voltar
        </Button>
        <Button onClick={baixar} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4">
          📥 Baixar PDF
        </Button>
      </div>
      <Button onClick={compartilhar} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4">
        📤 Compartilhar Contrato
      </Button>
    </motion.div>
  );
}