import React, { useState, useMemo } from 'react';
import { fmtBR } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, Phone, Send, Trash2, Gavel, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ROLE_LABEL } from '@/lib/crmUnifiedCustomers';

// ☀️ Redesenho (18/08/2026): tabela em tema branco + verde institucional,
// badges neutros (sem arco-íris). Ações (encaminhar/excluir) só aparecem em
// clientes cadastrados manualmente — as linhas automáticas (indicação / loja
// virtual) vêm de outras tabelas e não podem ser editadas/excluídas por aqui.
// 🧭 DIR-24 Fase 5 (30/08/2026): ordenação clicável nas colunas que importam,
// paginação de 50 em 50 (a base já passa de mil linhas — rolagem infinita
// numa tabela é onde CRM morre), e no celular a tabela de 11 colunas vira
// CARTÕES empilhados (grade some abaixo de sm).
const STATUS_LABEL = { lead: 'Lead', cliente: 'Cliente', inativo: 'Inativo' };
const PURCHASE_LABEL = {
  sem_compra: 'Sem Compra', em_negociacao: 'Em Negociação', aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado',
};
const SOURCE_PART_LABEL = { cadastro: 'Cadastro', loja_virtual: 'Loja Virtual', leilao: 'Leilão', indicacao: 'Indicação', site: 'Site', whatsapp: 'WhatsApp', redes_sociais: 'Redes Sociais', outro: 'Outro' };
const formatSource = (source) => (source || '').split('+').map((p) => SOURCE_PART_LABEL[p] || p).join(' + ');

const POR_PAGINA = 50;

const ORDENADORES = {
  nome: (a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'pt-BR'),
  gasto: (a, b) => (a.total_spent || 0) - (b.total_spent || 0),
  contato: (a, b) => new Date(a.last_contact || 0) - new Date(b.last_contact || 0),
  leiloes: (a, b) => (a.auctions_won || 0) - (b.auctions_won || 0),
};

function ThOrdenavel({ campo, rotulo, sortBy, sortDir, onSort, className = 'text-left' }) {
  const ativo = sortBy === campo;
  const Icone = !ativo ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`${className} p-3 font-semibold text-nz-tinta`}>
      <button type="button" onClick={() => onSort(campo)} className={`inline-flex items-center gap-1 hover:text-nz-verde ${ativo ? 'text-nz-verde' : ''}`}>
        {rotulo}
        <Icone className="w-3.5 h-3.5" />
      </button>
    </th>
  );
}

export default function CrmCustomersTable({ customers, onForward, onDelete, onRowClick }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('contato');
  const [sortDir, setSortDir] = useState('desc');
  const [pagina, setPagina] = useState(1);

  const handleSort = (campo) => {
    if (sortBy === campo) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(campo); setSortDir(campo === 'nome' ? 'asc' : 'desc'); }
    setPagina(1);
  };

  const ordenados = useMemo(() => {
    const lista = [...customers].sort(ORDENADORES[sortBy] || ORDENADORES.contato);
    if (sortDir === 'desc') lista.reverse();
    return lista;
  }, [customers, sortBy, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = ordenados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const abrir = (customer) => {
    if (customer.origin_type === 'manual') navigate(createPageUrl('CustomerDetails') + `?id=${customer.manual_id || customer.id}`);
    else onRowClick?.(customer);
  };

  const Paginacao = () => totalPaginas > 1 && (
    <div className="flex items-center justify-between px-3 py-2 border-t border-nz-borda text-xs text-nz-tinta-fraca">
      <span>{ordenados.length} clientes · página {paginaAtual} de {totalPaginas}</span>
      <div className="flex gap-1">
        <Button size="sm" variant="outline" disabled={paginaAtual <= 1} onClick={() => setPagina(paginaAtual - 1)} className="h-7 px-2 border-nz-borda">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" disabled={paginaAtual >= totalPaginas} onClick={() => setPagina(paginaAtual + 1)} className="h-7 px-2 border-nz-borda">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="bg-white border-nz-borda">
      <CardHeader>
        <CardTitle className="text-nz-tinta">Clientes ({customers.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* 📱 Celular: cartões empilhados (a tabela de 11 colunas não cabe) */}
        <div className="sm:hidden divide-y divide-nz-borda">
          {visiveis.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => abrir(customer)}
              className="w-full text-left p-3 hover:bg-nz-cinza-fundo"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-nz-tinta truncate">{customer.full_name}</p>
                <p className="text-nz-verde font-bold text-sm shrink-0">R$ {fmtBR(customer.total_spent || 0)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nz-marrom-fundo text-nz-marrom-escuro">{ROLE_LABEL[customer.role_type] || 'Cliente'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">{PURCHASE_LABEL[customer.purchase_status] || customer.purchase_status}</span>
                {customer.auctions_won > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-nz-verde font-semibold"><Gavel className="w-3 h-3" />{customer.auctions_won}</span>
                )}
              </div>
              <p className="text-xs text-nz-tinta-fraca truncate">{customer.email || customer.phone || '—'}</p>
            </button>
          ))}
          {visiveis.length === 0 && (
            <div className="text-center py-12 text-nz-tinta-fraca">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
          <Paginacao />
        </div>

        {/* 🖥️ Telas maiores: tabela completa com ordenação */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-nz-borda bg-nz-cinza-fundo">
                <ThOrdenavel campo="nome" rotulo="Nome" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                <th className="text-left p-3 font-semibold text-nz-tinta">Contato</th>
                <th className="text-left p-3 font-semibold text-nz-tinta">Endereço</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Tipo</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Status</th>
                <th className="text-center p-3 font-semibold text-nz-tinta">Compra</th>
                <ThOrdenavel campo="leiloes" rotulo="Leilões" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <th className="text-center p-3 font-semibold text-nz-tinta">Origem</th>
                <ThOrdenavel campo="contato" rotulo="Último Contato" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-center" />
                <ThOrdenavel campo="gasto" rotulo="Gasto Total" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right" />
                <th className="text-center p-3 font-semibold text-nz-tinta">Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((customer, index) => {
                const isManual = customer.origin_type === 'manual';
                return (
                  <tr
                    key={customer.id}
                    onClick={() => abrir(customer)}
                    className={`border-b border-nz-borda transition-colors cursor-pointer hover:bg-nz-cinza-fundo ${index % 2 === 0 ? 'bg-white' : 'bg-nz-cinza-fundo/40'}`}
                  >
                    <td className="p-3 text-nz-tinta font-medium">{customer.full_name}</td>
                    <td className="p-3 text-nz-tinta-fraca">
                      <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email || '-'}</div>
                      <div className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{customer.phone || '-'}</div>
                    </td>
                    <td className="p-3 text-nz-tinta-fraca max-w-[220px] truncate" title={customer.address}>{customer.address || '-'}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-marrom-fundo text-nz-marrom-escuro">
                        {ROLE_LABEL[customer.role_type] || 'Cliente'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-verde-fundo text-nz-verde">
                        {STATUS_LABEL[customer.status] || customer.status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">
                        {PURCHASE_LABEL[customer.purchase_status] || customer.purchase_status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-nz-tinta-fraca">
                      {customer.auctions_won > 0 ? (
                        <span className="inline-flex items-center gap-1 text-nz-verde font-semibold"><Gavel className="w-3.5 h-3.5" />{customer.auctions_won}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-cinza-fundo text-nz-tinta-fraca border border-nz-borda">
                        {formatSource(customer.source)}
                      </span>
                    </td>
                    <td className="p-3 text-center text-nz-tinta-fraca">
                      {customer.last_contact ? new Date(customer.last_contact).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="p-3 text-right text-nz-verde font-bold">R$ {fmtBR(customer.total_spent || 0)}</td>
                    <td className="p-3">
                      {isManual ? (
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onForward(customer.raw); }} className="text-nz-verde hover:bg-nz-verde-fundo" title="Encaminhar para Vendedor">
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(customer.manual_id || customer.id); }} className="text-red-500 hover:bg-red-50" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-nz-tinta-fraca text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visiveis.length === 0 && (
            <div className="text-center py-12 text-nz-tinta-fraca">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Nenhum cliente encontrado</p>
            </div>
          )}
          <Paginacao />
        </div>
      </CardContent>
    </Card>
  );
}
