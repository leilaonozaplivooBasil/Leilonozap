import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, RefreshCw } from 'lucide-react';

import LeadStatsCards from './LeadStatsCards';
import LeadFilters from './LeadFilters';
import LeadTable from './LeadTable';
import LeadFormModal from './LeadFormModal';

const LicenseeLead = base44.entities.LicenseeLead;

export default function LicenseeCRM() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [statsFilter, setStatsFilter] = useState(null);
  const [filters, setFilters] = useState({ search: '', statusLead: 'all', statusNeg: 'all', origem: 'all' });

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const data = await LicenseeLead.list('-created_date', 500);
      setLeads(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const handleSave = async (formData) => {
    try {
      // Atualiza automaticamente valor_fechado quando status muda para pago
      const dataToSave = { ...formData };
      if (dataToSave.status_negociacao === 'pago' && (!dataToSave.valor_fechado || dataToSave.valor_fechado === 0) && dataToSave.valor_negociado > 0) {
        dataToSave.valor_fechado = dataToSave.valor_negociado;
      }

      if (editingLead) {
        await LicenseeLead.update(editingLead.id, dataToSave);
      } else {
        await LicenseeLead.create(dataToSave);
      }
      setShowForm(false);
      setEditingLead(null);
      await loadLeads();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('❌ Erro ao salvar lead');
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este lead?')) return;
    try {
      await LicenseeLead.delete(id);
      await loadLeads();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('❌ Erro ao excluir');
    }
  };

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Stats filter (cards clicáveis)
    if (statsFilter === 'total') { /* sem filtro */ }
    else if (statsFilter === 'ativo') result = result.filter(l => l.status_lead === 'ativo');
    else if (statsFilter === 'em_negociacao') result = result.filter(l => l.status_negociacao === 'em_negociacao');
    else if (statsFilter === 'aguardando_pagamento') result = result.filter(l => l.status_negociacao === 'aguardando_pagamento');
    else if (statsFilter === 'pago') result = result.filter(l => l.status_negociacao === 'pago');

    // Text search
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(l =>
        (l.nome || '').toLowerCase().includes(s) ||
        (l.email || '').toLowerCase().includes(s) ||
        (l.telefone || '').includes(s)
      );
    }

    if (filters.statusLead !== 'all') result = result.filter(l => l.status_lead === filters.statusLead);
    if (filters.statusNeg !== 'all') result = result.filter(l => l.status_negociacao === filters.statusNeg);
    if (filters.origem !== 'all') result = result.filter(l => l.origem === filters.origem);

    return result;
  }, [leads, filters, statsFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-white">🔥 Meu CRM</h2>
        <div className="flex gap-2">
          <Button onClick={loadLeads} variant="outline" className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 h-9" size="sm">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Atualizar
          </Button>
          <Button onClick={() => { setEditingLead(null); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 h-9" size="sm">
            <UserPlus className="w-3.5 h-3.5 mr-1" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <LeadStatsCards leads={leads} onFilterClick={setStatsFilter} activeFilter={statsFilter} />

      {/* Filters */}
      <LeadFilters filters={filters} setFilters={setFilters} />

      {/* Table */}
      <LeadTable leads={filteredLeads} onEdit={handleEdit} onDelete={handleDelete} />

      {/* Form Modal */}
      {showForm && (
        <LeadFormModal
          lead={editingLead}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingLead(null); }}
        />
      )}
    </div>
  );
}