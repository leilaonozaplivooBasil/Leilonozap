import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Save, Plus, Trash2 } from 'lucide-react';

const emptyForm = {
  nome: '', email: '', telefone: '', status_lead: 'lead', status_negociacao: 'sem_compra',
  origem: 'whatsapp', valor_negociado: 0, valor_fechado: 0,
  ultimo_contato: new Date().toISOString().split('T')[0],
  proximo_followup: '', probabilidade_fechamento: 0, observacoes: '',
  historico_interacoes: []
};

export default function LeadFormModal({ lead, onSave, onClose }) {
  const [form, setForm] = useState(emptyForm);
  const [newInteraction, setNewInteraction] = useState({ tipo: 'WhatsApp', observacao: '' });

  useEffect(() => {
    if (lead) {
      setForm({
        ...emptyForm,
        ...lead,
        historico_interacoes: lead.historico_interacoes || []
      });
    } else {
      setForm(emptyForm);
    }
  }, [lead]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const addInteraction = () => {
    if (!newInteraction.observacao.trim()) return;
    const interaction = {
      data: new Date().toISOString(),
      tipo: newInteraction.tipo,
      observacao: newInteraction.observacao
    };
    setForm(f => ({
      ...f,
      historico_interacoes: [interaction, ...(f.historico_interacoes || [])],
      ultimo_contato: new Date().toISOString().split('T')[0]
    }));
    setNewInteraction({ tipo: 'WhatsApp', observacao: '' });
  };

  const removeInteraction = (idx) => {
    setForm(f => ({
      ...f,
      historico_interacoes: f.historico_interacoes.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="bg-gray-800 border-gray-700 max-w-2xl w-full my-8 max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">
              {lead ? '✏️ Editar Lead' : '➕ Novo Lead'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-gray-300 text-xs">Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))} className="bg-gray-700 text-white h-9" required />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="bg-gray-700 text-white h-9" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))} className="bg-gray-700 text-white h-9" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Origem</Label>
                <select value={form.origem} onChange={(e) => setForm(f => ({ ...f, origem: e.target.value }))} className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 text-sm h-9">
                  <option value="site">Site</option>
                  <option value="indicacao">Indicação</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Status do Lead</Label>
                <select value={form.status_lead} onChange={(e) => setForm(f => ({ ...f, status_lead: e.target.value }))} className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 text-sm h-9">
                  <option value="lead">Lead</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Status da Negociação</Label>
                <select value={form.status_negociacao} onChange={(e) => setForm(f => ({ ...f, status_negociacao: e.target.value }))} className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 text-sm h-9">
                  <option value="sem_compra">Sem Compra</option>
                  <option value="em_negociacao">Em Negociação</option>
                  <option value="aguardando_pagamento">Aguardando Pag.</option>
                  <option value="pago">Pago</option>
                  <option value="enviado">Enviado</option>
                  <option value="entregue">Entregue</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Valor Negociado (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_negociado} onChange={(e) => setForm(f => ({ ...f, valor_negociado: parseFloat(e.target.value) || 0 }))} className="bg-gray-700 text-white h-9" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Valor Fechado (R$)</Label>
                <Input type="number" step="0.01" value={form.valor_fechado} onChange={(e) => setForm(f => ({ ...f, valor_fechado: parseFloat(e.target.value) || 0 }))} className="bg-gray-700 text-white h-9" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Último Contato</Label>
                <Input type="date" value={form.ultimo_contato} onChange={(e) => setForm(f => ({ ...f, ultimo_contato: e.target.value }))} className="bg-gray-700 text-white h-9 [color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Próximo Follow-up</Label>
                <Input type="date" value={form.proximo_followup} onChange={(e) => setForm(f => ({ ...f, proximo_followup: e.target.value }))} className="bg-gray-700 text-white h-9 [color-scheme:dark]" />
              </div>
              <div>
                <Label className="text-gray-300 text-xs">Probabilidade de Fechamento (%)</Label>
                <Input type="number" min="0" max="100" value={form.probabilidade_fechamento} onChange={(e) => setForm(f => ({ ...f, probabilidade_fechamento: parseFloat(e.target.value) || 0 }))} className="bg-gray-700 text-white h-9" />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} className="bg-gray-700 text-white" rows={2} />
            </div>

            {/* Histórico de Interações */}
            <div className="border-t border-gray-700 pt-4">
              <Label className="text-gray-300 text-sm font-semibold mb-2 block">📋 Histórico de Interações</Label>
              <div className="flex gap-2 mb-3">
                <select value={newInteraction.tipo} onChange={(e) => setNewInteraction(n => ({ ...n, tipo: e.target.value }))} className="bg-gray-700 text-white rounded-md px-2 py-1 border border-gray-600 text-xs w-28">
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Ligação">Ligação</option>
                  <option value="Email">Email</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Outro">Outro</option>
                </select>
                <Input
                  placeholder="Descrição da interação..."
                  value={newInteraction.observacao}
                  onChange={(e) => setNewInteraction(n => ({ ...n, observacao: e.target.value }))}
                  className="bg-gray-700 text-white h-8 text-xs flex-1"
                />
                <Button type="button" onClick={addInteraction} size="sm" className="bg-green-600 hover:bg-green-700 h-8 px-2">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
              {(form.historico_interacoes || []).length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {form.historico_interacoes.map((int, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-900/50 rounded px-2 py-1 text-xs">
                      <span className="text-gray-500">{int.data ? new Date(int.data).toLocaleDateString('pt-BR') : '-'}</span>
                      <span className="text-blue-400 font-semibold">{int.tipo}</span>
                      <span className="text-gray-300 flex-1 truncate">{int.observacao}</span>
                      <button type="button" onClick={() => removeInteraction(idx)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-gray-700">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                {lead ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}