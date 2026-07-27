import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, X, Image as ImageIcon, ClipboardList } from "lucide-react";
import { toast } from "sonner";

export default function ValidationReportModal({ validationReport, onClose }) {
  if (!validationReport) return null;

  const validCount = validationReport.filter(r => r.isImage === 'É imagem').length;
  const reportText = `RELATÓRIO DE VALIDAÇÃO DE IMAGENS\n` +
    `Data: ${new Date().toLocaleString('pt-BR')}\n` +
    `Total: ${validationReport.length} imagens\n` +
    `Válidas: ${validCount}/${validationReport.length}\n\n` +
    validationReport.map(r =>
      `Imagem ${r.index}:\n   Status: ${r.status}\n   Tipo: ${r.contentType}\n   Validação: ${r.isImage}\n   URL: ${r.url}` +
      (r.error ? `\n   Erro: ${r.error}` : '') + '\n'
    ).join('\n');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] bg-gray-800 border-gray-700">
        <CardHeader className="border-b border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Relatório de Validação
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-300"><strong className="text-white">Total:</strong> {validationReport.length} imagens</div>
            <div className="text-sm text-gray-300"><strong className="text-green-400">Válidas:</strong> {validCount}</div>
            <div className="text-sm text-gray-300"><strong className="text-red-400">Inválidas:</strong> {validationReport.length - validCount}</div>
          </div>
          <div className="space-y-3">
            {validationReport.map((r, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${r.isImage === 'É imagem' ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
                <div className="font-bold text-white mb-2 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" />Imagem {r.index}</div>
                <div className="text-xs space-y-1 text-gray-300">
                  <div><strong>Status:</strong> {r.status}</div>
                  <div><strong>Tipo:</strong> {r.contentType}</div>
                  <div><strong>Validação:</strong> {r.isImage}</div>
                  <div className="break-all"><strong>URL:</strong> {r.url}</div>
                  {r.error && <div className="text-red-400"><strong>Erro:</strong> {r.error}</div>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <div className="border-t border-gray-700 p-4 flex gap-3">
          <Button onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Relatório copiado!"); }} className="flex-1 bg-blue-600 hover:bg-blue-700">
            <ClipboardList className="w-4 h-4 mr-2" />Copiar Relatório Completo
          </Button>
          <Button onClick={onClose} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">Fechar</Button>
        </div>
      </Card>
    </div>
  );
}