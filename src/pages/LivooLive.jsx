import React, { useState } from "react";
import { Radio, Bell, ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

/**
 * 🔴 LivooLive — Página placeholder oficial (FASE 4A)
 *
 * Livoo é a plataforma de live commerce parceira oficial da Leilão NoZap
 * (sócio Diogo Arxanjo / Orcângeo). A integração real ainda não chegou —
 * essa página captura leads interessados até o lançamento.
 *
 * Lead salvo em InfluencerLead com influencer_code = 'livoo_waitlist'.
 */
export default function LivooLive() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setError("Por favor, informe um e-mail válido.");
      return;
    }

    setSending(true);
    try {
      await base44.entities.InfluencerLead.create({
        influencer_id: "livoo_waitlist",
        influencer_code: "livoo_waitlist",
        lead_email: clean,
        status: "pending",
      });
      setSent(true);
      setEmail("");
    } catch (err) {
      console.error("[LivooLive] Erro ao salvar lead:", err);
      setError("Não foi possível registrar agora. Tente novamente em instantes.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "radial-gradient(circle at 20% 0%, rgba(236, 72, 153, 0.15), transparent 50%), radial-gradient(circle at 80% 100%, rgba(249, 115, 22, 0.12), transparent 50%), #0a0f1c",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <Link
            to="/leiloes"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>

          {/* Selo Em Breve */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 mb-6">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
            <span className="text-xs font-semibold text-pink-300 uppercase tracking-wider">
              Em Breve — Parceria Oficial
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
              Livoo Live
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 font-semibold">
            A plataforma oficial de live commerce da Leilão NoZap
          </p>

          <p className="text-base md:text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            As lives acontecem na Livoo — assista, interaja com o vendedor na tela e
            compre em tempo real. Estamos finalizando a integração para trazer a
            experiência completa até você.
          </p>

          {/* Formulário de captura */}
          <div className="max-w-md mx-auto bg-gray-800/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            {sent ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 mb-3">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-emerald-300 font-semibold mb-1">Tudo certo!</p>
                <p className="text-sm text-gray-400">
                  Vamos te avisar assim que a Livoo Live estiver no ar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2 justify-center text-sm text-gray-300 mb-2">
                  <Bell className="w-4 h-4 text-pink-400" />
                  <span>Me avise quando lançar</span>
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-gray-900/60 border-gray-700 text-white h-12 text-base"
                  disabled={sending}
                />
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full h-12 text-base font-bold text-white border-0"
                  style={{
                    background: "linear-gradient(135deg, #ec4899 0%, #f97316 100%)",
                  }}
                >
                  {sending ? "Registrando..." : "Quero ser avisado"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Sobre a Livoo */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-pink-500/15 flex items-center justify-center mb-4">
              <Radio className="w-5 h-5 text-pink-400" />
            </div>
            <h3 className="font-bold text-white mb-2">Lives ao vivo</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Produtos apresentados por vendedores em tempo real, com estoque
              exclusivo pra quem tá assistindo.
            </p>
          </div>

          <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center mb-4">
              <span className="text-lg">🎁</span>
            </div>
            <h3 className="font-bold text-white mb-2">Ofertas exclusivas</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Preços de live valem só durante a transmissão. Depois volta ao normal.
            </p>
          </div>

          <div className="bg-gray-800/40 border border-white/5 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center mb-4">
              <span className="text-lg">💬</span>
            </div>
            <h3 className="font-bold text-white mb-2">Chat direto</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Tire dúvidas com o vendedor durante a live e feche a compra na hora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}