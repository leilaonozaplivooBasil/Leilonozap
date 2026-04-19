import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export default function AdminPanelMenu({ adminMenuItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoveredCategory(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuEnter = () => {
    clearTimeout(closeTimerRef.current);
  };

  const handleMenuLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 200);
  };

  const handleNavigate = (pageName) => {
    navigate(createPageUrl(pageName));
    setIsOpen(false);
    setHoveredCategory(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        onClick={() => { setIsOpen(!isOpen); setHoveredCategory(null); }}
        className="flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-purple-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-purple-500/10"
      >
        <Settings className="h-4 w-4" />
        Painel de Controle
      </Button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 flex z-[200]"
          onMouseEnter={handleMenuEnter}
          onMouseLeave={handleMenuLeave}
        >
          {/* Menu principal de categorias */}
          <div
            className="rounded-lg overflow-hidden py-1"
            style={{
              background: 'rgba(15,23,42,0.92)',
              backdropFilter: 'blur(24px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            }}
          >
            {adminMenuItems.map((item, idx) => (
              <button
                key={item.title}
                onMouseEnter={() => setHoveredCategory(item)}
                onClick={() => {
                  if (hoveredCategory?.title === item.title) {
                    setHoveredCategory(null);
                  } else {
                    setHoveredCategory(item);
                  }
                }}
                className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-all flex items-center justify-between gap-3 whitespace-nowrap ${
                  hoveredCategory?.title === item.title
                    ? 'text-white bg-white/[0.07]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{item.title}</span>
                <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {/* Submenu lateral — abre à direita, tamanho ajustado ao conteúdo */}
          {hoveredCategory && (
            <div
              className="ml-1 rounded-lg overflow-hidden py-1 animate-in fade-in slide-in-from-left-2 duration-150"
              style={{
                background: 'rgba(15,23,42,0.92)',
                backdropFilter: 'blur(24px) saturate(1.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
              }}
            >
              {hoveredCategory.items?.map((subItem) => (
                <button
                  key={subItem.pageName}
                  onClick={() => handleNavigate(subItem.pageName)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/[0.07] transition-colors whitespace-nowrap"
                >
                  {subItem.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}