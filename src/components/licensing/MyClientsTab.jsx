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
    <Card className="bg-white border-nz-borda">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-gray-900">Clientes Indicados</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-gray-300 text-gray-900" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingClients ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-nz-verde" />
          </div>
        ) : filteredClients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="border-nz-borda">
                <TableHead className="text-gray-500">Nome</TableHead>
                <TableHead className="text-gray-500">Email</TableHead>
                <TableHead className="text-gray-500">Indicado Por</TableHead>
                <TableHead className="text-gray-500">Data de Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => {
                const referrer = client.referred_by_id ? allUsers.find((u) => u.id === client.referred_by_id) : null;
                return (
                  <TableRow key={client.id} className="border-nz-borda">
                    <TableCell className="text-gray-900">{client.full_name}</TableCell>
                    <TableCell className="text-gray-600">{client.email}</TableCell>
                    <TableCell className="text-gray-600">
                      {referrer ? (
                        <span className={isSaiDeBaixo ? 'text-red-600' : 'text-nz-verde'}>👤 {referrer.full_name}</span>
                      ) : (
                        <span className="text-gray-400">Sem indicação</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-600">
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