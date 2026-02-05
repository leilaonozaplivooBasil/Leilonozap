import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { createPageUrl } from '@/utils';

const AppUser = base44.entities.AppUser;

export default function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [tokenError, setTokenError] = useState('');
    const [userId, setUserId] = useState(null);

    // Validação de senha forte (mesma do Register.jsx)
    const validatePassword = (pwd) => /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(pwd);

    // Validar token ao carregar a página
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setTokenError('Link inválido. Solicite um novo link de recuperação.');
                setIsValidating(false);
                return;
            }

            try {
                // Buscar usuário pelo token
                const users = await AppUser.filter({ password_reset_token: token });

                if (!users || users.length === 0) {
                    setTokenError('Link inválido ou já utilizado. Solicite um novo link.');
                    setIsValidating(false);
                    return;
                }

                const user = users[0];

                // Verificar expiração
                if (user.password_reset_expires) {
                    const expiresAt = new Date(user.password_reset_expires);
                    if (expiresAt < new Date()) {
                        setTokenError('Link expirado. Solicite um novo link de recuperação.');
                        setIsValidating(false);
                        return;
                    }
                }

                setUserId(user.id);
                setIsValidating(false);
            } catch (err) {
                console.error('Erro ao validar token:', err);
                setTokenError('Erro ao validar link. Tente novamente.');
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validatePassword(password)) {
            setError('A senha deve ter no mínimo 8 caracteres, incluindo letra, número e caractere especial.');
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await base44.functions.invoke('updateUserPassword', {
                user_id: userId,
                new_password: password
            });

            if (response?.success || response?.data?.success) {
                // Limpar o token após uso bem sucedido
                try {
                    await AppUser.update(userId, {
                        password_reset_token: null,
                        password_reset_expires: null
                    });
                } catch (e) {
                    console.log('Token cleanup handled by backend');
                }

                setSuccess(true);
            } else {
                setError(response?.error || response?.data?.error || 'Erro ao redefinir senha. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro:', err);
            setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // Estado de carregamento inicial
    if (isValidating) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Validando link...</p>
                </div>
            </div>
        );
    }

    // Erro de token inválido
    if (tokenError) {
        return (
            <div className="min-h-screen bg-gray-900 py-8 px-4 flex items-center justify-center">
                <div className="w-full max-w-md">
                    <Card className="bg-gray-800 border-gray-700 text-white">
                        <CardContent className="pt-8 text-center">
                            <div className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="w-10 h-10 text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-red-400 mb-3">
                                Link Inválido ❌
                            </h3>
                            <p className="text-gray-300 mb-6">
                                {tokenError}
                            </p>
                            <div className="space-y-3">
                                <Button
                                    onClick={() => navigate(createPageUrl("ForgotPassword"))}
                                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                                >
                                    Solicitar Novo Link
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => navigate(createPageUrl("Home"))}
                                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 h-12"
                                >
                                    Voltar ao Login
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4 flex items-center justify-center">
            <div className="w-full max-w-md">
                <Button
                    variant="ghost"
                    onClick={() => navigate(createPageUrl("Home"))}
                    className="mb-6 text-gray-300 hover:text-white"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Login
                </Button>

                <Card className="bg-gray-800 border-gray-700 text-white">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/30">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Nova Senha
                        </CardTitle>
                        <p className="text-gray-400 text-sm mt-2">
                            Crie uma nova senha segura para sua conta
                        </p>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {success ? (
                            <div className="text-center py-6">
                                <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-green-400 mb-3">
                                    Senha Alterada! 🎉
                                </h3>
                                <p className="text-gray-300 mb-6">
                                    Sua senha foi redefinida com sucesso. Agora você pode fazer login com a nova senha.
                                </p>
                                <Button
                                    onClick={() => navigate(createPageUrl("Home"))}
                                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                                >
                                    Fazer Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-300 text-sm">{error}</p>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="password" className="text-gray-300">
                                        Nova Senha
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            className="bg-gray-700 border-gray-600 text-white h-12 pr-12"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-gray-500 text-xs mt-2">
                                        Use letras, números e caracteres especiais (!@#$%...)
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="confirmPassword" className="text-gray-300">
                                        Confirmar Senha
                                    </Label>
                                    <div className="relative mt-2">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Digite a senha novamente"
                                            className="bg-gray-700 border-gray-600 text-white h-12 pr-12"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Indicador de força da senha */}
                                {password && (
                                    <div className={`text-sm flex items-center gap-2 ${validatePassword(password) ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {validatePassword(password) ? (
                                            <>
                                                <CheckCircle className="w-4 h-4" />
                                                Senha forte ✓
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-4 h-4" />
                                                Senha precisa de letra, número e caractere especial
                                            </>
                                        )}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isLoading || !password || !confirmPassword}
                                    className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold mt-4"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Alterando...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5 mr-2" />
                                            Alterar Senha
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
