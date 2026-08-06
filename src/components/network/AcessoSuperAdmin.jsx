import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Mail, Copy, Share2, ShieldAlert, GitBranch, Wand2 } from 'lucide-react';

const SITE = 'https://leilaonozap.net';
export const SENHA_PADRAO = '@LeilaoNoZap123';

/** Link público: loja própria → link de indicação */
export function linkPublico(u, codigoExtra) {
  if (u?.store_slug) return `${SITE}/loja/${u.store_slug}`;
  const code = codigoExtra || u?.referral_code;
  return code ? `${SITE}/Loja-Virtual?ref=${code}` : null;
}

/** Código de indicação: primeiro nome + sufixo curto (único o suficiente) */
function gerarCodigo(nome) {
  const base = (nome || 'user')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '').slice(0, 10).toUpperCase() || 'USER';
  return `${base}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/**
 * 🔐 AcessoSuperAdmin — bloco do cartão de identificação, só para super_admin.
 * Senha (padrão/nova via adminSetPassword), reset por e-mail (sendEmailCode) e
 * link público (gera código de indicação quando falta).
 * Não altera comissão, carreira, saldo nem hierarquia.
 */
export default function AcessoSuperAdmin({ user, indicadoPor, onAtualizado }) {
  const [nova, setNova] = useState(SENHA_PADRAO);
  const [confirmar, setConfirmar] = useState(null); // 'senha' | 'padrao' | 'reset'
  const [ocupado, setOcupado] = useState(false);
  const [definidaAgora, setDefinidaAgora] = useState(null);
  const [codigoNovo, setCodigoNovo] = useState(null);
  // O cargo salvo no navegador pode estar defasado (sticky admin do Layout) —
  // quem manda é o cargo no banco.
  const [souSuperAdmin, setSouSuperAdmin] = useState(false);
  const [eu, setEu] = useState(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let sessao = null;
      try { sessao = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (_) { /* sem sessão */ }
      if (!sessao?.id) return;
      if (vivo) setEu(sessao);
      if (sessao.role === 'super_admin') { setSouSuperAdmin(true); return; }
      try {
        const rows = await base44.entities.AppUser.filter({ id: sessao.id });
        if (vivo && rows?.[0]?.role === 'super_admin') setSouSuperAdmin(true);
      } catch (_) { /* sem leitura: mantém oculto */ }
    })();
    return () => { vivo = false; };
  }, []);

  // Trocar de pessoa no cartão zera o que era da pessoa anterior
  useEffect(() => {
    setNova(SENHA_PADRAO);
    setDefinidaAgora(null);
    setCodigoNovo(null);
    setConfirmar(null);
  }, [user?.id]);

  if (!souSuperAdmin) return null;

  const link = linkPublico(user, codigoNovo);

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado!');
    } catch (_) {
      toast.error('Não foi possível copiar — copie manualmente.');
    }
  };

  // Define a senha DE VERDADE no servidor. `padrao` = usa a senha da casa e
  // avisa a pessoa por e-mail (com o caminho pra ela trocar depois).
  const salvarSenha = async (padrao = false) => {
    const senha = padrao ? SENHA_PADRAO : nova;
    setOcupado(true);
    try {
      const r = await base44.functions.invoke('adminSetPassword', {
        userId: user.id,
        newPassword: senha,
        actorId: eu?.id,
        notify: true,
      });
      if (r?.success) {
        setDefinidaAgora(senha);
        toast.success(
          r.emailed
            ? `Senha definida e enviada por e-mail para ${user.email}.`
            : 'Senha definida — a pessoa já pode entrar com ela. (o e-mail não saiu)'
        );
        setNova(SENHA_PADRAO);
        setConfirmar(null);
      } else {
        toast.error(r?.error || 'Não foi possível definir a senha.');
      }
    } catch (e) {
      toast.error('Falha ao definir a senha: ' + (e?.message || 'erro'));
    } finally {
      setOcupado(false);
    }
  };

  const enviarReset = async () => {
    setOcupado(true);
    try {
      const r = await base44.functions.invoke('sendEmailCode', { email: user.email, purpose: 'reset' });
      if (r?.success) toast.success(`Código de redefinição enviado para ${user.email}`);
      else toast.error(r?.error || 'Não foi possível enviar o e-mail.');
      setConfirmar(null);
    } catch (e) {
      toast.error('Falha ao enviar o e-mail: ' + (e?.message || 'erro'));
    } finally {
      setOcupado(false);
    }
  };

  const criarCodigo = async () => {
    setOcupado(true);
    try {
      const code = gerarCodigo(user.full_name);
      const r = await base44.functions.invoke('adminUpdateUser', {
        userId: user.id,
        updates: { referral_code: code },
        actorId: eu?.id,
      });
      if (r?.success) {
        setCodigoNovo(code);
        toast.success('Link de indicação criado.');
        onAtualizado?.();
      } else {
        toast.error(r?.error || 'Não foi possível criar o código.');
      }
    } catch (e) {
      toast.error('Falha ao criar o código: ' + (e?.message || 'erro'));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-900/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-amber-300 font-bold mb-2 flex items-center gap-1.5">
        <ShieldAlert className="w-3.5 h-3.5" />
        Acesso — visível só para o Super Admin
      </p>

      {/* ---- Senha ---- */}
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        {definidaAgora ? (
          <span className="text-[12px] text-emerald-300 font-mono break-all">
            senha definida agora: {definidaAgora}
            <button type="button" onClick={() => copiar(definidaAgora)}
              className="ml-2 text-gray-300 hover:text-white inline-flex items-center gap-1 align-middle">
              <Copy className="w-3.5 h-3.5" /> copiar
            </button>
          </span>
        ) : (
          <span className="text-[11.5px] text-gray-400">
            As senhas ficam criptografadas no banco — não é possível ver a atual, só definir uma nova.
            A padrão da casa é <strong className="text-amber-300 font-mono">{SENHA_PADRAO}</strong>.
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row sm:flex-wrap gap-2">
        <Input
          type="text"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova senha (mín. 6)"
          className="h-11 text-[13px] bg-gray-800 border-gray-600 text-white w-full sm:max-w-[220px]"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={() => setConfirmar('padrao')}
          className="h-11 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white"
        >
          <Wand2 className="w-3.5 h-3.5 mr-1.5" />
          Usar senha padrão
        </Button>
        <Button
          size="sm"
          disabled={ocupado || nova.trim().length < 6}
          onClick={() => setConfirmar('senha')}
          className="h-11 text-[12px] bg-amber-600 hover:bg-amber-500"
        >
          Definir nova senha
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado || !user.email}
          onClick={() => setConfirmar('reset')}
          className="h-11 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white"
        >
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Enviar reset por e-mail
        </Button>
      </div>

      {/* ---- Link público + posição na árvore ---- */}
      <div className="mt-3 pt-3 border-t border-amber-500/20 space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">Link da loja / perfil</p>
        <p className="text-[11.5px] text-gray-400 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
          Indicado por <strong className="text-emerald-300">{indicadoPor || 'Leilão NoZap Oficial (site)'}</strong>
        </p>
        {link ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-emerald-300 break-all">{link}</span>
            <button
              type="button"
              onClick={() => copiar(link)}
              className="min-h-[44px] px-2 text-[11.5px] text-gray-300 hover:text-white flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${user.full_name} — Leilão NoZap: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-2 text-[11.5px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        ) : (
          <Button
            size="sm"
            disabled={ocupado}
            onClick={criarCodigo}
            className="h-11 text-[12px] bg-emerald-600 hover:bg-emerald-500"
          >
            Gerar link de indicação
          </Button>
        )}
      </div>

      {/* ---- Confirmação ---- */}
      {confirmar && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-gray-900 p-3">
          <p className="text-[12.5px] text-gray-200">
            {confirmar === 'padrao'
              ? `Definir a senha padrão ${SENHA_PADRAO} para ${user.full_name} e avisar por e-mail em ${user.email}? A senha atual deixa de funcionar.`
              : confirmar === 'senha'
              ? `Definir a senha "${nova}" para ${user.full_name} e avisar por e-mail? A senha atual deixa de funcionar.`
              : `Enviar um código de redefinição para ${user.email}?`}
          </p>
          <div className="flex justify-end gap-2 mt-2.5">
            <Button size="sm" variant="outline" disabled={ocupado} onClick={() => setConfirmar(null)}
              className="h-10 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white">
              Cancelar
            </Button>
            <Button size="sm" disabled={ocupado}
              onClick={() => (confirmar === 'reset' ? enviarReset() : salvarSenha(confirmar === 'padrao'))}
              className="h-10 text-[12px] bg-emerald-600 hover:bg-emerald-500">
              {ocupado ? 'Aguarde…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}