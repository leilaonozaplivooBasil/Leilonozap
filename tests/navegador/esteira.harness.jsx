/**
 * Banca da ESTEIRA DE CAPTAÇÃO — clique da fila até o card, e a mãozinha
 * (tour guiado). NÃO vai para o bundle do app.
 *
 * 🔴 POR QUE ISTO EXISTE (08/09/2026)
 * Dono: "eu estou com dificuldade de ver aonde é o contato pra entrar na
 * esteira." O bug de verdade: a fila "Quem contatar hoje" abria o cliente
 * (às vezes vazio, quando a oportunidade não tinha e-mail) em vez do card
 * da negociação. Esta banca liga fila + esteira exatamente como
 * CrmClientesTab.jsx faz (mesmas props, mesma função de pular de aba), sem
 * montar a aba inteira (gigante, com dezenas de outras dependências).
 */
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import '@/index.css';
import CrmQuemContatar from '@/components/licensing/CentralVendas/CrmQuemContatar';
import CrmEsteiraCaptacao from '@/components/licensing/CentralVendas/CrmEsteiraCaptacao';
import { quemContatarHoje } from '@/lib/quemContatarHoje';
import { alertasEsteira } from '@/lib/esteiraCaptacao';

const REF = new Date('2026-09-08T12:00:00Z'); // terça — a reunião de ontem já "aconteceu"

const OPORTUNIDADES = [
  {
    id: 'op1', cliente_nome: 'Marina Alves', cliente_email: '', cliente_telefone: '11988887777',
    tipo: 'aporte_parceiro', valor_previsto: 50000, estagio: 'reuniao_agendada',
    reuniao_em: '2026-09-07T15:00:00Z', // ontem — "aconteceu", sem e-mail (o caso que quebrava)
    responsavel_id: 'exec1', responsavel_nome: 'Ribeiro', estagio_desde: '2026-09-05',
  },
];

// 🪜 08/09/2026 — a Lista do Método (Hábito 3): a Roberta já fez tudo
// (qualificada, contatada, reunião marcada) — a mãozinha não deve avisar
// nada pra ela. O Diego não fez nada — clicar "Nova oportunidade" e digitar
// o telefone dele tem que acender o aviso "🪜 antes da esteira...".
const CLIENTES_MANUAIS = [
  {
    id: 'cm1', full_name: 'Roberta Nunes', email: 'roberta@exemplo.com', phone: '11977776666',
    qualificacao_network: { confianca: 5, financeiro: 4, apetite: 5 },
    contatos_metodo: [{ resultado: 'agendado', quando: '2026-09-10T10:00:00Z', em: '2026-09-08T09:00:00Z' }],
  },
  { id: 'cm2', full_name: 'Diego Prado', email: 'diego@exemplo.com', phone: '11966665555', qualificacao_network: null, contatos_metodo: [] },
];

window.__foiPara = []; // registra pra onde o botão "ir qualificar/registrar" mandou

function Banca() {
  const [oportunidades] = useState(OPORTUNIDADES);
  const [oportunidadeParaAbrir, setOportunidadeParaAbrir] = useState(null);
  const alertas = alertasEsteira(oportunidades, REF);
  const fila = quemContatarHoje({ unifiedCustomers: [], sales: [], alertasEsteiraLista: alertas, ref: REF });

  return (
    <div className="min-h-screen bg-nz-cinza-fundo p-4 sm:p-6">
      <Toaster position="top-center" />
      <CrmQuemContatar fila={fila} onAbrirOportunidade={setOportunidadeParaAbrir} />
      <CrmEsteiraCaptacao
        oportunidades={oportunidades}
        sales={[]}
        executivos={[{ user: { id: 'exec1', full_name: 'Ribeiro' }, funcaoPrincipal: 'executivo_conta' }]}
        usuariosApp={[]}
        clientes={[]}
        clientesManuais={CLIENTES_MANUAIS}
        currentUser={{ id: 'exec1', full_name: 'Ribeiro' }}
        visaoTotal
        onSalvar={async () => {}}
        onRegistrarAporteExterno={async () => {}}
        oportunidadeParaAbrir={oportunidadeParaAbrir}
        onOportunidadeParaAbrirConsumida={() => setOportunidadeParaAbrir(null)}
        onIr={(sec) => window.__foiPara.push(sec)}
      />
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<Banca />);
