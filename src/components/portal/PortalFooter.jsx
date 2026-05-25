import React from "react";
import { Link } from "react-router-dom";

export default function PortalFooter() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800/60 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} Leilão NoZap · Todos os direitos reservados
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
              Termos
            </Link>
            <Link to="/leiloes" className="text-gray-400 hover:text-white transition-colors">
              Ver Leilões
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}