import React, { useState } from 'react';
import { X, UserPlus, Search, ArrowLeft, Pencil, Mail, CheckCircle2, AlertCircle, Loader2, ChevronRight, KeyRound } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const Arrematante = base44.entities.Arrematante;

const maskCPF = (cpf) => {
    const d = (cpf || '').replace(/\D/g, '');
    if (d.length !== 11) return cpf || '—';
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

const AVATAR_COLORS = ['bg-rose-600', 'bg-amber-600', 'bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-indigo-600'];
const avatarColor = (name) => AVATAR_COLORS[(name || 'A').charCodeAt(0) % AVATAR_COLORS.length];

const PIX_LABELS = { cpf: 'CPF', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Aleatória' };

const emptyForm = { full_name: '', cpf: '', city: '', state: '', email: '', phone: '', pix_key: '', pix_key_type: 'cpf', is_active: true, notes: '' };

export default function ArrematantesModal({ isOpen, onClose, arrematantes, onRefresh }) {
    const [busca, setBusca] = useState('');
    const [screen, setScreen] = useState('lista'); // 'lista' | 'perfil' | 'form'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailData, setEmailData] = useState({ subject: '', body: '' });
    const [sendingEmail, setSendingEmail] = useState(false);
    const [sendingAccess, setSendingAccess] = useState(false);

    if (!isOpen) return null;

    const filtrados = arrematantes.filter(a =>
        !busca || a.full_name?.toLowerCase().includes(busca.toLowerCase())
    );

    const openPerfil = (a) => { setSelected(a); setScreen('perfil'); };
    const openNovo = () => { setForm(emptyForm); setSelected(null); setScreen('form'); };
    const openEditar = (a) => { setForm({ ...emptyForm, ...a }); setSelected(a); setScreen('form'); };
    const voltarLista = () => { setScreen('lista'); setBusca(''); };
    const voltarPerfil = () => { setScreen('perfil'); };

    const handleSave = async () => {
        if (!form.full_name) { toast.error('Nome obrigatório.'); return; }
        setIsSaving(true);
        try {
            const payload = {
                ...form,
                cpf: (form.cpf || '').replace(/\D/g, ''),
                state: (form.state || '').toUpperCase(),
            };
            if (selected?.id) {
                await Arrematante.update(selected.id, payload);
                setSelected({ ...selected, ...payload });
                toast.success('Arrematante atualizado.');
            } else {
                await Arrematante.create(payload);
                toast.success('Arrematante cadastrado.');
            }
            onRefresh();
            if (selected?.id) {
                const updated = { ...selected, ...payload };
                setSelected(updated);
                setScreen('perfil');
            } else {
                voltarLista();
            }
        } catch (err) {
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendEmail = async () => {
        if (!selected?.email) { toast.error('Arrematante sem e-mail.'); return; }
        if (!emailData.subject || !emailData.body) { toast.error('Preencha assunto e corpo.'); return; }
        setSendingEmail(true);
        try {
            await base44.integrations.Core.SendEmail({
                to: selected.email,
                subject: emailData.subject,
                body: emailData.body,
            });
            toast.success('E-mail enviado!');
            setShowEmailModal(false);
            setEmailData({ subject: '', body: '' });
        } catch (err) {
            toast.error('Erro ao enviar e-mail: ' + err.message);
        } finally {
            setSendingEmail(false);
        }
    };

    const handleEnviarAcesso = async () => {
        alert('Enviando para: ' + selected?.email);
        if (!selected?.email) { 
            toast.error('Arrematante sem e-mail cadastrado.'); 
            return; 
        }
        if (!window.confirm(`Enviar acesso para ${selected.full_name} (${selected.email})?`)) return;
        setSendingAccess(true);
        try {
            const senhaTemp = 'Acesso@' + Math.floor(1000 + Math.random() * 9000);
            await base44.integrations.Core.SendEmail({
                to: selected.email,
                subject: 'Seu acesso ao Leilão NoZap',
                body: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;background:#0d1117;color:#e6edf3;padding:32px;border-radius:12px;">
  <div style="text-align:center;margin-bottom:24px;">
    <h1 style="color:#f59e0b;font-size:22px;margin:0;">🏷️ Leilão NoZap</h1>
    <p style="color:#8b949e;font-size:13px;margin:4px 0 0;">Plataforma Oficial de Leilões</p>
  </div>
  <h2 style="font-size:18px;margin-bottom:8px;">Olá, ${selected.full_name}! 👋</h2>
  <p style="color:#8b949e;margin-bottom:24px;">Seu acesso à plataforma foi criado. Use as credenciais abaixo para entrar:</p>
  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:24px;">
    <p style="margin:0 0 12px;"><span style="color:#8b949e;">📧 E-mail:</span><br><strong style="color:#f59e0b;">${selected.email}</strong></p>
    <p style="margin:0;"><span style="color:#8b949e;">🔑 Senha temporária:</span><br><strong style="color:#f59e0b;font-size:20px;">${senhaTemp}</strong></p>
  </div>
  <div style="background:#1c2a1c;border:1px solid #2ea043;border-radius:8px;padding:16px;margin-bottom:24px;">
    <p style="margin:0;color:#3fb950;">⚠️ <strong>Troque sua senha imediatamente após o primeiro acesso!</strong></p>
  </div>
  <div style="text-align:center;">
    <a href="https://leilaonozap.net" style="background:#f59e0b;color:#0d1117;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;">🚀 Acessar Plataforma</a>
  </div>
  <p style="text-align:center;color:#8b949e;font-size:12px;margin-top:24px;">Equipe Leilão NoZap • leilaonozap.net</p>
</div>`,
            });
            toast.success(`✅ E-mail de acesso enviado para ${selected.email}!`);
        } catch (err) {
            toast.error('Erro ao enviar acesso: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setSendingAccess(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* ── TELA 1: LISTA ── */}
                {screen === 'lista' && (
                    <>
                        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
                            <h3 className="font-bold text-white text-lg">Arrematantes</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={openNovo} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                                    <UserPlus size={13} /> Novo
                                </button>
                                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 border-b border-[#30363d]">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome..."
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filtrados.length === 0 ? (
                                <p className="text-center text-slate-500 text-sm py-8">Nenhum arrematante encontrado.</p>
                            ) : filtrados.map(a => (
                                <button
                                    key={a.id}
                                    onClick={() => openPerfil(a)}
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-left hover:border-rose-500/50 transition-colors flex items-center gap-3 group"
                                >
                                    <div className={`w-10 h-10 rounded-full ${avatarColor(a.full_name)} flex items-center justify-center text-white text-sm font-black shrink-0`}>
                                        {(a.full_name || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-white text-sm truncate">{a.full_name}</p>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider shrink-0 ${a.is_active !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                                {a.is_active !== false ? 'ATIVO' : 'INATIVO'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate">
                                            {[a.city, a.state].filter(Boolean).join(' · ')}
                                            {a.email && ` · ${a.email}`}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 shrink-0" />
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── TELA 2: PERFIL ── */}
                {screen === 'perfil' && selected && (
                    <>
                        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
                            <button onClick={voltarLista} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                            <div className="flex items-center gap-2">
                                <button onClick={openNovo} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                                    <UserPlus size={13} /> Novo
                                </button>
                                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Avatar + Nome */}
                            <div className="flex items-center gap-4">
                                <div className={`w-16 h-16 rounded-full ${avatarColor(selected.full_name)} flex items-center justify-center text-white text-2xl font-black shrink-0`}>
                                    {(selected.full_name || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-xl">{selected.full_name}</h4>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${selected.is_active !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                                        {selected.is_active !== false ? 'ATIVO' : 'INATIVO'}
                                    </span>
                                </div>
                            </div>

                            {/* Dados */}
                            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 space-y-3">
                                {[
                                    { label: 'CPF', value: maskCPF(selected.cpf) },
                                    { label: 'Cidade / Estado', value: [selected.city, selected.state].filter(Boolean).join(' · ') || '—' },
                                    { label: 'E-mail', value: selected.email || '—' },
                                    { label: 'Telefone', value: selected.phone || '—' },
                                    { label: 'Chave PIX', value: selected.pix_key ? `${selected.pix_key} (${PIX_LABELS[selected.pix_key_type] || selected.pix_key_type})` : '—' },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between items-start gap-3">
                                        <span className="text-xs text-slate-500 uppercase tracking-wider shrink-0">{item.label}</span>
                                        <span className="text-sm text-slate-200 text-right">{item.value}</span>
                                    </div>
                                ))}
                                {selected.notes && (
                                    <div>
                                        <span className="text-xs text-slate-500 uppercase tracking-wider">Observações</span>
                                        <p className="text-sm text-slate-300 mt-1 leading-relaxed">{selected.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Ações */}
                            <div className="flex gap-3">
                                <button onClick={() => openEditar(selected)} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                    <Pencil size={14} /> Editar
                                </button>
                                <button onClick={() => setShowEmailModal(true)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                    <Mail size={14} /> Enviar E-mail
                                </button>
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleEnviarAcesso(); }} 
                                    disabled={sendingAccess} 
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                    {sendingAccess ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><KeyRound size={14} /> Enviar Acesso</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── TELA 3: FORMULÁRIO ── */}
                {screen === 'form' && (
                    <>
                        <div className="flex items-center justify-between p-5 border-b border-[#30363d]">
                            <button onClick={selected ? voltarPerfil : voltarLista} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
                                <ArrowLeft size={14} /> Voltar
                            </button>
                            <h3 className="font-bold text-white text-base">{selected ? 'Editar Arrematante' : 'Novo Arrematante'}</h3>
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-3">
                            {[
                                { label: 'Nome Completo *', key: 'full_name', type: 'text', placeholder: 'Nome completo' },
                                { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
                                { label: 'E-mail', key: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                                { label: 'Telefone / WhatsApp', key: 'phone', type: 'tel', placeholder: '(XX) XXXXX-XXXX' },
                                { label: 'Cidade', key: 'city', type: 'text', placeholder: 'Cidade' },
                                { label: 'Chave PIX', key: 'pix_key', type: 'text', placeholder: 'Chave PIX' },
                            ].map(({ label, key, type, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                                    <input
                                        type={type}
                                        value={form[key] || ''}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={placeholder}
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            ))}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado</label>
                                    <input
                                        type="text" maxLength={2}
                                        value={form.state || ''}
                                        onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))}
                                        placeholder="UF"
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tipo PIX</label>
                                    <select
                                        value={form.pix_key_type || 'cpf'}
                                        onChange={e => setForm(f => ({ ...f, pix_key_type: e.target.value }))}
                                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="cpf">CPF</option>
                                        <option value="email">E-mail</option>
                                        <option value="telefone">Telefone</option>
                                        <option value="aleatoria">Aleatória</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observações</label>
                                <textarea
                                    rows={3}
                                    value={form.notes || ''}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Observações internas..."
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                                />
                            </div>

                            <div
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.is_active ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-[#30363d] bg-[#0d1117]'}`}
                                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${form.is_active ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
                                    {form.is_active && <CheckCircle2 size={12} className="text-white" />}
                                </div>
                                <p className="text-sm font-semibold text-white">Ativo</p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button onClick={selected ? voltarPerfil : voltarLista}
                                    className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                                    Cancelar
                                </button>
                                <button onClick={handleSave} disabled={isSaving}
                                    className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                                    {isSaving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Mini Modal de E-mail */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowEmailModal(false)}>
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-white">Enviar E-mail para {selected?.full_name}</h4>
                            <button onClick={() => setShowEmailModal(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assunto</label>
                                <input
                                    type="text"
                                    value={emailData.subject}
                                    onChange={e => setEmailData(d => ({ ...d, subject: e.target.value }))}
                                    placeholder="Assunto do e-mail"
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mensagem</label>
                                <textarea
                                    rows={5}
                                    value={emailData.body}
                                    onChange={e => setEmailData(d => ({ ...d, body: e.target.value }))}
                                    placeholder="Corpo do e-mail..."
                                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button onClick={() => setShowEmailModal(false)}
                                    className="flex-1 bg-[#0d1117] border border-[#30363d] text-slate-400 hover:text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={handleSendEmail} disabled={sendingEmail}
                                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                    {sendingEmail ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : <><Mail size={14} /> Enviar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}