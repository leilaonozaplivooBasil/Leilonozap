import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export default function LeadFilters({ filters, setFilters }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar nome, email, telefone..."
          value={filters.search}
          onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
          className="pl-10 bg-gray-800 text-white border-gray-700 h-9"
        />
      </div>

      <select
        value={filters.statusLead}
        onChange={(e) => setFilters(f => ({ ...f, statusLead: e.target.value }))}
        className="bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-700 text-sm h-9"
      >
        <option value="all">Status Lead</option>
        <option value="lead">Lead</option>
        <option value="ativo">Ativo</option>
        <option value="inativo">Inativo</option>
      </select>

      <select
        value={filters.statusNeg}
        onChange={(e) => setFilters(f => ({ ...f, statusNeg: e.target.value }))}
        className="bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-700 text-sm h-9"
      >
        <option value="all">Negociação</option>
        <option value="sem_compra">Sem Compra</option>
        <option value="em_negociacao">Em Negociação</option>
        <option value="aguardando_pagamento">Aguardando Pag.</option>
        <option value="pago">Pago</option>
        <option value="enviado">Enviado</option>
        <option value="entregue">Entregue</option>
        <option value="cancelado">Cancelado</option>
      </select>

      <select
        value={filters.origem}
        onChange={(e) => setFilters(f => ({ ...f, origem: e.target.value }))}
        className="bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-700 text-sm h-9"
      >
        <option value="all">Origem</option>
        <option value="site">Site</option>
        <option value="indicacao">Indicação</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="instagram">Instagram</option>
        <option value="outro">Outro</option>
      </select>

      <Button
        onClick={() => setFilters({ search: '', statusLead: 'all', statusNeg: 'all', origem: 'all' })}
        variant="outline"
        className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 h-9 text-sm"
      >
        <Filter className="w-3.5 h-3.5 mr-1" />
        Limpar
      </Button>
    </div>
  );
}