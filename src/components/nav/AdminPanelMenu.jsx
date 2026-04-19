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
          className="absolute right-0 top-full mt-2 flex z-[200]"
          onMouseEnter={handleMenuEnter}
          onMouseLeave={handleMenuLeave}
        >
          {/* Submenu lateral — aparece à esquerda */}
          {hoveredCategory && (
            <div
              className="mr-1 rounded-xl overflow-hidden py-2 min-w-[220px] animate-in fade-in slide-in-from-right-2 duration-150"
              style={{
                background: 'rgba(15,23,42,0.92)',
                backdropFilter: 'blur(24px) saturate(1.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
              <p className="px-4 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                {hoveredCategory.title}
              </p>
              {hoveredCategory.items?.map((subItem) => (
                <button
                  key={subItem.pageName}
                  onClick={() => handleNavigate(subItem.pageName)}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-2"
                >
                  {subItem.title}
                </button>
              ))}
            </div>
          )}

          {/* Menu principal de categorias */}
          <div
            className="rounded-xl overflow-hidden py-2 min-w-[210px]"
            style={{
              background: 'rgba(15,23,42,0.92)',
              backdropFilter: 'blur(24px) saturate(1.5)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            }}
          >
            <p className="px-4 py-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Administração
            </p>
            <div className="h-px bg-white/[0.06] mx-3 my-1" />
            {adminMenuItems.map((item) => (
              <button
                key={item.title}
                onMouseEnter={() => setHoveredCategory(item)}
                onClick={() => {
                  if (hoveredCategory?.title === item.title) {
                    // Se já está aberto e clicou, fecha
                    setHoveredCategory(null);
                  } else {
                    setHoveredCategory(item);
                  }
                }}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-between gap-2 ${
                  hoveredCategory?.title === item.title
                    ? 'text-white bg-white/[0.06]'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>{item.title}</span>
                <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}