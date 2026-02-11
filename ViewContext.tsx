
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ViewMode = 'auto' | 'mobile' | 'desktop';

interface ViewContextType {
  viewMode: ViewMode;
  isMobile: boolean;
  setViewMode: (mode: ViewMode) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('auto');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Update window width on resize for 'auto' mode
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine if we are in mobile view based on mode or auto-detection
  const isMobile = viewMode === 'auto' 
    ? windowWidth < 768 
    : viewMode === 'mobile';

  return (
    <ViewContext.Provider value={{ viewMode, isMobile, setViewMode }}>
      {children}
    </ViewContext.Provider>
  );
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within a ViewProvider');
  return context;
};
