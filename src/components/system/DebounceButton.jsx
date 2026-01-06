import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

/**
 * 🎯 BOTÃO COM DEBOUNCE AUTOMÁTICO
 * Previne double-click e múltiplos submits
 */
export default function DebounceButton({ 
  onClick, 
  debounceMs = 300, 
  children, 
  disabled = false,
  ...props 
}) {
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef(null);

  const handleClick = async (e) => {
    if (isDebouncing || disabled) return;

    setIsDebouncing(true);

    try {
      await onClick(e);
    } catch (error) {
      console.error('Button action failed:', error);
    }

    timeoutRef.current = setTimeout(() => {
      setIsDebouncing(false);
    }, debounceMs);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Button 
      {...props} 
      onClick={handleClick}
      disabled={disabled || isDebouncing}
    >
      {children}
    </Button>
  );
}