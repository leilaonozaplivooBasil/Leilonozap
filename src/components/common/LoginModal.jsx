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
import { LogIn, X, UserPlus, AlertCircle, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginModal({ onClose, onSuccess, onSwitchToRegister }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isSaiDeBaixo = sessionStorage.getItem('saiDeBaixoContext') === 'true';

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

  const handleForgotPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      alert("❌ Por favor, insira um e-mail válido.");
      return;
    }

    setIsResetting(true);
    try {
      const normalizedResetEmail = resetEmail.toLowerCase().trim();
      const users = await AppUser.filter({ email: normalizedResetEmail });
      
      if (users.length === 0) {
        alert("❌ E-mail não encontrado no sistema.");
        setIsResetting(false);
        return;
      }

      const user = users[0];
      
      // Gera nova senha temporária
      const newPassword = Math.random().toString(36).slice(-8);
      
      // Atualiza no banco
      await AppUser.update(user.id, { password: newPassword });
      
      // Envia email
      await SendEmail({
        to: user.email,
        subject: "🔐 Nova Senha - Leilão NoZap",
        body: `
Olá ${user.full_name},

Você solicitou a recuperação de senha.

📧 **Nova Senha Temporária:** ${newPassword}

⚠️ **IMPORTANTE:** Por segurança, recomendamos que você altere esta senha assim que fizer login.

Entre no app e faça login com esta senha.

---
Equipe Leilão NoZap 🎯
        `
      });
      
      alert("✅ Nova senha enviada para seu e-mail!");
      setShowForgotPassword(false);
      setResetEmail('');
      
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      alert("❌ Erro ao enviar e-mail. Tente novamente ou contate o suporte.");
    } finally {
      setIsResetting(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className={`fixed inset-0 ${isSaiDeBaixo ? 'bg-black/50' : 'bg-gray-900/80'} flex items-center justify-center z-[2001] p-4 animate-in fade-in-0`}>
        <Card className={`w-full max-w-md ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} relative`}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowForgotPassword(false)} 
            className={isSaiDeBaixo ? 'absolute top-2 right-2 text-gray-600' : 'absolute top-2 right-2 text-gray-400'}
          >
            <X className="w-4 h-4" />
          </Button>
          
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}`}>
              <Mail />
              Recuperar Senha
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-300'} text-sm`}>
              Digite seu e-mail cadastrado. Enviaremos uma nova senha temporária.
            </p>
            <div>
              <Label htmlFor="resetEmail" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>E-mail</Label>
              <Input 
                id="resetEmail" 
                type="email" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)} 
                placeholder="seu@email.com" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
                disabled={isResetting}
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              className={`flex-1 ${isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}
              disabled={isResetting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleForgotPassword} 
              disabled={isResetting || !resetEmail}
              className={`flex-1 ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isResetting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Enviando...
                </>
              ) : (
                "Enviar Nova Senha"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 ${isSaiDeBaixo ? 'bg-black/50' : 'bg-gray-900/80'} flex items-center justify-center z-[2001] p-4 animate-in fade-in-0`}>
      <Card className={`w-full max-w-md ${isSaiDeBaixo ? 'bg-white border-2 border-gray-200' : 'bg-gray-800 border-gray-700'} ${isSaiDeBaixo ? 'text-gray-900' : 'text-white'} relative`}>
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
        
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className={`${isSaiDeBaixo ? 'bg-red-100 border-2 border-red-300' : 'bg-red-900/20 border border-red-500/50'} rounded-lg p-3 flex items-start gap-3`}>
              <AlertCircle className={`w-5 h-5 ${isSaiDeBaixo ? 'text-red-700' : 'text-red-400'} flex-shrink-0 mt-0.5`} />
              <p className={`${isSaiDeBaixo ? 'text-red-800' : 'text-red-300'} text-sm`}>{errorMessage}</p>
            </div>
          )}
          
          <div>
            <Label htmlFor="email" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              onKeyPress={handleKeyPress}
              placeholder="seu@email.com" 
              className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}
              disabled={isLogging}
            />
          </div>
          
          <div>
            <Label htmlFor="password" className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-300'}>Senha</Label>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyPress={handleKeyPress}
                placeholder="Sua senha" 
                className={isSaiDeBaixo ? 'bg-white border-gray-300 text-gray-900 pr-10' : 'bg-gray-700 border-gray-600 text-white pr-10'}
                disabled={isLogging}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-3 ${isSaiDeBaixo ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                disabled={isLogging}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setShowForgotPassword(true);
              setErrorMessage('');
            }}
            className={`${isSaiDeBaixo ? 'text-red-600' : 'text-green-400'} text-sm hover:underline`}
            disabled={isLogging}
          >
            Esqueci minha senha
          </button>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleLogin} 
            disabled={isLogging || !email || !password}
            className={`w-full ${isSaiDeBaixo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isLogging ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Entrando...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </>
            )}
          </Button>
          
          <div className="text-center">
            <p className={`${isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'} text-sm mb-2`}>Ainda não tem conta?</p>
            <Button 
              onClick={() => {
                onClose();
                navigate(createPageUrl("Register"));
              }}
              variant="outline"
              className={isSaiDeBaixo ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-gray-600 text-gray-300 hover:bg-gray-700'}
              disabled={isLogging}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Conta
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}