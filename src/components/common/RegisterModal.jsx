import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus, AlertCircle } from 'lucide-react';

const AppUser = base44.entities.AppUser;

export default function RegisterModal({ onClose, onSuccess, onSwitchToLogin }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZipCode, setAddressZipCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  // Passo 1: valida, checa duplicados e envia o código de verificação por e-mail
  const handleSendCode = async () => {
    if (!fullName || !email || !phone || !cpf || !password || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode) {
      setErrorMessage("❌ Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (!email.includes('@')) { setErrorMessage("❌ Por favor, insira um E-mail válido."); return; }
    if (password.length < 6) { setErrorMessage("❌ A senha deve ter no mínimo 6 caracteres."); return; }

    setIsRegistering(true);
    setErrorMessage('');
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const phoneDigits = (phone || '').replace(/\D/g, '');
      const cpfDigits = (cpf || '').replace(/\D/g, '');

      // Evita enviar código pra quem já tem cadastro
      const [byEmail, byPhone, byCpf] = await Promise.all([
        AppUser.filter({ email: normalizedEmail }),
        phoneDigits ? AppUser.filter({ phone: phoneDigits }) : Promise.resolve([]),
        cpfDigits ? AppUser.filter({ cpf: cpfDigits }) : Promise.resolve([]),
      ]);
      if ((byEmail?.length || 0) > 0 || (byPhone?.length || 0) > 0 || (byCpf?.length || 0) > 0) {
        setErrorMessage("USUÁRIO JÁ CADASTRADO.");
        setIsRegistering(false);
        return;
      }

      const result = await base44.functions.invoke('sendEmailCode', { email: normalizedEmail, purpose: 'signup' });
      if (!result?.success) throw new Error(result?.error || 'Falha ao enviar o código');

      setCodeSent(true);
      setErrorMessage('');
    } catch (error) {
      console.error("[REGISTER] Erro ao enviar código:", error);
      setErrorMessage("❌ Erro ao enviar o código: " + (error.message || "tente novamente"));
    } finally {
      setIsRegistering(false);
    }
  };

  // Passo 2: confirma o código e cria a conta de verdade (persiste + referral_code + indicação)
  const handleCreateAccount = async () => {
    if (!/^\d{6}$/.test((verificationCode || '').trim())) {
      setErrorMessage("❌ Digite o código de 6 dígitos enviado por e-mail.");
      return;
    }
    setIsRegistering(true);
    setErrorMessage('');
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const nameTrimmed = (fullName || '').trim();
      const nameParts = nameTrimmed.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
      const refCode = sessionStorage.getItem('referralCode') || '';

      const result = await base44.functions.invoke('registerNetworkUser', {
        full_name: nameTrimmed,
        display_first_name: firstName || null,
        display_last_name: lastName || null,
        email: normalizedEmail,
        password,
        phone: (phone || '').replace(/\D/g, ''),
        cpf: (cpf || '').replace(/\D/g, ''),
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        address_zip_code: addressZipCode,
        code: verificationCode.trim(),
        ref_code: refCode,
      });

      if (!result?.success) {
        setErrorMessage("❌ " + (result?.error || 'Não foi possível criar a conta.'));
        setIsRegistering(false);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(result.user));
      sessionStorage.setItem('isLoggedIn', 'true');
      sessionStorage.removeItem('referralCode');

      setTimeout(() => {
        if (onSuccess) onSuccess(result.user);
        onClose();
        window.location.reload();
      }, 400);
    } catch (error) {
      console.error("[REGISTER] Erro ao criar conta:", error);
      setErrorMessage("❌ Erro ao criar conta: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={`fixed inset-0 ${isSaiDeBaixo ? 'bg-black/50' : 'bg-gray-900/80'} flex items-center justify-center z-[2001] p-4 animate-in fade-in-0`}>
      <Card className={`w-full max-w-md md:max-w-4xl ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} relative`}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className={isSaiDeBaixo ? 'absolute top-2 right-2 text-gray-600' : 'absolute top-2 right-2 text-gray-400'}
          disabled={isRegistering}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
            <UserPlus />
            Criar Nova Conta
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className={`${isSaiDeBaixo ? 'bg-red-100 border-2 border-red-300' : 'bg-red-900/20 border border-red-500/50'} rounded-lg p-3 flex items-start gap-3`}>
              <AlertCircle className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-700' : 'text-red-400'} flex-shrink-0 mt-0.5`} />
              <p className={`${isSaiDeBaixo ? 'text-red-800' : 'text-red-300'} text-sm`}>{errorMessage}</p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Nome Completo *</Label>
              <Input 
                id="fullName" 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Seu nome completo" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isRegistering}
              />
            </div>

            <div>
              <Label htmlFor="email" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>E-mail *</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="seu@email.com" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isRegistering}
              />
            </div>

            <div>
              <Label htmlFor="phone" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Telefone *</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="(XX) XXXXX-XXXX" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isRegistering}
              />
            </div>

            <div>
              <Label htmlFor="cpf" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>CPF *</Label>
              <Input 
                id="cpf" 
                type="text" 
                value={cpf} 
                onChange={(e) => setCpf(e.target.value)} 
                placeholder="000.000.000-00" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isRegistering}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="password" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Senha *</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Mínimo 6 caracteres" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isRegistering}
              />
            </div>
          </div>

          <div className={`${isSaiDeBaixo ? 'bg-gray-50' : 'bg-gray-900/30'} p-4 rounded-lg space-y-3`}>
            <h3 className={`font-semibold ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} text-sm mb-2`}>Endereço de Entrega</h3>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3">
                <Label htmlFor="addressStreet" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Rua *</Label>
                <Input 
                  id="addressStreet" 
                  type="text" 
                  value={addressStreet} 
                  onChange={(e) => setAddressStreet(e.target.value)} 
                  placeholder="Nome da rua" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
              <div>
                <Label htmlFor="addressNumber" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Nº *</Label>
                <Input 
                  id="addressNumber" 
                  type="text" 
                  value={addressNumber} 
                  onChange={(e) => setAddressNumber(e.target.value)} 
                  placeholder="123" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="addressComplement" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Complemento</Label>
                <Input 
                  id="addressComplement" 
                  type="text" 
                  value={addressComplement} 
                  onChange={(e) => setAddressComplement(e.target.value)} 
                  placeholder="Apto, bloco (opcional)" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
              <div>
                <Label htmlFor="addressNeighborhood" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Bairro *</Label>
                <Input 
                  id="addressNeighborhood" 
                  type="text" 
                  value={addressNeighborhood} 
                  onChange={(e) => setAddressNeighborhood(e.target.value)} 
                  placeholder="Seu bairro" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="addressCity" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Cidade *</Label>
                <Input 
                  id="addressCity" 
                  type="text" 
                  value={addressCity} 
                  onChange={(e) => setAddressCity(e.target.value)} 
                  placeholder="Sua cidade" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
              <div>
                <Label htmlFor="addressState" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>UF *</Label>
                <Input 
                  id="addressState" 
                  type="text" 
                  value={addressState} 
                  onChange={(e) => setAddressState(e.target.value)} 
                  placeholder="SP" 
                  maxLength={2}
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
              <div>
                <Label htmlFor="addressZipCode" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>CEP *</Label>
                <Input 
                  id="addressZipCode" 
                  type="text" 
                  value={addressZipCode} 
                  onChange={(e) => setAddressZipCode(e.target.value)} 
                  placeholder="00000-000" 
                  className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                  disabled={isRegistering}
                />
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          {!codeSent ? (
            <Button
              onClick={handleSendCode}
              disabled={isRegistering || !fullName || !email || !phone || !cpf || !password || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode}
              className={`w-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isRegistering ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Enviando código...</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />Continuar</>
              )}
            </Button>
          ) : (
            <div className="w-full space-y-3">
              <div className={`rounded-lg p-3 text-center text-sm ${isSaiDeBaixo ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-green-500/10 text-green-300 border border-green-500/30'}`}>
                📧 Enviamos um código de 6 dígitos para <strong>{email}</strong>. Confira sua caixa de entrada (e o spam).
              </div>
              <div>
                <Label className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Código de verificação *</Label>
                <Input
                  type="text" inputMode="numeric" maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={`text-center text-2xl tracking-[0.5em] font-bold ${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}`}
                  disabled={isRegistering}
                  autoFocus
                />
              </div>
              <Button
                onClick={handleCreateAccount}
                disabled={isRegistering || verificationCode.length !== 6}
                className={`w-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isRegistering ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Criando conta...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" />Criar Conta</>
                )}
              </Button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isRegistering}
                className={`w-full text-xs ${isSaiDeBaixo ? 'text-gray-600 hover:text-gray-800' : 'text-gray-400 hover:text-gray-200'}`}
              >
                Não recebeu? Reenviar código
              </button>
            </div>
          )}

          <div className="text-center">
            <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} text-sm mb-2`}>Já tem uma conta?</p>
            <Button 
              onClick={onSwitchToLogin}
              variant="outline"
              className={isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
              disabled={isRegistering}
            >
              Entrar
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}