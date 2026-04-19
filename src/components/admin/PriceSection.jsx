import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";

// Sugere incremento proporcional ao lance inicial do leilão
function suggestIncrement(lanceInicio) {
  if (lanceInicio <= 0) return null;
  if (lanceInicio < 30)    return { value: "2.00",   label: "R$ 2" };
  if (lanceInicio < 100)   return { value: "5.00",   label: "R$ 5" };
  if (lanceInicio < 300)   return { value: "10.00",  label: "R$ 10" };
  if (lanceInicio < 700)   return { value: "20.00",  label: "R$ 20" };
  if (lanceInicio < 1500)  return { value: "50.00",  label: "R$ 50" };
  if (lanceInicio < 5000)  return { value: "100.00", label: "R$ 100" };
  return { value: "250.00", label: "R$ 250" };
}

export default function PriceSection({ formData, onInputChange }) {
  const sp = parseFloat(formData.starting_price) || 0;

  // Auto-aplica incremento sugerido quando o valor de mercado muda
  useEffect(() => {
    if (sp <= 0) return;
    const lanceInicio = sp * 0.60;
    const suggestion = suggestIncrement(lanceInicio);
    if (suggestion) {
      onInputChange("increment", suggestion.value);
    }
  }, [sp]);
  // sp = valor de mercado (base inserida pelo admin)
  // Loja Virtual = mercado × 0.80 (20% abaixo do mercado)
  // Lance inicial = mercado × 0.60 (40% abaixo do mercado)
  // Arremate Agora = preço da Loja Virtual (teto direto)
  const lojaPrice = sp > 0 ? parseFloat((sp * 0.80).toFixed(2)) : 0;
  const leilaoInicio = sp > 0 ? parseFloat((sp * 0.60).toFixed(2)) : 0;
  const incrementSuggestion = suggestIncrement(leilaoInicio);

  return (
    <Card className="bg-gray-800 border border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-green-400">
          <DollarSign className="w-5 h-5" /> Preços e Duração
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-3 gap-4">

        {/* PREÇO INICIAL */}
        <div>
          <Label htmlFor="starting_price" className="text-sm font-medium text-gray-400">
            Valor de Mercado (R$) *
          </Label>
          <Input
            id="starting_price"
            type="number"
            step="0.01"
            value={formData.starting_price}
            onChange={(e) => onInputChange("starting_price", e.target.value)}
            required
            className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500"
          />

          {/* Sinalização da fórmula */}
          {sp > 0 && (
            <div className="mt-2 p-2 bg-emerald-900/30 border border-emerald-600/40 rounded-lg">
              <p className="text-xs text-emerald-400 font-semibold mb-1.5">✅ Fórmula automática:</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">📊 Mercado</span>
                  <span className="text-xs text-white font-bold whitespace-nowrap">R$ {sp.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">🏪 Loja Virtual <span className="text-gray-500">(−20%)</span></span>
                  <span className="text-xs text-blue-400 font-bold whitespace-nowrap">R$ {lojaPrice.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">🔨 Lance inicial <span className="text-gray-500">(−40%)</span></span>
                  <span className="text-xs text-yellow-400 font-bold whitespace-nowrap">R$ {leilaoInicio.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* INCREMENTO */}
        <div>
          <Label htmlFor="increment" className="text-sm font-medium text-gray-400">
            Incremento (R$) *
          </Label>
          <Input
            id="increment"
            type="number"
            step="0.01"
            value={formData.increment}
            onChange={(e) => onInputChange("increment", e.target.value)}
            required
            className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500"
          />
          {incrementSuggestion && (
            <p className="text-xs text-gray-500 mt-1">
              💡 Auto: {incrementSuggestion.label} para lance de R$ {leilaoInicio.toFixed(2)} — editável
            </p>
          )}
        </div>

        {/* ARREMATE AGORA */}
        <div>
          <Label htmlFor="buy_now_price" className="text-sm font-medium text-gray-400">
            Arremate Agora (opcional)
          </Label>
          <Input
            id="buy_now_price"
            type="number"
            step="0.01"
            value={formData.buy_now_price}
            onChange={(e) => onInputChange("buy_now_price", e.target.value)}
            className="mt-1 bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500 focus:border-green-500"
          />

          {/* Sugestão automática */}
          {sp > 0 && (
            <div className="mt-1.5 p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 Sugerido: <strong>R$ {lojaPrice.toFixed(2)}</strong> (= preço da Loja Virtual)
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Arrematar agora = comprar direto na loja.</p>
              {!formData.buy_now_price && (
                <button
                  type="button"
                  onClick={() => onInputChange("buy_now_price", lojaPrice.toString())}
                  className="mt-1 text-xs text-blue-400 underline hover:text-blue-300"
                >
                  Usar este valor
                </button>
              )}
            </div>
          )}
        </div>

        {/* DURAÇÃO */}
        <div>
          <Label htmlFor="duration" className="text-sm font-medium text-gray-400">
            Duração do Leilão
          </Label>
          <Select value={formData.duration} onValueChange={(value) => onInputChange("duration", value)}>
            <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-gray-200">
              <SelectItem value="60">⚡ 1 Minuto (Teste)</SelectItem>
              <SelectItem value="300">⚡ 5 Minutos (Teste)</SelectItem>
              <SelectItem value="900">⚡ 15 Minutos (Teste)</SelectItem>
              <SelectItem value="3600">1 hora</SelectItem>
              <SelectItem value="21600">6 horas</SelectItem>
              <SelectItem value="43200">12 horas</SelectItem>
              <SelectItem value="86400">1 dia (24h)</SelectItem>
              <SelectItem value="172800">2 dias (48h)</SelectItem>
              <SelectItem value="259200">3 dias (72h)</SelectItem>
              <SelectItem value="604800">1 semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}