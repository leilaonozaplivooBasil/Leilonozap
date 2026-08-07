import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getReferral } from '@/lib/referral';
import { clientIdEmCache, buscarClientId } from '@/lib/googleClientId';

// 🔑 ENTRAR/CADASTRAR COM GOOGLE na lâmina preta da captação privada.
// Reusa exatamente o mesmo fluxo do site (getGoogleClientId + googleLogin com
// ref_code, mantendo a árvore de indicação). Nenhuma lógica de auth nova.
export default function ParceiroGoogleBotao({ onSucesso, onErro, bloqueado, aviso }) {
  const alvo = useRef(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let tentativas = 0;

    const entrar = async (resposta) => {
      if (bloqueado) {
        onErro?.(aviso || 'É necessário aceitar o termo de confidencialidade.');
        return;
      }
      setValidando(true);
      try {
        const r = await base44.functions.invoke('googleLogin', {
          credential: resposta.credential,
          ref_code: getReferral() || '',
        });
        if (!r?.success) {
          onErro?.(r?.error || 'Não foi possível entrar com o Google.');
          setValidando(false);
          return;
        }
        // ⏱️ Registra lentidão do servidor (só acima de 2,5s).
        if (Number(r.duracao_ms) > 2500) {
          base44.entities.SystemLog.create({
            step: 'Login_Google_Lento',
            status: 'warning',
            message: `Login com Google levou ${r.duracao_ms}ms no servidor`,
            component_name: 'ParceiroGoogleBotao',
            execution_time_ms: Number(r.duracao_ms),
            payload: { email: r.user?.email },
          }).catch(() => {});
        }
        localStorage.setItem('currentUser', JSON.stringify(r.user));
        sessionStorage.setItem('isLoggedIn', 'true');
        onSucesso?.(r.user);
      } catch (e) {
        onErro?.('Falha de conexão com o Google. Tente novamente.');
        setValidando(false);
      }
    };

    const desenhar = (clientId) => {
      if (cancelado) return;
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({ client_id: clientId, callback: entrar });
        if (alvo.current) {
          alvo.current.innerHTML = '';
          window.google.accounts.id.renderButton(alvo.current, {
            theme: 'filled_black',
            size: 'large',
            width: 320,
            text: 'continue_with',
            locale: 'pt-BR',
          });
        }
      } else if (tentativas < 20) {
        tentativas += 1;
        setTimeout(() => desenhar(clientId), 250);
      } else {
        setIndisponivel(true);
      }
    };

    // ⚡ Client ID em cache desenha o botão na hora; a confirmação vem depois.
    const emCache = clientIdEmCache();
    if (emCache) desenhar(emCache);
    (async () => {
      const clientId = await buscarClientId(base44);
      if (cancelado) return;
      if (clientId) {
        if (clientId !== emCache) desenhar(clientId);
      } else if (!emCache) {
        setIndisponivel(true);
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bloqueado]);

  if (indisponivel) return null;

  return (
    <div className={bloqueado || validando ? 'pointer-events-none opacity-50' : ''}>
      <div ref={alvo} className="flex justify-center" />
      {validando && (
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.14em] text-pc-tinta-fraca">
          Validando sua conta Google...
        </p>
      )}
    </div>
  );
}