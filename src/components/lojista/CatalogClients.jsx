import React, { useState, useEffect } from 'react';
import { fmtBR } from '@/lib/money';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Mail, Phone, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AppUserEntity = base44.entities.AppUser;

export default function CatalogClients({ catalogSales = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      try {
        const uniqueClientIds = [...new Set(catalogSales.map(s => s.user_id).filter(Boolean))];
        
        if (uniqueClientIds.length > 0) {
          const clientsData = await Promise.all(
            uniqueClientIds.map(id => AppUserEntity.filter({ id }).then(res => Array.isArray(res) ? res[0] : null))
          );
          setClients(clientsData.filter(Boolean));
        }
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClients();
  }, [catalogSales]);

  const filteredClients = clients.filter(client => {
    return !searchTerm || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm);
  });

  const getClientInitials = (name) => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getClientOrders = (clientId) => {
    return catalogSales.filter(s => s.user_id === clientId).length;
  };

  const getClientTotal = (clientId) => {
    return catalogSales
      .filter(s => s.user_id === clientId)
      .reduce((sum, s) => sum + (s.total_amount || 0), 0);
  };

  return (
    <div className="space-y-4">
      {/* Filtro de Busca */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border-gray-600 text-white pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">Total de Clientes</p>
            <p className="text-2xl font-bold text-green-400 mt-2">{filteredClients.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-sm">Esperando entrega</p>
            <p className="text-2xl font-bold text-yellow-400 mt-2">0 clientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-gray-400 text-center py-8">Carregando clientes...</p>
          ) : filteredClients.length > 0 ? (
            <div className="space-y-3">
              {filteredClients.map((client) => (
                <div key={client.id} className="flex items-start justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">{getClientInitials(client.full_name)}</span>
                    </div>
                    
                    {/* Informações */}
                    <div className="flex-1">
                      <p className="text-white font-medium">{client.full_name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-500/20 text-green-300 text-xs">
                          {getClientOrders(client.id)} pedido(s)
                        </Badge>
                        <span className="text-xs text-gray-500">R$ {fmtBR(getClientTotal(client.id))}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-blue-400">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-green-400">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">Nenhum cliente encontrado</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}