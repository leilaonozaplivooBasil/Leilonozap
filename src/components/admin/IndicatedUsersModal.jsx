import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AppUser = base44.entities.AppUser;
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users } from 'lucide-react';

export default function IndicatedUsersModal({ licensee, isOpen, onClose }) {
    const [indicatedUsers, setIndicatedUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && licensee) {
            const fetchIndicatedUsers = async () => {
                setIsLoading(true);
                try {
                    // Busca usuários que têm o `referred_by_id` igual ao ID do licenciado
                    const users = await AppUser.filter({ referred_by_id: licensee.id }, "-created_date", 200);
                    setIndicatedUsers(users);
                } catch (error) {
                    console.error("Failed to fetch indicated users:", error);
                    alert("Erro ao buscar usuários indicados.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchIndicatedUsers();
        }
    }, [isOpen, licensee]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-400">
                        <Users className="w-5 h-5"/>
                        Clientes Indicados por {licensee?.nickname || licensee?.full_name}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Email: {licensee?.email} <br/>
                        A lista abaixo mostra todos os usuários que se cadastraram usando o link deste licenciado.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                        </div>
                    ) : indicatedUsers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-700">
                                    <TableHead className="text-gray-300">Nome</TableHead>
                                    <TableHead className="text-gray-300">Email</TableHead>
                                    <TableHead className="text-gray-300">Data de Cadastro</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {indicatedUsers.map(user => (
                                    <TableRow key={user.id} className="border-gray-700/80">
                                        <TableCell className="font-medium text-gray-200">{user.full_name}</TableCell>
                                        <TableCell className="text-gray-400">{user.email}</TableCell>
                                        <TableCell className="text-gray-400">{new Date(user.created_date).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-gray-500">Nenhum cliente indicado encontrado.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}