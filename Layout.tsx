
import React from 'react';
import { useView } from './ViewContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'venue' | 'resource';
  setActiveTab: (tab: 'venue' | 'resource') => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout }) => {
  const { isMobile, viewMode, setViewMode } = useView();

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col font-sans ${isMobile ? 'mobile-view' : 'desktop-view'}`}>
      {/* Header */}
      <header className="bg-blue-900 text-white p-4 shadow-lg flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 font-black italic text-[10px] shadow-inner">CMX</div>
          <div>
            <h1 className="text-sm md:text-lg font-bold tracking-tight">車美仕車間數位管理系統</h1>
            <p className="text-[10px] opacity-70 uppercase hidden sm:block">Workshop Digital Resource System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {!isMobile && (
             <nav className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('venue')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'venue' ? 'bg-white text-blue-900 shadow-md' : 'hover:bg-blue-800 text-blue-100'}`}
                >
                  場地預約
                </button>
                <button 
                  onClick={() => setActiveTab('resource')}
                  className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'resource' ? 'bg-white text-blue-900 shadow-md' : 'hover:bg-blue-800 text-blue-100'}`}
                >
                  資源管理
                </button>
             </nav>
          )}
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs md:text-sm font-black shadow-lg shadow-rose-900/20 transition-all active:scale-95"
          >
            <span className="hidden md:inline">登出系統</span>
            <span>🚪</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar for Desktop - Only shown if NOT in mobile mode */}
        {!isMobile && (
          <aside className="w-64 bg-white border-r border-slate-200 p-6 space-y-2 hidden md:block">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-4">MAIN MENU</p>
             <button 
                onClick={() => setActiveTab('venue')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${activeTab === 'venue' ? 'bg-blue-50 text-blue-700 font-black shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                <span className="text-xl">📅</span>
                <span>場地預約系統</span>
             </button>
             <button 
                onClick={() => setActiveTab('resource')}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all ${activeTab === 'resource' ? 'bg-blue-50 text-blue-700 font-black shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                <span className="text-xl">🛠️</span>
                <span>資源管理系統</span>
             </button>
             <div className="pt-8 mt-8 border-t border-slate-100 px-4">
               <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all font-bold"
               >
                  <span>🚪</span>
                  <span>登出系統</span>
               </button>
             </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 p-4 md:p-8 overflow-y-auto ${isMobile ? 'pb-32' : 'pb-8'}`}>
          {children}
        </main>
      </div>

      {/* Bottom Nav for Mobile - Only shown if in mobile mode */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 h-20 flex items-center justify-around z-40 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           <button 
             onClick={() => setActiveTab('venue')}
             className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'venue' ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60'}`}
           >
             <span className="text-2xl">🏛️</span>
             <span className="text-[10px] font-black uppercase tracking-tighter">場地預約</span>
           </button>
           <button 
             onClick={() => setActiveTab('resource')}
             className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'resource' ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60'}`}
           >
             <span className="text-2xl">🧰</span>
             <span className="text-[10px] font-black uppercase tracking-tighter">資源管理</span>
           </button>
        </nav>
      )}

      {/* Footer with Manual View Switcher */}
      <footer className={`bg-slate-100 p-4 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 ${isMobile ? 'mb-20' : ''}`}>
        <div className="text-[10px] text-slate-400 font-medium">© 2024 Hotai Motor - CARMAX Workshop Digital Management System</div>
        
        {/* View Switcher UI */}
        <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
          <button 
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'mobile' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            title="切換至手機版佈局"
          >
            <span>📱</span>
            <span className="hidden xs:inline">手機版</span>
          </button>
          
          <button 
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'desktop' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
            title="切換至電腦版佈局"
          >
            <span>💻</span>
            <span className="hidden xs:inline">電腦版</span>
          </button>
          
          <button 
            onClick={() => setViewMode('auto')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'auto' ? 'bg-slate-200 text-slate-700 shadow-inner' : 'text-slate-400 hover:bg-slate-50'}`}
            title="恢復自動偵測"
          >
            <span>🔄</span>
            <span className="hidden xs:inline">自動</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
