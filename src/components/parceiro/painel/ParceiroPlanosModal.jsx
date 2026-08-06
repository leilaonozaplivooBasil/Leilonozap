import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ParceiroPlanoCarrossel from './ParceiroPlanoCarrossel';
import ParceiroPixForm from './ParceiroPixForm';
import ParceiroPixQrCode from './ParceiroPixQrCode';
import ParceiroContratoModal from './ParceiroContratoModal';

// 🧩 Modal de contratação de plano — orquestra as 4 etapas:
// carrossel → dados/assinatura → QR do PIX, e a leitura do contrato.
// Todo o estado da contratação vive aqui (antes estava espalhado na página).
export default function ParceiroPlanosModal({
  open,
  onOpenChange,
  portfolios,
  productImages,
  currentUser,
  planoInicialIndex = 0,
  temPlanosAtivos,
  onPagamentoConfirmado,
  onContratoAssinado,
}) {
  const [indice, setIndice] = useState(planoInicialIndex);
  const [pausado, setPausado] = useState(false);
  const [plano, setPlano] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [showContract, setShowContract] = useState(false);
  const [aceitouContrato, setAceitouContrato] = useState(false);
  const [assinaturaPng, setAssinaturaPng] = useState(null);
  const [assinaturaRegistro, setAssinaturaRegistro] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', cpf: '' });

  // Pré-preenche com os dados do parceiro logado
  useEffect(() => {
    if (!currentUser) return;
    setFormData({
      name: currentUser.full_name || '',
      phone: currentUser.phone || '',
      email: currentUser.email || '',
      cpf: currentUser.cpf || '',
    });
  }, [currentUser]);

  useEffect(() => {
    setIndice(planoInicialIndex);
  }, [planoInicialIndex]);

  // 🔄 Ao ABRIR o modal, sempre volta para a vitrine de planos. Sem isso, o
  // plano escolhido numa contratação anterior ficava preso no estado e o modal
  // reabria direto no formulário (parecia que o carrossel não girava).
  useEffect(() => {
    if (!open) return;
    setPlano(null);
    setPixData(null);
    setShowContract(false);
    setAceitouContrato(false);
    setIndice(planoInicialIndex);
     
  }, [open]);

  // Carrossel automático: só enquanto o modal está aberto e na vitrine de planos
  useEffect(() => {
    if (!open || pausado || plano) return;
    const interval = setInterval(() => {
      setIndice((prev) => (prev === portfolios.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [open, pausado, plano, portfolios.length]);

  // Avisa a página quando a assinatura eletrônica é registrada
  useEffect(() => {
    if (assinaturaRegistro && onContratoAssinado) onContratoAssinado();
  }, [assinaturaRegistro, onContratoAssinado]);

  const dadosPdf = {
    partner_name: formData?.name || '',
    partner_cpf: formData?.cpf || '',
    partner_email: formData?.email || '',
    plan_name: plano?.name,
    plan_amount: plano?.minInvestment,
    signature_base64: assinaturaPng || undefined,
    ...(assinaturaRegistro || {}),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-pc-preto border border-pc-borda text-pc-tinta p-3 sm:p-4 md:p-6 max-h-[95vh] overflow-y-auto">
        <DialogHeader className="mb-3 text-center">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-pc-tinta">
            {temPlanosAtivos ? 'Contratar ' : 'Escolha Seu '}
            <span className="text-pc-ouro">Novo Plano</span>
          </DialogTitle>
          <p className="text-pc-tinta-fraca text-xs text-center">
            {temPlanosAtivos
              ? 'Selecione o plano para um novo aporte de capital'
              : 'Selecione o plano de parceria para o seu aporte'}
          </p>
        </DialogHeader>

        {showContract ? (
          <ParceiroContratoModal dadosPdf={dadosPdf} onVoltar={() => setShowContract(false)} />
        ) : !plano ? (
          <ParceiroPlanoCarrossel
            portfolios={portfolios}
            productImages={productImages}
            indice={indice}
            setIndice={setIndice}
            setPausado={setPausado}
            onEscolher={(p) => {
              setPlano(p);
              setPixData(null);
            }}
          />
        ) : !pixData ? (
          <ParceiroPixForm
            plano={plano}
            formData={formData}
            setFormData={setFormData}
            currentUser={currentUser}
            aceitouContrato={aceitouContrato}
            setAceitouContrato={setAceitouContrato}
            assinaturaPng={assinaturaPng}
            setAssinaturaPng={setAssinaturaPng}
            assinaturaRegistro={assinaturaRegistro}
            setAssinaturaRegistro={setAssinaturaRegistro}
            onLerContrato={() => setShowContract(true)}
            onVoltar={() => {
              setPlano(null);
              setAceitouContrato(false);
            }}
            onPixGerado={setPixData}
          />
        ) : (
          <ParceiroPixQrCode
            pixData={pixData}
            valor={plano.minInvestment}
            onCancelar={() => {
              setPixData(null);
              setPlano(null);
            }}
            onPagamentoConfirmado={async () => {
              onOpenChange(false);
              await onPagamentoConfirmado();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}