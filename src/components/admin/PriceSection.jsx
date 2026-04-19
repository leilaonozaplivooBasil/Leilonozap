import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";

export default function PriceSection({ formData, onInputChange }) {
  const sp = parseFloat(formData.starting_price) || 0;
  const lojaPrice = sp > 0 ? parseFloat((sp * 1.20).toFixed(2)) : 0;
  const leilaoInicio = sp > 0 ? parseFloat((lojaPrice * 0.80).toFixed(2)) : 0;
  const descontoMercado = sp > 0 ? Math.round((1 - leilaoInicio / sp) * 100) : 0;

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
            Preço Inicial / Base (R$) *
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
            <div className="mt-2 p-2 bg-emerald-900/30 border border-emerald-600/40 rounded-lg space-y-1">
              <p className="text-xs text-emerald-400 font-semibold">✅ Fórmula automática:</p>
              <div className="text-xs space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-400">🏪 Loja Virtual (× 1.20):</span>
                  <span className="text-blue-400 font-bold">R$ {lojaPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">🔨 Lance inicial (loja × 0.80):</span>
                  <span className="text-yellow-400 font-bold">R$ {leilaoInicio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">📉 Desconto vs base:</span>
                  <span className="text-orange-400 font-bold">{descontoMercado}% abaixo</span>
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