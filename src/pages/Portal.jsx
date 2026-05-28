import React, { useEffect, useState } from "react";
import PortalHero from "@/components/portal/PortalHero";
import PortalCardGrid from "@/components/portal/PortalCardGrid";
import PortalFooter from "@/components/portal/PortalFooter";

function loadCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

export default function Portal() {
  const [currentUser, setCurrentUser] = useState(() => loadCurrentUser());

  useEffect(() => {
    document.title = "Leilão NoZap — Portal de Acesso";

    const onStorage = () => setCurrentUser(loadCurrentUser());
    const onUserChange = () => setCurrentUser(loadCurrentUser());
    window.addEventListener("storage", onStorage);
    window.addEventListener("userChanged", onUserChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userChanged", onUserChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <PortalHero />
      <PortalCardGrid currentUser={currentUser} />
      <div className="flex-1" />
      <PortalFooter />
    </div>
  );
}
