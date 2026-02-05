import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email || !email.includes('@')) {
            setError('Por favor, insira um email válido.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await base44.functions.invoke('sendPasswordResetEmail', {
                email: email.toLowerCase().trim()
            });

            if (response?.success || response?.data?.success) {
                setSuccess(true);
            } else {
                setError(response?.error || response?.data?.error || 'Erro ao enviar email. Tente novamente.');
            }
        } catch (err) {
            console.error('Erro:', err);
            setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

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
                            <Mail className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">
                            Recuperar Senha
                        </CardTitle>
                        <p className="text-gray-400 text-sm mt-2">
                            Digite seu email para receber o link de recuperação
                        </p>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {success ? (
                            <div className="text-center py-6">
                                <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                                    <CheckCircle className="w-10 h-10 text-green-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-green-400 mb-3">
                                    Email Enviado! 📧
                                </h3>
                                <p className="text-gray-300 mb-6 leading-relaxed">
                                    Se o email <strong className="text-white">{email}</strong> estiver cadastrado,
                                    você receberá um link para redefinir sua senha.
                                </p>
                                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                                    <p className="text-yellow-300 text-sm">
                                        ⏰ O link expira em <strong>15 minutos</strong>. Verifique também a pasta de spam.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate(createPageUrl("Home"))}
                                    className="w-full bg-green-600 hover:bg-green-700 h-12"
                                >
                                    Voltar ao Login
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-300 text-sm">{error}</p>
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="email" className="text-gray-300">
                                        Email cadastrado
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="bg-gray-700 border-gray-600 text-white h-12 mt-2"
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="w-full bg-green-600 hover:bg-green-700 h-12 text-base font-semibold"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-5 h-5 mr-2" />
                                            Enviar Link de Recuperação
                                        </>
                                    )}
                                </Button>

                                <div className="text-center pt-4 border-t border-gray-700">
                                    <p className="text-gray-400 text-sm">
                                        Lembrou a senha?{' '}
                                        <button
                                            type="button"
                                            onClick={() => navigate(createPageUrl("Home"))}
                                            className="text-green-400 hover:text-green-300 font-medium"
                                        >
                                            Fazer login
                                        </button>
                                    </p>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
