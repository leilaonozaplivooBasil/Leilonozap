import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Smartphone, Crown, AlertCircle } from "lucide-react";

export default function ConfirmationModal({ type, isOpen, onConfirm, onCancel, onSwitchOption }) {
    if (!isOpen) return null;

    const content = {
        app: {
            icon: Smartphone,
            iconColor: "text-green-400",
            iconBg: "bg-green-500/20",
            title: "Sistema de Indicação - Aplicativo",
            message: "Só pra confirmar: você quer indicar pessoas para o aplicativo Leilão NoZap e ganhar 3% em Valora Pay sobre os arremates delas?",
            benefits: [
                "✅ Ganha link de indicação imediato",
                "✅ 3% em cada arremate dos seus indicados",
                "✅ Cadastro rápido e simples"
            ],
            wrongChoice: "Licenciado Profissional"
        },
        professional: {
            icon: Crown,
            iconColor: "text-yellow-400",
            iconBg: "bg-yellow-500/20",
            title: "Licenciado Profissional",
            message: "Você quer se tornar um Licenciado Profissional com plano de carreira completo e sistema de alavancagem?",
            benefits: [
                "✅ Plano de carreira estruturado",
                "✅ Sistema de alavancagem",
                "✅ Acesso direto à diretoria"
            ],
            wrongChoice: "Sistema de Indicação"
        }
    };

    const config = content[type];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2001] p-4 animate-in fade-in-0">
            <Card className="w-full max-w-lg bg-gray-800 border-gray-700 text-white relative">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onCancel} 
                    className="absolute top-2 right-2 text-gray-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </Button>

                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <div className={`p-3 ${config.iconBg} rounded-lg`}>
                            <Icon className={`w-6 h-6 ${config.iconColor}`} />
                        </div>
                        <div>
                            <div className="text-green-400 font-bold">{config.title}</div>
                            <div className="text-sm text-gray-400 font-normal">Confirmação</div>
                        </div>
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-200 leading-relaxed">
                                {config.message}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {config.benefits.map((benefit, index) => (
                            <p key={index} className="text-gray-300 text-sm">{benefit}</p>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            onClick={onConfirm}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg"
                        >
                            ✅ Sim, é isso que eu quero!
                        </Button>

                        <Button
                            onClick={onSwitchOption}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 py-6"
                        >
                            ❌ Não, quero ver {config.wrongChoice}
                        </Button>

                        <button
                            onClick={onCancel}
                            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                        >
                            Voltar sem escolher
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}