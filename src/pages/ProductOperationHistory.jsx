import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, Trash2, Calendar, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ProductOperationHistory() {
  const [operations, setOperations] = useState([]);
  const [filteredOperations, setFilteredOperations] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const user = JSON.parse(savedUser);
          setCurrentUser(user);

          if (user.role !== 'admin') {
            alert("❌ Acesso negado! Apenas administradores.");
            navigate(createPageUrl('Home'));
            return;
          }
        }

        const allOperations = await base44.entities.ProductOperation.list('-operation_date', 500);
        setOperations(allOperations);
        setFilteredOperations(allOperations);
      } catch (error) {
        console.error("Erro ao carregar operações:", error);
        alert("❌ Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = operations.filter(op =>
        op.product_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOperations(filtered);
    } else {
      setFilteredOperations(operations);
    }
  }, [searchTerm, operations]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-900">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Histórico de Operações</h1>
          <Button
            onClick={() => navigate(createPageUrl("ProductManagement"))}
            variant="outline"
            className="bg-white border-gray-300 text-gray-900 hover:bg-gray-100"
          >
            Voltar para Estoque
          </Button>
        </div>

        {/* BARRA DE BUSCA */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por produto, operador ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white text-gray-900 border-gray-300"
            />
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Total de Operações</p>
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{filteredOperations.length}</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Estoque Zerado</p>
                <RotateCcw className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredOperations.filter(op => op.operation_type === 'zerar_estoque').length}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm">Produtos Excluídos</p>
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredOperations.filter(op => op.operation_type === 'excluir_produto').length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* TABELA DE OPERAÇÕES */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Histórico de Operações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800">
                    <th className="text-left p-3 font-semibold text-white">Data</th>
                    <th className="text-left p-3 font-semibold text-white">Operação</th>
                    <th className="text-left p-3 font-semibold text-white">Produto</th>
                    <th className="text-left p-3 font-semibold text-white">Operador</th>
                    <th className="text-left p-3 font-semibold text-white">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.map((operation, index) => (
                    <tr 
                      key={operation.id} 
                      className={`border-b border-gray-100 hover:bg-gray-100 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="p-3 text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(operation.operation_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {operation.operation_type === 'zerar_estoque' ? (
                            <>
                              <RotateCcw className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-600 font-semibold">Zerar Estoque</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 text-red-500" />
                              <span className="text-red-600 font-semibold">Excluir Produto</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-gray-900">{operation.product_description}</td>
                      <td className="p-3 text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {operation.operator_name}
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 text-sm max-w-md">
                        {operation.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOperations.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma operação encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}