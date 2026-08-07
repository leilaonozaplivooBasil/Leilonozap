import React, { useState } from 'react';
import { X, Lock, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getReferral } from '@/lib/referral';

// 🖤 MODAL DE ACESSO — cadastro da plataforma na lâmina preta da captação privada.
// Usa a MESMA rota server-side do cadastro público (publicRegister), sem criar
// nenhum fluxo novo de auth. Exige o aceite de confidencialidade antes de enviar.
export default function ParceiroAcessoModal({ onFechar, onSucesso }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [ciente, setCiente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const campo =
    'mt-1.5 h-12 w-full border border-pc-borda bg-pc-preto px-3 text-sm text-pc-tinta outline-none placeholder:text-pc-tinta-fraca/60 focus:border-pc-ouro';
  const rotulo = 'text-[10px] uppercase tracking-[0.18em] text-pc-tinta-fraca';

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    const digitos = (telefone || '').replace(/\D/g, '');
    if (nome.trim().length < 3) return setErro('Informe seu nome completo.');
    if (!email.includes('@') || !email.includes('.')) return setErro('Informe um e-mail válido.');
    if (digitos.length < 10) return setErro('Informe um telefone válido com DDD.');
    if (senha.length < 8) return setErro('A senha deve ter pelo menos 8 caracteres.');
    if (senha !== senha2) return setErro('As senhas não coincidem.');
    if (!ciente) return setErro('É necessário aceitar o termo de confidencialidade.');

    setEnviando(true);
    try {
      const partes = nome.trim().split(/\s+/).filter(Boolean);
      const resp = await base44.functions.invoke('publicRegister', {
        full_name: nome.trim(),
        email: email.toLowerCase().trim(),
        password: senha,
        phone: digitos,
        ref_code: getReferral() || '',
        display_first_name: partes[0] || null,
        display_last_name: partes.length > 1 ? partes[partes.length - 1] : null,
      });
      if (!resp?.success) {
        setErro(resp?.error || 'Não foi possível concluir o cadastro.');
        setEnviando(false);
        return;
      }
      localStorage.setItem('currentUser', JSON.stringify(resp.user));
      sessionStorage.setItem('isLoggedIn', 'true');
      onSucesso(resp.user);
    } catch (err) {
      setErro('Falha de conexão. Tente novamente em alguns segundos.');
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9500] flex items-end justify-center bg-black/90 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={enviar}
        className="max-h-[95vh] w-full max-w-lg overflow-y-auto border border-pc-ouro/40 bg-pc-preto"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-pc-borda bg-pc-preto p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro">Acesso restrito</p>
            <h3 className="mt-1.5 text-lg font-bold text-pc-tinta">Solicitar acesso às condições</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">
              As condições comerciais são apresentadas somente após identificação e aceite de
              confidencialidade.
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-pc-borda text-pc-tinta-fraca hover:text-pc-tinta"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className={rotulo} htmlFor="pc-nome">Nome completo</label>
            <input id="pc-nome" className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" autoComplete="name" />
          </div>
          <div>
            <label className={rotulo} htmlFor="pc-email">E-mail</label>
            <input id="pc-email" type="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
          </div>
          <div>
            <label className={rotulo} htmlFor="pc-tel">Telefone / WhatsApp</label>
            <input id="pc-tel" inputMode="tel" className={campo} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(21) 99999-9999" autoComplete="tel" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={rotulo} htmlFor="pc-senha">Senha</label>
              <input id="pc-senha" type="password" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 8 caracteres" autoComplete="new-password" />
            </div>
            <div>
              <label className={rotulo} htmlFor="pc-senha2">Confirmar senha</label>
              <input id="pc-senha2" type="password" className={campo} value={senha2} onChange={(e) => setSenha2(e.target.value)} placeholder="repita a senha" autoComplete="new-password" />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 border border-pc-borda bg-pc-preto-2 p-3">
            <input
              type="checkbox"
              checked={ciente}
              onChange={(e) => setCiente(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A55C]"
            />
            <span className="text-[11px] leading-relaxed text-pc-tinta-fraca">
              <span className="font-bold text-pc-tinta">Estou ciente</span> de que se trata de{' '}
              <span className="text-pc-ouro">captação privada e confidencial</span>, dirigida
              exclusivamente a convidados identificados, que não constitui oferta pública nem
              promessa de rentabilidade, e me comprometo a não divulgar, reproduzir ou compartilhar
              as informações, documentos e valores apresentados no ambiente restrito.
            </span>
          </label>

          {erro && (
            <p className="border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 border border-pc-ouro bg-pc-ouro px-6 text-xs font-bold uppercase tracking-[0.18em] text-pc-preto transition-colors hover:bg-pc-ouro-claro disabled:opacity-60"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {enviando ? 'Registrando acesso' : 'Aceitar e acessar'}
          </button>

          <p className="text-center text-[10px] leading-relaxed text-pc-tinta-fraca">
            COMPRAS FULL COMÉRCIO LTDA · CNPJ 51.544.091/0001-67 — o aceite é registrado com data e
            hora para fins de auditoria.
          </p>
        </div>
      </form>
    </div>
  );
}