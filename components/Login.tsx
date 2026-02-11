
import React, { useState } from 'react';

interface LoginProps {
  onLoginSuccess: (name: string, dept: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeName.trim() || !department.trim()) {
      setError('請輸入姓名與所屬部門');
      return;
    }
    // Specific password requirement: 22660624
    if (password === '22660624') {
      onLoginSuccess(employeeName, department);
    } else {
      setError('密碼錯誤，請重新輸入');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 flex-col gap-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-blue-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-blue-900 font-black italic text-xl mx-auto mb-4 tracking-tighter">CMX</div>
          <h1 className="text-xl font-bold tracking-tight">車美仕車間數位管理系統</h1>
          <p className="text-xs opacity-80 uppercase tracking-widest mt-1">Workshop Digital System</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-xl font-bold text-slate-800">員工登入</h2>
            <p className="text-slate-500 text-sm">請輸入您的資訊以存取系統資源</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-xs animate-pulse">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">員工姓名 (Employee Name)</label>
            <input 
              type="text" 
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="請輸入姓名"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">所屬部門 (Department)</label>
            <input 
              type="text" 
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="例如: 商品一、技術...等"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">登入密碼 (Password)</label>
            <input 
              type="text" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1 italic">* 密碼輸入時將直接顯示數字</p>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all mt-2"
          >
            登入系統
          </button>
        </form>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[10px] text-slate-600 font-semibold tracking-tighter">
            © 2026 CARMAX | 網頁製作與維護者 陳薇安
          </p>
        </div>
      </div>
    </div>
  );
};
