import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield } from 'lucide-react';

const AppUser = base44.entities.AppUser;

export default function CPFModal({ currentUser, onClose }) {
  const [cpf, setCpf] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  const validateCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    if (/^(\d)\1+$/.test(numbers)) return false;
    return true;
  };

  const handleSave = async () => {
    if (!validateCPF(cpf)) {
      setErrorMessage('❌ CPF inválido. Verifique os números.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      // Verifica se CPF já existe
      const existing = await AppUser.filter({ cpf: cpf.replace(/\D/g, '') });
      if (existing.length > 0 && existing[0].id !== currentUser.id) {
        setErrorMessage('❌ Este CPF já está cadastrado por outro usuário.');
        setIsSaving(false);
        return;
      }

      await AppUser.update(currentUser.id, { cpf: cpf.replace(/\D/g, '') });

      // Atualiza localStorage
      const updatedUser = { ...currentUser, cpf: cpf.replace(/\D/g, '') };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      onClose();
    } catch (error) {
      console.error('Erro ao salvar CPF:', error);
      setErrorMessage('❌ Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 animate-in fade-in-0">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Shield className="w-6 h-6" />
            Complete seu Cadastro
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-300 text-sm">
            Para sua segurança e conformidade legal, precisamos do seu CPF. Isso garante transações mais seguras e proteção contra fraudes.
          </p>

          {errorMessage && (
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{errorMessage}</p>
            </div>
          )}

          <div>
            <Label htmlFor="cpf" className="text-gray-300">CPF</Label>
            <Input
              id="cpf"
              type="text"
              value={cpf}
              onChange={handleCPFChange}
              placeholder="000.000.000-00"
              maxLength={14}
              className="bg-gray-700 border-gray-600 text-white h-12 text-base"
              disabled={isSaving}
              autoFocus
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleSave}
            disabled={isSaving || !cpf || cpf.replace(/\D/g, '').length !== 11}
            className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Salvar CPF
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}