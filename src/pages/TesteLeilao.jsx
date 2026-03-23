import React, { useState, useEffect } from 'react';
import { AppUser } from '@/entities/AppUser';
import { Auction } from '@/entities/Auction';
import { AuctionMessage } from '@/entities/AuctionMessage';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
    BeakerIcon,
    Trash2,
    Zap,
    Users,
    Gavel,
    CheckCircle,
    AlertTriangle,
    Loader2,
    ExternalLink,
    BarChart3,
    Play,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';

// NEW IMPORTS FOR AUCTION MANAGEMENT
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearAuctionMessages } from "@/functions/clearAuctionMessages";


export default function TesteLeilaoPage() {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [testEnvironment, setTestEnvironment] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();
    const [authorized, setAuthorized] = useState(false);

    // NEW STATES FOR AUCTION MANAGEMENT
    const [auctions, setAuctions] = useState([]);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [isClearingMessages, setIsClearingMessages] = useState(false);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!user || user.role !== 'admin') {
            navigate('/');
        } else {
            setAuthorized(true);
        }
    }, []);

    useEffect(() => {
        if (authorized) loadCurrentUser();
    }, [authorized]);

    const loadCurrentUser = async () => {
        try {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                const usersFromDB = await AppUser.filter({ id: user.id });
                if (usersFromDB.length > 0) {
                    setCurrentUser(usersFromDB[0]);
                }
            }
        } catch (error) {
            console.error("Erro ao carregar usuário:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTestEnvironment = async () => {
        try {
            // Busca todos os elementos de teste
            const testUsers = await AppUser.filter({ email: { $regex: '@teste.leilao' } });
            const testAuctions = await Auction.filter({ title: { $regex: '[TESTE]' } });

            if (testUsers.length > 0 || testAuctions.length > 0) {
                setTestEnvironment({
                    users: testUsers,
                    auctions: testAuctions,
                    licensee: testUsers.find(u => u.role === 'licensee'),
                    clients: testUsers.filter(u => u.role === 'user')
                });
            } else {
                setTestEnvironment(null);
            }
        } catch (error) {
            console.error("Erro ao carregar ambiente de teste:", error);
        }
    };

    // NEW FUNCTION: Load only test auctions for the select dropdown
    const loadAuctions = async () => {
        try {
            const fetchedAuctions = await Auction.filter({ title: { $regex: '[TESTE]' } });
            setAuctions(fetchedAuctions);
            // Try to keep selected auction if it still exists, otherwise auto-select first one
            setSelectedAuction(prev => {
                if (prev && fetchedAuctions.some(a => a.id === prev.id)) {
                    return fetchedAuctions.find(a => a.id === prev.id);
                }
                return fetchedAuctions.length > 0 ? fetchedAuctions[0] : null;
            });
        } catch (error) {
            console.error("Erro ao carregar leilões de teste:", error);
            toast.error("Erro ao carregar leilões de teste.");
        }
    };

    useEffect(() => {
        if (!isLoading) {
            loadTestEnvironment();
            loadAuctions(); // Load auctions for the select component
        }
    }, [isLoading]);

    const createTestEnvironment = async () => {
        if (!currentUser || currentUser.role !== 'admin') {
            toast.error("Apenas administradores podem criar ambientes de teste!");
            return;
        }

        setIsCreating(true);
        toast.info("🧪 Criando ambiente de teste sandbox...");

        try {
            // 1. CRIAR LICENCIADO DE TESTE
            const testLicensee = await AppUser.create({
                full_name: "Licenciado Teste Sandbox",
                nickname: "LicenciadoTeste",
                email: "licenciado@teste.leilao",
                password: "teste123",
                phone: "(11) 99999-0001",
                role: "licensee",
                referral_code: "testelicenciado123",
                valora_pay_balance: 0,
                commission_balance: 0,
                indicated_clients_count: 0,
                network_bids_count: 0,
                career_level: "licenciado_aplicativo",
                points: 0,
                total_bids: 0,
                won_auctions: 0,
                avatar_color: "#FF6B6B",
                terms_accepted: true
            });

            toast.success("✅ Licenciado de teste criado!");

            // 2. CRIAR 3 USUÁRIOS DE TESTE (indicados pelo licenciado)
            const testClients = [];
            for (let i = 1; i <= 3; i++) {
                const client = await AppUser.create({
                    full_name: `Cliente Teste ${i}`,
                    nickname: `Teste${i}`,
                    email: `cliente${i}@teste.leilao`,
                    password: "teste123",
                    phone: `(11) 99999-000${i + 1}`,
                    role: "user",
                    referred_by_id: testLicensee.id,
                    valora_pay_balance: 1000, // 1000 VP para cada um testar
                    points: 0,
                    total_bids: 0,
                    won_auctions: 0,
                    avatar_color: ['#4ECDC4', '#45B7D1', '#96CEB4'][i - 1],
                    terms_accepted: true
                });
                testClients.push(client);
            }

            toast.success(`✅ ${testClients.length} clientes de teste criados!`);

            // 3. CRIAR LEILÃO DE TESTE (2 minutos de duração)
            const now = new Date();
            const endTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutos

            const testAuction = await Auction.create({
                title: "[TESTE] Fritadeira Air Fryer Sandbox",
                description: "🧪 LEILÃO DE TESTE - Este leilão é para testes e será excluído automaticamente. Teste lances, arremates e comissões sem medo!",
                image_urls: ["https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=400"],
                starting_price: 50.00,
                current_price: 50.00,
                increment: 5.00,
                buy_now_price: null,
                end_time: endTime.toISOString(),
                category: "eletrodomesticos",
                status: "active",
                seller_id: currentUser.id,
                seller_name: "[ADMIN] Teste",
                winner_id: null,
                winner_name: null,
                order_status: null
            });

            toast.success("✅ Leilão de teste criado (2 minutos)!");

            // 4. CRIAR MENSAGEM INICIAL DO SISTEMA
            await AuctionMessage.create({
                auction_id: testAuction.id,
                message_type: "start",
                content: "🧪 AMBIENTE DE TESTE ATIVO! Teste todos os recursos sem medo. Tudo será excluído após o teste.",
                sender_name: "Sistema Sandbox",
                is_system_message: true,
                timestamp: new Date().toISOString()
            });

            toast.success("🎉 Ambiente de teste criado com sucesso!");

            // Recarrega o ambiente E os leilões para o select
            await loadTestEnvironment();
            await loadAuctions();

        } catch (error) {
            console.error("Erro ao criar ambiente de teste:", error);
            toast.error("Falha ao criar ambiente de teste: " + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    // NOVA FUNÇÃO: Criar leilão adicional de teste
    const createAdditionalAuction = async () => {
        if (!currentUser) return;

        const confirm = window.confirm("Criar um novo leilão de teste? Duração: 2 minutos");
        if (!confirm) return;

        try {
            toast.info("Criando novo leilão de teste...");

            const now = new Date();
            const endTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutos

            const products = [
                { title: "Notebook Dell i5", image: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=400", price: 200 },
                { title: "Smart TV 50\"", image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400", price: 150 },
                { title: "iPhone 13", image: "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400", price: 300 },
            ];

            const randomProduct = products[Math.floor(Math.random() * products.length)];

            await Auction.create({
                title: `[TESTE] ${randomProduct.title}`,
                description: "🧪 LEILÃO DE TESTE - Este leilão é para testes e será excluído automaticamente.",
                image_urls: [randomProduct.image],
                starting_price: randomProduct.price,
                current_price: randomProduct.price,
                increment: 10.00,
                buy_now_price: null,
                end_time: endTime.toISOString(),
                category: "eletronicos",
                status: "active",
                seller_id: currentUser.id,
                seller_name: "[ADMIN] Teste",
                winner_id: null,
                winner_name: null,
                order_status: null
            });

            toast.success("✅ Novo leilão de teste criado!");
            await loadTestEnvironment(); // Refresh main environment state
            await loadAuctions(); // Refresh auctions for the select dropdown

        } catch (error) {
            console.error("Erro ao criar leilão adicional:", error);
            toast.error("Falha ao criar leilão: " + error.message);
        }
    };

    // NEW FUNCTION: Handle clearing auction messages
    const handleClearMessages = async () => {
        if (!selectedAuction) {
            toast.error("❌ Selecione um leilão primeiro!");
            return;
        }

        const confirm = window.confirm(
            `🗑️ Deletar TODAS as mensagens do leilão?\n\n"${selectedAuction.title}"\n\nEsta ação não pode ser desfeita!`
        );

        if (!confirm) return;

        setIsClearingMessages(true);
        try {
            const { data } = await clearAuctionMessages({ auction_id: selectedAuction.id });

            toast.success(`✅ ${data.deleted_count} mensagens deletadas com sucesso!`);

            // Recarrega a lista de leilões
            await loadAuctions();

        } catch (error) {
            console.error("❌ Erro ao limpar mensagens:", error);
            toast.error("❌ Erro ao limpar mensagens: " + error.message);
        } finally {
            setIsClearingMessages(false);
        }
    };

    const deleteTestEnvironment = async () => {
        const confirm = window.confirm(
            "⚠️ ATENÇÃO!\n\n" +
            "Isso vai excluir TODO o ambiente de teste:\n" +
            "- Todos os usuários de teste\n" +
            "- Licenciado de teste\n" +
            "- Leilões de teste\n" +
            "- Mensagens de teste\n\n" +
            "Os dados REAIS não serão afetados.\n\n" +
            "Confirma a exclusão?"
        );

        if (!confirm) return;

        setIsDeleting(true);
        toast.info("🗑️ Excluindo ambiente de teste...");

        try {
            let deleted = 0;

            // 1. Exclui mensagens de leilões de teste
            if (testEnvironment?.auctions) {
                for (const auction of testEnvironment.auctions) {
                    const messages = await AuctionMessage.filter({ auction_id: auction.id });
                    for (const msg of messages) {
                        await AuctionMessage.delete(msg.id);
                        deleted++;
                    }
                }
            }

            // 2. Exclui leilões de teste
            if (testEnvironment?.auctions) {
                for (const auction of testEnvironment.auctions) {
                    await Auction.delete(auction.id);
                    deleted++;
                }
            }

            // 3. Exclui usuários de teste
            if (testEnvironment?.users) {
                for (const user of testEnvironment.users) {
                    await AppUser.delete(user.id);
                    deleted++;
                }
            }

            toast.success(`✅ ${deleted} registros de teste excluídos!`);
            setTestEnvironment(null);
            setAuctions([]); // Clear auctions list
            setSelectedAuction(null); // Clear selected auction

        } catch (error) {
            console.error("Erro ao excluir ambiente de teste:", error);
            toast.error("Falha ao excluir ambiente de teste: " + error.message);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!authorized) return null;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
        );
    }

    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <Card className="bg-gray-800 border-gray-700 text-white max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                            Acesso Negado
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-300">
                            Apenas administradores podem acessar o ambiente de teste.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => navigate(createPageUrl("Home"))} className="w-full">
                            Voltar para Home
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                            <BeakerIcon className="w-8 h-8 text-purple-400" />
                            Ambiente de Teste Sandbox
                        </h1>
                        <p className="text-gray-400">
                            Crie um ambiente isolado para testar todas as funcionalidades sem afetar dados reais
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate(createPageUrl("Home"))}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                        Voltar
                    </Button>
                </div>

                {/* Alertas */}
                <Alert className="bg-purple-900/20 border-purple-500/50">
                    <BeakerIcon className="h-5 w-5 text-purple-400" />
                    <AlertTitle className="text-purple-300 font-bold">Ambiente de Teste Isolado</AlertTitle>
                    <AlertDescription className="text-purple-200">
                        Este ambiente é completamente separado dos dados reais. Você pode testar:
                        <ul className="list-disc ml-6 mt-2 space-y-1">
                            <li>Sistema de lances e arremates</li>
                            <li>Pontos e gamificação</li>
                            <li>Valora Pay (moeda virtual)</li>
                            <li>Comissões de licenciados</li>
                            <li>Indicações e rede</li>
                        </ul>
                    </AlertDescription>
                </Alert>

                {!testEnvironment ? (
                    /* Criar Novo Ambiente */
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-green-400 flex items-center gap-2">
                                <Play className="w-6 h-6" />
                                Criar Ambiente de Teste
                            </CardTitle>
                            <CardDescription className="text-gray-400">
                                Isso vai criar automaticamente:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <Users className="w-8 h-8 text-blue-400 mb-2" />
                                    <h3 className="font-bold mb-1">1 Licenciado</h3>
                                    <p className="text-sm text-gray-400">
                                        Com link de indicação e sistema de comissões ativo
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <Users className="w-8 h-8 text-green-400 mb-2" />
                                    <h3 className="font-bold mb-1">3 Clientes</h3>
                                    <p className="text-sm text-gray-400">
                                        Indicados pelo licenciado, cada um com 1000 VP
                                    </p>
                                </div>
                                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <Gavel className="w-8 h-8 text-orange-400 mb-2" />
                                    <h3 className="font-bold mb-1">1 Leilão Ativo</h3>
                                    <p className="text-sm text-gray-400">
                                        Duração de 2 minutos para testes rápidos
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={createTestEnvironment}
                                disabled={isCreating}
                                className="w-full bg-green-600 hover:bg-green-700"
                                size="lg"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Criando Ambiente...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 mr-2" />
                                        Criar Ambiente de Teste
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ) : (
                    /* Ambiente Ativo */
                    <>
                        <Alert className="bg-green-900/20 border-green-500/50">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <AlertTitle className="text-green-300 font-bold">✅ Ambiente Ativo</AlertTitle>
                            <AlertDescription className="text-green-200">
                                O ambiente de teste está rodando! Siga os passos abaixo para testar.
                            </AlertDescription>
                        </Alert>

                        {/* MELHORADO: Passo a Passo com Contraste Melhor */}
                        <Card className="bg-gray-800 border-yellow-500/50">
                            <CardHeader className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40">
                                <CardTitle className="text-yellow-300 text-xl">📋 Como Testar (Passo a Passo)</CardTitle>
                                <CardDescription className="text-yellow-200/80 font-semibold mt-2">
                                    ⚠️ IMPORTANTE: Os usuários já foram criados automaticamente! Role para baixo para ver as credenciais.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">1</div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 text-lg">Faça Logout da Sua Conta Admin</h4>
                                        <p className="text-gray-300">Clique no menu superior direito e faça logout para testar com os usuários de teste.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">2</div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 text-lg">Login com Usuário de Teste</h4>
                                        <p className="text-gray-300 mb-2">Use as credenciais na seção <strong className="text-green-400">"Credenciais de Acesso"</strong> abaixo ⬇️</p>
                                        <div className="bg-green-900/30 border border-green-500/50 rounded p-2 font-mono text-sm">
                                            <p className="text-green-300">📧 cliente1@teste.leilao</p>
                                            <p className="text-green-300">🔑 teste123</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="bg-orange-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">3</div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 text-lg">Entre no Leilão de Teste</h4>
                                        <p className="text-gray-300">Clique no botão <strong className="text-orange-400">"ENTRAR NO LEILÃO AGORA"</strong> na próxima seção ⬇️</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <div className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">4</div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 text-lg">Teste Tudo!</h4>
                                        <p className="text-gray-300">Dê lances, veja a IA narrando, aguarde o arremate e confira pontos/comissões.</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 bg-red-900/30 p-4 rounded-lg border border-red-500">
                                    <div className="bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0 text-lg">5</div>
                                    <div>
                                        <h4 className="font-bold text-white mb-2 text-lg">Excluir Ambiente</h4>
                                        <p className="text-gray-300">Ao terminar, role até o final e clique em <strong className="text-red-400">"Excluir Todo o Ambiente de Teste"</strong></p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Leilão Ativo - DESTACADO */}
                        {testEnvironment.auctions && testEnvironment.auctions.length > 0 && (
                            <Card className="bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-500/50 shadow-xl">
                                <CardHeader>
                                    <CardTitle className="text-orange-300 flex items-center gap-2 text-xl">
                                        <Gavel className="w-6 h-6 animate-pulse" />
                                        🔴 LEILÃO DE TESTE ATIVO AGORA
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="bg-gray-900/50 p-4 rounded-lg">
                                        <h3 className="font-bold text-xl mb-2 text-white">
                                            {testEnvironment.auctions[0].title}
                                        </h3>
                                        <p className="text-gray-300 text-sm mb-3">
                                            {testEnvironment.auctions[0].description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <Badge className="bg-green-600 text-white">
                                                💰 Preço: R$ {testEnvironment.auctions[0].current_price.toFixed(2)}
                                            </Badge>
                                            <Badge className="bg-blue-600 text-white">
                                                ⚡ Incremento: R$ {testEnvironment.auctions[0].increment.toFixed(2)}
                                            </Badge>
                                            <Badge className={testEnvironment.auctions[0].status === 'active' ? 'bg-orange-600 text-white animate-pulse' : 'bg-gray-600 text-white'}>
                                                {testEnvironment.auctions[0].status === 'active' ? '🔴 ATIVO' : '⚫ ENCERRADO'}
                                            </Badge>
                                        </div>
                                        <Link to={createPageUrl("AuctionRoom") + `?id=${testEnvironment.auctions[0].id}`}>
                                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg py-6" size="lg">
                                                <ExternalLink className="w-5 h-5 mr-2" />
                                                🎯 ENTRAR NO LEILÃO AGORA
                                            </Button>
                                        </Link>
                                    </div>

                                    <Button
                                        onClick={createAdditionalAuction}
                                        variant="outline"
                                        className="w-full border-orange-500 text-orange-400 hover:bg-orange-900/30"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Criar Mais um Leilão de Teste
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* NEW: Grid for Auction Management and Credentials */}
                        <div className="grid lg:grid-cols-2 gap-6">

                            {/* COLUNA 1: GERENCIAR LEILÕES */}
                            <Card className="bg-gray-800 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-green-400 flex items-center gap-2">
                                        <Zap className="w-5 h-5" />
                                        Gerenciar Leilões de Teste
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* SELECIONAR LEILÃO */}
                                    {auctions.length > 0 && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-gray-300">Selecionar Leilão para Testar / Gerenciar</Label>
                                                <Select
                                                    value={selectedAuction?.id || ""}
                                                    onValueChange={(value) => {
                                                        const auction = auctions.find(a => a.id === value);
                                                        setSelectedAuction(auction);
                                                    }}
                                                >
                                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                                        <SelectValue placeholder="Escolha um leilão de teste" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-gray-700 border-gray-600">
                                                        {auctions.map((auction) => {
                                                            const endTime = new Date(auction.end_time);
                                                            const now = new Date();
                                                            const remaining = Math.floor((endTime - now) / 1000);
                                                            const minutes = Math.floor(remaining / 60);
                                                            const seconds = remaining % 60;

                                                            return (
                                                                <SelectItem key={auction.id} value={auction.id} className="text-white hover:bg-gray-600">
                                                                    {auction.title} - {remaining > 0 ? `${minutes}m ${seconds}s` : 'Encerrado'}
                                                                </SelectItem>
                                                            );
                                                        })}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* AÇÕES DO LEILÃO SELECIONADO */}
                                            {selectedAuction && (
                                                <div className="space-y-3 pt-4 border-t border-gray-700">
                                                    {/* Example of other buttons that might exist here: */}
                                                    {/* <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                        Simular Lances (Em Breve)
                                                    </Button> */}

                                                    {/* 🗑️ BOTÃO DE LIMPAR MENSAGENS - BEM VISÍVEL */}
                                                    <Button
                                                        onClick={handleClearMessages}
                                                        disabled={isClearingMessages}
                                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                                                    >
                                                        {isClearingMessages ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                                                Limpando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Limpar Todas as Mensagens
                                                            </>
                                                        )}
                                                    </Button>

                                                    {/* You can add more actions here based on selectedAuction */}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!auctions.length && testEnvironment && (
                                        <p className="text-gray-400 text-center">Nenhum leilão de teste encontrado.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* COLUNA 2: Credenciais de Acesso */}
                            <div className="space-y-6"> {/* This column contains Credenciais and Stats */}
                                {/* Credenciais de Acesso - MELHORADO */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Licenciado */}
                                    <Card className="bg-gray-800 border-blue-500/50">
                                        <CardHeader className="bg-blue-900/30">
                                            <CardTitle className="text-blue-300 flex items-center gap-2">
                                                <Users className="w-5 h-5" />
                                                👑 Licenciado de Teste
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-4">
                                            <div>
                                                <span className="text-gray-400 text-sm font-bold">Email:</span>
                                                <p className="font-mono bg-gray-900 p-3 rounded text-blue-300 font-bold">licenciado@teste.leilao</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 text-sm font-bold">Senha:</span>
                                                <p className="font-mono bg-gray-900 p-3 rounded text-blue-300 font-bold">teste123</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 text-sm font-bold">Link de Indicação:</span>
                                                <p className="font-mono bg-gray-900 p-2 rounded text-xs break-all text-blue-300">
                                                    {window.location.origin}?ref=testelicenciado123
                                                </p>
                                            </div>
                                            <Link to={createPageUrl("Licensing")}>
                                                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Acessar Painel Licenciado
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>

                                    {/* Clientes */}
                                    <Card className="bg-gray-800 border-green-500/50">
                                        <CardHeader className="bg-green-900/30">
                                            <CardTitle className="text-green-300 flex items-center gap-2">
                                                <Users className="w-5 h-5" />
                                                👥 Clientes de Teste
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-4">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="bg-gray-900 p-3 rounded-lg border border-gray-700">
                                                    <h4 className="font-bold mb-2 text-white">Cliente Teste {i}</h4>
                                                    <div className="text-sm space-y-1">
                                                        <p><span className="text-gray-400 font-bold">Email:</span> <span className="font-mono text-green-300 font-bold">cliente{i}@teste.leilao</span></p>
                                                        <p><span className="text-gray-400 font-bold">Senha:</span> <span className="font-mono text-green-300 font-bold">teste123</span></p>
                                                        <Badge className="bg-green-600 mt-2">💰 1000 VP disponível</Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        {/* Estatísticas do Teste */}
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-purple-400 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Estatísticas do Ambiente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-gray-900 rounded-lg">
                                        <p className="text-3xl font-bold text-blue-400">{testEnvironment.users.length}</p>
                                        <p className="text-gray-400 text-sm">Usuários</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-900 rounded-lg">
                                        <p className="text-3xl font-bold text-green-400">{auctions.length}</p> {/* Use `auctions` state for current count */}
                                        <p className="text-gray-400 text-sm">Leilões</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-900 rounded-lg">
                                        <p className="text-3xl font-bold text-purple-400">3000</p>
                                        <p className="text-gray-400 text-sm">VP Total</p>
                                    </div>
                                    <div className="text-center p-4 bg-gray-900 rounded-lg">
                                        <p className="text-3xl font-bold text-orange-400">3</p>
                                        <p className="text-gray-400 text-sm">Indicados</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Botão de Exclusão */}
                        <Card className="bg-red-900/20 border-red-500/50">
                            <CardHeader>
                                <CardTitle className="text-red-400 flex items-center gap-2">
                                    <Trash2 className="w-5 h-5" />
                                    Limpar Ambiente de Teste
                                </CardTitle>
                                <CardDescription className="text-red-200">
                                    Isso vai excluir TODOS os dados de teste. Os dados reais não serão afetados.
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button
                                    onClick={deleteTestEnvironment}
                                    disabled={isDeleting}
                                    variant="destructive"
                                    className="w-full"
                                    size="lg"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Excluindo...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-5 h-5 mr-2" />
                                            Excluir Todo o Ambiente de Teste
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}