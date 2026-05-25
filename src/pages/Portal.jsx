import React, { useEffect } from "react";
import PortalHero from "@/components/portal/PortalHero";
import PortalCardGrid from "@/components/portal/PortalCardGrid";
import PortalFooter from "@/components/portal/PortalFooter";

export default function Portal() {
  useEffect(() => {
    document.title = "Leilão NoZap — Portal de Acesso";
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <PortalHero />
      <PortalCardGrid />
      <div className="flex-1" />
      <PortalFooter />
    </div>
  );
}