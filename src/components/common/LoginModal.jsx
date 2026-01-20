import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const AppUser = base44.entities.AppUser;
const SendEmail = (params) => base44.integrations.Core.SendEmail(params);
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, X, UserPlus, AlertCircle, Mail, Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function LoginModal({ onClose, onSuccess, onSwitchToRegister, theme }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados para recuperação de senha com código
  const [resetStep, setResetStep] = useState('email'); // 'email', 'code', 'newPassword'
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetUserId, setResetUserId] = useState(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  
  const isSaiDeBaixo = theme === 'saidebaixo';

  const handleLogin = async () => {
    // ✅ VALIDAÇÕES
    if (!email || !password) {
      setErrorMessage("❌ Por favor, preencha E-mail e Senha.");
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage("❌ Por favor, insira um E-mail válido.");
      return;
    }

    setIsLogging(true);
    setErrorMessage('');
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      console.log(`[LOGIN] Tentando login com: ${normalizedEmail}`);
      
      // 🔥 MASTER ADMIN BYPASS
      if (normalizedEmail === 'luizsantanna@tttcorporate.com') {
        console.log('[LOGIN] 🔑 Admin master detectado - verificando usuário...');
        
        const adminUsers = await AppUser.filter({ email: normalizedEmail });
        
        if (adminUsers.length > 0) {
          const adminUser = adminUsers[0];
          adminUser.role = 'admin';
          
          localStorage.setItem('currentUser', JSON.stringify(adminUser));
          sessionStorage.setItem('isLoggedIn', 'true');
          
          console.log('[LOGIN] ✅ Admin master logado com sucesso!');
          
          setTimeout(() => {
            if (onSuccess) onSuccess(adminUser);
            onClose();
          }, 500);
          return;
        } else {
          console.log('[LOGIN] ⚠️ Admin não encontrado no banco - criando...');
          
          const newAdmin = await AppUser.create({
            full_name: 'Luiz Sant Anna',
            email: normalizedEmail,
            password: password,
            phone: '00000000000',
            role: 'admin'
          });
          
          localStorage.setItem('currentUser', JSON.stringify(newAdmin));
          sessionStorage.setItem('isLoggedIn', 'true');
          
          console.log('[LOGIN] ✅ Admin master criado e logado!');
          
          setTimeout(() => {
            if (onSuccess) onSuccess(newAdmin);
            onClose();
          }, 500);
          return;
        }
      }

      let allUsers;
      try {
        allUsers = await AppUser.list('-created_date', 1000);
      } catch (networkError) {
        console.warn("[LOGIN] Primeira tentativa de buscar usuários falhou, tentando novamente...", networkError);
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        try {
          allUsers = await AppUser.list('-created_date', 1000);
        } catch (error2) {
          console.error("[LOGIN] Segunda tentativa falhou:", error2);
          setErrorMessage("❌ Erro de conexão. Verifique sua internet e tente novamente.");
          setIsLogging(false);
          return;
        }
      }
      
      console.log(`[LOGIN] Total de usuários retornados: ${allUsers.length}`);
      
      const users = allUsers.filter(u => u.email && u.email.toLowerCase().trim() === normalizedEmail);
      console.log(`[LOGIN] Encontrados ${users.length} usuários após o filtro.`);

      if (users.length === 0) {
        setErrorMessage("❌ E-mail não encontrado. Verifique os dados ou crie uma conta.");
        setIsLogging(false);
        return;
      }

      // TRATAMENTO DE DUPLICATAS
      if (users.length > 1) {
        console.warn("⚠️ Encontrados múltiplos usuários com o mesmo E-mail!");
        users.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        const [keepUser, ...oldUsers] = users;
        console.log(`✅ Mantendo usuário: ${keepUser.id} (${keepUser.created_date})`);
        
        for (const oldUser of oldUsers) {
          try {
            console.log(`❌ Removendo duplicata: ${oldUser.id} (${oldUser.created_date})`);
            await AppUser.delete(oldUser.id);
          } catch (e) {
            console.error("Erro ao remover duplicata:", e);
          }
        }
        
        const user = keepUser;
        
        if (user.password !== password) {
          setErrorMessage("❌ Senha incorreta.");
          setIsLogging(false);
          return;
        }

        localStorage.setItem('currentUser', JSON.stringify(user));
        sessionStorage.setItem('isLoggedIn', 'true');

        console.log(`[LOGIN] Login bem-sucedido: ${user.full_name} (duplicatas removidas)`);
        
        setTimeout(() => {
          try {
            if (onSuccess) {
              onSuccess(user);
            }
            onClose();
          } catch (err) {
            console.error("Erro no callback:", err);
          }
        }, 500);
        
        return;
      }

      const user = users[0];
      
      if (user.password !== password) {
        setErrorMessage("❌ Senha incorreta.");
        setIsLogging(false);
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(user));
      sessionStorage.setItem('isLoggedIn', 'true');

      console.log(`[LOGIN] Login bem-sucedido para: ${user.full_name}, Role: ${user.role}`);
      
      // 🆕 LOGGING NO SYSTEMLOG
      try {
        await base44.entities.SystemLog.create({
          step: 'User_Login_Success',
          status: 'success',
          message: `Login bem-sucedido: ${user.full_name}`,
          component_name: 'LoginModal',
          payload: { user_id: user.id, email: user.email }
        });
      } catch (logErr) {
        console.debug('Log não enviado (não crítico)');
      }
      
      setTimeout(() => {
        try {
          if (onSuccess) onSuccess(user);
          onClose();
        } catch (err) {
          console.error("Erro no callback:", err);
          // 🆕 LOGA ERRO NO CALLBACK
          base44.entities.SystemLog.create({
            step: 'Login_Callback_Error',
            status: 'error',
            message: `Erro ao executar callback de sucesso: ${err.message}`,
            component_name: 'LoginModal',
            error_details: { message: err.message, stack: err.stack }
          }).catch(() => {});
        }
      }, 500);

    } catch (error) {
      console.error("[LOGIN] Erro no login:", error);
      
      // 🆕 LOGA ERRO NO SYSTEMLOG
      try {
        await base44.entities.SystemLog.create({
          step: 'User_Login_Failed',
          status: 'error',
          message: `Falha no login: ${error.message}`,
          component_name: 'LoginModal',
          error_details: { message: error.message, stack: error.stack },
          payload: { email }
        });
      } catch (logErr) {
        console.debug('Log não enviado (não crítico)');
      }
      
      const errorMsg = error?.message || "Erro desconhecido";
      setErrorMessage("❌ Erro ao fazer login: " + errorMsg);
      setIsLogging(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Passo 1: Enviar código de verificação por email
  const handleSendVerificationCode = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      alert("❌ Por favor, insira um e-mail válido.");
      return;
    }

    setIsResetting(true);
    setResetSuccessMessage('');

    try {
      const normalizedResetEmail = resetEmail.toLowerCase().trim();
      const users = await AppUser.filter({ email: normalizedResetEmail });

      if (users.length === 0) {
        // Por segurança, não revelamos se o email existe ou não
        alert("✅ Se o seu e-mail estiver registrado, você receberá um código de verificação.");
        setIsResetting(false);
        return;
      }

      const user = users[0];
      
      // Gera código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setResetUserId(user.id);

      await SendEmail({
        to: user.email,
        subject: "🔐 Código de Verificação - Leilão NoZap",
        body: `Olá ${user.full_name},

Você solicitou a recuperação de senha.

🔑 Seu código de verificação é: ${code}

⚠️ Este código é válido por 10 minutos.

Se você não solicitou esta recuperação, ignore este e-mail.

---
Equipe Leilão NoZap 🎯`
      });

      await base44.entities.SystemLog.create({
        step: 'Password_Reset_Code_Sent',
        status: 'success',
        message: 'Verification code sent successfully',
        component_name: 'LoginModal',
        payload: { email: normalizedResetEmail }
      });

      setResetStep('code');
      setResetSuccessMessage('✅ Código enviado! Verifique seu e-mail.');

    } catch (error) {
      console.error("Erro ao enviar código:", error);
      alert("❌ Erro ao enviar código. Tente novamente.");
    } finally {
      setIsResetting(false);
    }
  };

  // Passo 2: Verificar código
  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      setResetStep('newPassword');
      setResetSuccessMessage('✅ Código verificado! Defina sua nova senha.');
    } else {
      alert("❌ Código incorreto. Verifique e tente novamente.");
    }
  };

  // Passo 3: Definir nova senha
  const handleSetNewPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert("❌ A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("❌ As senhas não coincidem.");
      return;
    }

    setIsResetting(true);

    try {
      // Usa função backend para atualizar senha (bypass de RLS)
      await base44.functions.invoke('updateUserPassword', { 
        user_id: resetUserId, 
        new_password: newPassword 
      });

      await base44.entities.SystemLog.create({
        step: 'Password_Reset_Complete',
        status: 'success',
        message: 'Password changed successfully via verification code',
        component_name: 'LoginModal',
        payload: { user_id: resetUserId }
      }).catch(() => {});

      alert("✅ Senha alterada com sucesso! Faça login com sua nova senha.");
      
      // Reset todos os estados
      setShowForgotPassword(false);
      setResetStep('email');
      setResetEmail('');
      setVerificationCode('');
      setGeneratedCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResetUserId(null);
      setResetSuccessMessage('');

    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      alert("❌ Erro ao alterar senha. Tente novamente.");
    } finally {
      setIsResetting(false);
    }
  };

  // Cancelar recuperação
  const handleCancelReset = () => {
    setShowForgotPassword(false);
    setResetStep('email');
    setResetEmail('');
    setVerificationCode('');
    setGeneratedCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetUserId(null);
    setResetSuccessMessage('');
  };

  if (showForgotPassword) {
    return (
      <div className={`fixed inset-0 ${isSaiDeBaixo ? 'bg-black/50' : 'bg-gray-900/80'} flex items-center justify-center z-[2001] p-4 animate-in fade-in-0 overflow-y-auto`} style={{ paddingTop: 'max(16px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
        <Card className={`w-full max-w-md ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} relative my-auto`}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancelReset} 
            className={isSaiDeBaixo ? 'absolute top-2 right-2 text-gray-600' : 'absolute top-2 right-2 text-gray-400'}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
              {resetStep === 'email' && <Mail />}
              {resetStep === 'code' && <KeyRound />}
              {resetStep === 'newPassword' && <CheckCircle />}
              {resetStep === 'email' && 'Recuperar Senha'}
              {resetStep === 'code' && 'Verificar Código'}
              {resetStep === 'newPassword' && 'Nova Senha'}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-5 sm:space-y-4">
            {/* Indicador de passos */}
            <div className="flex justify-center gap-2 mb-4">
              <div className={`w-8 h-1 rounded ${resetStep === 'email' ? (isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500') : (isSaiDeBaixo ? 'bg-red-200' : 'bg-green-900')}`} />
              <div className={`w-8 h-1 rounded ${resetStep === 'code' ? (isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500') : resetStep === 'newPassword' ? (isSaiDeBaixo ? 'bg-red-200' : 'bg-green-900') : 'bg-gray-600'}`} />
              <div className={`w-8 h-1 rounded ${resetStep === 'newPassword' ? (isSaiDeBaixo ? 'bg-red-600' : 'bg-green-500') : 'bg-gray-600'}`} />
            </div>

            {resetSuccessMessage && (
              <div className={`${isSaiDeBaixo ? 'bg-green-100 border border-green-300' : 'bg-green-900/30 border border-green-500/50'} rounded-lg p-3 text-center`}>
                <p className={`${isSaiDeBaixo ? 'text-green-700' : 'text-green-400'} text-sm`}>{resetSuccessMessage}</p>
              </div>
            )}

            {/* PASSO 1: Email */}
            {resetStep === 'email' && (
              <>
                <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-300'} text-sm sm:text-base`}>
                  Digite seu e-mail cadastrado. Enviaremos um código de verificação.
                </p>
                <div>
                  <Label htmlFor="resetEmail" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>E-mail</Label>
                  <Input 
                    id="resetEmail" 
                    type="email" 
                    value={resetEmail} 
                    onChange={(e) => setResetEmail(e.target.value)} 
                    placeholder="seu@email.com" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isResetting}
                  />
                </div>
              </>
            )}

            {/* PASSO 2: Código */}
            {resetStep === 'code' && (
              <>
                <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-300'} text-sm sm:text-base`}>
                  Digite o código de 6 dígitos enviado para <strong>{resetEmail}</strong>
                </p>
                <div>
                  <Label htmlFor="verificationCode" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Código de Verificação</Label>
                  <Input 
                    id="verificationCode" 
                    type="text" 
                    value={verificationCode} 
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                    placeholder="000000" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base text-center text-2xl tracking-widest font-mono`}
                    maxLength={6}
                  />
                </div>
                <button
                  onClick={handleSendVerificationCode}
                  disabled={isResetting}
                  className={`${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'} text-sm hover:underline`}
                >
                  Não recebeu? Reenviar código
                </button>
              </>
            )}

            {/* PASSO 3: Nova Senha */}
            {resetStep === 'newPassword' && (
              <>
                <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-300'} text-sm sm:text-base`}>
                  Defina sua nova senha (mínimo 6 caracteres).
                </p>
                <div>
                  <Label htmlFor="newPassword" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Nova Senha</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Mínimo 6 caracteres" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isResetting}
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Confirmar Senha</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Digite novamente" 
                    className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
                    disabled={isResetting}
                  />
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="flex gap-2 sm:gap-3">
            <Button 
              variant="outline"
              onClick={handleCancelReset}
              className={`flex-1 h-12 text-base ${isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            
            {resetStep === 'email' && (
              <Button 
                onClick={handleSendVerificationCode} 
                disabled={isResetting || !resetEmail}
                className={`flex-1 h-12 text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isResetting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Código"
                )}
              </Button>
            )}

            {resetStep === 'code' && (
              <Button 
                onClick={handleVerifyCode} 
                disabled={verificationCode.length !== 6}
                className={`flex-1 h-12 text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                Verificar Código
              </Button>
            )}

            {resetStep === 'newPassword' && (
              <Button 
                onClick={handleSetNewPassword} 
                disabled={isResetting || !newPassword || newPassword !== confirmPassword}
                className={`flex-1 h-12 text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isResetting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Nova Senha"
                )}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
          <div className={`fixed inset-0 ${isSaiDeBaixo ? 'bg-black/50' : 'bg-gray-900/80'} flex items-center justify-center z-[2001] p-3 sm:p-4 md:p-6 animate-in fade-in-0 overflow-y-auto`}>
      <Card className={`w-full max-w-md ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} relative my-auto`}>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className={isSaiDeBaixo ? 'absolute top-2 right-2 text-gray-600' : 'absolute top-2 right-2 text-gray-400'}
          disabled={isLogging}
        >
          <X className="w-4 h-4" />
        </Button>
        
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
            <LogIn />
            Entrar na Sua Conta
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-5 sm:space-y-4">
          {errorMessage && (
            <div className={`${isSaiDeBaixo ? 'bg-red-100 border-2 border-red-300' : 'bg-red-900/20 border border-red-500/50'} rounded-lg p-3 flex items-start gap-3`}>
              <AlertCircle className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-700' : 'text-red-400'} flex-shrink-0 mt-0.5`} />
              <p className={`${isSaiDeBaixo ? 'text-red-800' : 'text-red-300'} text-sm`}>{errorMessage}</p>
            </div>
          )}
          
          <div>
            <Label htmlFor="email" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="seu@email.com" 
              className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'} h-12 text-base`}
              disabled={isLogging}
            />
          </div>
          
          <div>
            <Label htmlFor="password" className={`${isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'} text-base`}>Senha</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyPress={handleKeyPress}
                placeholder="Sua senha" 
                className={`${isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900 pr-12' : 'bg-gray-700 border-gray-600 text-white pr-12'} h-12 text-base`}
                disabled={isLogging}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 ${isSaiDeBaixo ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                disabled={isLogging}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setShowForgotPassword(true);
              setErrorMessage('');
            }}
            className={`${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'} text-sm hover:underline min-h-[44px] flex items-center py-2`}
            disabled={isLogging}
          >
            Esqueci minha senha
          </button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4 sm:gap-3">
          <Button 
            onClick={handleLogin} 
            disabled={isLogging || !email || !password}
            className={`w-full h-12 text-base ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isLogging ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </Button>
          
          <div className="text-center w-full">
            <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} text-sm mb-3`}>Ainda não tem conta?</p>
            <Button 
              onClick={() => {
                onClose();
                navigate(createPageUrl("Register"));
              }}
              variant="outline"
              className={`w-full h-12 text-base ${isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
              disabled={isLogging}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Criar Conta
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}