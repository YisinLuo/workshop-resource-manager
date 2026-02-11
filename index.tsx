
import React from 'react';
import { createRoot } from 'react-dom/client';
import AppContent from './App';
import { ViewProvider } from './ViewContext';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const Root = () => (
  <ViewProvider>
    <AppContent />
  </ViewProvider>
);

createRoot(rootElement).render(<Root />);
