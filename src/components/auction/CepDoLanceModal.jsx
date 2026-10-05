import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Truck, X, Handshake, LogIn } from 'lucide-react';
import { fmtBR } from '@/lib/money';
import { formatarCep, MENSAGEM_PRODUTO_GRANDE } from '@/lib/freteDoLance';
import { pedirNovoLogin } from '@/lib/sessaoCliente';

/**
 * 📮 MODAL DO CEP DO LANCE — 28/09/2026, pedido do dono.
 *
 * Antes: alert() do navegador ("leilaonozap.net diz — Informe seu CEP para
 * calcular o frete antes de dar o lance", botão OK). A pessoa, que queria dar o
 * lance, levava um "não" seco e ainda tinha de achar a caixinha de CEP sozinha.
 *
 * Agora: o CEP é digitado aqui mesmo. Com 8 números a cotação sai sozinha, a
 * cidade aparece enquanto digita, o frete aparece no modal e um toque segue para
 * o lance. Regra do dono para o texto: convidativo, sem vermelho, sem amarelo,
 * sem emoji — nada que pareça erro para quem está com vontade de dar o lance.
 *
 * Nenhuma regra de frete mora aqui: quem cota é o `calcularFreteLance` da sala
 * (o mesmo da caixinha), quem grava o endereço é o `handleConfirmarEndereco`, e
 * quem decide se o lance pode sair continua sendo o `bloqueioDoFrete` —
 * `liberado` é a resposta dele.
 */
export default function CepDoLanceModal({
  acao, status, freteValor, liberado, cepInicial, enderecoAtual, salvandoEndereco,
  onCalcular, onConfirmarEndereco, onContinuar, onFechar,
}) {
  const [cep, setCep] = useState(() => formatarCep(cepInicial));
  const [lugar, setLugar] = useState(null); // {rua, bairro, cidade, uf} do ViaCEP
  const [mexeuDepois, setMexeuDepois] = useState(false);
  const ultimoCotado = useRef(String(cepInicial || '').replace(/\D/g, ''));
  const campo = useRef(null);
  const digitos = cep.replace(/\D/g, '');
  const completo = digitos.length === 8;

  useEffect(() => { campo.current?.focus(); }, []);
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onFechar]);

  // Cidade/UF enquanto digita: a pessoa vê que o CEP "pegou" antes do frete.
  useEffect(() => {
    if (!completo) { setLugar(null); return undefined; }
    let cancelado = false;
    fetch(`https://viacep.com.br/ws/${digitos}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelado && d && !d.erro) {
          setLugar({ rua: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: (d.uf || '').toUpperCase() });
        }
      })
      .catch(() => { /* só enfeite — a cotação segue pelo servidor */ });
    return () => { cancelado = true; };
  }, [digitos, completo]);

  const cotar = (valor = digitos) => {
    if (valor.length !== 8) return;
    ultimoCotado.current = valor;
    setMexeuDepois(false);
    onCalcular(valor);
  };

  const mudarCep = (texto) => {
    const novo = formatarCep(texto);
    setCep(novo);
    setMexeuDepois(true);
    const d = novo.replace(/\D/g, '');
    // 8 números = cota sozinho, sem precisar achar botão
    if (d.length === 8 && d !== ultimoCotado.current) cotar(d);
  };

  const calculando = status === 'loading';
  const semResposta = !calculando && (status === 'idle' || status === 'needs_cep' || mexeuDepois);
  const naoAchou = status === 'error' && !mexeuDepois;
  const temFrete = !mexeuDepois && (status === 'ok' || status === 'a_combinar' || status === 'needs_address');
  const valorAcao = acao?.valor != null && Number(acao.valor) > 0 ? `R$ ${fmtBR(acao.valor)}` : '';
  const textoSeguir = acao?.tipo === 'arremate'
    ? 'Seguir para o arremate'
    : valorAcao ? `Dar lance de ${valorAcao}` : 'Seguir para o lance';
  const cidade = (lugar?.cidade && `${lugar.cidade}/${lugar.uf}`)
    || (enderecoAtual?.city && `${enderecoAtual.city}${enderecoAtual.state ? `/${enderecoAtual.state}` : ''}`) || '';

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-nz-verde-escuro/70 p-4 backdrop-blur-sm animate-in fade-in-0"
      onClick={onFechar}
      data-teste="modal-cep-do-lance"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cep-do-lance-titulo"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-nz-borda bg-white shadow-xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-nz-tinta-fraca hover:bg-nz-cinza-fundo"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-5 pb-5 pt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-nz-verde">Frete do seu lance</p>
          <h2 id="cep-do-lance-titulo" className="mt-1 pr-8 text-xl font-bold text-nz-tinta">Qual é o seu CEP?</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-nz-tinta-fraca">
            Calculamos o frete na hora e você segue direto para o lance.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); cotar(); }} className="mt-4">
            <label htmlFor="cep-do-lance" className="sr-only">CEP</label>
            <div className="flex items-center gap-2 rounded-xl border border-nz-borda bg-nz-cinza-fundo px-3 transition focus-within:border-nz-verde focus-within:bg-white focus-within:ring-4 focus-within:ring-nz-verde/15">
              <MapPin className="h-5 w-5 shrink-0 text-nz-verde" />
              <input
                id="cep-do-lance"
                ref={campo}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => mudarCep(e.target.value)}
                maxLength={9}
                data-teste="campo-cep"
                className="min-h-[52px] min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[0.12em] text-nz-tinta placeholder:font-normal placeholder:text-nz-tinta-fraca/50 focus:outline-none"
              />
              {calculando && <Loader2 className="h-5 w-5 shrink-0 animate-spin text-nz-verde" />}
            </div>
            <p className="mt-1.5 min-h-[18px] px-1 text-xs text-nz-tinta-fraca" data-teste="cep-lugar" aria-live="polite">
              {naoAchou
                ? 'Não achamos esse CEP. Confira os números e tente de novo.'
                : calculando ? 'Calculando o frete…'
                : cidade && !temFrete ? cidade
                : !completo && digitos.length > 0 ? `Faltam ${8 - digitos.length} números` : ''}
            </p>

            {(semResposta || naoAchou) && (
              <button
                type="submit"
                disabled={!completo}
                data-teste="ver-frete"
                className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-nz-verde text-base font-semibold text-white transition hover:bg-nz-verde-claro active:scale-[0.99] disabled:bg-nz-verde/40"
              >
                Ver o frete
              </button>
            )}
          </form>

          {temFrete && (
            <div className="mt-2 flex items-center gap-3 rounded-xl bg-nz-verde-fundo px-3.5 py-3" data-teste="frete-no-modal">
              {status === 'a_combinar'
                ? <Handshake className="h-5 w-5 shrink-0 text-nz-verde" />
                : <Truck className="h-5 w-5 shrink-0 text-nz-verde" />}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-nz-tinta-fraca">{status === 'a_combinar' ? 'Entrega combinada com a equipe' : 'Frete para o seu CEP'}</p>
                {cidade && <p className="truncate text-sm font-medium text-nz-tinta">{cidade}</p>}
              </div>
              <p className="shrink-0 text-lg font-bold tabular-nums text-nz-verde">R$ {fmtBR(freteValor || 0)}</p>
            </div>
          )}

          {status === 'needs_address' && !mexeuDepois && (
            <EnderecoRapido
              enderecoAtual={enderecoAtual}
              lugar={lugar}
              cep={digitos}
              salvando={salvandoEndereco}
              textoSeguir={textoSeguir}
              onConfirmar={async (dados) => { if (await onConfirmarEndereco(dados)) onContinuar(); }}
            />
          )}

          {(status === 'ok' || status === 'a_combinar') && !mexeuDepois && (
            liberado ? (
              <button
                type="button"
                onClick={onContinuar}
                data-teste="continuar-lance"
                className="mt-3 flex min-h-[52px] w-full items-center justify-center whitespace-nowrap rounded-xl bg-nz-verde px-4 text-base font-semibold text-white shadow-sm transition hover:bg-nz-verde-claro active:scale-[0.99]"
              >
                {textoSeguir}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => cotar()}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-xl border border-nz-verde text-sm font-semibold text-nz-verde"
              >
                Confirmar o frete de novo
              </button>
            )
          )}

          {status === 'needs_login' && (
            <div className="mt-3">
              <p className="text-sm text-nz-tinta-fraca">Para calcular o frete, entre de novo na sua conta. Você volta para este leilão.</p>
              <button
                type="button"
                onClick={pedirNovoLogin}
                className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-nz-verde text-base font-semibold text-white"
              >
                <LogIn className="h-4 w-4" /> Entrar
              </button>
            </div>
          )}

          {status === 'produto_grande' && (
            <p className="mt-3 text-sm text-nz-tinta-fraca">{MENSAGEM_PRODUTO_GRANDE}</p>
          )}

          <p className="mt-3 text-center text-[11px] text-nz-tinta-fraca">Seu CEP fica salvo para os próximos lances.</p>
        </div>
      </div>
    </div>
  );
}

/** Frete já cotado, mas falta rua/número para despachar. Rua, bairro e cidade
 * vêm prontos do CEP; na maioria das vezes a pessoa só digita o número. */
function EnderecoRapido({ enderecoAtual, lugar, cep, salvando, textoSeguir, onConfirmar }) {
  const [rua, setRua] = useState(enderecoAtual?.street || '');
  const [numero, setNumero] = useState(enderecoAtual?.number || '');
  const [complemento, setComplemento] = useState(enderecoAtual?.complement || '');
  const [bairro, setBairro] = useState(enderecoAtual?.neighborhood || '');
  const [cidade, setCidade] = useState(enderecoAtual?.city || '');
  const [uf, setUf] = useState(enderecoAtual?.state || '');

  // preenche SÓ o que está vazio — nunca sobrescreve o que a pessoa digitou
  useEffect(() => {
    if (!lugar) return;
    setRua((v) => v || lugar.rua);
    setBairro((v) => v || lugar.bairro);
    setCidade((v) => v || lugar.cidade);
    setUf((v) => v || lugar.uf);
  }, [lugar]);

  const falta = [!rua.trim() && 'a rua', !numero.trim() && 'o número', !cidade.trim() && 'a cidade', !uf.trim() && 'o estado'].filter(Boolean);
  const campo = 'min-h-[44px] w-full rounded-lg border border-nz-borda bg-white px-3 text-sm text-nz-tinta placeholder:text-nz-tinta-fraca/60 focus:border-nz-verde focus:outline-none focus:ring-2 focus:ring-nz-verde/15';
  const localPronto = bairro && cidade && uf;

  return (
    <form
      className="mt-3"
      data-teste="endereco-no-modal"
      onSubmit={(e) => {
        e.preventDefault();
        if (falta.length || salvando) return;
        onConfirmar({
          address_zip_code: cep,
          address_street: rua.trim(),
          address_number: numero.trim(),
          address_complement: complemento.trim() || null,
          address_neighborhood: bairro.trim(),
          address_city: cidade.trim(),
          address_state: uf.trim().toUpperCase(),
        });
      }}
    >
      <p className="text-sm font-medium text-nz-tinta">Só falta o número da entrega</p>
      <div className="mt-2 grid grid-cols-[1fr_88px] gap-2">
        <input value={rua} onChange={(e) => setRua(e.target.value)} placeholder="Rua / Avenida" aria-label="Rua" className={campo} />
        <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número" aria-label="Número" inputMode="numeric" autoFocus data-teste="campo-numero" className={campo} />
      </div>
      <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento (opcional)" aria-label="Complemento" className={`${campo} mt-2`} />
      {localPronto ? (
        <p className="mt-1.5 px-1 text-xs text-nz-tinta-fraca">{bairro} · {cidade}/{uf}</p>
      ) : (
        <div className="mt-2 grid grid-cols-[1fr_1fr_64px] gap-2">
          <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" aria-label="Bairro" className={campo} />
          <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" aria-label="Cidade" className={campo} />
          <input value={uf} onChange={(e) => setUf(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))} placeholder="UF" aria-label="Estado (UF)" className={`${campo} text-center uppercase`} />
        </div>
      )}
      <button
        type="submit"
        disabled={falta.length > 0 || salvando}
        data-teste="salvar-endereco-e-seguir"
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-nz-verde text-base font-semibold text-white transition hover:bg-nz-verde-claro disabled:bg-nz-verde/40"
      >
        {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
        {textoSeguir}
      </button>
      {falta.length > 0 && (
        <p className="mt-1.5 text-center text-xs text-nz-tinta-fraca">
          Falta {falta.length === 1 ? falta[0] : `${falta.slice(0, -1).join(', ')} e ${falta[falta.length - 1]}`}.
        </p>
      )}
    </form>
  );
}
