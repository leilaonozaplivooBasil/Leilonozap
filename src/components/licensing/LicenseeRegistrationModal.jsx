import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, CheckCircle, User as UserIcon, AlertCircle, Sparkles, Star } from 'lucide-react';

const generateReferralCode = (name) => {
    const namePart = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${namePart.toUpperCase()}${randomPart}`;
};

export default function LicenseeRegistrationModal({ onClose, onSuccess }) {
    // State for form inputs
    const [fullName, setFullName] = useState('');
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // 🆕 CONFIRMAÇÃO
    const [avatarPrompt, setAvatarPrompt] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    // State for UI interactions
    const [isRegistering, setIsRegistering] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(''); // Changed from 'error'
    const [success, setSuccess] = useState(false);

    // Dummy avatar generation function
    const generateAvatar = async () => {
        if (!avatarPrompt.trim()) {
            setErrorMessage("Por favor, digite uma descrição para o avatar.");
            return;
        }
        setErrorMessage('');
        setIsGenerating(true);
        setAvatarUrl(''); // Clear previous avatar
        try {
            // Simulate API call to generate avatar
            await new Promise(resolve => setTimeout(resolve, 2000));
            // In a real application, you would call an AI service here
            // For now, we use a placeholder image based on the prompt or a random one
            const dummyAvatarSeed = encodeURIComponent(avatarPrompt.trim().substring(0, 50));
            setAvatarUrl(`https://api.dicebear.com/7.x/identicon/svg?seed=${dummyAvatarSeed}&backgroundColor=000000,c0aede,d1d4f9,b6e3f4,ffd5dc,ffdfbf`);
            // setAvatarUrl(`https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`);
        } catch (error) {
            console.error("Erro ao gerar avatar:", error);
            setErrorMessage("Não foi possível gerar o avatar. Tente novamente.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!fullName || !nickname || !email || !phone || !password || !confirmPassword) {
            setErrorMessage("Por favor, preencha todos os campos obrigatórios (*).");
            return;
        }
        if (password.length < 6) {
            setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
            return;
        }
        
        // 🆕 VALIDAÇÃO DE CONFIRMAÇÃO
        if (password !== confirmPassword) {
            setErrorMessage("❌ As senhas não coincidem. Digite novamente.");
            return;
        }
        
        setIsRegistering(true);
        setErrorMessage('');
        
        try {
            const normalizedEmail = email.toLowerCase().trim();
            
            console.log("🔍 [LICENCIADO] Verificando se email já existe...");
            
            let existingUsers;
            try {
                existingUsers = await AppUser.filter({ email: normalizedEmail });
            } catch (error) {
                console.error("Erro ao verificar email:", error);
                setErrorMessage("❌ Erro de conexão. Verifique sua internet e tente novamente.");
                setIsRegistering(false);
                return;
            }
            
            if (existingUsers.length > 0) {
                console.log("❌ Email já cadastrado:", existingUsers[0]);
                setErrorMessage("❌ Este email já está cadastrado. Tente fazer login ou use outro email.");
                setIsRegistering(false);
                return;
            }

            // 🏢 LÓGICA DE INDICAÇÃO COM LICENCIADO SITE
            let referredById = null;
            const incomingReferralCode = sessionStorage.getItem('referralCode');
            
            if (incomingReferralCode) {
                console.log(`[LICENCIADO] Código de indicação encontrado: ${incomingReferralCode}`);
                try {
                    const licensees = await AppUser.filter({ referral_code: incomingReferralCode });
                    if (licensees.length > 0) {
                        const referrer = licensees[0];
                        referredById = referrer.id;
                        console.log(`✅ Indicado por: ${referrer.full_name}`);
                    } else {
                        console.log(`⚠️ Código de indicação "${incomingReferralCode}" não encontrado.`);
                    }
                } catch (error) {
                    console.warn("Erro ao buscar indicador:", error);
                }
            }
            
            // 🏢 SE NÃO TEM INDICAÇÃO, USA O "LICENCIADO SITE"
            if (!referredById) {
                console.log("🏢 [LICENCIADO] Sem código de indicação. Buscando Licenciado Site...");
                
                try {
                    let siteLicensees = await AppUser.filter({ email: "site@leilaonozap.com" });
                    let siteLicensee;
                    
                    if (siteLicensees.length > 0) {
                        siteLicensee = siteLicensees[0];
                        referredById = siteLicensee.id;
                        console.log(`✅ Vinculado ao Licenciado Site: ${siteLicensee.full_name}`);
                    } else {
                        // 🆕 CRIA O LICENCIADO SITE SE NÃO EXISTIR
                        console.log("🏗️ [LICENCIADO] Criando Licenciado Site...");
                        
                        siteLicensee = await AppUser.create({
                            full_name: "Leilão NoZap - Site Oficial",
                            nickname: "Site Oficial",
                            email: "site@leilaonozap.com",
                            password: "SITE_ADMIN_2025_SECURE", // This should ideally be hashed
                            phone: "(21) 00000-0000",
                            role: "licensee",
                            referral_code: "SITE2025",
                            terms_accepted: true,
                            avatar_color: "#22c55e",
                            points: 0,
                            total_bids: 0,
                            won_auctions: 0,
                            valora_pay_balance: 0,
                            commission_balance: 0,
                            indicated_clients_count: 0,
                            network_bids_count: 0,
                            career_levels: ["licenciado_aplicativo"],
                            primary_career_level: "licenciado_aplicativo"
                        });
                        
                        referredById = siteLicensee.id;
                        console.log(`✅ Licenciado Site criado: ${siteLicensee.id}`);
                    }
                } catch (error) {
                    console.error("❌ Erro ao criar/buscar Licenciado Site:", error);
                    setErrorMessage("❌ Erro interno ao processar indicação. Tente novamente.");
                    setIsRegistering(false);
                    return;
                }
            }

            const generatedCode = generateReferralCode(fullName);
            
            console.log("✅ [LICENCIADO] Criando novo licenciado...");
            const newUserPayload = {
                full_name: fullName.trim(),
                nickname: nickname.trim(),
                email: normalizedEmail,
                phone: phone.trim(),
                password: password,
                role: 'licensee',
                career_levels: ['licenciado_aplicativo'], // Updated to array
                primary_career_level: 'licenciado_aplicativo', // New field
                referral_code: generatedCode, // This is the new user's own referral code
                referred_by_id: referredById, // 🏢 SEMPRE TEM INDICAÇÃO AGORA!
                valora_pay_balance: 0,
                commission_balance: 0,
                indicated_clients_count: 0,
                network_bids_count: 0,
                points: 0,
                total_bids: 0,
                won_auctions: 0,
                terms_accepted: true,
                avatar_color: '#' + Math.floor(Math.random()*16777215).toString(16),
                avatar_url: avatarUrl || null, // Use generated avatar or null if none
            };

            const createdUser = await AppUser.create(newUserPayload);
            console.log("✅ Licenciado criado:", createdUser);

            if (!createdUser || !createdUser.id) {
                throw new Error("A criação do usuário falhou.");
            }

            localStorage.setItem('currentUser', JSON.stringify(createdUser));
            sessionStorage.setItem('isLoggedIn', 'true');
            
            setSuccess(true);
            
            // ✅ SEM RELOAD! Transição suave após 1.5s
            setTimeout(() => {
                onSuccess(createdUser);
            }, 1500);

        } catch (err) {
            console.error("❌ ERRO NO CADASTRO:", err);
            const errorMsg = err?.message || "Erro desconhecido";
            setErrorMessage("❌ Erro ao realizar cadastro: " + errorMsg);
            setIsRegistering(false);
        }
    };

    if (success) {
        return (
             <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[2001] p-4 animate-in fade-in-0">
                <Card className="w-full max-w-md bg-gray-800 border-green-500 text-white relative text-center">
                    <CardHeader>
                        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <CardTitle className="text-green-400">Sucesso!</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-300">Sua conta de licenciado foi criada. Você será redirecionado para o seu painel.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-gray-900/80 flex items-center justify-center z-[2001] p-4 animate-in fade-in-0 overflow-y-auto">
            <Card className="w-full max-w-lg bg-gray-800 border-gray-700 text-white relative my-8">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className="absolute top-2 right-2 text-gray-400 z-10"
                    disabled={isRegistering}
                >
                    <X className="w-4 h-4" />
                </Button>

                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                        <UserIcon className="w-6 h-6" />
                        Cadastro de Licenciado
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-2">
                        Preencha seus dados para se tornar um Licenciado do Leilão NoZap
                    </p>
                </CardHeader>

                <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                        {errorMessage && (
                            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <p className="text-red-300 text-sm">{errorMessage}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fullName" className="text-gray-300">Nome Completo *</Label>
                                <Input 
                                    id="fullName" 
                                    value={fullName} 
                                    onChange={(e) => setFullName(e.target.value)} 
                                    placeholder="Seu nome completo" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    disabled={isRegistering}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="nickname" className="text-gray-300">Apelido *</Label>
                                <Input 
                                    id="nickname" 
                                    value={nickname} 
                                    onChange={(e) => setNickname(e.target.value)} 
                                    placeholder="Como quer ser chamado" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    disabled={isRegistering}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="email" className="text-gray-300">E-mail *</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    placeholder="seu@email.com" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    disabled={isRegistering}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="phone" className="text-gray-300">Telefone/WhatsApp *</Label>
                                <Input 
                                    id="phone" 
                                    type="tel" 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    placeholder="(11) 99999-9999" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    disabled={isRegistering}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-gray-300">Crie uma Senha *</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Mínimo 6 caracteres" 
                                className="bg-gray-700 border-gray-600 text-white"
                                disabled={isRegistering}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword" className="text-gray-300">Confirme a Senha *</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                placeholder="Digite a senha novamente" 
                                className="bg-gray-700 border-gray-600 text-white"
                                disabled={isRegistering}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="avatarPrompt" className="text-gray-300">Descreva seu Avatar (Opcional)</Label>
                            <div className="flex gap-2">
                                <Input 
                                    id="avatarPrompt" 
                                    value={avatarPrompt} 
                                    onChange={(e) => setAvatarPrompt(e.target.value)} 
                                    placeholder="Ex: empresário de terno" 
                                    className="bg-gray-700 border-gray-600 text-white"
                                    disabled={isGenerating || isRegistering}
                                />
                                <Button 
                                    type="button" // Important to prevent form submission
                                    onClick={generateAvatar} 
                                    disabled={isGenerating || isRegistering || !avatarPrompt.trim()} 
                                    className="bg-green-600 hover:bg-green-700"
                                    size="icon"
                                >
                                    {isGenerating ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {(isGenerating || avatarUrl) && (
                            <div className="flex justify-center items-center h-24 bg-gray-700 rounded-lg">
                                {isGenerating && <div className="text-gray-400">Gerando avatar...</div>}
                                {avatarUrl && !isGenerating && <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-lg object-cover" />}
                            </div>
                        )}
                    </CardContent>

                    <CardFooter>
                        <Button 
                            type="submit" 
                            disabled={isRegistering || !fullName || !nickname || !email || !phone || !password || !confirmPassword}
                            className="w-full bg-green-600 hover:bg-green-700"
                            style={{backgroundColor: '#1DB24A'}}
                        >
                            {isRegistering ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Criando conta...
                                </>
                            ) : (
                                <>
                                    <Star className="w-4 h-4 mr-2" />
                                    Criar Conta de Licenciado
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}