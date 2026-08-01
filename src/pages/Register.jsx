import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getReferral } from '@/lib/referral';
import TermoAdesaoModal from '@/components/legal/TermoAdesaoModal';
import { registrarAceiteTermo } from '@/lib/termoAdesao';

const AppUser = base44.entities.AppUser;

export default function Register() {
  const navigate = useNavigate();
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
  const [dup, setDup] = useState({ email: false, phone: false, cpf: false });
  const [dupMsg, setDupMsg] = useState({ email: '', phone: '', cpf: '' });
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  // 📜 PONTO 67 — Termo de Adesão obrigatório antes de concluir o cadastro
  const [termoAceito, setTermoAceito] = useState(false);
  const [showTermo, setShowTermo] = useState(false);

  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  const validatePassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

  const validateCPF = (raw) => {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false; // todos iguais
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const checkDuplicateOnBlur = async (field) => {
    try {
      if (field === 'email') {
        const normalizedEmail = (email || '').toLowerCase().trim();
        if (!normalizedEmail) return;
        const byEmail = await AppUser.filter({ email: normalizedEmail });
        const has = (byEmail?.length || 0) > 0;
        setDup((d) => ({ ...d, email: has }));
        setDupMsg((m) => ({ ...m, email: has ? 'E-mail já cadastrado' : '' }));
        if (has) setErrorMessage('USUÁRIO JÁ CADASTRADO.');
        return;
      }
      if (field === 'phone') {
        const digits = (phone || '').replace(/\D/g, '');
        if (!digits) return;
        const byPhone = await AppUser.filter({ phone: digits });
        const has = (byPhone?.length || 0) > 0;
        setDup((d) => ({ ...d, phone: has }));
        setDupMsg((m) => ({ ...m, phone: has ? 'Telefone já cadastrado' : '' }));
        if (has) setErrorMessage('USUÁRIO JÁ CADASTRADO.');
        return;
      }
      if (field === 'cpf') {
        const digits = (cpf || '').replace(/\D/g, '');
        if (!digits) return;
        // Valida CPF primeiro
        if (!validateCPF(digits)) {
          setDup((d) => ({ ...d, cpf: true }));
          setDupMsg((m) => ({ ...m, cpf: 'CPF inválido' }));
          return;
        }
        const byCpf = await AppUser.filter({ cpf: digits });
        const has = (byCpf?.length || 0) > 0;
        setDup((d) => ({ ...d, cpf: has }));
        setDupMsg((m) => ({ ...m, cpf: has ? 'CPF já cadastrado' : '' }));
        if (has) setErrorMessage('USUÁRIO JÁ CADASTRADO.');
        return;
      }
    } catch (_) { /* silencioso */ }
  };

  const handleCepLookup = async () => {
    const digits = (addressZipCode || '').replace(/\D/g, '');
    if (!digits) { setCepError(''); return; }
    if (digits.length !== 8) { setCepError('CEP inválido'); return; }
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) { setCepError('CEP não encontrado'); return; }
      setAddressStreet(data.logradouro || '');
      setAddressNeighborhood(data.bairro || '');
      setAddressCity(data.localidade || '');
      setAddressState(data.uf || '');
      // complement optional
      if (data.complemento) setAddressComplement(data.complemento);
    } catch (_) {
      setCepError('Falha ao buscar CEP');
    } finally {
      setCepLoading(false);
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();
    // 📜 PONTO 67 — sem aceite do termo, o cadastro não prossegue
    if (!termoAceito) {
      setShowTermo(true);
      return;
    }
    executarCadastro();
  };

  const executarCadastro = async () => {
    if (!fullName || !email || !phone || !cpf || !password || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode) {
      setErrorMessage("❌ Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (!email.includes('@')) {
      setErrorMessage("❌ Por favor, insira um E-mail válido.");
      return;
    }
    if (!validateCPF(cpf)) {
      setErrorMessage("❌ CPF inválido. Verifique e tente novamente.");
      setDup((d) => ({ ...d, cpf: true }));
      setDupMsg((m) => ({ ...m, cpf: 'CPF inválido' }));
      return;
    }
    if (!validatePassword(password)) {
      setErrorMessage("❌ A senha deve ter no mínimo 8 caracteres, incluindo letra, número e caractere especial.");
      return;
    }

    setIsRegistering(true);
    setErrorMessage('');
    setDup({ email: false, phone: false, cpf: false, name: false, nameDL: false });

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const phoneDigits = (phone || '').replace(/\D/g, '');
      const cpfDigits = (cpf || '').replace(/\D/g, '');
      const nameTrimmed = (fullName || '').trim();
      const nameParts = nameTrimmed.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      const [byEmail, byPhone, byCpf] = await Promise.all([
        AppUser.filter({ email: normalizedEmail }),
        phoneDigits ? AppUser.filter({ phone: phoneDigits }) : Promise.resolve([]),
        cpfDigits ? AppUser.filter({ cpf: cpfDigits }) : Promise.resolve([]),
      ]);

      if ((byEmail?.length || 0) > 0 || (byPhone?.length || 0) > 0 || (byCpf?.length || 0) > 0) {
        setDup({
          email: (byEmail?.length || 0) > 0,
          phone: phoneDigits && (byPhone?.length || 0) > 0,
          cpf: cpfDigits && (byCpf?.length || 0) > 0,
        });
        setErrorMessage("USUÁRIO JÁ CADASTRADO.");
        setIsRegistering(false);
        return;
      }

      // 🆕 VERIFICA CÓDIGO DE INDICAÇÃO
      const refCode = getReferral();
      let referredById = null;

      if (refCode) {
        try {
          const licensees = await AppUser.filter({ referral_code: refCode });
          if (licensees && licensees.length > 0) {
            referredById = licensees[0].id;
            console.log('✅ Código de indicação válido:', refCode);
          }
        } catch (error) {
          console.error('Erro ao validar código:', error);
        }
      }

      // 🆕 VERIFICA CÓDIGO DE INFLUENCIADOR
      const infCode = sessionStorage.getItem('influencerCode');
      if (infCode && !referredById) {
        try {
          const influencers = await AppUser.filter({ referral_code: infCode });
          if (influencers && influencers.length > 0) {
            referredById = influencers[0].id;
            console.log('✅ Código de influenciador válido:', infCode);
          }
        } catch (error) {
          console.error('Erro ao validar código influenciador:', error);
        }
      }

      // 🔒 Cadastro via backend service_role (anon não pode inserir em app_users por RLS).
      const refForBackend = getReferral() || sessionStorage.getItem('influencerCode') || '';
      const reg = await base44.functions.invoke('publicRegister', {
        full_name: fullName.trim(),
        display_first_name: firstName || null,
        display_last_name: lastName || null,
        email: normalizedEmail,
        phone: phoneDigits,
        cpf: cpfDigits,
        password: password,
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        address_zip_code: addressZipCode,
        ref_code: refForBackend,
      });

      if (!reg || reg.success !== true || !reg.user) {
        setErrorMessage('❌ ' + ((reg && reg.error) || 'Erro ao criar conta. Tente novamente.'));
        setIsRegistering(false);
        return;
      }
      const newUser = reg.user;

      localStorage.setItem('currentUser', JSON.stringify(newUser));
      sessionStorage.setItem('isLoggedIn', 'true');

      // 📜 PONTO 67 — registra o aceite dado antes do cadastro
      registrarAceiteTermo(newUser);

      // 🆕 FASE 2: pede ao Layout abrir o seletor de painéis após o reload
      try { sessionStorage.setItem('pendingPanelSelector', '1'); } catch (_) {}

      console.log(`[REGISTER] Registro bem-sucedido: ${newUser.full_name}`);

      setTimeout(() => {
        // Verifica se veio da página Partners
        const fromPartners = sessionStorage.getItem('registerFromPartners');
        if (fromPartners === 'true') {
          sessionStorage.removeItem('registerFromPartners');
          window.location.href = createPageUrl("InvestorDashboard");
        } else {
          window.location.href = createPageUrl("Home");
        }
      }, 500);

    } catch (error) {
      console.error("[REGISTER] Erro no registro:", error);
      setErrorMessage("❌ Erro ao criar conta: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className={`min-h-screen ${isSaiDeBaixo ? 'bg-white' : 'bg-gray-900'} py-8 px-4`}>
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className={`mb-6 ${isSaiDeBaixo ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'}`}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className={`${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 text-2xl ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
              <UserPlus />
              Criar Nova Conta
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-5 sm:space-y-6">
              {errorMessage && (
                <div className={`${isSaiDeBaixo ? 'bg-red-100 border-2 border-red-300' : 'bg-red-900/20 border border-red-500/50'} rounded-lg p-3 flex items-start gap-3`}>
                  <AlertCircle className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-700' : 'text-red-400'} flex-shrink-0 mt-0.5`} />
                  <p className={`${isSaiDeBaixo ? 'text-red-800' : 'text-red-300'} text-sm`}>{errorMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <Label htmlFor="fullName" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Nome Completo *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div>
                  <Label htmlFor="email" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => checkDuplicateOnBlur('email')}
                    placeholder="seu@email.com"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base ${dup.email ? (isSaiDeBaixo ? ' border-red-500 bg-red-50 text-red-800 placeholder:text-red-500' : ' border-red-500/70 bg-red-900/20 text-red-200 placeholder:text-red-300') : ''}`}
                    disabled={isRegistering}
                  />
                  {dup.email && (
                    <p className="mt-1 text-xs text-red-400">{dupMsg.email || 'E-mail já cadastrado'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Telefone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => checkDuplicateOnBlur('phone')}
                    placeholder="(XX) XXXXX-XXXX"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base ${dup.phone ? (isSaiDeBaixo ? ' border-red-500 bg-red-50 text-red-800 placeholder:text-red-500' : ' border-red-500/70 bg-red-900/20 text-red-200 placeholder:text-red-300') : ''}`}
                    disabled={isRegistering}
                  />
                  {dup.phone && (
                    <p className="mt-1 text-xs text-red-400">{dupMsg.phone || 'Telefone já cadastrado'}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpf" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>CPF *</Label>
                  <Input
                    id="cpf"
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    onBlur={() => checkDuplicateOnBlur('cpf')}
                    placeholder="000.000.000-00"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base ${dup.cpf ? (isSaiDeBaixo ? ' border-red-500 bg-red-50 text-red-800 placeholder:text-red-500' : ' border-red-500/70 bg-red-900/20 text-red-200 placeholder:text-red-300') : ''}`}
                    disabled={isRegistering}
                  />
                  {dup.cpf && (
                    <p className="mt-1 text-xs text-red-400">{dupMsg.cpf || 'CPF já cadastrado'}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="password" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="Mínimo 8 caracteres com letra, número e caractere especial"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base ${passwordTouched && !validatePassword(password) ? (isSaiDeBaixo ? ' border-red-500 bg-red-50 text-red-800 placeholder:text-red-500' : ' border-red-500/70 bg-red-900/20 text-red-200 placeholder:text-red-300') : ''}`}
                    disabled={isRegistering}
                  />
                  {passwordTouched && !validatePassword(password) && (
                    <p className="mt-1 text-xs text-red-400">A senha deve ter no mínimo 8 caracteres, com letra, número e caractere especial.</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className={`font-semibold mb-3 ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'}`}>Endereço de Entrega</h3>
                {/* CEP primeiro */}
                <div className="mb-3">
                  <Label htmlFor="addressZipCode" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>CEP *</Label>
                  <Input
                    id="addressZipCode"
                    type="text"
                    value={addressZipCode}
                    onChange={(e) => { setAddressZipCode(e.target.value); setCepError(''); }}
                    onBlur={handleCepLookup}
                    placeholder="00000-000"
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base ${cepError ? (isSaiDeBaixo ? ' border-red-500 bg-red-50 text-red-800 placeholder:text-red-500' : ' border-red-500/70 bg-red-900/20 text-red-200 placeholder:text-red-300') : ''}`}
                    disabled={isRegistering}
                  />
                  {cepLoading && (<p className="mt-1 text-xs text-gray-400">Buscando endereço...</p>)}
                  {cepError && (<p className="mt-1 text-xs text-red-400">{cepError}</p>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div className="md:col-span-2">
                    <Label htmlFor="addressStreet" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Rua/Avenida *</Label>
                    <Input
                      id="addressStreet"
                      type="text"
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      placeholder="Nome da rua"
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressNumber" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Número *</Label>
                    <Input
                      id="addressNumber"
                      type="text"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      placeholder="123"
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressComplement" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Complemento</Label>
                    <Input
                      id="addressComplement"
                      type="text"
                      value={addressComplement}
                      onChange={(e) => setAddressComplement(e.target.value)}
                      placeholder="Apto, Bloco..."
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressNeighborhood" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Bairro *</Label>
                    <Input
                      id="addressNeighborhood"
                      type="text"
                      value={addressNeighborhood}
                      onChange={(e) => setAddressNeighborhood(e.target.value)}
                      placeholder="Nome do bairro"
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressCity" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Cidade *</Label>
                    <Input
                      id="addressCity"
                      type="text"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Nome da cidade"
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressState" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Estado *</Label>
                    <Input
                      id="addressState"
                      type="text"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="UF (ex: SP)"
                      maxLength={2}
                      className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                      disabled={isRegistering}
                    />
                  </div>

                  <div>

                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <Button
                  type="submit"
                  disabled={isRegistering || !fullName || !email || !phone || !cpf || !password || !validatePassword(password) || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode}
                  className={`w-full h-12 text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {isRegistering ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Criar Conta
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} text-sm mb-2`}>Já tem uma conta?</p>
                  <Button
                    type="button"
                    onClick={() => navigate(createPageUrl("Home"))}
                    className={`h-12 text-base ${isSaiDeBaixo ? 'bg-gray-800 text-white hover:bg-gray-900' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    disabled={isRegistering}
                  >
                    Fazer Login
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 📜 PONTO 67 — Termo de Adesão obrigatório */}
      {showTermo && (
        <TermoAdesaoModal
          textoConfirmar="Concordo e Quero Participar"
          onAccept={() => { setTermoAceito(true); setShowTermo(false); executarCadastro(); }}
          onClose={() => setShowTermo(false)}
        />
      )}
    </div>
  );
}