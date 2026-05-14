import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function AcessoVendedor() {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState("validating"); // validating | form | success | invalid
  const [seller, setSeller] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lê token da URL
  const params = new URLSearchParams(location.search);
  const token = params.get("t");

  // Valida token ao carregar
  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setPhase("invalid");
        setErrorMsg("Link inválido: token não fornecido.");
        return;
      }

      try {
        const response = await base44.functions.invoke("validateSellerAccessToken", {
          token,
          action: "check",
        });
        const data = response?.data;
        if (data?.success && data.seller) {
          setSeller(data.seller);
          setPhase("form");
        } else {
          setErrorMsg(data?.error || "Link inválido ou expirado.");
          setPhase("invalid");
        }
      } catch (err) {
        const apiMsg = err?.response?.data?.error;
        setErrorMsg(apiMsg || err.message || "Não foi possível validar o link.");
        setPhase("invalid");
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke("validateSellerAccessToken", {
        token,
        new_password: password,
      });
      const data = response?.data;

      if (data?.success && data.user) {
        // Persiste sessão (mesmo pattern do LoginModal)
        try {
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          sessionStorage.setItem("isLoggedIn", "true");
          sessionStorage.removeItem("userLoggedOut");
        } catch (storageErr) {
          // Storage indisponível, segue mesmo assim
        }

        setPhase("success");
        toast.success("Senha definida! Entrando no seu painel...");

        // Redireciona após pequeno delay (Fase 1: vai pra Home, Fase 2 mudará pra /SellerPanel)
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1500);
      } else {
        toast.error(data?.error || "Não foi possível definir a senha.");
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.error;
      toast.error(apiMsg || err.message || "Erro ao definir senha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68d536db3c26ff51f79c4137/58892a1ef_leilao_nozap_logo_transparent.png"
            alt="Leilão NoZap"
            className="h-16 w-auto mx-auto"
          />
        </div>

        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
          {phase === "validating" && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-green-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-200 font-medium">Validando seu link de acesso...</p>
            </div>
          )}

          {phase === "form" && seller && (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-600/20 border border-green-600/40 mx-auto mb-3 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-xl font-bold text-gray-100">
                  Olá, {(seller.full_name || "").split(" ")[0]}! 👋
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Defina sua senha para acessar seu painel de vendedor.
                </p>
                {seller.email && (
                  <p className="text-xs text-gray-500 mt-2">
                    Seu e-mail de login: <span className="text-gray-300">{seller.email}</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-gray-300">Nova senha</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500 min-h-[44px]"
                    required
                    minLength={6}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Confirmar senha</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-gray-100 placeholder:text-gray-500 min-h-[44px]"
                    required
                    minLength={6}
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Definindo senha...
                    </>
                  ) : (
                    "Acessar meu painel"
                  )}
                </Button>
              </form>
            </>
          )}

          {phase === "success" && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-100 mb-2">Tudo certo!</h2>
              <p className="text-sm text-gray-400">Levando você para o painel...</p>
            </div>
          )}

          {phase === "invalid" && (
            <div className="text-center py-6">
              <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-100 mb-2">Link inválido ou expirado</h2>
              <p className="text-sm text-gray-400 mb-6">
                {errorMsg || "Solicite um novo link de acesso ao licenciado que te cadastrou."}
              </p>
              <a
                href="https://wa.me/5521984072064"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition"
              >
                <MessageCircle className="w-4 h-4" />
                Falar com o suporte
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          Leilão NoZap · Painel do Vendedor
        </p>
      </div>
    </div>
  );
}