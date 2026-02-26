import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, FileText, Loader2, X, CheckCircle2, Receipt, Table2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const DOC_TYPES = [
  { key: "boleto", label: "Boleto", icon: FileText, color: "text-emerald-400", accept: "image/*,.pdf" },
  { key: "nota_fiscal", label: "Nota Fiscal", icon: Receipt, color: "text-blue-400", accept: "image/*,.pdf,.xml" },
  { key: "planilha", label: "Planilha", icon: Table2, color: "text-orange-400", accept: ".csv,.xlsx,.xls,.pdf,image/*" },
];

const EXTRACTION_SCHEMAS = {
  boleto: {
    type: "object",
    properties: {
      description: { type: "string", description: "Descrição/nome do serviço ou produto cobrado no boleto" },
      company: { type: "string", description: "Nome da empresa/beneficiário que emitiu o boleto" },
      amount: { type: "number", description: "Valor do boleto em reais" },
      due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
      interest_amount: { type: "number", description: "Valor de juros/multa se houver, senão 0" },
    }
  },
  nota_fiscal: {
    type: "object",
    properties: {
      description: { type: "string", description: "Descrição dos itens/serviços da nota fiscal (resumo)" },
      company: { type: "string", description: "Nome do emitente/fornecedor da nota fiscal" },
      amount: { type: "number", description: "Valor total da nota fiscal em reais" },
      due_date: { type: "string", description: "Data de emissão ou vencimento no formato YYYY-MM-DD" },
      category: { type: "string", description: "Categoria do gasto baseada nos itens da nota (ex: Material de Escritório, Equipamentos, etc)" },
      interest_amount: { type: "number", description: "Valor de impostos se discriminado, senão 0" },
    }
  },
  planilha: {
    type: "object",
    properties: {
      expenses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            description: { type: "string", description: "Descrição do gasto" },
            company: { type: "string", description: "Empresa/fornecedor" },
            amount: { type: "number", description: "Valor em reais" },
            due_date: { type: "string", description: "Data de vencimento no formato YYYY-MM-DD" },
            category: { type: "string", description: "Categoria do gasto" },
          }
        },
        description: "Lista de gastos extraídos da planilha"
      }
    }
  }
};

export default function BoletoUploader({ onExtracted, onBulkExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extracted, setExtracted] = useState(false);
  const [selectedType, setSelectedType] = useState("boleto");
  const [bulkCount, setBulkCount] = useState(0);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const currentDocType = DOC_TYPES.find(d => d.key === selectedType);

  const processFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setExtracted(false);
    setBulkCount(0);

    // Preview
    const ext = file.name?.split('.').pop()?.toLowerCase();
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview({ type: "image", src: e.target.result });
      reader.readAsDataURL(file);
    } else if (ext === "pdf") {
      setPreview({ type: "pdf", name: file.name });
    } else if (["csv", "xlsx", "xls"].includes(ext)) {
      setPreview({ type: "spreadsheet", name: file.name });
    } else if (ext === "xml") {
      setPreview({ type: "xml", name: file.name });
    } else {
      setPreview({ type: "file", name: file.name });
    }

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setUploading(false);
    setExtracting(true);

    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: EXTRACTION_SCHEMAS[selectedType]
    });

    setExtracting(false);

    if (result.status === "success" && result.output) {
      setExtracted(true);

      if (selectedType === "planilha") {
        const expenses = result.output.expenses || (Array.isArray(result.output) ? result.output : []);
        setBulkCount(expenses.length);
        if (onBulkExtracted && expenses.length > 0) {
          onBulkExtracted(expenses.map(exp => ({
            description: exp.description || "",
            company: exp.company || "",
            amount: exp.amount || "",
            due_date: exp.due_date || "",
            category: exp.category || "",
            interest_amount: 0,
          })));
        } else if (expenses.length === 1) {
          onExtracted({ ...expenses[0], interest_amount: 0 });
        }
      } else {
        const data = result.output;
        onExtracted({
          description: data.description || "",
          company: data.company || "",
          amount: data.amount || "",
          due_date: data.due_date || "",
          interest_amount: data.interest_amount || 0,
          category: data.category || "",
          payment_method: selectedType === "boleto" ? "boleto" : "",
        });
      }
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
    setBulkCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const PreviewIcon = ({ type }) => {
    if (type === "pdf") return <FileText className="w-6 h-6 text-red-400" />;
    if (type === "spreadsheet") return <Table2 className="w-6 h-6 text-orange-400" />;
    if (type === "xml") return <Receipt className="w-6 h-6 text-blue-400" />;
    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  const previewLabel = {
    pdf: "PDF enviado",
    spreadsheet: "Planilha enviada",
    xml: "XML da NF enviado",
    file: "Arquivo enviado",
  };

  return (
    <div className="md:col-span-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {React.createElement(currentDocType.icon, { className: `w-4 h-4 ${currentDocType.color}` })}
          <span className="text-gray-300 text-sm font-medium">Importar Documento</span>
          {extracted && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              {bulkCount > 0 ? `${bulkCount} gastos extraídos` : "Dados extraídos"}
            </span>
          )}
        </div>
      </div>

      {/* Seletor de tipo de documento */}
      <div className="flex gap-1.5 mb-3">
        {DOC_TYPES.map(dt => (
          <button
            key={dt.key}
            type="button"
            onClick={() => { setSelectedType(dt.key); handleClear(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedType === dt.key
                ? `bg-gray-700 ${dt.color} border border-gray-600`
                : "bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700"
            }`}
          >
            {React.createElement(dt.icon, { className: "w-3.5 h-3.5" })}
            {dt.label}
          </button>
        ))}
      </div>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
            dragOver ? "border-emerald-400 bg-emerald-400/10" : "border-gray-600 bg-gray-800/50 hover:border-gray-500"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-7 h-7 text-gray-500" />
            <p className="text-gray-400 text-sm">
              Arraste e solte {selectedType === "boleto" ? "o boleto" : selectedType === "nota_fiscal" ? "a nota fiscal" : "a planilha"} aqui
            </p>
            <p className="text-gray-500 text-xs">
              {selectedType === "planilha" ? "CSV, Excel (.xlsx/.xls)" : selectedType === "nota_fiscal" ? "Imagem, PDF ou XML" : "Imagem ou PDF"}
            </p>
            <div className="flex gap-2 mt-1">
              {selectedType !== "planilha" && (
                <Button type="button" variant="outline" size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5"
                  onClick={() => cameraInputRef.current?.click()}>
                  <Camera className="w-3.5 h-3.5" /> Tirar Foto
                </Button>
              )}
              <Button type="button" variant="outline" size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1.5"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5" /> Enviar Arquivo
              </Button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept={currentDocType.accept} className="hidden" onChange={handleFileChange} />
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
                {uploading ? "Enviando arquivo..." : "Extraindo dados com IA..."}
              </span>
            </div>
          )}

          {!uploading && !extracting && preview?.type === "image" && (
            <img src={preview.src} alt="Documento" className="max-h-32 rounded-lg mx-auto object-contain" />
          )}
          {!uploading && !extracting && preview?.type && preview.type !== "image" && (
            <div className="flex items-center gap-2 justify-center py-4">
              <PreviewIcon type={preview.type} />
              <span className="text-gray-300 text-sm">{preview.name || previewLabel[preview.type]}</span>
            </div>
          )}

          {extracted && (
            <p className="text-center text-xs text-emerald-400 mt-2">
              {bulkCount > 0
                ? `${bulkCount} gastos extraídos da planilha. Serão adicionados automaticamente.`
                : "Campos preenchidos automaticamente. Revise e ajuste se necessário."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}