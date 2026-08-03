import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, ArrowRightLeft, User, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from "sonner";

const AppUser = base44.entities.AppUser;

export default function TransferirSaldo() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [step, setStep] = useState('search'); // search -> amount -> confirm -> done
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('currentUser') || 'null');
      setCurrentUser(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      try {
        const referred = await AppUser.filter({ referred_by_id: currentUser.id }, '-created_date', 10);
        setSuggestions(Array.isArray(referred) ? referred : []);
      } catch { setSuggestions([]); }
    })();
  }, [currentUser]);

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.trim().length < 2) { setResults([]); return; }
    setIsSearching(true);
    try {
      const byName = await AppUser.filter({ full_name: { $regex: term } }).catch(() => []);
      const byEmail = await AppUser.filter({ email: term.toLowerCase() }).catch(() => []);
      const merged = [...(Array.isArray(byName) ? byName : []), ...(Array.isArray(byEmail) ? byEmail : [])];
      const unique = Array.from(new Map(merged.map((u) => [u.id, u])).values())
        .filter((u) => u.id !== currentUser?.id);
      setResults(unique.slice(0, 15));
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const totalAvailable = currentUser?.commission_balance || 0;

  const selectRecipient = (u) => {
    setRecipient(u);
    setStep('amount');
  };

  const goConfirm = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error('Informe um valor válido'); return; }
    if (amt > totalAvailable) { toast.error('Saldo insuficiente'); return; }
    setStep('confirm');
  };

  const handleTransfer = async () => {
    setIsSubmitting(true);
    try {
      const response = await base44.functions.invoke('transferBalance', {
        receiver_id: recipient.id,
        amount: parseFloat(amount),
        note
      });
      const data = response?.data;
      if (data?.success) {
        toast.success('Transferência realizada com sucesso!');
        try {
          const saved = JSON.parse(localStorage.getItem('currentUser') || 'null');
          if (saved) {
            saved.commission_balance = data.new_balance;
            localStorage.setItem('currentUser', JSON.stringify(saved));
            setCurrentUser(saved);
          }
        } catch { /* ignore */ }
        setStep('done');
      } else {
        toast.error(data?.error || 'Erro ao transferir');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Erro ao transferir');
    } finally {
      setIsSubmitting(false);
    }
  };

  const listToShow = searchTerm.trim().length >= 2 ? results : suggestions;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Transferência de Saldo</h1>
        </div>

        {step === 'search' &&
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base text-gray-900">Transferir para</CardTitle>
              <CardDescription>Saldo disponível: <strong className="text-emerald-600">R$ {totalAvailable.toFixed(2)}</strong></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail"
                  className="pl-9 bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {searchTerm.trim().length >= 2 ? 'Resultados' : 'Meus indicados'}
                </p>
                {isSearching ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
                ) : listToShow.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Nenhum contato encontrado.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {listToShow.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => selectRecipient(u)}
                        className="w-full flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 text-left"
                      >
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        }

        {step === 'amount' && recipient &&
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base text-gray-900">Transferir para {recipient.full_name}</CardTitle>
              <CardDescription>Saldo disponível: R$ {totalAvailable.toFixed(2)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-700">Valor (R$)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="bg-gray-50 border-gray-200 text-gray-900 text-lg"
                />
              </div>
              <div>
                <Label className="text-gray-700">Nota (opcional)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: acerto de comissão"
                  className="bg-gray-50 border-gray-200 text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-gray-300" onClick={() => setStep('search')}>Voltar</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={goConfirm}>Continuar</Button>
              </div>
            </CardContent>
          </Card>
        }

        {step === 'confirm' && recipient &&
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-base text-gray-900">Confirmar transferência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">De</span>
                  <span className="font-medium text-gray-900">{currentUser?.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Para</span>
                  <span className="font-medium text-gray-900">{recipient.full_name}</span>
                </div>
                {note && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Nota</span>
                    <span className="font-medium text-gray-900">{note}</span>
                  </div>
                )}
                <div className="h-px bg-gray-200 my-1" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Valor</span>
                  <span className="font-bold text-emerald-600 text-lg">R$ {parseFloat(amount).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-gray-300" onClick={() => setStep('amount')} disabled={isSubmitting}>Voltar</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleTransfer} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                  Transferir
                </Button>
              </div>
            </CardContent>
          </Card>
        }

        {step === 'done' &&
          <Card className="bg-white border-gray-200 text-center">
            <CardContent className="py-10">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-bold text-gray-900">Transferência concluída!</p>
              <p className="text-sm text-gray-500 mt-1">R$ {parseFloat(amount).toFixed(2)} enviados para {recipient?.full_name}.</p>
              <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('/Licensing')}>
                Voltar ao Painel
              </Button>
            </CardContent>
          </Card>
        }
      </div>
    </div>
  );
}