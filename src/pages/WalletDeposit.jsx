import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
    Wallet, 
    ArrowLeft, 
    CreditCard, 
    Zap,
    CheckCircle2,
    Sparkles,
    TrendingUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function WalletDepositPage() {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [walletBalance, setWalletBalance] = useState(0);
    const [depositPackages, setDepositPackages] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedUser = localStorage.getItem('currentUser');
                if (!savedUser) {
                    navigate('/');
                    return;
                }

                const user = JSON.parse(savedUser);
                setCurrentUser(user);

                // Buscar saldo da carteira
                const wallets = await base44.entities.Wallet.filter({ user_id: user.id });
                if (wallets && wallets.length > 0) {
                    setWalletBalance(wallets[0].balance || 0);
                }

                // Buscar pacotes de depósito
                const packages = await base44.entities.DepositPackage.filter({ is_active: true });
                setDepositPackages(packages.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handlePackageSelect = (pkg) => {
        setSelectedPackage(pkg);
        setCustomAmount('');
    };

    const handleCustomAmountChange = (e) => {
        const value = e.target.value.replace(/[^\d]/g, '');
        setCustomAmount(value);
        setSelectedPackage(null);
    };

    const getSelectedAmount = () => {
        if (selectedPackage) return selectedPackage.amount;
        if (customAmount) return parseFloat(customAmount);
        return 0;
    };

    const getBonusAmount = () => {
        if (!selectedPackage || !selectedPackage.bonus_percentage) return 0;
        return (selectedPackage.amount * selectedPackage.bonus_percentage) / 100;
    };

    const getTotalAmount = () => {
        return getSelectedAmount() + getBonusAmount();
    };

    const handleDeposit = async () => {
        const amount = getSelectedAmount();
        
        if (!amount || amount < 10) {
            alert('O valor mínimo para depósito é R$ 10,00');
            return;
        }

        setIsProcessing(true);
        try {
            // Aqui você integrará com o gateway de pagamento
            // Por enquanto, vamos criar a transação pendente
            await base44.entities.WalletTransaction.create({
                user_id: currentUser.id,
                type: 'deposit',
                direction: 'credit',
                amount: getTotalAmount(),
                status: 'pending',
                description: `Depósito de R$ ${amount.toFixed(2)}${getBonusAmount() > 0 ? ` + Bônus de R$ ${getBonusAmount().toFixed(2)}` : ''}`
            });

            alert('Pedido de depósito criado! Redirecionando para pagamento...');
            // Aqui você redirecionaria para o checkout do gateway
            
        } catch (error) {
            console.error('Erro ao processar depósito:', error);
            alert('Erro ao processar depósito. Tente novamente.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Button
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        className="text-gray-400 hover:text-white mb-6 -ml-2"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-gradient-to-br from-green-600 to-green-700 p-3 rounded-2xl shadow-lg shadow-green-500/25">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                Adicionar Saldo
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">
                                Escolha um pacote ou insira o valor desejado
                            </p>
                        </div>
                    </div>

                    {/* Saldo Atual */}
                    <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm mb-1">Saldo Atual</p>
                                <p className="text-white text-2xl font-bold">R$ {walletBalance.toFixed(2)}</p>
                            </div>
                            <div className="bg-green-600/10 p-3 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Pacotes de Depósito */}
                {depositPackages.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Pacotes Populares
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {depositPackages.map((pkg) => (
                                <Card
                                    key={pkg.id}
                                    onClick={() => handlePackageSelect(pkg)}
                                    className={`cursor-pointer transition-all duration-300 ${
                                        selectedPackage?.id === pkg.id
                                            ? 'bg-gradient-to-br from-green-600 to-green-700 border-green-500 shadow-lg shadow-green-500/25 scale-105'
                                            : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50 hover:border-green-500/50 hover:scale-102'
                                    }`}
                                >
                                    <CardContent className="p-4 text-center">
                                        {pkg.bonus_percentage > 0 && (
                                            <Badge className="mb-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                +{pkg.bonus_percentage}%
                                            </Badge>
                                        )}
                                        <p className="text-2xl font-black text-white">
                                            R$ {pkg.amount.toFixed(0)}
                                        </p>
                                        {pkg.bonus_percentage > 0 && (
                                            <p className="text-xs text-green-400 mt-1">
                                                Receba R$ {(pkg.amount + (pkg.amount * pkg.bonus_percentage / 100)).toFixed(0)}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Valor Personalizado */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">Ou insira um valor personalizado</h2>
                    <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400 text-2xl font-bold">R$</span>
                                <Input
                                    type="text"
                                    placeholder="0,00"
                                    value={customAmount ? `${parseFloat(customAmount).toFixed(2)}` : ''}
                                    onChange={handleCustomAmountChange}
                                    className="text-3xl font-bold bg-transparent border-none text-white placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                            </div>
                            <p className="text-gray-500 text-xs mt-2">Valor mínimo: R$ 10,00</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Resumo */}
                {(selectedPackage || customAmount) && (
                    <Card className="bg-gradient-to-br from-green-600/10 to-green-700/5 border-green-500/20 mb-6">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between text-gray-300">
                                <span>Valor do depósito</span>
                                <span className="font-bold">R$ {getSelectedAmount().toFixed(2)}</span>
                            </div>
                            
                            {getBonusAmount() > 0 && (
                                <div className="flex items-center justify-between text-yellow-400">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-4 h-4" />
                                        Bônus
                                    </span>
                                    <span className="font-bold">+ R$ {getBonusAmount().toFixed(2)}</span>
                                </div>
                            )}
                            
                            <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
                                <span className="text-white font-bold">Total a receber</span>
                                <span className="text-green-400 text-2xl font-black">
                                    R$ {getTotalAmount().toFixed(2)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Botão de Confirmar */}
                <Button
                    onClick={handleDeposit}
                    disabled={!getSelectedAmount() || isProcessing}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-6 text-lg shadow-xl shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                    {isProcessing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                            Processando...
                        </>
                    ) : (
                        <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            Continuar para Pagamento
                        </>
                    )}
                </Button>

                {/* Informações de Segurança */}
                <div className="mt-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>Pagamento 100% seguro e criptografado</span>
                    </div>
                </div>
            </div>
        </div>
    );
}