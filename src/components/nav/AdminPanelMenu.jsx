import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

const GLASS_STYLE = {
  background: 'rgba(15,23,42,0.92)',
  backdropFilter: 'blur(24px) saturate(1.5)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
};

export default function AdminPanelMenu({ adminMenuItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);
  const categoryRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoveredCategory(null);
        setHoveredIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuEnter = () => clearTimeout(closeTimerRef.current);
  const handleMenuLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredCategory(null);
      setHoveredIndex(-1);
    }, 200);
  };

  const handleNavigate = (pageName) => {
    navigate(createPageUrl(pageName));
    setIsOpen(false);
    setHoveredCategory(null);
    setHoveredIndex(-1);
  };

  // Calcula o top do submenu relativo ao container
  const getSubMenuTop = () => {
    if (hoveredIndex < 0 || !categoryRefs.current[hoveredIndex]) return 0;
    return categoryRefs.current[hoveredIndex].offsetTop;
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        onClick={() => { setIsOpen(!isOpen); setHoveredCategory(null); setHoveredIndex(-1); }}
        className="flex items-center gap-2 text-sm font-semibold text-purple-300 hover:text-purple-200 px-3 py-1.5 rounded-lg transition-all duration-300 hover:bg-purple-500/10"
      >
        <Settings className="h-4 w-4" />
        Painel de Controle
      </Button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-[200]"
          onMouseEnter={handleMenuEnter}
          onMouseLeave={handleMenuLeave}
        >
          <div className="relative">
            {/* Menu principal */}
            <div className="rounded-lg overflow-hidden py-1" style={GLASS_STYLE}>
              {adminMenuItems.map((item, idx) => (
                <button
                  key={item.title}
                  ref={el => categoryRefs.current[idx] = el}
                  onMouseEnter={() => { setHoveredCategory(item); setHoveredIndex(idx); }}
                  onClick={() => {
                    if (hoveredCategory?.title === item.title) {
                      setHoveredCategory(null); setHoveredIndex(-1);
                    } else {
                      setHoveredCategory(item); setHoveredIndex(idx);
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

            {/* Submenu — posicionado alinhado ao item hovered */}
            {hoveredCategory && (
              <div
                className="absolute left-full rounded-lg overflow-hidden py-1 ml-1 animate-in fade-in duration-100"
                style={{ ...GLASS_STYLE, top: getSubMenuTop() }}
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
        </div>
      )}
    </div>
  );
}