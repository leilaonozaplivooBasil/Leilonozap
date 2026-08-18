import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gavel, Loader2 } from "lucide-react";
import { fmtBR } from "@/lib/money";

const AuctionMessage = base44.entities.AuctionMessage;
const AppUser = base44.entities.AppUser;

// 🔎 PONTO 85 — histórico completo (somente leitura) de todos os lances de um
// leilão, com identidade do arrematante (nome, e-mail, telefone quando disponível).
// Não altera nenhuma lógica de lance/saldo — só lê AuctionMessage e AppUser.
export default function BidHistoryCard({ auctionId }) {
  const [bids, setBids] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auctionId) return;
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const messages = await AuctionMessage.filter({ auction_id: auctionId });
        const bidMessages = (messages || [])
          .filter((m) => m.message_type === "bid" && Number(m.bid_amount) > 0)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        const senderIds = [...new Set(bidMessages.map((m) => m.sender_id).filter(Boolean))];
        const usersById = {};
        await Promise.all(senderIds.map(async (id) => {
          try {
            const found = await AppUser.filter({ id });
            if (found && found[0]) usersById[id] = found[0];
          } catch (_) { /* usuário não encontrado, segue sem e-mail/telefone */ }
        }));

        if (active) {
          setBids(bidMessages.map((m) => ({
            ...m,
            email: usersById[m.sender_id]?.email || "",
            phone: usersById[m.sender_id]?.phone || "",
          })));
        }
      } catch (e) {
        console.error("Erro ao carregar histórico de lances:", e);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [auctionId]);

  return (
    <Card className="rounded-2xl border-white/[0.06]" style={{ background: 'linear-gradient(160deg, rgba(26,34,48,0.92) 0%, rgba(16,21,30,0.97) 60%)', boxShadow: '0 10px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 grid place-items-center shrink-0">
            <Gavel className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-white text-base">Histórico de Lances</CardTitle>
            <p className="text-xs text-slate-400 mt-1">Todos os lances deste leilão, do mais recente ao mais antigo.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          </div>
        ) : bids.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nenhum lance registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {bids.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d1117]/80 border border-white/10 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{b.sender_name || "Participante"}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {b.email || "sem e-mail"}{b.phone ? ` · ${b.phone}` : ""}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {b.created_date ? new Date(b.created_date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : ''}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-emerald-400 text-sm">R$ {fmtBR(b.bid_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}