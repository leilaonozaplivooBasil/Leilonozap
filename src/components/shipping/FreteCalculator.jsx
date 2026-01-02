import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FreteCalculator({ productId }) {
  const [cep, setCep] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleCepChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    
    setCep(value);
  };

  const calcularFrete = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      toast.error("Digite um CEP válido");
      return;
    }

    setIsCalculating(true);
    setResultado(null);

    try {
      const response = await base44.functions.invoke('calculateShipping', {
        cepDestino: cleanCep,
        productId: productId
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      setResultado(response.data);
      toast.success("Frete calculado com sucesso!");

    } catch (error) {
      toast.error("Erro ao calcular frete: " + error.message);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Truck className="w-5 h-5 text-green-500" />
          Calcular Frete
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-gray-400">Digite seu CEP</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={cep}
              onChange={handleCepChange}
              placeholder="00000-000"
              maxLength={9}
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Button
              onClick={calcularFrete}
              disabled={isCalculating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCalculating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Calcular"
              )}
            </Button>
          </div>
        </div>

        {resultado && (
          <div className="space-y-3">
            {resultado.SEDEX && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-semibold">SEDEX</p>
                    <p className="text-gray-400 text-sm">{resultado.SEDEX.prazo}</p>
                  </div>
                  <p className="text-green-500 font-bold text-lg">
                    R$ {resultado.SEDEX.valor}
                  </p>
                </div>
              </div>
            )}

            {resultado.PAC && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-semibold">PAC</p>
                    <p className="text-gray-400 text-sm">{resultado.PAC.prazo}</p>
                  </div>
                  <p className="text-green-500 font-bold text-lg">
                    R$ {resultado.PAC.valor}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}