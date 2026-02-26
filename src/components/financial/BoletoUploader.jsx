import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, FileText, Loader2, X, CheckCircle2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BoletoUploader({ onExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setExtracted(false);

    // Preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview("pdf");
    }

    // Upload
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setUploading(false);
    setExtracting(true);

    // Extrair dados via IA
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          description: { type: "string", description: "Descrição/nome do serviço ou produto cobrado no boleto" },
          company: { type: "string", description: "Nome da empresa/beneficiário que emitiu o boleto" },
          amount: { type: "number", description: "Valor do boleto em reais" },
          due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
          interest_amount: { type: "number", description: "Valor de juros/multa se houver, senão 0" },
        }
      }
    });

    setExtracting(false);

    if (result.status === "success" && result.output) {
      const data = result.output;
      setExtracted(true);
      onExtracted({
        description: data.description || "",
        company: data.company || "",
        amount: data.amount || "",
        due_date: data.due_date || "",
        interest_amount: data.interest_amount || 0,
        payment_method: "boleto",
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    setExtracted(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="md:col-span-2">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4 text-emerald-400" />
        <span className="text-gray-300 text-sm font-medium">Importar do Boleto</span>
        {extracted && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Dados extraídos
          </span>
        )}
      </div>

      {!preview ? (
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragOver ? "border-emerald-400 bg-emerald-400/10" : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-gray-500" />
            <p className="text-gray-400 text-sm">Arraste e solte o boleto aqui</p>
            <p className="text-gray-500 text-xs">ou use os botões abaixo</p>
            <div className="flex gap-2 mt-1">
              <Button type="button" variant="outline" size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5"
                onClick={() => cameraInputRef.current?.click()}>
                <Camera className="w-3.5 h-3.5" /> Tirar Foto
              </Button>
              <Button type="button" variant="outline" size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Enviar Arquivo
              </Button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        </div>
      ) : (
        <div className="relative border border-gray-700 rounded-xl p-3 bg-gray-800/50">
          <Button type="button" size="icon" variant="ghost"
            className="absolute top-2 right-2 h-6 w-6 text-gray-400 hover:text-white z-10"
            onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>

          {(uploading || extracting) && (
            <div className="flex items-center gap-3 py-4 justify-center">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span className="text-gray-300 text-sm">
                {uploading ? "Enviando boleto..." : "Extraindo dados com IA..."}
              </span>
            </div>
          )}

          {!uploading && !extracting && preview && preview !== "pdf" && (
            <img src={preview} alt="Boleto" className="max-h-32 rounded-lg mx-auto object-contain" />
          )}
          {!uploading && !extracting && preview === "pdf" && (
            <div className="flex items-center gap-2 justify-center py-4">
              <FileText className="w-6 h-6 text-red-400" />
              <span className="text-gray-300 text-sm">PDF do boleto enviado</span>
            </div>
          )}

          {extracted && (
            <p className="text-center text-xs text-emerald-400 mt-2">
              Campos preenchidos automaticamente. Revise e ajuste se necessário.
            </p>
          )}
        </div>
      )}
    </div>
  );
}