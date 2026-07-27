import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ESTADOS = [
  { uf: "AC", name: "Acre" }, { uf: "AL", name: "Alagoas" }, { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" }, { uf: "BA", name: "Bahia" }, { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" }, { uf: "ES", name: "Espírito Santo" }, { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" }, { uf: "MT", name: "Mato Grosso" }, { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" }, { uf: "PA", name: "Pará" }, { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" }, { uf: "PE", name: "Pernambuco" }, { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" }, { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" }, { uf: "RO", name: "Rondônia" }, { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" }, { uf: "SP", name: "São Paulo" }, { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" }
];

export default function RegioesSelect({ value, onChange }) {
  return (
    <div>
      <Label htmlFor="allowed_regions" className="text-sm font-medium text-gray-400">
        Regiões Permitidas (Estados)
      </Label>
      <Select
        value={value.length === 0 ? "todos" : "custom"}
        onValueChange={(v) => { if (v === "todos") onChange([]); }}
      >
        <SelectTrigger className="mt-1 bg-gray-900 border-gray-600 text-gray-100">
          <SelectValue>
            {value.length === 0
              ? "Todo o Brasil"
              : `${value.length} estado${value.length > 1 ? 's' : ''} selecionado${value.length > 1 ? 's' : ''}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700 text-gray-200 max-h-[400px]">
          <SelectItem value="todos">Todo o Brasil</SelectItem>
          <div className="px-2 py-1 text-xs text-gray-400 font-semibold">Selecione os estados:</div>
          {ESTADOS.map((estado) => (
            <div
              key={estado.uf}
              className={`flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-gray-700 rounded ${value.includes(estado.uf) ? 'bg-green-600/20' : ''}`}
              onClick={() => {
                const next = value.includes(estado.uf)
                  ? value.filter((r) => r !== estado.uf)
                  : [...value, estado.uf];
                onChange(next);
              }}
            >
              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${value.includes(estado.uf) ? 'bg-green-600 border-green-600' : 'border-gray-500'}`}>
                {value.includes(estado.uf) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="font-bold text-sm">{estado.uf}</span>
              <span className="text-xs text-gray-400">- {estado.name}</span>
            </div>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-gray-500 mt-2">
        {value.length === 0 ? "Leilão disponível em TODO o Brasil" : `Disponível em: ${value.join(", ")}`}
      </p>
    </div>
  );
}