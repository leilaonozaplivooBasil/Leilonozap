import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check, Images } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// 🔍 PONTO 77 — Buscador Inteligente de Fotos (reaproveita a MESMA função já em
// produção no fluxo de catálogo: extractGoogleShoppingImages).
// ⚠️ De propósito ele devolve SOMENTE URLs de imagem (onSelect) — nunca título,
// descrição ou preço. Em leilão que já tem lance, sobrescrever esses campos seria
// destrutivo. Quem quiser o pacote completo usa o GoogleShoppingImporter (criação).
const IDEAL = 6;

export default function BuscadorFotos({ productName = "", onSelect, jaTem = 0 }) {
  const [termo, setTermo] = useState(productName);
  const [buscando, setBuscando] = useState(false);
  const [fotos, setFotos] = useState([]);
  const [escolhidas, setEscolhidas] = useState([]);

  const buscar = async () => {
    const nome = (termo || "").trim();
    if (nome.length < 3) {
      toast.error("Digite pelo menos 3 caracteres do nome do produto");
      return;
    }
    setBuscando(true);
    setFotos([]);
    setEscolhidas([]);
    try {
      const resp = await base44.functions.invoke("extractGoogleShoppingImages", { productName: nome });
      // ⚠️ CAUSA-RAIZ PONTO 77: aqui se lia resp.data.data.products[].imageUrl, campo
      // que esta função NUNCA devolveu — ela devolve { success, images: [...] }. Por
      // isso TODA busca caía em "Nenhuma foto encontrada", com título curto ou longo.
      // O adapter devolve o JSON cru; .data é só rede de segurança.
      // Existem DOIS backends com formatos diferentes (Vercel devolve { images: [] },
      // o runtime Deno devolve { products: [{ imageUrl }] }) e o adapter às vezes
      // aninha em .data. Aceita todos — assim a tela não depende de qual respondeu.
      const camadas = [resp, resp?.data, resp?.data?.data].filter(Boolean);
      const dados = camadas.find((c) => c.images || c.products) || {};
      const urls = [
        ...(dados.images || []),
        ...(dados.products || []).map((p) => p?.imageUrl || p?.image),
      ].filter((u, i, arr) => typeof u === "string" && /^https?:\/\//i.test(u) && arr.indexOf(u) === i);
      if (urls.length === 0) {
        // Mensagem honesta: "não achei" é diferente de "a busca falhou".
        if (dados.motivo === "falha_busca") {
          toast.error("A busca de fotos falhou: " + (dados.error || "erro na API"));
        } else {
          toast.error("Nenhuma foto encontrada para \"" + (dados.query_usada || nome) + "\". Tente marca + modelo.");
        }
        return;
      }
      // Mostra o termo que REALMENTE foi usado (a busca simplifica o título) —
      // o usuário pode editar e buscar de novo.
      if (dados.query_usada) setTermo(dados.query_usada);
      setFotos(urls);
      // já vem com as 6 primeiras marcadas — o caminho natural é sair com 6 fotos
      setEscolhidas(urls.slice(0, IDEAL));
      toast.success(`${urls.length} fotos encontradas`);
    } catch (e) {
      toast.error("Erro na busca: " + e.message);
    } finally {
      setBuscando(false);
    }
  };

  const alternar = (url) =>
    setEscolhidas((prev) => (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

  const aplicar = () => {
    if (escolhidas.length === 0) {
      toast.error("Selecione pelo menos 1 foto");
      return;
    }
    onSelect(escolhidas);
    setFotos([]);
    setEscolhidas([]);
  };

  const total = jaTem + escolhidas.length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !buscando) { e.preventDefault(); buscar(); } }}
          placeholder="Nome do produto (marca + modelo)"
          className="bg-[#0d1117]/80 border-white/10 text-white h-11 rounded-xl"
          disabled={buscando}
        />
        <Button
          type="button"
          onClick={buscar}
          disabled={buscando || (termo || "").trim().length < 3}
          className="h-11 shrink-0 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold px-4"
        >
          {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="ml-2 hidden sm:inline">{buscando ? "Buscando..." : "Buscar Fotos"}</span>
        </Button>
      </div>

      {fotos.length > 0 && (
        <>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Images className="w-3.5 h-3.5 text-sky-400" />
            Toque para marcar ou desmarcar — ideal {IDEAL} fotos
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
            {fotos.map((url) => {
              const on = escolhidas.includes(url);
              return (
                <button
                  type="button"
                  key={url}
                  onClick={() => alternar(url)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all min-h-[88px] ${on ? "border-emerald-500" : "border-white/10 opacity-60 hover:opacity-100"}`}
                >
                  <div className="w-full h-20 bg-[#0d1117] flex items-center justify-center p-1">
                    <img
                      src={url}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                  {on && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-emerald-500 grid place-items-center">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            onClick={aplicar}
            disabled={escolhidas.length === 0}
            className={`w-full h-11 rounded-xl font-bold text-white ${total >= IDEAL ? "bg-emerald-600 hover:bg-emerald-500" : "bg-sky-600 hover:bg-sky-500"}`}
          >
            <Check className="w-4 h-4 mr-2" />
            Adicionar {escolhidas.length} foto(s) — ficará com {total}
          </Button>
        </>
      )}
    </div>
  );
}