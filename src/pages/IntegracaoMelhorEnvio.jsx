// PONTO 81 — Página de autorização do Melhor Envio (uso do admin).
// Recebe o ?code= do callback OAuth e manda pro backend trocar por token.
// O token NUNCA aparece aqui: a página só mostra "autorizado" ou o erro.
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Truck, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";

export default function IntegracaoMelhorEnvio() {
  const [status, setStatus] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  // O backend valida o cargo pelo actorId (mesmo padrão das outras rotas de admin
  // deste app). Sem isso a função recusa por segurança.
  const chamar = useCallback(async (acao, extra = {}) => {
    let actorId = null;
    try { actorId = JSON.parse(localStorage.getItem("currentUser") || "null")?.id || null; } catch { actorId = null; }
    return await base44.functions.invoke("melhorEnvioOAuth", { acao, actorId, ...extra });
  }, []);

  const lerStatus = useCallback(async () => {
    try {
      const r = await chamar("status");
      if (r?.ok) setStatus(r);
      else setErro(r?.error || "Não foi possível ler o status.");
    } catch (e) {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }, [chamar]);

  // Se voltou do Melhor Envio com ?code=, troca por token automaticamente.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const erroUrl = params.get("error");

    if (erroUrl) {
      setErro("A autorização foi recusada ou cancelada no Melhor Envio.");
      setCarregando(false);
      return;
    }

    if (!code) {
      lerStatus();
      return;
    }

    (async () => {
      try {
        const esperado = sessionStorage.getItem("me_oauth_state");
        const recebido = params.get("state");
        if (esperado && recebido && esperado !== recebido) {
          setErro("Verificação de segurança falhou (state divergente). Comece a autorização novamente.");
          setCarregando(false);
          return;
        }
        const r = await chamar("trocar", { code });
        // limpa o code da barra de endereço na hora (é credencial de uso único)
        window.history.replaceState(null, "", "/integracoes/melhor-envio");
        sessionStorage.removeItem("me_oauth_state");
        if (r?.ok) {
          setOk("Autorização concluída com sucesso.");
          await lerStatus();
        } else {
          setErro(r?.error || "Não foi possível concluir a autorização.");
          setCarregando(false);
        }
      } catch (e) {
        setErro("Falha ao concluir a autorização.");
        setCarregando(false);
      }
    })();
  }, [chamar, lerStatus]);

  const autorizar = async () => {
    setErro("");
    try {
      const r = await chamar("autorizar_url");
      if (!r?.ok || !r?.url) {
        setErro(r?.error || "Não foi possível montar o link de autorização.");
        return;
      }
      sessionStorage.setItem("me_oauth_state", r.state);
      window.location.href = r.url;
    } catch (e) {
      setErro("Não foi possível iniciar a autorização.");
    }
  };

  const renovar = async () => {
    setErro("");
    setOk("");
    const r = await chamar("renovar");
    if (r?.ok) {
      setOk("Token renovado.");
      await lerStatus();
    } else {
      setErro(r?.error || "Não foi possível renovar.");
    }
  };

  const dataBr = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("pt-BR"); } catch { return "—"; }
  };

  return (
    <div className="min-h-screen bg-nz-cinza-fundo px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-nz-verde text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-nz-tinta">Melhor Envio — Autorização</h1>
            <p className="text-sm text-nz-tinta-fraca">Libera etiquetas e leitura de pedidos</p>
          </div>
        </div>

        <div className="rounded-2xl border border-nz-borda bg-white p-5 shadow-sm">
          {carregando ? (
            <div className="flex items-center gap-2 text-nz-tinta-fraca">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
            </div>
          ) : (
            <>
              {ok && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-nz-verde-fundo p-3 text-sm text-nz-verde">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{ok}</span>
                </div>
              )}
              {erro && (
                <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{erro}</span>
                </div>
              )}

              <dl className="mb-5 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-nz-tinta-fraca">Ambiente</dt>
                  <dd className="font-semibold text-nz-tinta">
                    {status?.ambiente === "producao" ? "Produção (pedidos reais)" : "Sandbox (teste)"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-nz-tinta-fraca">Situação</dt>
                  <dd className="font-semibold text-nz-tinta">
                    {status?.autorizado ? (status?.vencido ? "Autorizado (token vencido)" : "Autorizado") : "Não autorizado"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-nz-tinta-fraca">Válido até</dt>
                  <dd className="text-nz-tinta">{dataBr(status?.expira_em)}</dd>
                </div>
                <div className="flex flex-col gap-1 border-t border-nz-borda pt-2">
                  <dt className="text-nz-tinta-fraca">URL de callback cadastrada</dt>
                  <dd className="break-all font-mono text-xs text-nz-tinta">{status?.redirect_uri || "—"}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={autorizar}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-nz-verde px-4 font-semibold text-white transition hover:brightness-110"
                >
                  <ExternalLink className="h-4 w-4" />
                  {status?.autorizado ? "Autorizar novamente" : "Autorizar no Melhor Envio"}
                </button>
                {status?.autorizado && (
                  <button
                    type="button"
                    onClick={renovar}
                    className="min-h-[44px] rounded-xl border border-nz-borda px-4 font-semibold text-nz-tinta transition hover:bg-nz-cinza-fundo"
                  >
                    Renovar token
                  </button>
                )}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-nz-tinta-fraca">
                Esta tela não altera o cálculo de frete da loja, que continua funcionando normalmente.
                Sandbox e produção são contas separadas no Melhor Envio: autorizar em uma não vale para a outra.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}