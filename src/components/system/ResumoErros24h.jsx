import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  BadgeAlert,
  Banknote,
  Monitor,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { SystemLog } from '@/entities/SystemLog';

/**
 * ResumoErros24h — PONTO 88 (FASE 2)
 *
 * Resumo em PORTUGUÊS dos erros das últimas 24h, para o dono do sistema ler
 * sem saber nada de código. Fica no TOPO da página de Diagnóstico do Sistema.
 *
 * REGRAS DESTE ARQUIVO:
 *   • SOMENTE LEITURA. Não grava, não apaga, não corrige nada.
 *   • Não altera as abas/filtros/exportação que já existem na página.
 *   • ZERO emoji (regra permanente do painel admin) — só ícones lucide.
 *
 * ⚠️ Se aparecer vazio, é porque NÃO houve erro registrado nas últimas 24h —
 * e a tela diz isso com letras, em vez de fingir que não carregou.
 */

// Palavras que indicam que o erro tocou DINHEIRO. Qualquer uma delas presente
// no nome da função, na etapa ou na mensagem já promove o erro para o
// destaque vermelho — é melhor um alerta a mais do que um prejuízo escondido.
const PALAVRAS_DINHEIRO = [
  'pagamento', 'payment', 'pay', 'pix', 'asaas', 'mercadopago', 'mercado_pago',
  'comissao', 'comissão', 'commission',
  'saldo', 'balance', 'carteira', 'wallet',
  'lance', 'bid', 'arremat',
  'frete', 'shipping', 'melhorenvio', 'melhor_envio',
  'saque', 'withdrawal', 'deposito', 'depósito', 'deposit',
  'checkout', 'pedido', 'order', 'venda', 'sale',
];

function ehDeDinheiro(log) {
  const alvo = `${log?.component_name || ''} ${log?.step || ''} ${log?.message || ''}`.toLowerCase();
  return PALAVRAS_DINHEIRO.some((p) => alvo.includes(p));
}

// Nome amigável da origem: "funcao:createMPPix" → "createMPPix".
function origemAmigavel(log) {
  const bruto = log?.component_name || log?.step || 'Origem não informada';
  return String(bruto).replace(/^funcao:/i, '');
}

// Assinatura de agrupamento: mesma origem + mensagem SEM os números.
// ⚠️ Sem tirar os números, "Requisição lenta: 26252ms" e "...: 27469ms" contam
// como problemas diferentes e o "mais repetiu" some — foi o que o teste mostrou.
function assinatura(log) {
  const semNumeros = String(log?.message || '')
    .replace(/\d+/g, '#')
    .slice(0, 80);
  return `${origemAmigavel(log)}||${semNumeros}`;
}

// Texto do grupo já sem os números, para não exibir um valor de um caso só.
function mensagemGrupo(log) {
  return String(log?.message || '').replace(/\d[\d.,]*/g, '…');
}

export default function ResumoErros24h() {
  const [logs, setLogs] = useState(null); // null = ainda carregando
  const [erroAoCarregar, setErroAoCarregar] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroAoCarregar(null);
    try {
      // Busca os últimos registros e recorta 24h no navegador — evita depender
      // de filtro por data no banco, que varia de ambiente para ambiente.
      // ⚠️ A coluna real no banco é `created_at` (NÃO `created_date`). Ordenar
      // por `created_date` faz o banco recusar a consulta inteira — foi
      // exatamente o que o primeiro teste desta fase mostrou.
      const recentes = await SystemLog.list('-created_at', 500);
      const limite = Date.now() - 24 * 60 * 60 * 1000;
      const dentro = (recentes || []).filter((l) => {
        const quando = new Date(l.created_date || l.created_at || 0).getTime();
        return Number.isFinite(quando) && quando >= limite;
      });
      setLogs(dentro);
    } catch (e) {
      setErroAoCarregar(e?.message || 'Não foi possível ler o histórico agora.');
      setLogs([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // 📱 Celular suspende a aba em segundo plano: ao voltar para o app, recarrega
  // na hora — senão o dono olha um resumo velho pensando que é o de agora.
  useEffect(() => {
    const aoVoltar = () => { if (!document.hidden) carregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, [carregar]);

  if (logs === null) {
    return (
      <Card className="bg-gray-800 border-gray-700 mb-6">
        <CardContent className="p-6 text-gray-400 text-sm">Lendo o histórico das últimas 24 horas...</CardContent>
      </Card>
    );
  }

  const erros = logs.filter((l) => l.status === 'error');
  const avisos = logs.filter((l) => l.status === 'warning');
  const problemas = [...erros, ...avisos];

  const noCelular = problemas.filter((l) => l.is_mobile === true).length;
  const noComputador = problemas.filter((l) => l.is_mobile === false).length;
  const semDispositivo = problemas.length - noCelular - noComputador;

  const deDinheiro = problemas.filter(ehDeDinheiro);

  // Top 5 problemas que mais repetiram
  const grupos = new Map();
  for (const l of problemas) {
    const chave = assinatura(l);
    const atual = grupos.get(chave);
    if (atual) atual.vezes += 1;
    else grupos.set(chave, { vezes: 1, origem: origemAmigavel(l), mensagem: mensagemGrupo(l), status: l.status });
  }
  const top5 = [...grupos.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 5);

  const Numero = ({ icone: Icone, valor, rotulo, cor }) => (
    <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
      <Icone className={`h-5 w-5 shrink-0 ${cor}`} />
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none text-white">{valor}</p>
        <p className="truncate text-xs text-gray-400">{rotulo}</p>
      </div>
    </div>
  );

  return (
    <Card className="mb-6 border-gray-700 bg-gray-800">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Resumo das últimas 24 horas</h2>
            <p className="text-xs text-gray-400">O que deu errado no sistema, em português</p>
          </div>
          <Button onClick={carregar} variant="outline" size="sm" disabled={carregando} className="min-h-[44px]">
            <RefreshCw className={`mr-2 h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {erroAoCarregar && (
          <p className="mb-4 rounded-lg border border-red-700 bg-red-900/20 p-3 text-sm text-red-300">
            Não foi possível ler o histórico agora: {erroAoCarregar}
          </p>
        )}

        {problemas.length === 0 && !erroAoCarregar ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-700 bg-emerald-900/20 p-4">
            <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-400" />
            <div>
              <p className="font-bold text-white">Nenhum erro registrado nas últimas 24 horas</p>
              <p className="text-xs text-gray-400">
                Isso significa que nada foi registrado nesse período — não que o sistema esteja sem falhas.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Numero icone={AlertTriangle} valor={erros.length} rotulo="erros" cor="text-red-400" />
              <Numero icone={BadgeAlert} valor={avisos.length} rotulo="avisos" cor="text-yellow-400" />
              <Numero icone={Smartphone} valor={noCelular} rotulo="no celular" cor="text-purple-400" />
              <Numero icone={Monitor} valor={noComputador} rotulo="no computador" cor="text-blue-400" />
            </div>

            {semDispositivo > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {semDispositivo} {semDispositivo === 1 ? 'registro' : 'registros'} sem informação de aparelho.
              </p>
            )}

            {/* Honestidade sobre o alcance: são os 500 registros mais recentes.
                Se as 24h tiverem mais que isso, o resumo é uma amostra. */}
            {logs.length >= 500 && (
              <p className="mt-2 text-xs text-amber-300/80">
                Volume alto: este resumo considera os 500 registros mais recentes das últimas 24 horas.
              </p>
            )}

            {/* 🔴 Destaque separado: erro que tocou dinheiro nunca pode ficar
                misturado no meio da lista comum. */}
            {deDinheiro.length > 0 && (
              <div className="mt-4 rounded-lg border-2 border-red-600 bg-red-900/20 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Banknote className="h-5 w-5 shrink-0 text-red-400" />
                  <h3 className="font-bold text-white">
                    Atenção: {deDinheiro.length} {deDinheiro.length === 1 ? 'falha' : 'falhas'} em área de dinheiro
                  </h3>
                </div>
                <p className="mb-3 text-xs text-red-200/80">
                  Pagamento, comissão, saldo, carteira, lance, frete ou pedido. Confira estes primeiro.
                </p>
                <ul className="space-y-2">
                  {deDinheiro.slice(0, 5).map((l, i) => (
                    <li key={i} className="rounded border border-red-800/60 bg-gray-900/50 p-2">
                      <p className="text-sm font-medium text-white break-words">{origemAmigavel(l)}</p>
                      <p className="text-xs text-gray-400 break-words">{l.message}</p>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {new Date(l.created_date || l.created_at).toLocaleString('pt-BR')}
                        {l.is_mobile === true && ' · celular'}
                        {l.is_mobile === false && ' · computador'}
                      </p>
                    </li>
                  ))}
                </ul>
                {deDinheiro.length > 5 && (
                  <p className="mt-2 text-xs text-red-200/70">
                    e mais {deDinheiro.length - 5}. A lista completa está nas abas abaixo.
                  </p>
                )}
              </div>
            )}

            {top5.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-2">
                  <Repeat2 className="h-4 w-4 shrink-0 text-gray-400" />
                  <h3 className="text-sm font-bold text-white">O que mais repetiu</h3>
                </div>
                <ul className="space-y-2">
                  {top5.map((g, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                      <span
                        className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
                          g.status === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-yellow-900/50 text-yellow-300'
                        }`}
                      >
                        {g.vezes}x
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white break-words">{g.origem}</p>
                        <p className="text-xs text-gray-400 break-words">{g.mensagem}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}