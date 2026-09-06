import React from 'react';
import { ShoppingCart, MessageSquare, Clock, CheckCircle, Package, Truck, XCircle, Move, X } from 'lucide-react';

// 🌊 DIR-24 Fase 5 (30/08/2026) — FUNIL VISUAL (kanban) por status de compra.
// As colunas são os mesmos status dos cards (mesma fonte, buildUnifiedCustomers)
// — só muda a forma: cada cliente vira um cartão na coluna do seu momento, e o
// vendedor enxerga o funil inteiro de uma vez. Clicar no cartão abre o perfil.
// Cartão de cliente AUTOMÁTICO não se arrasta (o status vem do pedido real —
// quem muda é o pagamento/entrega, não a mão); cliente MANUAL muda de coluna
// pelo perfil (editar), onde já existe o campo de status.
//
// 📱 06/09/2026 — NO CELULAR NÃO MOVIA NADA, e a causa é a API: o arrastar
// nativo do HTML5 (draggable/onDragStart/dataTransfer) é DE MOUSE. Navegador
// de celular não dispara nenhum desses eventos — por isso o card não reagia,
// e sem nem uma mensagem de erro pra denunciar.
//
// A CORREÇÃO NÃO FOI SÓ TROCAR DE API, e a razão importa: mesmo com um motor
// que entende o dedo, ARRASTAR aqui brigaria com a rolagem. Este quadro tem
// 980px de largura mínima e rola pro lado; cada coluna rola pra baixo. Num
// telefone o card ocupa quase toda a coluna, então segurar o card pra mover
// tiraria da pessoa o único lugar de onde ela consegue rolar o quadro.
//
// Então o gesto virou PEGAR e SOLTAR, em dois toques (é o que o Trello faz no
// celular): toca na alça ✥ do card, as colunas acendem, toca na coluna de
// destino. Não disputa com rolagem nenhuma, funciona igual no dedo e no
// mouse, e o toque no corpo do card continua abrindo o perfil como sempre.
// O arrastar do mouse continua existindo, intacto, pra quem já usa assim.
const fmtBRL = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const COLUNAS = [
  { key: 'sem_compra', label: 'Sem Compra', icon: ShoppingCart },
  { key: 'em_negociacao', label: 'Em Negociação', icon: MessageSquare },
  { key: 'aguardando_pagamento', label: 'Aguardando Pag.', icon: Clock },
  { key: 'pago', label: 'Pago', icon: CheckCircle },
  { key: 'enviado', label: 'Enviado', icon: Package },
  { key: 'entregue', label: 'Entregue', icon: Truck },
  { key: 'cancelado', label: 'Cancelado', icon: XCircle },
];

const MAX_POR_COLUNA = 30;

export default function CrmFunilKanban({ customers = [], onAbrirCliente, onMoverManual }) {
  // o card que está "na mão" esperando a coluna de destino
  const [naMao, setNaMao] = React.useState(null);
  const porColuna = Object.fromEntries(COLUNAS.map((c) => [c.key, []]));
  customers.forEach((c) => {
    const key = c.purchase_status || 'sem_compra';
    (porColuna[key] || porColuna.sem_compra).push(c);
  });
  // 🖐️ DIR-29 — arrastar e soltar NATIVO (HTML5, sem lib): só cliente MANUAL
  // se move na mão; o automático tem o status ditado pelo pedido real.
  const aoSoltar = (e, colunaDestino) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const cliente = customers.find((c) => c.id === id);
    if (cliente && (cliente.purchase_status || 'sem_compra') !== colunaDestino) {
      onMoverManual?.(cliente, colunaDestino);
    }
  };
  // soltar na coluna: vale tanto pro toque quanto pro clique
  const soltarNaColuna = (colunaDestino) => {
    const cliente = naMao;
    setNaMao(null);
    if (cliente && (cliente.purchase_status || 'sem_compra') !== colunaDestino) {
      onMoverManual?.(cliente, colunaDestino);
    }
  };

  return (
    <div className="pb-2">
      {/* a faixa que aparece com um card na mão: diz o que fazer e deixa
          desistir. Sem ela, "pegar" um card seria um estado invisível. */}
      {naMao && (
        <div className="flex items-center gap-2 mb-2 rounded-lg border border-nz-verde/40 bg-nz-verde/10 px-3 py-2">
          <Move className="w-3.5 h-3.5 text-nz-verde shrink-0" />
          <p className="text-xs text-nz-tinta flex-1 min-w-0 truncate">
            <span className="font-semibold">{naMao.full_name}</span> na mão — toque na etapa de destino
          </p>
          <button
            type="button"
            onClick={() => setNaMao(null)}
            className="shrink-0 text-nz-tinta-fraca hover:text-nz-tinta"
            title="desistir"
          ><X className="w-4 h-4" /></button>
        </div>
      )}
      <div className="overflow-x-auto">
      <div className="flex gap-3 min-w-[980px]">
        {COLUNAS.map(({ key, label, icon: Icon }) => {
          const lista = porColuna[key];
          const valorColuna = lista.reduce((s, c) => s + (c.total_spent || 0), 0);
          const alvoValido = naMao && (naMao.purchase_status || 'sem_compra') !== key;
          return (
            <div
              key={key}
              className={`flex-1 min-w-[140px] rounded-xl border bg-nz-cinza-fundo/50 transition-colors ${
                alvoValido ? 'border-nz-verde ring-1 ring-nz-verde/40' : 'border-nz-borda'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => aoSoltar(e, key)}
            >
              {/* com um card na mão a coluna inteira vira o botão de soltar */}
              {alvoValido ? (
                <button
                  type="button"
                  onClick={() => soltarNaColuna(key)}
                  className="w-full p-2.5 border-b border-nz-verde/40 flex items-center gap-1.5 bg-nz-verde/10 hover:bg-nz-verde/20"
                >
                  <Icon className="w-3.5 h-3.5 text-nz-verde" />
                  <span className="text-xs font-bold text-nz-verde flex-1 text-left truncate">soltar em {label}</span>
                </button>
              ) : (
                <div className="p-2.5 border-b border-nz-borda flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-nz-tinta-fraca" />
                  <p className="text-xs font-semibold text-nz-tinta flex-1 truncate">{label}</p>
                  <span className="text-xs font-bold text-nz-verde">{lista.length}</span>
                </div>
              )}
              {key !== 'sem_compra' && valorColuna > 0 && (
                <p className="px-2.5 pt-1.5 text-[10px] text-nz-tinta-fraca">{fmtBRL(valorColuna)} em clientes aqui</p>
              )}
              <div className="p-2 space-y-1.5 max-h-[420px] overflow-y-auto">
                {lista.slice(0, MAX_POR_COLUNA).map((c) => {
                  const arrastavel = c.origin_type === 'manual';
                  return (
                  <div
                    key={c.id}
                    draggable={arrastavel}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)}
                    className={`flex items-stretch rounded-lg border bg-white transition-colors ${
                      naMao?.id === c.id ? 'border-nz-verde ring-1 ring-nz-verde/40' : 'border-nz-borda hover:border-nz-verde/50'}`}
                  >
                    <button
                      type="button"
                      onClick={() => onAbrirCliente?.(c)}
                      title="abrir o perfil"
                      className="flex-1 min-w-0 text-left p-2"
                    >
                      <p className="text-xs font-semibold text-nz-tinta truncate">{c.full_name}</p>
                      <p className="text-[10px] text-nz-tinta-fraca truncate">
                        {c.total_spent > 0 ? fmtBRL(c.total_spent) : (c.email || c.phone || '—')}
                      </p>
                    </button>
                    {/* ✥ A ALÇA. Ela existe porque o toque no card já tem dono:
                        abrir o perfil. Sem um alvo separado, "pegar pra mover"
                        e "abrir" seriam o mesmo gesto — e no celular não há
                        clique-com-o-outro-botão pra desempatar. Só aparece no
                        cliente MANUAL: no automático o status vem do pedido
                        real e mover na mão seria mentira. */}
                    {arrastavel && (
                      <button
                        type="button"
                        onClick={() => setNaMao(naMao?.id === c.id ? null : c)}
                        title={naMao?.id === c.id ? 'largar' : 'pegar para mudar de etapa'}
                        className={`shrink-0 px-2 flex items-center border-l rounded-r-lg cursor-grab active:cursor-grabbing ${
                          naMao?.id === c.id
                            ? 'border-nz-verde/40 bg-nz-verde/15 text-nz-verde'
                            : 'border-nz-borda text-nz-tinta-fraca hover:text-nz-verde hover:bg-nz-verde/5'}`}
                      >
                        <Move className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  );
                })}
                {lista.length > MAX_POR_COLUNA && (
                  <p className="text-[10px] text-center text-nz-tinta-fraca pt-1">+ {lista.length - MAX_POR_COLUNA} — refine os filtros</p>
                )}
                {lista.length === 0 && <p className="text-[10px] text-center text-nz-tinta-fraca py-3">vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
