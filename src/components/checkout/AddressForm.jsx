import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AddressForm({ userId, onAddressSaved }) {
  const [address, setAddress] = useState({
    address_street: "",
    address_number: "",
    address_complement: "",
    address_neighborhood: "",
    address_city: "",
    address_state: "",
    address_zip_code: ""
  });
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [hasExistingAddress, setHasExistingAddress] = useState(false);

  useEffect(() => {
    loadUserAddress();
  }, [userId]);

  const loadUserAddress = async () => {
    if (!userId) return;

    try {
      const users = await base44.entities.AppUser.filter({ id: userId });
      if (users.length > 0) {
        const user = users[0];
        
        // Verifica se já tem endereço salvo
        if (user.address_street) {
          setAddress({
            address_street: user.address_street || "",
            address_number: user.address_number || "",
            address_complement: user.address_complement || "",
            address_neighborhood: user.address_neighborhood || "",
            address_city: user.address_city || "",
            address_state: user.address_state || "",
            address_zip_code: user.address_zip_code || ""
          });
          setHasExistingAddress(true);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar endereço:", error);
    }
  };

  const searchCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setAddress(prev => ({
        ...prev,
        address_street: data.logradouro || prev.address_street,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.localidade || prev.address_city,
        address_state: data.uf || prev.address_state
      }));

      toast.success("Endereço encontrado!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    
    // Formata: 12345-678
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    
    setAddress(prev => ({ ...prev, address_zip_code: value }));

    // Busca automática ao completar 8 dígitos
    if (value.replace(/\D/g, "").length === 8) {
      searchCep(value);
    }
  };

  const handleSaveAddress = async () => {
    // Validação básica
    if (!address.address_street || !address.address_number || !address.address_city || !address.address_state || !address.address_zip_code) {
      toast.error("Preencha os campos obrigatórios do endereço");
      return;
    }

    try {
      await base44.entities.AppUser.update(userId, address);
      
      // Atualiza localStorage
      const savedUserJSON = localStorage.getItem('currentUser');
      if (savedUserJSON) {
        const user = JSON.parse(savedUserJSON);
        const updatedUser = { ...user, ...address };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      toast.success("✅ Endereço salvo com sucesso!");
      
      if (onAddressSaved) {
        onAddressSaved(address);
      }
    } catch (error) {
      toast.error("Erro ao salvar endereço: " + error.message);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-green-500" />
          Endereço de Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasExistingAddress && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-4">
            <p className="text-green-400 text-sm">✅ Você já tem um endereço cadastrado. Edite se necessário.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-gray-400">CEP *</Label>
            <div className="relative">
              <Input
                value={address.address_zip_code}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="bg-gray-900 border-gray-700 text-white"
              />
              {isLoadingCep && (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 text-green-500 animate-spin" />
              )}
            </div>
          </div>
        </div>

        <div>
          <Label className="text-gray-400">Rua/Avenida *</Label>
          <Input
            value={address.address_street}
            onChange={(e) => setAddress(prev => ({ ...prev, address_street: e.target.value }))}
            placeholder="Nome da rua"
            className="bg-gray-900 border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Label className="text-gray-400">Número *</Label>
            <Input
              value={address.address_number}
              onChange={(e) => setAddress(prev => ({ ...prev, address_number: e.target.value }))}
              placeholder="123"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-gray-400">Complemento</Label>
            <Input
              value={address.address_complement}
              onChange={(e) => setAddress(prev => ({ ...prev, address_complement: e.target.value }))}
              placeholder="Apto, Bloco, etc"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        <div>
          <Label className="text-gray-400">Bairro *</Label>
          <Input
            value={address.address_neighborhood}
            onChange={(e) => setAddress(prev => ({ ...prev, address_neighborhood: e.target.value }))}
            placeholder="Bairro"
            className="bg-gray-900 border-gray-700 text-white"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <Label className="text-gray-400">Cidade *</Label>
            <Input
              value={address.address_city}
              onChange={(e) => setAddress(prev => ({ ...prev, address_city: e.target.value }))}
              placeholder="Cidade"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
          <div className="col-span-1">
            <Label className="text-gray-400">UF *</Label>
            <Input
              value={address.address_state}
              onChange={(e) => setAddress(prev => ({ ...prev, address_state: e.target.value.toUpperCase() }))}
              placeholder="SP"
              maxLength={2}
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        </div>

        <Button
          onClick={handleSaveAddress}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {hasExistingAddress ? "Atualizar Endereço" : "Salvar Endereço"}
        </Button>
      </CardContent>
    </Card>
  );
}