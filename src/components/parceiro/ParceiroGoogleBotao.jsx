import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getReferral } from '@/lib/referral';

// 🔑 ENTRAR/CADASTRAR COM GOOGLE na lâmina preta da captação privada.
// Reusa exatamente o mesmo fluxo do site (getGoogleClientId + googleLogin com
// ref_code, mantendo a árvore de indicação). Nenhuma lógica de auth nova.
export default function ParceiroGoogleBotao({ onSucesso, onErro, bloqueado, aviso }) {
  const alvo = useRef(null);
  const [indisponivel, setIndisponivel] = useState(false);

  useEffect(() => {
    let cancelado = false;
    let tentativas = 0;

    const entrar = async (resposta) => {
      if (bloqueado) {
        onErro?.(aviso || 'É necessário aceitar o termo de confidencialidade.');
        return;
      }
      try {
        const r = await base44.functions.invoke('googleLogin', {
          credential: resposta.credential,
          ref_code: getReferral() || '',
        });
        if (!r?.success) {
          onErro?.(r?.error || 'Não foi possível entrar com o Google.');
          return;
        }
        localStorage.setItem('currentUser', JSON.stringify(r.user));
        sessionStorage.setItem('isLoggedIn', 'true');
        onSucesso?.(r.user);
      } catch (e) {
        onErro?.('Falha de conexão com o Google. Tente novamente.');
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

    (async () => {
      try {
        const res = await base44.functions.invoke('getGoogleClientId', {});
        if (res?.clientId) desenhar(res.clientId);
        else setIndisponivel(true);
      } catch {
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
    <div className={bloqueado ? 'pointer-events-none opacity-50' : ''}>
      <div ref={alvo} className="flex justify-center" />
    </div>
  );
}