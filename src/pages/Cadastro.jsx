import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Loader2, Check, ArrowRight, Package, Users, TrendingUp, ShieldCheck,
  Gavel, Copy, CheckCircle2, Mail, Lock, User as UserIcon, Phone, Hash, ArrowLeft
} from 'lucide-react';

const money = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 });
const LABEL = { usuario: 'Usuário', influenciador: 'Influenciador', vendedor: 'Vendedor', licenciado: 'Licenciado', parceiro: 'Parceiro', ponto_retirada: 'Ponto de Retirada', loja_fisica: 'Loja Física', distribuidor: 'Distribuidor' };
const PITCH = {
  influenciador: 'Indique clientes e ganhe comissão em cada venda feita pelo seu link.',
  vendedor: 'Venda os produtos da Leilão NoZap e ganhe comissão direta nas suas vendas.',
  licenciado: 'Tenha sua própria operação de catálogo e cadastre vendedores e influenciadores.',
  parceiro: 'Cadastre licenciados e monte sua estrutura de rede com comissões em vários níveis.',
  ponto_retirada: 'Vire ponto de armazenagem e distribuição da sua região, com estoque próprio.',
  loja_fisica: 'Sua loja física completa, com estoque próprio e toda a cadeia abaixo de você.',
  distribuidor: 'O nível máximo: distribua e cadastre toda a estrutura da rede.',
};

const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
function getParam(name) {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name) || '';
}

export default function Cadastro() {
  const navigate = useNavigate();
  const cargo = (getParam('cargo') || getParam('as') || 'licenciado').trim();
  const refCode = (getParam('ref') || '').trim();

  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState(null);
  const [unlocks, setUnlocks] = useState([]);
  const [seller, setSeller] = useState(null);
  const [me, setMe] = useState(null);

  // funil: landing → form → code → checkout → pix → done
  const [step, setStep] = useState('landing');
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', cpf: '', password: '' });
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [gateway, setGateway] = useState('pix');
  const [pix, setPix] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);

  useEffect(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { u = null; }
    setMe(u);
    (async () => {
      try {
        const { data: lv } = await supabase.from('career_levels').select('*').eq('id', cargo).limit(1);
        setLevel(Array.isArray(lv) ? lv[0] : null);
        const { data: rp } = await supabase.from('register_permissions').select('can_register_level').eq('actor_level', cargo);
        setUnlocks((rp || []).map((r) => LABEL[r.can_register_level] || r.can_register_level));
        if (refCode) {
          const { data: s } = await supabase.from('app_users').select('full_name,store_name,primary_career_level').eq('referral_code', refCode).limit(1);
          setSeller(Array.isArray(s) ? s[0] : null);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
     
  }, [cargo, refCode]);

  const adesao = Number(level?.adesao_valor) || 0;
  const isPaid = adesao > 0;
  const cargoNome = LABEL[cargo] || cargo;
  const alreadyHas = me && Array.isArray(me.career_levels) && me.career_levels.includes(cargo);

  const startCadastro = () => {
    if (me?.id) {
      // já logado → vai direto pro checkout (cargo pago) ou ativa (grátis via suporte)
      setCreatedUser(me);
      if (isPaid) setStep('checkout');
      else { toast.info('Você já tem conta. Para cargos grátis, peça ao seu indicador.'); }
      return;
    }
    setStep('form');
  };

  const sendCode = async () => {
    if (!form.full_name || !form.email || !form.password) { toast.error('Preencha nome, e-mail e senha.'); return; }
    if (form.password.length < 6) { toast.error('Senha de no mínimo 6 caracteres.'); return; }
    setSending(true);
    try {
      const r = await base44.functions.invoke('sendEmailCode', { email: form.email.trim().toLowerCase(), purpose: 'signup' });
      if (!r?.success) { toast.error(r?.error || 'Erro ao enviar código.'); setSending(false); return; }
      toast.success('Código enviado pro seu e-mail!');
      setStep('code');
    } catch (e) { toast.error('Erro ao enviar código.'); }
    setSending(false);
  };

  const confirmCode = async () => {
    if (code.length < 4) { toast.error('Digite o código recebido.'); return; }
    setSending(true);
    try {
      const r = await base44.functions.invoke('registerNetworkUser', {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: onlyDigits(form.phone),
        cpf: onlyDigits(form.cpf),
        code: code.trim(),
        ref_code: refCode,
        as_level: cargo,
      });
      if (!r?.success) { toast.error(r?.error || 'Erro ao cadastrar.'); setSending(false); return; }
      const user = r.user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      setCreatedUser(user);
      if (r.needs_adesao || isPaid) {
        toast.success('Cadastro criado! Falta só o pagamento da adesão.');
        setStep('checkout');
      } else {
        toast.success(`Pronto! Você agora é ${cargoNome}.`);
        setStep('done');
      }
    } catch (e) { toast.error('Erro ao cadastrar.'); }
    setSending(false);
  };

  const pay = async () => {
    const u = createdUser || me;
    if (!u?.id) { toast.error('Sessão expirada, refaça o cadastro.'); return; }
    setSending(true);
    try {
      const r = await base44.functions.invoke('createAdesaoPayment', {
        user: { id: u.id, name: u.full_name, email: u.email, cpf: u.cpf }, adesao_level: cargo, gateway,
      });
      if (!r?.success) { toast.error(r?.error || 'Erro ao iniciar pagamento.'); setSending(false); return; }
      if (gateway === 'card' && r.url) { window.location.href = r.url; return; }
      setPix(r); setStep('pix');
    } catch (e) { toast.error('Erro ao processar pagamento.'); }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando convite…</div>;
  if (!level) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-300 gap-3 px-4 text-center">
      <p>Convite inválido ou cargo não encontrado.</p>
      <button onClick={() => navigate('/')} className="text-green-400 underline">Ir pra Leilão NoZap</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-emerald-950/20 to-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* topo marca */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Gavel className="w-5 h-5 text-green-400" />
          <span className="font-black tracking-tight">LEILÃO <span className="text-green-400">NOZAP</span></span>
        </div>

        {/* convite */}
        {seller && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 text-xs bg-green-500/10 border border-green-500/30 text-green-300 rounded-full px-3 py-1">
              <Users className="w-3.5 h-3.5" /> Convite de <strong>{seller.store_name || seller.full_name}</strong>
            </span>
          </div>
        )}

        {/* HERO */}
        <div className="text-center mb-8">
          <p className="text-green-400 font-semibold tracking-wide uppercase text-sm mb-1">Seja um</p>
          <h1 className="text-4xl md:text-5xl font-black mb-3">{cargoNome}</h1>
          <p className="text-gray-300 max-w-xl mx-auto">{PITCH[cargo] || 'Faça parte da rede da Leilão NoZap.'}</p>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="bg-gray-900/70 border border-gray-700 rounded-3xl p-6 md:p-8 shadow-2xl">
          {/* preço */}
          <div className="text-center mb-6">
            {isPaid ? (
              <>
                <div className="text-sm text-gray-400">Adesão única</div>
                <div className="text-4xl font-black text-green-400">{money(adesao)}</div>
                <div className="inline-flex items-center gap-1.5 mt-2 text-xs bg-yellow-500/10 text-yellow-300 border border-yellow-500/30 rounded-full px-3 py-1">
                  <Package className="w-3.5 h-3.5" /> 100% volta em produtos
                </div>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 text-2xl font-black text-green-400"><CheckCircle2 className="w-6 h-6" /> Cadastro grátis</div>
            )}
          </div>

          {/* benefícios */}
          <div className="space-y-2.5 mb-6 max-w-md mx-auto">
            <Benefit icon={TrendingUp} text={<>Comissão direta de <strong className="text-white">{level.venda_direta_pct}%</strong> nas suas vendas</>} />
            {isPaid && <Benefit icon={Package} text={<><strong className="text-white">{money(adesao)}</strong> de volta em produtos pra você revender</>} />}
            {unlocks.length > 0 && <Benefit icon={Users} text={<>Pode cadastrar: <strong className="text-white">{unlocks.join(', ')}</strong></>} />}
            <Benefit icon={ShieldCheck} text={<>Pagamento seguro via PIX ou Cartão</>} />
          </div>

          {/* ====== STEPS ====== */}
          {alreadyHas ? (
            <div className="text-center bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <Check className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-green-300 font-semibold">Você já é {cargoNome}!</p>
              <button onClick={() => navigate('/painel')} className="mt-2 text-sm text-green-400 underline">Ir pro meu painel</button>
            </div>
          ) : step === 'landing' && (
            <button onClick={startCadastro} className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 font-black text-lg flex items-center justify-center gap-2 transition-colors">
              {isPaid ? `Quero ser ${cargoNome}` : `Cadastrar grátis`} <ArrowRight className="w-5 h-5" />
            </button>
          )}

          {/* FORM */}
          {step === 'form' && (
            <div className="space-y-3">
              <Field icon={UserIcon} placeholder="Nome completo" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <Field icon={Mail} placeholder="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field icon={Phone} placeholder="WhatsApp" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
                <Field icon={Hash} placeholder="CPF" value={form.cpf} onChange={(v) => setForm({ ...form, cpf: v })} />
              </div>
              <Field icon={Lock} placeholder="Crie uma senha" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <button onClick={sendCode} disabled={sending} className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 font-bold flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Receber código por e-mail
              </button>
              <button onClick={() => setStep('landing')} className="w-full text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1"><ArrowLeft className="w-3 h-3" /> Voltar</button>
            </div>
          )}

          {/* CODE */}
          {step === 'code' && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-400">Enviamos um código de 6 dígitos para<br /><strong className="text-white">{form.email}</strong></p>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                className="w-full text-center text-3xl tracking-[0.5em] font-black bg-gray-950 border border-gray-700 rounded-xl py-4 text-white focus:border-green-500 outline-none"
              />
              <button onClick={confirmCode} disabled={sending} className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 font-bold flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {isPaid ? 'Confirmar e ir pro pagamento' : 'Confirmar cadastro'}
              </button>
              <button onClick={sendCode} className="text-xs text-gray-500 hover:text-gray-300">Reenviar código</button>
            </div>
          )}

          {/* CHECKOUT */}
          {step === 'checkout' && (
            <div className="space-y-4">
              <div className="bg-gray-950/60 rounded-xl p-4 text-center">
                <div className="text-sm text-gray-400">Adesão {cargoNome} (volta em produto)</div>
                <div className="text-3xl font-black text-green-400">{money(adesao)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setGateway('pix')} className={`py-4 rounded-xl border-2 font-bold ${gateway === 'pix' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-300'}`}>💚 PIX</button>
                <button onClick={() => setGateway('card')} className={`py-4 rounded-xl border-2 font-bold ${gateway === 'card' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-gray-700 text-gray-300'}`}>💳 Cartão</button>
              </div>
              <button onClick={pay} disabled={sending} className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-700 font-black flex items-center justify-center gap-2">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {gateway === 'pix' ? 'Gerar PIX agora' : 'Pagar com Cartão'}
              </button>
              <p className="text-[11px] text-gray-500 text-center">Assim que o pagamento cair, seu cargo é ativado automaticamente e seu pedido de produtos é gerado.</p>
            </div>
          )}

          {/* PIX */}
          {step === 'pix' && pix && (
            <div className="text-center space-y-3">
              <p className="text-green-400 font-semibold">💚 Pague com PIX para ativar</p>
              {pix.qr_code_base64 && <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR PIX" className="w-56 h-56 mx-auto bg-white rounded-xl p-2" />}
              <div className="text-2xl font-black text-green-400">{money(pix.amount)}</div>
              <button onClick={() => { navigator.clipboard.writeText(pix.pix_code || ''); toast.success('Código PIX copiado!'); }} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 font-bold flex items-center justify-center gap-2"><Copy className="w-4 h-4" /> Copiar código PIX</button>
              <p className="text-[11px] text-gray-500">Assim que o pagamento cair, seu cargo ativa sozinho. Você já pode acessar seu painel.</p>
              <button onClick={() => navigate('/painel')} className="text-sm text-green-400 underline">Ir pro meu painel</button>
            </div>
          )}

          {/* DONE (free) */}
          {step === 'done' && (
            <div className="text-center bg-green-500/10 border border-green-500/30 rounded-xl p-5">
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-bold text-lg">Bem-vindo, {cargoNome}!</p>
              <p className="text-sm text-gray-400 mt-1">Sua conta está ativa. Comece agora.</p>
              <button onClick={() => navigate('/painel')} className="mt-3 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 font-bold">Acessar meu painel</button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">© 2026 Leilão NoZap · Pagamento 100% seguro</p>
      </div>
    </div>
  );
}

function Benefit({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-300">
      <span className="w-7 h-7 rounded-lg bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-green-400" /></span>
      <span>{text}</span>
    </div>
  );
}

function Field({ icon: Icon, placeholder, value, onChange, type = 'text' }) {
  return (
    <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 rounded-xl px-3 focus-within:border-green-500">
      <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent py-3 text-white placeholder-gray-600 outline-none text-sm"
      />
    </div>
  );
}
