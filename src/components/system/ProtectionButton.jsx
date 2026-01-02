import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Shield, AlertTriangle, X, Send } from 'lucide-react';
import { toast } from 'sonner';

/**
 * 🛡️ BOTÃO FLUTUANTE DE PROTEÇÃO
 * Aparece em todas as páginas para reportar problemas
 */

export default function ProtectionButton({ currentPage, isAdmin }) {
  const navigate = useNavigate();
  const [showReportModal, setShowReportModal] = useState(false);
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Só mostra para admins
  if (!isAdmin) return null;

  // Não mostra na própria página de Proteção
  if (currentPage === 'ProtecaoCriacao') return null;

  const handleReport = () => {
    if (!issueDescription.trim()) {
      toast.error('Descreva o problema encontrado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Salva o issue no localStorage
      const existingIssues = JSON.parse(localStorage.getItem('systemIssues') || '[]');
      
      const newIssue = {
        level: 'warning',
        type: 'page_issue',
        message: `Problema reportado em ${currentPage}`,
        location: `Página: ${currentPage}`,
        timestamp: new Date().toISOString(),
        description: issueDescription,
        prompt: `PROBLEMA REPORTADO NA PÁGINA ${currentPage}\n\nDescrição:\n${issueDescription}\n\nAnalisar e corrigir.`
      };

      existingIssues.unshift(newIssue);
      localStorage.setItem('systemIssues', JSON.stringify(existingIssues.slice(0, 50)));

      toast.success('Problema reportado!');
      setShowReportModal(false);
      setIssueDescription('');

      // Redireciona para Proteção de Criação
      setTimeout(() => {
        navigate(createPageUrl('ProtecaoCriacao'));
      }, 1000);

    } catch (error) {
      toast.error('Erro ao reportar: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToProtection = () => {
    navigate(createPageUrl('ProtecaoCriacao'));
  };

  return (
    <>
      {/* Botão Flutuante */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <Button
          onClick={() => setShowReportModal(true)}
          className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/30"
          title="Reportar Problema"
        >
          <AlertTriangle className="w-6 h-6" />
        </Button>
        
        <Button
          onClick={goToProtection}
          className="w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30"
          title="Ir para Proteção de Criação"
        >
          <Shield className="w-6 h-6" />
        </Button>
      </div>

      {/* Modal de Reportar Problema */}
      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowReportModal(false)}
        >
          <Card 
            className="bg-gray-800 border-orange-500/50 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Reportar Problema
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowReportModal(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Página: <span className="text-orange-400 font-semibold">{currentPage}</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 mb-2 block">
                  Descreva o problema encontrado:
                </label>
                <Textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Ex: O botão X não funciona, a tabela não carrega, erro ao salvar..."
                  className="bg-gray-900 border-gray-700 text-white min-h-[120px]"
                  disabled={isSubmitting}
                />
              </div>

              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
                <p className="text-xs text-orange-300">
                  ⚡ Seu report será automaticamente registrado e você será redirecionado para a central de Proteção de Criação.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleReport}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={isSubmitting || !issueDescription.trim()}
                >
                  {isSubmitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Reportar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}