import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
const GenerateImage = (params) => base44.integrations.Core.GenerateImage(params);
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { User as UserIcon, Sparkles, ShieldCheck, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ensureSiteLicensee } from '@/functions/ensureSiteLicensee'; // New import for the ensureSiteLicensee function
import { getReferral } from '@/lib/referral';
import TermoAdesaoTexto, { DECLARACAO_CIENCIA } from '@/components/legal/TermoAdesaoTexto';
import { registrarAceiteTermo } from '@/lib/termoAdesao';

export default function GuestRegistrationModal({ onClose, onSuccess, referrerName }) {
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // CONFIRMAÇÃO
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const generateAvatar = useCallback(async () => {
    if (!avatarPrompt) {
      alert("Por favor, descreva como você quer seu avatar.");
      return;
    }
    setIsGenerating(true);
    setAvatarUrl('');
    setErrorMessage('');
    try {
      const response = await GenerateImage({ 
        prompt: `avatar para site de leilão: ${avatarPrompt}, estilo cartoon vibrante, fundo neutro, formato quadrado`
      });
      if (response && response.url) {
        setAvatarUrl(response.url);
        alert("Avatar gerado com sucesso!");
      } else {
        throw new Error("Não foi possível gerar o avatar.");
      }
    } catch (error) {
      console.error("Error generating avatar:", error);
      alert("Falha ao gerar o avatar. Tente novamente ou pule esta etapa.");
    } finally {
      setIsGenerating(false);
    }
  }, [avatarPrompt]);
  
  const handleRegister = async () => {
    // ✅ VALIDAÇÕES COMPLETAS
    if (!fullName || !nickname || !email || !phone || !password || !confirmPassword) {
      setErrorMessage("❌ Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (fullName.length < 3) {
      setErrorMessage("❌ Nome completo deve ter pelo menos 3 caracteres.");
      return;
    }

    if (nickname.length < 2) {
      setErrorMessage("❌ Apelido deve ter pelo menos 2 caracteres.");
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage("❌ Por favor, insira um e-mail válido.");
      return;
    }

    if (phone.length < 10) {
      setErrorMessage("❌ Telefone inválido. Use (11) 99999-9999");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("❌ A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    // VALIDAÇÃO DE CONFIRMAÇÃO
    if (password !== confirmPassword) {
      setErrorMessage("❌ As senhas não coincidem. Digite novamente.");
      return;
    }

    setIsRegistering(true);
    setErrorMessage('');
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const phoneDigits = (phone || '').replace(/\D/g, '');
      const nameTrimmed = (fullName || '').trim();
      const nameParts = nameTrimmed.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      let results;
      try {
        const [byEmail, byPhone, byNameExact, byNameDL] = await Promise.all([
          AppUser.filter({ email: normalizedEmail }),
          phoneDigits ? AppUser.filter({ phone: phoneDigits }) : Promise.resolve([]),
          nameTrimmed ? AppUser.filter({ full_name: nameTrimmed }) : Promise.resolve([]),
          (firstName && lastName) ? AppUser.filter({ display_first_name: firstName, display_last_name: lastName }) : Promise.resolve([]),
        ]);
        results = { byEmail, byPhone, byNameExact, byNameDL };
      } catch (error) {
        console.error("Erro ao verificar duplicidade:", error);
        setErrorMessage("❌ Erro de conexão. Verifique sua internet e tente novamente.");
        setIsRegistering(false);
        return;
      }

      if ((results.byEmail?.length || 0) > 0 || (results.byPhone?.length || 0) > 0 || (results.byNameExact?.length || 0) > 0 || (results.byNameDL?.length || 0) > 0) {
        setErrorMessage("USUÁRIO JÁ CADASTRADO.");
        setIsRegistering(false);
        return;
      }

      // 🏢 LÓGICA DE INDICAÇÃO CORRIGIDA
      let referredById = null;
      const referralCode = getReferral();
      
      console.log(`🔍 [CADASTRO] Código de indicação na sessão: ${referralCode || 'NENHUM'}`);
      
      // 🔧 CORREÇÃO: PRIORIDADE PARA CÓDIGO DE INDICAÇÃO
      if (referralCode && referralCode.trim() !== '') {
        console.log(`🔍 [CADASTRO] Buscando licenciado com código: ${referralCode}`);
        try {
          const licensees = await AppUser.filter({ referral_code: referralCode });
          if (licensees.length > 0) {
            const referrer = licensees[0];
            referredById = referrer.id;
            console.log(`✅ [CADASTRO] Indicado por: ${referrer.full_name} (${referrer.email})`);
          } else {
            console.log(`⚠️ [CADASTRO] Código '${referralCode}' não encontrado no sistema`);
          }
        } catch (error) {
          console.warn("❌ Erro ao buscar licenciado:", error);
        }
      }
      
      // 🏢 SÓ USA "SITE OFICIAL" SE NÃO TIVER INDICAÇÃO
      if (!referredById) {
        console.log("🏢 [CADASTRO] Sem código de indicação válido. Usando Site Oficial como fallback...");
        
        try {
          const response = await ensureSiteLicensee({});
          
          if (response.data && response.data.success) {
            referredById = response.data.siteLicensee.id;
            console.log(`✅ [CADASTRO] Vinculado ao Site Oficial: ${response.data.siteLicensee.id}`);
            console.log(`📊 [CADASTRO] Ação executada: ${response.data.action}`);
            if (response.data.duplicatesRemoved) {
              console.log(`🧹 [CADASTRO] Duplicatas removidas: ${response.data.duplicatesRemoved}`);
            }
          } else {
            throw new Error("Falha ao garantir Site Oficial");
          }
        } catch (error) {
          console.error("❌ [CADASTRO] Erro crítico ao buscar/criar Site Oficial:", error);
          setErrorMessage("❌ Erro ao processar cadastro. Tente novamente.");
          setIsRegistering(false);
          return;
        }
      }

      // 🔒 VALIDAÇÃO FINAL
      if (!referredById) {
        console.error("❌ [CADASTRO] Falha crítica: nenhum indicador definido!");
        setErrorMessage("❌ Erro no sistema de indicação. Contate o suporte.");
        setIsRegistering(false);
        return;
      }

      console.log("✅ [CADASTRO] Email disponível, criando USUÁRIO COMUM...");
      console.log(`📎 [CADASTRO] Será vinculado ao ID: ${referredById}`);
      
      // 🔐 Cadastro REAL via rota server-side (publicRegister, service_role). Antes usava
      // AppUser.create, bloqueado por RLS (42501) — o cadastro do visitante nunca concluía.
      // O indicador é resolvido no servidor pelo ref_code (link de indicação).
      let createdUser;
      try {
        const resp = await base44.functions.invoke('publicRegister', {
          full_name: fullName.trim(),
          email: normalizedEmail,
          password,
          phone: phoneDigits,
          ref_code: referralCode || '',
          display_first_name: firstName || null,
          display_last_name: lastName || null,
        });
        if (!resp?.success) {
          setErrorMessage("❌ " + (resp?.error || "Não foi possível concluir o cadastro."));
          setIsRegistering(false);
          return;
        }
        createdUser = resp.user;
      } catch (error) {
        console.error("❌ Erro ao criar usuário:", error);
        setErrorMessage("❌ Erro ao criar conta. Tente novamente em alguns segundos.");
        setIsRegistering(false);
        return;
      }
      
      console.log("✅ [CADASTRO] Usuário comum criado:", createdUser);
      
      if (!createdUser || !createdUser.id) {
        throw new Error("A criação do usuário falhou.");
      }
      
      // ✅ SALVA SESSÃO
      localStorage.setItem('currentUser', JSON.stringify(createdUser));
      sessionStorage.setItem('isLoggedIn', 'true');
      if (referralCode) {
        sessionStorage.removeItem('referralCode');
        console.log(`🧹 [CADASTRO] Código de indicação '${referralCode}' removido da sessão`);
      }
      console.log("✅ [CADASTRO] Sessão salva localmente");

      // 📜 PONTO 67 — o aceite já foi dado neste modal: registra para não pedir de novo no 1º lance
      registrarAceiteTermo(createdUser);
      
      setRegistrationSuccess(true);
      
      setTimeout(() => {
        try {
          if (onSuccess) onSuccess(createdUser);
          onClose();
        } catch (err) {
          console.error("Erro no callback:", err);
        }
      }, 2500);

    } catch (error) {
      console.error("❌ ERRO NO CADASTRO:", error);
      const errorMsg = error?.message || "Erro desconhecido";
      setErrorMessage("❌ Erro ao realizar cadastro: " + errorMsg);
      setIsRegistering(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[2001] p-4 animate-in fade-in-0">
        <Card className="w-full max-w-lg bg-gray-800 border-gray-700 text-white relative">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-green-400 mb-4">
              🎉 Cadastro Realizado com Sucesso!
            </h2>
            <p className="text-gray-300 mb-6">
              Olá <strong>{nickname}</strong>! Você já pode participar dos leilões e dar seus lances.
            </p>
            <div className="animate-pulse text-green-400">
              Carregando sua conta...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderStepOne = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white">
          <FileText className="w-6 h-6 text-orange-400"/>
          Termo de Adesão Obrigatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300">
          Para participar, você deve ler e concordar com nossas regras. 
          A transparência é nosso maior compromisso.
        </p>
        <TermoAdesaoTexto />
        <div className="flex items-start space-x-2 pt-2">
          <Checkbox id="terms" checked={termsAccepted} onCheckedChange={setTermsAccepted} className="mt-0.5 border-gray-600 data-[state=checked]:bg-green-600"/>
          <label htmlFor="terms" className="text-sm font-medium leading-snug text-gray-300 cursor-pointer">
            {DECLARACAO_CIENCIA}
          </label>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-300 hover:bg-gray-700">Cancelar</Button>
        <Button onClick={() => setStep(2)} disabled={!termsAccepted} className="bg-green-600 hover:bg-green-700">
          <ShieldCheck className="w-4 h-4 mr-2" />
          Concordo e Quero Participar
        </Button>
      </CardFooter>
    </>
  );

  const renderStepTwo = () => (
    <>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-400">
          <UserIcon />
          Crie seu Perfil de Lance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errorMessage}</p>
          </div>
        )}
        
        <div>
          <Label htmlFor="fullName" className="text-gray-300">Nome Completo (Privado) *</Label>
          <Input 
            id="fullName" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            placeholder="Seu nome completo" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="nickname" className="text-gray-300">Apelido (Nome público nos leilões) *</Label>
          <Input 
            id="nickname" 
            value={nickname} 
            onChange={(e) => setNickname(e.target.value)} 
            placeholder="Ex: ReiDoLance" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="email" className="text-gray-300">E-mail *</Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="seu@email.com" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="phone" className="text-gray-300">Telefone/WhatsApp *</Label>
          <Input 
            id="phone" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="(11) 99999-9999" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-gray-300">Crie uma Senha *</Label>
          <Input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Mínimo 6 caracteres" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword" className="text-gray-300">Confirme a Senha *</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            placeholder="Digite a senha novamente" 
            className="bg-gray-700 border-gray-600 text-white"
            disabled={isRegistering}
          />
        </div>
        <div>
          <Label htmlFor="avatarPrompt" className="text-gray-300">Descreva seu Avatar (Opcional)</Label>
          <div className="flex gap-2">
            <Input 
              id="avatarPrompt" 
              value={avatarPrompt} 
              onChange={(e) => setAvatarPrompt(e.target.value)} 
              placeholder="Ex: um leão de óculos escuros" 
              className="bg-gray-700 border-gray-600 text-white"
              disabled={isGenerating || isRegistering}
            />
            <Button 
              onClick={generateAvatar} 
              disabled={isGenerating || isRegistering} 
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {(isGenerating || avatarUrl) && (
          <div className="flex justify-center items-center h-24 bg-gray-700 rounded-lg">
            {isGenerating && <div className="text-gray-400">Gerando seu avatar...</div>}
            {avatarUrl && <img src={avatarUrl} alt="Avatar Gerado" className="w-24 h-24 rounded-lg object-cover" />}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setStep(1)} 
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
          disabled={isRegistering}
        >
          Voltar
        </Button>
        <Button 
          onClick={handleRegister} 
          disabled={isRegistering || !nickname || !email || !phone || !password || !confirmPassword || !fullName}
          className="bg-green-600 hover:bg-green-700"
        >
          {isRegistering ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Criando conta...
            </>
          ) : (
            "Criar Minha Conta"
          )}
        </Button>
      </CardFooter>
    </>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[2001] p-4 animate-in fade-in-0">
      <Card className="w-full max-w-lg bg-gray-800 border-gray-700 text-white relative">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className="absolute top-2 right-2 text-gray-400"
          disabled={isRegistering}
        >
          <X className="w-4 h-4" />
        </Button>
        {referrerName && (
          <div className="mx-4 mt-4 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, rgba(233,30,131,.18), rgba(255,107,53,.1))', border: '1px solid rgba(233,30,131,.35)' }}>
            <span>🎉</span> Você foi convidado por <span style={{ color: '#ff8a5c' }}>{referrerName}</span>
          </div>
        )}
        {step === 1 ? renderStepOne() : renderStepTwo()}
      </Card>
    </div>
  );
}