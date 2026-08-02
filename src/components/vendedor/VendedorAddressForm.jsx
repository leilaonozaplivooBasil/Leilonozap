import React from "react";
import { Loader2, MapPin } from "lucide-react";

// 📦 Card "Confirme seu endereço" — mesmo padrão da nossa página de Checkout
// (CEP autocompleta rua/bairro/cidade/UF), só que no visual claro do fluxo de
// Adesão Vendedor. Componente puro: todo o estado vive no VendedorCheckout.
export default function VendedorAddressForm({ address, onChange, isLoadingCep }) {
  const set = (field) => (e) => onChange({ ...address, [field]: e.target.value });

  const handleCepChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
    onChange({ ...address, zip: v });
  };

  const inputClass =
    "w-full px-4 py-3 bg-nz-cinza-fundo border border-nz-borda rounded-lg text-nz-tinta placeholder-nz-tinta-fraca/60 focus:outline-none focus:border-nz-verde text-sm";
  const labelClass = "block text-sm font-medium text-nz-tinta-fraca mb-1.5";

  return (
    <div className="rounded-2xl border border-nz-borda bg-white p-5 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-nz-verde text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">2</span>
        <h2 className="font-bold text-nz-tinta flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-nz-verde" /> Confirme seu endereço para entrega
        </h2>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <label className={labelClass}>CEP</label>
            <input type="text" value={address.zip} onChange={handleCepChange} placeholder="00000-000" className={inputClass} />
            {isLoadingCep && <Loader2 className="w-4 h-4 animate-spin text-nz-verde absolute right-3 top-9" />}
          </div>
          <div>
            <label className={labelClass}>Número</label>
            <input type="text" value={address.number} onChange={set("number")} placeholder="Número" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Rua/Avenida</label>
          <input type="text" value={address.street} onChange={set("street")} placeholder="Nome da rua" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Complemento</label>
            <input type="text" value={address.complement} onChange={set("complement")} placeholder="Apto, bloco…" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bairro</label>
            <input type="text" value={address.neighborhood} onChange={set("neighborhood")} placeholder="Bairro" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Cidade</label>
            <input type="text" value={address.city} onChange={set("city")} placeholder="Cidade" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>UF</label>
            <input type="text" value={address.state} onChange={set("state")} placeholder="UF" maxLength={2} className={`${inputClass} uppercase`} />
          </div>
        </div>

        <div className="bg-nz-verde-fundo border border-nz-verde/20 rounded-lg p-3 text-xs text-nz-verde">
          🏠 Entrega em domicílio no endereço acima.
        </div>
      </div>
    </div>
  );
}