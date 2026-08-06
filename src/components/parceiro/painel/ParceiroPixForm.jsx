import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ParceiroAssinatura from './ParceiroAssinatura';

// ✅ Validação de CPF (mesma regra usada antes em InvestorDashboard)
const cpfValido = (cpf) => {
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf[10])) return false;
  return true;
};

// 📱 Dados do parceiro + assinatura eletrônica + geração do PIX do aporte.
// ⚠️ createPartnerPlanPix, registrarAssinaturaContrato e as validações são
// exatamente as de antes — só saíram da página para este componente.
export default function ParceiroPixForm({
  plano,
  formData,
  setFormData,
  currentUser,
  aceitouContrato,
  setAceitouContrato,
  assinaturaPng,
  setAssinaturaPng,
  assinaturaRegistro,
  setAssinaturaRegistro,
  onLerContrato,
  onVoltar,
  onPixGerado,
}) {
  const [showAssinatura, setShowAssinatura] = useState(false);
  const [salvandoAssinatura, setSalvandoAssinatura] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gerarPix = async () => {
    const { name, phone, email, cpf } = formData;
    if (!name || !phone || !email || !cpf) {
      toast.error('Preencha todos os campos');
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      toast.error('CPF inválido. Deve ter 11 dígitos.');
      return;
    }
    if (!cpfValido(cleanCpf)) {
      toast.error('CPF inválido. Verifique os números digitados.');
      return;
    }

    setIsProcessing(true);
    try {
      toast.info('Gerando QR Code PIX...');
      const response = await base44.functions.invoke('createPartnerPlanPix', {
        licensee_id: currentUser.id,
        user_name: name,
        user_email: email,
        user_phone: phone,
        user_cpf: cpf,
        plan_code: plano.name,
      });
      const pixInfo = response?.data || response;

      if (pixInfo?.success) {
        onPixGerado({
          billing_id: pixInfo.billing_id || pixInfo.payment_id,
          qr_code_base64: pixInfo.qr_code_base64,
          pix_code: pixInfo.pix_code,
        });
        toast.success('✅ QR Code gerado com sucesso!');
      } else {
        const errorMsg = pixInfo?.error || 'Erro ao gerar QR Code';
        const errorDetails = pixInfo?.details;
        console.error('❌ Erro ao gerar PIX:', { errorMsg, errorDetails });
        toast.error(errorMsg + (errorDetails ? ` - ${JSON.stringify(errorDetails)}` : ''));
      }
    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao processar: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const assinar = async (png) => {
    setSalvandoAssinatura(true);
    try {
      const resp = await base44.functions.invoke('registrarAssinaturaContrato', {
        user_id: currentUser?.id,
        nome: formData?.name,
        cpf: formData?.cpf,
        email: formData?.email,
        plano: plano?.name,
        valor_aporte: plano?.minInvestment,
        assinatura_png: png,
      });
      const dados = resp?.data || resp;
      if (!dados?.success) {
        toast.error(dados?.error || 'Não foi possível registrar a assinatura');
        return;
      }
      setAssinaturaPng(png);
      setAssinaturaRegistro(dados.assinatura);
      setAceitouContrato(true);
      setShowAssinatura(false);
      toast.success(`Contrato assinado. Código ${dados.assinatura.codigo_verificacao}`);
      if (!dados.persistido) {
        toast.warning('Assinatura aplicada no documento, mas o registro no servidor falhou.');
      }
    } catch (e) {
      toast.error('Erro ao assinar: ' + e.message);
    } finally {
      setSalvandoAssinatura(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold text-white">{plano.name}</h3>
        <p className="text-2xl font-bold text-green-400 mt-2">
          R$ {plano.minInvestment.toLocaleString('pt-BR')}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-gray-300">Nome Completo</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="João Silva"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div>
          <Label className="text-gray-300">Telefone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(11) 99999-9999"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div>
          <Label className="text-gray-300">E-mail</Label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="joao@email.com"
            type="email"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div>
          <Label className="text-gray-300">CPF</Label>
          <Input
            value={formData.cpf}
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, cpf: value });
              const cleanCpf = value.replace(/\D/g, '');
              if (cleanCpf.length === 11 && !cpfValido(cleanCpf)) {
                toast.error('CPF inválido. Verifique os números.');
              }
            }}
            placeholder="000.000.000-00"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </div>

      <Button
        onClick={onLerContrato}
        variant="outline"
        className="w-full bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700 mb-3"
      >
        📄 Ler Contrato de Parceria
      </Button>

      {/* ✍️ Assinatura eletrônica */}
      {showAssinatura ? (
        <div className="rounded-lg border border-pc-borda bg-pc-preto-2 p-3 mb-3">
          <ParceiroAssinatura
            nome={formData?.name}
            salvando={salvandoAssinatura}
            onCancelar={() => setShowAssinatura(false)}
            onConfirmar={assinar}
          />
        </div>
      ) : assinaturaRegistro ? (
        <div className="rounded-lg border border-pc-ouro/40 bg-pc-preto-2 p-3 mb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Contrato assinado eletronicamente</p>
          <p className="mt-1 text-xs text-pc-tinta">
            Código de verificação {assinaturaRegistro.codigo_verificacao}
          </p>
          <p className="text-[10px] leading-relaxed text-pc-tinta-fraca">
            Registrado em {new Date(assinaturaRegistro.assinado_em).toLocaleString('pt-BR')} · Lei nº 14.063/2020 e MP nº 2.200-2/2001
          </p>
        </div>
      ) : (
        <Button
          onClick={() => {
            if (!formData?.name || !formData?.cpf || !formData?.email) {
              toast.error('Preencha nome, CPF e e-mail antes de assinar');
              return;
            }
            setShowAssinatura(true);
          }}
          className="w-full min-h-[48px] bg-pc-ouro font-semibold text-pc-preto hover:bg-pc-ouro-claro mb-3"
        >
          ✍️ Assinar contrato digitalmente
        </Button>
      )}

      <div className="flex items-center space-x-3 bg-gray-800 rounded-lg p-3 border border-gray-700 mb-3">
        <Checkbox
          id="accept-contract"
          checked={aceitouContrato}
          onCheckedChange={(checked) => setAceitouContrato(checked)}
          className="border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
        />
        <label htmlFor="accept-contract" className="text-sm text-gray-300 cursor-pointer leading-tight">
          Li e aceito os termos do <span className="text-green-400 font-semibold">Contrato de Parceria</span>
        </label>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onVoltar}
          variant="outline"
          className="flex-1 bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
        >
          Voltar
        </Button>
        <Button
          onClick={gerarPix}
          disabled={isProcessing || !aceitouContrato}
          className={`flex-1 ${aceitouContrato ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'}`}
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>📱 Gerar PIX</>}
        </Button>
      </div>
    </motion.div>
  );
}