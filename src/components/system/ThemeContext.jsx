import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    setTheme(savedTheme);
    applyTheme(savedTheme);
    setIsLoaded(true);
  }, []);

  const applyTheme = (newTheme) => {
    const html = document.documentElement;
    if (newTheme === 'light') {
      html.classList.add('light-theme');
      html.classList.remove('dark-theme');
    } else {
      html.classList.remove('light-theme');
      html.classList.add('dark-theme');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    applyTheme(newTheme);
  };

  if (!isLoaded) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}