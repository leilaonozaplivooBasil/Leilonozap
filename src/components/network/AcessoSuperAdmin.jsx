import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Eye, EyeOff, Mail, Copy, Share2, ShieldAlert } from 'lucide-react';

const SITE = 'https://leilaonozap.net';

/** Link público da pessoa: loja própria > link de indicação > nada */
export function linkPublico(u) {
  if (u?.store_slug) return `${SITE}/loja/${u.store_slug}`;
  if (u?.referral_code) return `${SITE}/Loja-Virtual?ref=${u.referral_code}`;
  return null;
}

const ehHash = (senha) => /^\$2[aby]\$/.test(String(senha || ''));

/**
 * 🔐 AcessoSuperAdmin — bloco do cartão de identificação visível SÓ para super_admin.
 * Ver senha (quando texto puro), definir nova senha (updateUserPassword),
 * enviar reset por e-mail (sendPasswordResetEmail) e link público pra compartilhar.
 * Não altera comissão, carreira, saldo nem hierarquia.
 */
export default function AcessoSuperAdmin({ user }) {
  const [revelada, setRevelada] = useState(false);
  const [nova, setNova] = useState('');
  const [confirmar, setConfirmar] = useState(null); // 'senha' | 'reset'
  const [ocupado, setOcupado] = useState(false);
  // ⚠️ O cargo salvo no navegador pode estar defasado (o Layout tem "sticky admin",
  // que trava a cópia local em 'admin'). Quem manda é o cargo no banco.
  const [souSuperAdmin, setSouSuperAdmin] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let eu = null;
      try { eu = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (_) { /* sem sessão */ }
      if (!eu?.id) return;
      if (eu.role === 'super_admin') { setSouSuperAdmin(true); return; }
      try {
        const rows = await base44.entities.AppUser.filter({ id: eu.id });
        if (vivo && rows?.[0]?.role === 'super_admin') setSouSuperAdmin(true);
      } catch (_) { /* sem permissão de leitura: mantém oculto */ }
    })();
    return () => { vivo = false; };
  }, []);

  if (!souSuperAdmin) return null;

  const hash = ehHash(user?.password);
  const link = linkPublico(user);

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success('Copiado!');
    } catch (_) {
      toast.error('Não foi possível copiar — copie manualmente.');
    }
  };

  const salvarSenha = async () => {
    setOcupado(true);
    try {
      const r = await base44.functions.invoke('updateUserPassword', { user_id: user.id, new_password: nova });
      if (r?.success) {
        toast.success('Senha definida com sucesso.');
        setNova('');
        setConfirmar(null);
      } else {
        toast.error(r?.error || 'Não foi possível definir a senha.');
      }
    } finally {
      setOcupado(false);
    }
  };

  const enviarReset = async () => {
    setOcupado(true);
    try {
      const codigo = String(Math.floor(100000 + Math.random() * 900000));
      const r = await base44.functions.invoke('sendPasswordResetEmail', {
        email: user.email,
        code: codigo,
        userName: (user.full_name || '').split(' ')[0],
      });
      if (r?.success) toast.success(`Código ${codigo} enviado para ${user.email}`);
      else toast.error(r?.error || 'Não foi possível enviar o e-mail.');
      setConfirmar(null);
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
        <KeyRound className="w-3.5 h-3.5 text-gray-500" />
        {hash ? (
          <span className="text-[11.5px] text-gray-400">
            Senha protegida (criptografada) — não é possível ver, só definir uma nova.
          </span>
        ) : (
          <>
            <span className="text-[12px] font-mono text-gray-200 break-all">
              {revelada ? (user.password || '— sem senha —') : '••••••••'}
            </span>
            <button
              type="button"
              onClick={() => setRevelada((v) => !v)}
              className="min-h-[36px] px-2 text-[11.5px] text-amber-300 hover:text-amber-200 flex items-center gap-1"
            >
              {revelada ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {revelada ? 'Ocultar' : 'Ver senha'}
            </button>
            {revelada && user.password && (
              <button
                type="button"
                onClick={() => copiar(user.password)}
                className="min-h-[36px] px-2 text-[11.5px] text-gray-300 hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar
              </button>
            )}
          </>
        )}
      </div>

      <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
        <Input
          type="text"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova senha (mín. 6)"
          className="h-10 text-[13px] bg-gray-800 border-gray-600 text-white sm:max-w-[220px]"
        />
        <Button
          size="sm"
          disabled={ocupado || nova.length < 6}
          onClick={() => setConfirmar('senha')}
          className="h-10 text-[12px] bg-amber-600 hover:bg-amber-500"
        >
          Definir nova senha
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado || !user.email}
          onClick={() => setConfirmar('reset')}
          className="h-10 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white"
        >
          <Mail className="w-3.5 h-3.5 mr-1.5" />
          Enviar reset por e-mail
        </Button>
      </div>

      {/* ---- Link público ---- */}
      <div className="mt-3 pt-3 border-t border-amber-500/20">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Link da loja / perfil</p>
        {link ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-emerald-300 break-all">{link}</span>
            <button
              type="button"
              onClick={() => copiar(link)}
              className="min-h-[36px] px-2 text-[11.5px] text-gray-300 hover:text-white flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copiar
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${user.full_name} — Leilão NoZap: ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-2 text-[11.5px] text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
            >
              <Share2 className="w-3.5 h-3.5" /> WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-[11.5px] text-gray-500">
            Esta pessoa ainda não tem loja nem código de indicação — sem link público.
          </p>
        )}
      </div>

      {/* ---- Confirmação ---- */}
      {confirmar && (
        <div className="mt-3 rounded-lg border border-amber-500/40 bg-gray-900 p-3">
          <p className="text-[12.5px] text-gray-200">
            {confirmar === 'senha'
              ? `Definir uma nova senha para ${user.full_name}? A senha atual deixa de funcionar.`
              : `Enviar um código de redefinição para ${user.email}?`}
          </p>
          <div className="flex justify-end gap-2 mt-2.5">
            <Button size="sm" variant="outline" disabled={ocupado} onClick={() => setConfirmar(null)}
              className="h-9 text-[12px] bg-gray-100 border-gray-300 text-gray-900 hover:bg-white">
              Cancelar
            </Button>
            <Button size="sm" disabled={ocupado} onClick={confirmar === 'senha' ? salvarSenha : enviarReset}
              className="h-9 text-[12px] bg-emerald-600 hover:bg-emerald-500">
              {ocupado ? 'Aguarde…' : 'Confirmar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}