import React, { useState, useEffect, useRef } from "react";
import { Loader2, Truck, MapPin, Search, LogIn, Pencil, Check } from "lucide-react";
import { fmtBR } from "@/lib/money";

/**
 * PONTO 82 — CEP em UMA linha: input + botão + resultado.
 * Sem tabelas, sem texto longo, sem amarelo. Nenhum cálculo aqui — só UI:
 * quem cota o frete continua sendo o cotarFrete chamado pela sala.
 *
 * 📮 CAIXINHA DE ENDEREÇO (21/08/2026) — decisão do dono: rua + número
 * confirmados na hora do lance, na mesma caixinha do CEP, sem virar tela nova.
 * Rua/bairro/cidade/UF vêm do ViaCEP (mesmo serviço que o Perfil já usa) —
 * a pessoa só digita o NÚMERO. Confirmado aqui, vale para todo arremate futuro
 * (grava em app_users, a mesma fonte que todo o site já lê).
 */
export default function FreteLanceBanner({
  status, freteValor, cep, onChangeCep, onCalcular,
  enderecoAtual, onConfirmarEndereco, salvandoEndereco, onEditarEndereco,
}) {
  if (status === "ok" && freteValor > 0) {
    return (
      <div className="mx-auto mt-3 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <Truck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1 truncate text-xs text-emerald-100">Frete para seu CEP</span>
        <span className="shrink-0 text-sm font-bold text-emerald-300 tabular-nums">R$ {fmtBR(freteValor)}</span>
        {onEditarEndereco && (
          <button
            type="button"
            onClick={onEditarEndereco}
            className="shrink-0 text-emerald-300/70 hover:text-emerald-200"
            title="Editar endereço de entrega"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-auto mt-3 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-400" />
        <span className="text-xs text-gray-300">Calculando frete…</span>
      </div>
    );
  }

  // 🔴 SESSÃO VELHA. Quem já estava logado antes do crachá existir não tem
  // nenhum, e a cotação passou a exigir crachá válido (B14). Pedir CEP aqui
  // seria mentir: o CEP da pessoa está certo, o que venceu foi a sessão.
  if (status === "needs_login") {
    return (
      <div className="mx-auto mt-3 flex max-w-lg items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.40)' }}>
        <LogIn className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="min-w-0 flex-1 text-xs text-amber-100">
          Sua sessão expirou. Saia e entre de novo para calcular o frete e dar o lance.
        </span>
      </div>
    );
  }

  if (status === "needs_address") {
    return (
      <EnderecoBox
        enderecoAtual={enderecoAtual}
        cep={cep}
        salvando={salvandoEndereco}
        onConfirmar={onConfirmarEndereco}
        freteValor={freteValor}
      />
    );
  }

  if (status === "needs_cep" || status === "error") {
    const falhou = status === "error";
    return (
      <div className="mx-auto mt-3 max-w-lg">
        {/* PONTO 83 — parado é NEUTRO (vermelho antes do erro faz o usuário achar
            que travou e desistir); foco vira verde da marca; erro real é ÂMBAR. */}
        <style>{`
          .nz-cep-form:focus-within { border-color: #1B7A48 !important; box-shadow: 0 0 0 3px rgba(27,122,72,0.18); }
        `}</style>
        <form
          onSubmit={(e) => { e.preventDefault(); onCalcular(cep); }}
          className="nz-cep-form flex items-center gap-2 rounded-xl p-1.5 transition-colors"
          style={{
            background: falhou ? 'rgba(245,158,11,0.07)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${falhou ? 'rgba(245,158,11,0.40)' : 'rgba(255,255,255,0.10)'}`,
          }}
        >
          <MapPin className={`ml-1.5 h-4 w-4 shrink-0 ${falhou ? 'text-amber-400' : 'text-emerald-400'}`} />
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => onChangeCep(e.target.value)}
            maxLength={9}
            className="min-h-[40px] min-w-0 flex-1 bg-transparent text-sm tracking-wider text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Search className="h-3.5 w-3.5" />
            Calcular frete
          </button>
        </form>
        {falhou && (
          <p className="mt-1 px-2 text-[11px] text-amber-400">CEP não encontrado — confira e tente outro.</p>
        )}
      </div>
    );
  }

  return null;
}

/** Rua/bairro/cidade/UF vêm prontos (ViaCEP já rodou no cotarFrete, ou tenta
 * de novo aqui se a pessoa nunca teve endereço nenhum). A pessoa só confirma
 * o número — igual ao Perfil, mesma fonte de dados, mesmo serviço de CEP. */
function EnderecoBox({ enderecoAtual, cep, salvando, onConfirmar, freteValor }) {
  const [street, setStreet] = useState(enderecoAtual?.street || '');
  const [number, setNumber] = useState(enderecoAtual?.number || '');
  const [complement, setComplement] = useState(enderecoAtual?.complement || '');
  const [neighborhood, setNeighborhood] = useState(enderecoAtual?.neighborhood || '');
  const [city, setCity] = useState(enderecoAtual?.city || '');
  const [state, setState] = useState(enderecoAtual?.state || '');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // 🔴 01/09/2026 — O LOOP DO CEP (vídeo do cliente, 20:33).
  //
  // Este efeito começava com `if (street) return;` — só buscava o CEP quando NÃO
  // havia rua nenhuma. Quem já tinha endereço PARCIAL no cadastro (rua, bairro e
  // cidade, mas UF vazia) nunca era completado. E como `podeConfirmar` exige
  // `state`, e NÃO EXISTIA campo de UF nesta tela, o botão "Confirmar endereço e
  // liberar lance" ficava desabilitado para sempre, sem dizer por quê.
  //
  // O cliente do vídeo digitava o número, o botão continuava apagado, ele clicava
  // em "Dar Lance", escolhia o valor, e voltava para o mesmo aviso. Sem erro, sem
  // alerta, sem saída. Medido no quadro: botão em RGB(20,92,66) — metade do verde
  // aceso, que é a assinatura de disabled:opacity-50.
  //
  // Agora busca sempre que FALTAR alguma parte, e preenche SÓ o que está vazio —
  // nunca sobrescreve o que a pessoa digitou.
  const cepBuscado = useRef('');
  useEffect(() => {
    const limpo = String(cep || '').replace(/\D/g, '');
    if (limpo.length !== 8) return;
    if (street && neighborhood && city && state) return;
    // Uma busca por CEP: sem isto, preencher um campo dispara o efeito de novo.
    if (cepBuscado.current === limpo) return;
    cepBuscado.current = limpo;
    let cancelado = false;
    setBuscandoCep(true);
    (async () => {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
        const d = await r.json();
        if (!cancelado && !d.erro) {
          setStreet((v) => v || d.logradouro || '');
          setNeighborhood((v) => v || d.bairro || '');
          setCity((v) => v || d.localidade || '');
          setState((v) => v || (d.uf || '').toUpperCase());
        }
      } catch { /* segue sem — agora existe campo para digitar tudo na mão */ }
      finally { if (!cancelado) setBuscandoCep(false); }
    })();
    return () => { cancelado = true; };
  }, [cep, street, neighborhood, city, state]);

  // Botão apagado sem explicação foi metade do problema: o cliente do vídeo não
  // tinha como saber que faltava a UF (campo que nem existia). Agora, quando não
  // dá para confirmar, a tela DIZ o que falta.
  const faltando = [
    !street.trim() && 'a rua',
    !number.trim() && 'o número',
    !city.trim() && 'a cidade',
    !state.trim() && 'o estado (UF)',
  ].filter(Boolean);
  const podeConfirmar = faltando.length === 0;

  const confirmar = (e) => {
    e.preventDefault();
    if (!podeConfirmar || salvando) return;
    onConfirmar({
      address_zip_code: String(cep || '').replace(/\D/g, ''),
      address_street: street.trim(),
      address_number: number.trim(),
      address_complement: complement.trim() || null,
      address_neighborhood: neighborhood.trim(),
      address_city: city.trim(),
      address_state: state.trim().toUpperCase(),
    });
  };

  return (
    <form onSubmit={confirmar} className="mx-auto mt-3 max-w-lg rounded-xl p-3"
      style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
      <div className="mb-2 flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-100">
          Falta o número da entrega{freteValor > 0 ? ` · frete R$ ${fmtBR(freteValor)}` : ''}
        </span>
        {buscandoCep && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />}
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          placeholder="Rua / Avenida"
          className="min-h-[38px] rounded-lg bg-black/20 px-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Número"
          autoFocus
          className="min-h-[38px] w-24 rounded-lg bg-black/20 px-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
          placeholder="Complemento (opcional)"
          className="min-h-[38px] rounded-lg bg-black/20 px-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="Bairro"
          className="min-h-[38px] rounded-lg bg-black/20 px-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      {/* 🆕 UF ao lado da cidade. `podeConfirmar` sempre exigiu `state` e o campo
          NUNCA existiu nesta tela — quem tinha endereço sem UF no cadastro não
          tinha como liberar o lance, e o botão não dizia por quê. */}
      <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Cidade"
          className="min-h-[38px] rounded-lg bg-black/20 px-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
          placeholder="UF"
          maxLength={2}
          autoCapitalize="characters"
          aria-label="Estado (UF)"
          className="min-h-[38px] w-16 rounded-lg bg-black/20 px-2.5 text-center text-sm uppercase text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>
      <button
        type="submit"
        disabled={!podeConfirmar || salvando}
        className="mt-2.5 flex w-full min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Confirmar endereço e liberar lance
      </button>
      {faltando.length > 0 && (
        <p className="mt-1.5 text-center text-[11px] text-amber-300">
          Falta preencher {faltando.length === 1 ? faltando[0] : `${faltando.slice(0, -1).join(', ')} e ${faltando[faltando.length - 1]}`}.
        </p>
      )}
    </form>
  );
}
