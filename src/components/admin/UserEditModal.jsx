import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Upload, ClipboardList, UserRound, TrendingUp, Trophy, Landmark, Network, Star, Briefcase } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
// P17/18/19: usa a lista CANÔNICA de cargos (bate com o card oficial e com o painel do usuário).
import { CAREER_LEVELS } from '@/lib/careerLevels';
import {
    listExecutives,
    readExecutiveOwner,
    buildExecutiveUpdate,
    resolveEffectiveExecutive,
    requiresExecutive,
} from '@/lib/executiveStructure';

const AppUser = base44.entities.AppUser;

export default function UserEditModal({ user, isOpen, onClose, onSuccess, allUsers = [] }) {
    const [userData, setUserData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    
    // Estados para níveis de carreira
    const [selectedLevels, setSelectedLevels] = useState([]);
    const [primaryLevel, setPrimaryLevel] = useState('');
    const [displayFirstName, setDisplayFirstName] = useState('');
    const [displayLastName, setDisplayLastName] = useState('');
    const [referrerId, setReferrerId] = useState('');
    const [avatarUrlInput, setAvatarUrlInput] = useState('');
    const [executiveOwnerId, setExecutiveOwnerId] = useState('');
    const [executivePinned, setExecutivePinned] = useState(false);

    useEffect(() => {
        if (user) {
            setUserData({ ...user });
            
            // Carregar níveis de carreira
            const validLevelIds = CAREER_LEVELS.map(l => l.id);
            const rawLevels = Array.isArray(user.career_levels) 
                ? user.career_levels 
                : (user.career_levels ? [user.career_levels] : ['usuario']);
            const userLevels = rawLevels.filter(l => validLevelIds.includes(l));
            setSelectedLevels(userLevels.length > 0 ? userLevels : ['usuario']);
            
            // Carregar nível principal — só aceita IDs que existem no CAREER_LEVELS
            const validPrimary = user.primary_career_level && validLevelIds.includes(user.primary_career_level)
                ? user.primary_career_level
                : (userLevels[0] || 'usuario');
            setPrimaryLevel(validPrimary);
            
            // Carregar nomes para exibição
            const nameParts = user.full_name.split(' ').filter(part => part.trim() !== '');
            setDisplayFirstName(
                user.display_first_name && user.display_first_name.trim() !== '' 
                    ? user.display_first_name 
                    : (nameParts[0] || '')
            );
            setDisplayLastName(
                user.display_last_name && user.display_last_name.trim() !== '' 
                    ? user.display_last_name 
                    : (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '')
            );
            setReferrerId(user.referred_by_id || '');
            const own = readExecutiveOwner(user);
            setExecutiveOwnerId(own.id || '');
            setExecutivePinned(own.pinned);
        }
    }, [user]);

    if (!userData) return null;

    const handleInputChange = (field, value) => {
        setUserData(prev => ({ ...prev, [field]: value }));
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingAvatar(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            if (!file_url) throw new Error('o servidor não devolveu a URL do arquivo');
            setUserData(prev => ({ ...prev, avatar_url: file_url }));
            toast.success('Foto anexada — salve para confirmar.');
        } catch (error) {
            console.error("Erro ao fazer upload:", error);
            toast.error('Erro ao enviar o arquivo: ' + (error?.message || 'falha'));
        } finally {
            setIsUploadingAvatar(false);
            e.target.value = '';
        }
    };

    // Foto por URL: cola o link e aplica direto no perfil
    const applyAvatarUrl = () => {
        const url = (avatarUrlInput || '').trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) {
            toast.error('A URL precisa começar com http:// ou https://');
            return;
        }
        setUserData(prev => ({ ...prev, avatar_url: url }));
        setAvatarUrlInput('');
        toast.success('Foto por URL aplicada — salve para confirmar.');
    };

    const toggleLevel = (levelId) => {
        setSelectedLevels(prev => {
            const newLevels = prev.includes(levelId) 
                ? prev.filter(l => l !== levelId) 
                : [...prev, levelId];
            
            // Ajustar nível principal se necessário
            if (levelId === primaryLevel && !newLevels.includes(levelId)) {
                setPrimaryLevel(newLevels[0] || 'usuario');
            } else if (newLevels.length === 0) {
                setPrimaryLevel('usuario');
            } else if (!newLevels.includes(primaryLevel)) {
                setPrimaryLevel(newLevels[0]);
            }
            
            return newLevels;
        });
    };

    const handleSave = async () => {
        if (!userData.full_name || !userData.email) {
            toast.error("Nome e email são obrigatórios!");
            return;
        }

        if (selectedLevels.length === 0) {
            toast.error("Selecione pelo menos um nível de carreira!");
            return;
        }

        if (!selectedLevels.includes(primaryLevel)) {
            toast.error("O nível principal deve estar entre os selecionados!");
            return;
        }

        setIsSaving(true);
        try {
            const newReferrerId = referrerId && String(referrerId).trim() !== '' ? referrerId : null;
            if (newReferrerId && newReferrerId === user.id) {
                toast.error("Um usuário não pode indicar a si mesmo.");
                setIsSaving(false);
                return;
            }
            // Admin que está executando a edição
            let actorId = null;
            try { actorId = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || null; } catch { actorId = null; }

            // Verifica se o ator é admin (leitura direta via Supabase — AppUser tem RLS null)
            if (!actorId) {
                throw new Error('Sessão expirada. Faça login novamente como admin.');
            }
            const actorRows = await AppUser.filter({ id: actorId });
            const actor = actorRows && actorRows[0];
            if (!actor || !['admin', 'super_admin'].includes(actor.role)) {
                throw new Error('Apenas admin pode editar usuários.');
            }

            // Se mudou indicador, limpa o indicador antigo do usuário que apontava para este
            if (newReferrerId) {
                const refUser = (Array.isArray(allUsers) ? allUsers : []).find(u => u.id === newReferrerId);
                if (refUser && refUser.referred_by_id === user.id) {
                    await AppUser.update(refUser.id, { referred_by_id: '' });
                }
            }

            const updatePayload = {
                full_name: userData.full_name,
                nickname: userData.nickname || '',
                email: userData.email,
                phone: userData.phone || '',
                role: userData.role,
                career_levels: selectedLevels,
                primary_career_level: primaryLevel,
                display_first_name: displayFirstName.trim() || null,
                display_last_name: displayLastName.trim() || null,
                avatar_url: userData.avatar_url || null,
                // Carteira do Sócio Executivo (1% sobre a própria estrutura)
                ...buildExecutiveUpdate(executiveOwnerId || null, { pinned: executivePinned }),
            };
            if (newReferrerId) {
                updatePayload.referred_by_id = newReferrerId;
            }

            // Update direto via Supabase (AppUser tem RLS null — funciona com anon key)
            await AppUser.update(user.id, updatePayload);

            // Confirma relendo o registro do banco (o retorno do update pode vir incompleto)
            const confirmRows = await AppUser.filter({ id: user.id });
            const confirmed = confirmRows && confirmRows[0];
            if (!confirmed || confirmed.primary_career_level !== primaryLevel) {
                throw new Error('O servidor não confirmou a alteração da função principal. Tente novamente.');
            }

            const levelNames = selectedLevels.map(id => CAREER_LEVELS.find(l => l.id === id)?.name).join(', ');
            const primaryName = CAREER_LEVELS.find(l => l.id === primaryLevel)?.name;

            toast.success(`Usuário atualizado!\nCargos: ${levelNames}\nPrincipal: ${primaryName}`);
            onSuccess(result.user);
            onClose();
        } catch (error) {
            console.error("Failed to update user:", error);
            toast.error(`Não foi salvo: ${error.message || 'erro desconhecido'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-5xl bg-gray-800 border-gray-700 text-white max-h-[90vh] md:aspect-video md:max-h-[86vh] p-0 gap-0 flex flex-col overflow-hidden">
                <DialogHeader className="px-6 pt-5 pb-3 border-b border-gray-700 flex-shrink-0">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-green-400" />
                        Editar Usuário: {user.full_name}
                    </DialogTitle>
                </DialogHeader>

                {/* duas colunas no desktop para caber no 16:9 sem virar um corredor */}
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[400px_1fr] overflow-hidden">
                  {/* ---- coluna esquerda: identidade e vínculo (rola sozinha) ---- */}
                  <div className="overflow-y-auto px-5 py-4 space-y-5 md:border-r border-gray-700">
                    {/* DADOS BÁSICOS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-green-400 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" />Dados Básicos</h3>
                        
                        {/* AVATAR UPLOAD */}
                        <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600 space-y-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full border-2 border-gray-600 overflow-hidden flex-shrink-0 bg-gray-700 flex items-center justify-center">
                                {userData.avatar_url ? (
                                    <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-400 text-xs text-center px-1">Sem foto</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <Label htmlFor="avatar-upload" className="text-[11px] text-gray-400 block leading-tight">
                                    Foto de perfil — arquivo ou URL
                                </Label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    onChange={handleAvatarUpload}
                                    disabled={isUploadingAvatar}
                                    className="hidden"
                                />
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-700"
                                        onClick={() => document.getElementById('avatar-upload')?.click()}
                                        disabled={isUploadingAvatar}
                                    >
                                        {isUploadingAvatar
                                            ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Enviando…</>
                                            : <><Upload className="w-3 h-3 mr-2" />Escolher arquivo</>}
                                    </Button>
                                    {userData.avatar_url && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-400 hover:bg-red-500/15"
                                            onClick={() => setUserData(prev => ({ ...prev, avatar_url: null }))}
                                        >
                                            Remover foto
                                        </Button>
                                    )}
                                </div>
                              </div>
                            </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={avatarUrlInput}
                                        onChange={(e) => setAvatarUrlInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyAvatarUrl(); } }}
                                        placeholder="https://… cole o link da imagem"
                                        className="bg-gray-700 border-gray-600 text-white h-8 text-xs"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-gray-600 text-gray-300 hover:bg-gray-700 flex-shrink-0"
                                        onClick={applyAvatarUrl}
                                        disabled={!avatarUrlInput.trim()}
                                    >
                                        Aplicar
                                    </Button>
                                </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-[12px] text-gray-400">Nome</Label>
                            <Input 
                                id="name" 
                                value={userData.full_name} 
                                onChange={(e) => handleInputChange('full_name', e.target.value)} 
                                className="bg-gray-700 border-gray-600 text-white" 
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="nickname" className="text-[12px] text-gray-400">Apelido</Label>
                            <Input 
                                id="nickname" 
                                value={userData.nickname || ''} 
                                onChange={(e) => handleInputChange('nickname', e.target.value)} 
                                className="bg-gray-700 border-gray-600 text-white" 
                                placeholder="Nome usado nos lances"
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[12px] text-gray-400">Email</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                value={userData.email} 
                                onChange={(e) => handleInputChange('email', e.target.value)} 
                                className="bg-gray-700 border-gray-600 text-white" 
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-[12px] text-gray-400">Telefone</Label>
                            <Input 
                                id="phone" 
                                value={userData.phone || ''} 
                                onChange={(e) => handleInputChange('phone', e.target.value)} 
                                className="bg-gray-700 border-gray-600 text-white" 
                                placeholder="(00) 00000-0000"
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <Label htmlFor="role" className="text-[12px] text-gray-400">Permissão</Label>
                            <Select value={userData.role} onValueChange={(value) => handleInputChange('role', value)}>
                                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                    <SelectValue placeholder="Selecione a permissão" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="user">Usuário Comum</SelectItem>
                                    <SelectItem value="licensee">Licenciado</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* NOMES PARA PAINEL */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-1.5"><UserRound className="w-3.5 h-3.5" />Nomes para Exibição no Painel</h3>
                        
                        <div className="grid grid-cols-2 gap-3 p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                            <div>
                                <Label htmlFor="firstName" className="text-xs text-gray-400 mb-1 block">
                                    Nome para Painel
                                </Label>
                                <Input
                                    id="firstName"
                                    value={displayFirstName}
                                    onChange={(e) => setDisplayFirstName(e.target.value)}
                                    placeholder="Ex: Geovani"
                                    className="bg-gray-700 border-gray-600 text-white text-sm"
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName" className="text-xs text-gray-400 mb-1 block">
                                    Sobrenome para Painel
                                </Label>
                                <Input
                                    id="lastName"
                                    value={displayLastName}
                                    onChange={(e) => setDisplayLastName(e.target.value)}
                                    placeholder="Ex: Silva"
                                    className="bg-gray-700 border-gray-600 text-white text-sm"
                                />
                            </div>
                            <p className="col-span-2 text-xs text-gray-400 italic">
                                Como aparecerá: "<strong className="text-white">{displayFirstName} {displayLastName}</strong>"
                            </p>
                        </div>
                    </div>

                    {/* ESTRUTURA DE NEGÓCIO — carteira do Sócio Executivo */}
                    {(() => {
                        const executivos = listExecutives(allUsers);
                        const byId = new Map((Array.isArray(allUsers) ? allUsers : []).map(u => [u.id, u]));
                        const efetivo = resolveEffectiveExecutive(
                            { ...user, executive_owner_id: executiveOwnerId || null },
                            byId
                        );
                        const nomeEfetivo = efetivo.executiveId
                            ? (byId.get(efetivo.executiveId)?.full_name || '—')
                            : null;
                        const precisa = requiresExecutive(user);
                        return (
                            <div className="space-y-3 pt-4 border-t border-gray-700">
                                <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Estrutura de Negócio (Sócio Executivo)
                                </h3>
                                <p className="text-[11px] text-gray-400 leading-snug">
                                    Define para quem vai o <strong className="text-purple-300">1% da estrutura</strong>.
                                    É independente de quem indicou. Em branco, herda de quem está acima na linha.
                                </p>

                                <div className="space-y-1.5">
                                    <Label className="text-[12px] text-gray-400">Executivo responsável</Label>
                                    <Select
                                        value={executiveOwnerId || 'herdar'}
                                        onValueChange={(v) => setExecutiveOwnerId(v === 'herdar' ? '' : v)}
                                    >
                                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                            <SelectValue placeholder="Herdar de quem indicou" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-72">
                                            <SelectItem value="herdar">Herdar de quem indicou (automático)</SelectItem>
                                            {executivos.map(e => (
                                                <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <label className="flex items-start gap-2 cursor-pointer">
                                    <Checkbox
                                        checked={executivePinned}
                                        onCheckedChange={(v) => setExecutivePinned(!!v)}
                                        disabled={!executiveOwnerId}
                                        className="mt-0.5"
                                    />
                                    <span className="text-[11.5px] text-gray-300 leading-snug">
                                        Fixar esta escolha
                                        <span className="block text-[10.5px] text-gray-500">
                                            protege contra mudanças em massa — use quando for negociação específica
                                        </span>
                                    </span>
                                </label>

                                <div className={`rounded-lg border p-2.5 text-[11.5px] ${
                                    efetivo.executiveId
                                        ? 'border-purple-500/25 bg-purple-900/12 text-gray-300'
                                        : 'border-amber-500/40 bg-amber-900/15 text-amber-300'
                                }`}>
                                    {efetivo.executiveId ? (
                                        <>Vale hoje: <strong className="text-purple-300">{nomeEfetivo}</strong>
                                        <span className="text-gray-500"> ({efetivo.source}{efetivo.from ? ` de ${efetivo.from.full_name}` : ''})</span></>
                                    ) : precisa ? (
                                        <>Sem executivo definido — o 1% desta estrutura fica sem destino.</>
                                    ) : (
                                        <>Sem executivo (este cargo não exige).</>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* HIERARQUIA / INDICADOR */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" />Hierarquia (Sistema de Alavancagem)</h3>
                        <div className="space-y-1.5">
                            <Label className="text-[12px] text-gray-400">Indicador</Label>
                            <div>
                                <Select value={referrerId} onValueChange={setReferrerId}>
                                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                                        <SelectValue placeholder="Selecione o indicador (opcional)" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-72">
                                        <SelectItem value={null}>Sem indicação</SelectItem>
                                        {(Array.isArray(allUsers) ? allUsers.filter(u => u.id !== user.id) : []).map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                {u.full_name} — {u.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                  </div>

                  {/* ---- coluna direita: plano de carreira (rola sozinha) ---- */}
                  <div className="overflow-y-auto px-5 py-4">
                    {/* NÍVEIS DE CARREIRA */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" />Níveis de Carreira</h3>
                        
                        <p className="text-xs text-gray-400">Selecione um ou mais cargos:</p>

                        {/* Regra de negócio do plano — a equipe trabalha entendendo a função */}
                        <div className="bg-emerald-900/15 border border-emerald-500/25 rounded-lg p-3 text-[11px] leading-relaxed text-gray-300">
                            <p className="font-bold text-emerald-300 uppercase tracking-wide text-[10px] mb-1">Distribuição do plano — 30% por venda</p>
                            <p><span className="text-white font-semibold">20% CADEIA</span> (usuário → distribuidor): venda direta + rebate por nível cadastrado.</p>
                            <p><span className="text-white font-semibold">10% TOPO</span>: CEO 3% · Livoo Live 2% · Embaixador 1% · Sócio Executivo 1% (sobre a própria estrutura, não é pool) · Conselheiros 1% pool · Fundadores 1% pool · Dir. Operacional 0,5% pool · Dir. Executiva 0,5% pool.</p>
                            <p className="text-gray-500 mt-1">Todo pagamento se origina desta configuração — cargo certo aqui = comissão certa no ato do pagamento.</p>
                        </div>
                        
                        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                            {/* P18/19: 2 categorias — Institucional (TTT, topo) × Rede (plano de carreira) */}
                            {[
                                { bloco: 'diretor', label: 'Cargos Institucionais (Diretoria / TTT)', icon: Landmark },
                                { bloco: 'rede', label: 'Cargos de Rede (Plano de Carreira)', icon: Network },
                            ].map((grp) => (
                                <div key={grp.bloco} className="space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-300">{grp.label}</p>
                                    {CAREER_LEVELS.filter((l) => l.bloco === grp.bloco).slice().reverse().map((level) => {
                                        const isSelected = selectedLevels.includes(level.id);
                                        const isPrimary = primaryLevel === level.id;
                                        return (
                                            <div key={level.id} className="p-3 rounded-lg hover:bg-gray-700/50 transition-colors border border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <Checkbox
                                                            id={`level-${level.id}`}
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleLevel(level.id)}
                                                            className="border-gray-600"
                                                        />
                                                        <label htmlFor={`level-${level.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                                                            <Badge className={`${level.color} text-white text-xs`}>{level.name}</Badge>
                                                        </label>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="flex items-center gap-2">
                                                            <label className="text-xs text-gray-400">Principal</label>
                                                            <input
                                                                type="radio"
                                                                name="primary"
                                                                checked={isPrimary}
                                                                onChange={() => setPrimaryLevel(level.id)}
                                                                className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 focus:ring-green-500"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                {level.regra && (
                                                    <p className="text-[11px] text-gray-400 leading-snug mt-1.5 ml-7">
                                                        {level.regra}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                        
                        {selectedLevels.length > 0 && (
                            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                <p className="text-sm text-green-400">
                                    <Star className="w-3.5 h-3.5 inline mr-1" />Função Principal: <strong>{CAREER_LEVELS.find(l => l.id === primaryLevel)?.name}</strong>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Esta será a função exibida no Plano de Carreira
                                </p>
                            </div>
                        )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-gray-700 flex-shrink-0 bg-gray-800">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary" className="bg-gray-700 text-white">
                            Cancelar
                        </Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Salvar Todas Alterações ({selectedLevels.length} cargos)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}