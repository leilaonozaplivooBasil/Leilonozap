import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Users } from "lucide-react";

export default function MyClientsTab({
  isSaiDeBaixo,
  isLoadingClients,
  filteredClients,
  searchTerm,
  setSearchTerm,
  allUsers
}) {
  return (
    <Card className={isSaiDeBaixo ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-700'}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>Clientes Indicados</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={isSaiDeBaixo ? 'pl-10 bg-gray-100 border-gray-300 text-gray-900' : 'pl-10 bg-gray-700 border-gray-600 text-white'} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingClients ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : filteredClients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Nome</TableHead>
                <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Email</TableHead>
                <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Indicado Por</TableHead>
                <TableHead className={isSaiDeBaixo ? 'text-gray-700' : 'text-gray-400'}>Data de Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const referrer = client.referred_by_id ? allUsers.find((u) => u.id === client.referred_by_id) : null;
                return (
                  <TableRow key={client.id} className={isSaiDeBaixo ? 'border-gray-300' : 'border-gray-700'}>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-900' : 'text-white'}>{client.full_name}</TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>{client.email}</TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                      {referrer ? (
                        <span className={isSaiDeBaixo ? 'text-red-600' : 'text-green-400'}>👤 {referrer.full_name}</span>
                      ) : (
                        <span className={isSaiDeBaixo ? 'text-gray-400' : 'text-gray-500'}>Sem indicação</span>
                      )}
                    </TableCell>
                    <TableCell className={isSaiDeBaixo ? 'text-gray-600' : 'text-gray-400'}>
                      {new Date(client.created_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="font-semibold">Nenhum cliente indicado ainda</p>
            <p className="text-sm mt-2">Compartilhe seu link para começar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}