import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Database, Loader2 } from "lucide-react";

export default function AuditSnapshot() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    const loadUser = async () => {
      const savedUserJSON = localStorage.getItem('currentUser');
      if (savedUserJSON) {
        setMe(JSON.parse(savedUserJSON));
      }
    };
    loadUser();
  }, []);

  const downloadSnapshot = async () => {
    setLoading(true);
    
    console.log('🔐 Tentando baixar snapshot com email:', me?.email);
    
    try {
      const response = await base44.functions.invoke('exportAuditData', {
        start_date: startDate,
        end_date: endDate,
        requester_email: me?.email || localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).email : null
      });

      // Cria blob e faz download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-snapshot-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('✅ Snapshot baixado com sucesso!');
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!me || (me.role !== 'admin' && me.email !== 'erbrito.sistemas@gmail.com' && me.email !== 'jonhhenrique29@hotmail.com')) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <p className="text-red-400">⛔ Acesso restrito a administradores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Database className="w-6 h-6" />
              Exportar Snapshot do Banco (Auditoria)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Data Inicial</Label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Data Final</Label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <Button 
              onClick={downloadSnapshot}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando snapshot...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Snapshot JSON
                </>
              )}
            </Button>

            <div className="bg-gray-900/50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-semibold text-green-400">📦 O que será exportado:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                <li>Todos os usuários (AppUser)</li>
                <li>Comissões (CommissionRecord)</li>
                <li>Vendas do catálogo (CatalogSale)</li>
                <li>Produtos (Product)</li>
                <li>Leilões (Auction)</li>
              </ul>
              <p className="text-amber-400 mt-4">⚠️ Use este arquivo localmente para testar a lógica de comissões sem afetar produção.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Como usar o snapshot localmente:</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 p-4 rounded text-xs overflow-x-auto text-green-400">
{`// 1. Baixe o snapshot JSON acima
// 2. Carregue no seu código local:

import { calculateExpectedCommission } from './CommissionAuditRules.js';
import snapshotData from './audit-snapshot-2026-02-16.json';

// 3. Teste com venda específica
const testSale = snapshotData.data.sales[0];
const result = calculateExpectedCommission(
  testSale, 
  snapshotData.data.users
);

console.log('Esperado:', result.total_distributed);
console.log('Trace:', result.trace);

// 4. Compare com CommissionRecord real
const realCommissions = snapshotData.data.commissions
  .filter(c => c.sale_id === testSale.id);
  
console.log('Real:', realCommissions.reduce((s,c) => s + c.amount, 0));`}
            </pre>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}