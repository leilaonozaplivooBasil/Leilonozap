import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';

export default function OlxCallback() {
    const [status, setStatus] = useState('loading');
    const [errorMessage, setErrorMessage] = useState('');
    const [errorDescription, setErrorDescription] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const processCallback = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                const error = urlParams.get('error');
                const errorDesc = urlParams.get('error_description');

                console.log('📥 OLX Callback recebido');

                if (error) {
                    console.log('❌ Erro OAuth:', error);
                    setStatus('error');
                    setErrorMessage(error);
                    setErrorDescription(errorDesc || 'Não foi possível completar a autorização');
                    return;
                }

                if (!code) {
                    setStatus('error');
                    setErrorMessage('invalid_request');
                    setErrorDescription('Código de autorização não recebido');
                    return;
                }

                console.log('✅ Code recebido (salvo de forma segura)');

                // Obter usuário atual (se estiver logado)
                let currentUser = null;
                try {
                    currentUser = await base44.auth.me();
                } catch (e) {
                    console.log('ℹ️ Usuário não autenticado');
                }

                // Salvar token no banco
                await base44.entities.OAuthToken.create({
                    provider: 'olx',
                    code: code,
                    state: state || '',
                    user_id: currentUser?.id || 'anonymous',
                    status: 'pending'
                });

                console.log('✅ Token salvo com sucesso');
                setStatus('success');

            } catch (error) {
                console.error('❌ Erro ao processar callback:', error.message);
                setStatus('error');
                setErrorMessage('processing_error');
                setErrorDescription('Erro ao salvar autorização. Tente novamente.');
            }
        };

        processCallback();
    }, []);

    const handleGoHome = () => {
        navigate(createPageUrl('Home'));
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                            <p className="text-white text-center">Processando autorização da OLX...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <CardTitle className="text-white text-center text-xl">
                            Autorização da OLX Concluída
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-gray-300 text-center">
                            Sua conta foi autorizada com sucesso. Você pode fechar esta página.
                        </p>
                        <Button
                            onClick={handleGoHome}
                            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Voltar para Início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="bg-gray-800 border-gray-700 max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>
                        <CardTitle className="text-white text-center text-xl">
                            Não Foi Possível Autorizar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                            <p className="text-red-400 text-center font-semibold">
                                {errorMessage || 'Erro desconhecido'}
                            </p>
                            {errorDescription && (
                                <p className="text-gray-400 text-sm text-center">
                                    {errorDescription}
                                </p>
                            )}
                        </div>
                        <Button
                            onClick={handleGoHome}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center gap-2"
                        >
                            <Home className="w-4 h-4" />
                            Voltar para Início
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}