import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

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

  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!fullName || !email || !phone || !cpf || !password || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode) {
      setErrorMessage("❌ Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    if (!email.includes('@')) {
      setErrorMessage("❌ Por favor, insira um E-mail válido.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("❌ A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsRegistering(true);
    setErrorMessage('');

    try {
      const existingUsers = await AppUser.filter({ email: email.toLowerCase().trim() });
      if (existingUsers.length > 0) {
        setErrorMessage("❌ Este e-mail já está cadastrado. Tente fazer login.");
        setIsRegistering(false);
        return;
      }

      const newUser = await AppUser.create({
        full_name: fullName,
        email: email.toLowerCase().trim(),
        phone: phone,
        cpf: cpf,
        password: password,
        role: 'user',
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        address_zip_code: addressZipCode,
      });

      localStorage.setItem('currentUser', JSON.stringify(newUser));
      sessionStorage.setItem('isLoggedIn', 'true');

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
                    placeholder="seu@email.com" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Telefone *</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(XX) XXXXX-XXXX" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div>
                  <Label htmlFor="cpf" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>CPF *</Label>
                  <Input 
                    id="cpf" 
                    type="text" 
                    value={cpf} 
                    onChange={(e) => setCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="password" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Senha *</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>
              </div>

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
                    placeholder="seu@email.com" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Telefone *</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="(XX) XXXXX-XXXX" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div>
                  <Label htmlFor="cpf" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>CPF *</Label>
                  <Input 
                    id="cpf" 
                    type="text" 
                    value={cpf} 
                    onChange={(e) => setCpf(e.target.value)} 
                    placeholder="000.000.000-00" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="password" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Senha *</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isRegistering}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4">
                <Button 
                  type="submit"
                  disabled={isRegistering || !fullName || !email || !phone || !cpf || !password || !addressStreet || !addressNumber || !addressNeighborhood || !addressCity || !addressState || !addressZipCode}
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
                    variant="outline"
                    className={`h-12 text-base ${isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
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
    </div>
  );
}