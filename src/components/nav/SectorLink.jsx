import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Link de setor que entende rota interna E link externo (a Livoo Live é fora do app).
// Assim `sectors.js` continua sendo a fonte única, sem cada menu ter que saber disso.
export default function SectorLink({ target, className, onClick, children }) {
  if (target?.external) {
    return (
      <a href={target.external} target="_blank" rel="noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    );
  }
  // Rota crua (ex.: "/rankpremiado", "/Licensing") — usada pelos atalhos de painel,
  // cujas rotas já vêm prontas do panelResolver.
  const destino = target?.to ? target.to : createPageUrl(target.page) + (target.query || "");
  return (
    <Link to={destino} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}