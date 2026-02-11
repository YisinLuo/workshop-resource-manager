
import React, { useState, useMemo, useEffect } from 'react';
import { compressImage } from '../utils/image';
import { fetchData } from '../utils/api';

// --- Types & Constants ---
interface ResourceItem {
  id: string;
  name: string;
  category: '門鎖類' | '工具類' | '設備類';
}

const CATEGORIES: ('門鎖類' | '工具類' | '設備類')[] = ['門鎖類', '工具類', '設備類'];

const RESOURCES: ResourceItem[] = [
  // 門鎖類
  { id: 'l1', name: '鐵門遙控器', category: '門鎖類' },
  { id: 'l2', name: '鐵門牆上鑰匙1', category: '門鎖類' },
  { id: 'l3', name: '鐵門牆上鑰匙2', category: '門鎖類' },
  { id: 'l4', name: '鐵門牆上鑰匙3', category: '門鎖類' },
  { id: 'l5', name: 'B2倉庫鑰匙', category: '門鎖類' },
  // 工具類
  { id: 't1', name: '工具櫃1(保2內)', category: '工具類' },
  { id: 't2', name: '工具櫃2(工位1旁)', category: '工具類' },
  { id: 't3', name: '工具櫃3(頂高機旁)', category: '工具類' },
  { id: 't4', name: '麥克風櫃', category: '工具類' },
  { id: 't5', name: '頂高塊櫃', category: '工具類' },
  { id: 't6', name: '紅工具櫃', category: '工具類' },
  // 設備類
  { id: 'e1', name: '電瓶快速充電機 (100976)', category: '設備類' },
  { id: 'e2', name: '移動電視(101931) & 電視遙控器(在6F)', category: '設備類' },
  { id: 'e3', name: '電鑽1', category: '設備類' },
  { id: 'e4', name: '電鑽2', category: '設備類' },
  { id: 'e5', name: '游標卡尺', category: '設備類' },
  { id: 'e6', name: '蘋果公務機 (102488)', category: '設備類' },
  { id: 'e7', name: '安卓公務機 (102502)', category: '設備類' },
  { id: 'e8', name: '護貝機 (開發驗證部的)', category: '設備類' },
  { id: 'e9', name: '電子式扭力板手工具 (102338)', category: '設備類' },
  { id: 'e10', name: 'DC電源供應器 (100788)', category: '設備類' },
  { id: 'e11', name: 'DC電源供應器 (100790)', category: '設備類' },
  { id: 'e12', name: '電源供應器 (102101)', category: '設備類' },
  { id: 'e13', name: '數位儲存示波器 (102100)', category: '設備類' },
  { id: 'e14', name: '手持式數位儲存示波器 (102099)', category: '設備類' },
  { id: 'e15', name: '多通道函數信號產生器 (102098)', category: '設備類' },
];

interface TransferLog {
  from: string;
  to: string;
  time: string;
}

interface ItemReturnDetail {
  isIntact: boolean;
  photos: string[];
  returner: string;
  time: string;
}

interface BorrowSession {
  id: string;
  items: string[];
  borrower: string;
  dept: string;
  borrowTime: string;
  transferLogs: TransferLog[];
  returnedItems: Record<string, ItemReturnDetail>;
}

interface HistoryEntry {
  id: string;
  sessionId: string;
  borrower: string;
  borrowTime: string;
  returner: string;
  returnTime: string;
  notes: string;
  transferLogs: TransferLog[];
  items: Record<string, { isIntact: boolean; photos: string[] }>;
}

// --- Component ---
export const ResourceManagementSystem: React.FC<{ userInfo: { name: string; dept: string } }> = ({ userInfo }) => {
  const [subTab, setSubTab] = useState<'status' | 'borrow' | 'return' | 'history'>('status');
  const [sessions, setSessions] = useState<BorrowSession[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Fetch Data on Mount
  useEffect(() => {
    const loadResourceData = async () => {
      try {
        const data = await fetchData('getAll');
        if (data && data.data) {
          if (data.data.resourceSessions) setSessions(data.data.resourceSessions);
          if (data.data.resourceHistory) {
            const parsedHistory = data.data.resourceHistory.map((h: any) => {
              let items = {};
              try {
                items = h.status_json ? JSON.parse(h.status_json) : {};
              } catch (e) {
                console.error("Failed to parse history status_json", h);
              }
              return { ...h, items, transferLogs: h.transferLogs || [] };
            });
            setHistory(parsedHistory);
          }
        }
      } catch (e) { console.error(e); }
    };
    loadResourceData();
  }, []);

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [workflow, setWorkflow] = useState<'none' | 'borrow_preview' | 'borrow_success' | 'return_form' | 'return_preview' | 'return_success' | 'transfer_form'>('none');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const [returnForm, setReturnForm] = useState<{
    returner: string;
    notes: string;
    itemDetails: Record<string, { isIntact: boolean; photos: string[] }>;
  }>({ returner: userInfo.name, notes: '', itemDetails: {} });

  const borrowedItemIds = useMemo(() => {
    return new Set(sessions.flatMap(s => (s.items || []).filter(id => !s.returnedItems[id])));
  }, [sessions]);

  const getDateTime = () => {
    const d = new Date();
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleConfirmBorrow = () => {
    const newSession: BorrowSession = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...selectedItemIds],
      borrower: userInfo.name,
      dept: userInfo.dept,
      borrowTime: getDateTime(),
      transferLogs: [],
      returnedItems: {}
    };

    // Call API
    fetchData('borrowResource', { ...newSession, borrowTime: newSession.borrowTime }) // API payload
      .then(res => {
        if (res.status === 'success') {
          setSessions([newSession, ...sessions]);
          setSelectedItemIds([]);
          setWorkflow('borrow_success');
        } else {
          alert('借用失敗: ' + res.message);
        }
      });
  };

  const handleTransfer = () => {
    const lastHolder = sessions.find(s => s.id === activeSessionId)?.borrower; // simplified fallback

    fetchData('transferResource', { sessionId: activeSessionId, newOwner: transferTarget, timestamp: getDateTime() })
      .then(res => {
        if (res.status === 'success') {
          setSessions(sessions.map(s => {
            if (s.id === activeSessionId) {
              const lastHolder = s.transferLogs.length > 0 ? s.transferLogs[s.transferLogs.length - 1].to : s.borrower;
              return {
                ...s,
                transferLogs: [...s.transferLogs, { from: lastHolder, to: transferTarget, time: getDateTime() }]
              };
            }
            return s;
          }));
          setWorkflow('none');
          setTransferTarget('');
        } else {
          alert('移轉失敗: ' + res.message);
        }
      });
  };

  const handleReturnItemPhoto = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64 } = await compressImage(file);
    // Use a placeholder prefix for display if needed, but here we probably want to store the base64 for preview?
    // Browser can display base64 images directly.
    const url = `data:image/jpeg;base64,${base64}`;
    setReturnForm(prev => {
      const details = prev.itemDetails[itemId] || { isIntact: true, photos: [] };
      return {
        ...prev,
        itemDetails: { ...prev.itemDetails, [itemId]: { ...details, photos: [...details.photos, url].slice(0, 4) } }
      };
    });
  };

  const handleExecuteReturn = () => {
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;

    const now = getDateTime();
    const returningItemsMap = { ...(returnForm.itemDetails as object) } as Record<string, { isIntact: boolean; photos: string[] }>;

    // 單品歸還即時寫入歷史
    const newHistoryEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: session.id,
      borrower: session.borrower,
      borrowTime: session.borrowTime,
      returner: returnForm.returner,
      returnTime: now,
      notes: returnForm.notes,
      transferLogs: [...session.transferLogs],
      items: returningItemsMap
    };

    // Prepare images for upload
    // We stored base64 in `photos` array in handleReturnItemPhoto modification? 
    // Wait, handleReturnItemPhoto pushes `url` which is `data:image/jpeg;base64,...`
    // We need to extract base64 for the API if we want to send clean base64, or just send the whole thing and let backend parse.
    // Our backend expects { name: '...', base64: '...' } in `images` array.

    const imagesToUpload: { name: string; base64: string }[] = [];
    Object.entries(returningItemsMap).forEach(([itemId, detail]) => {
      detail.photos.forEach((photoUrl, idx) => {
        // photoUrl is "data:image/jpeg;base64,....."
        const base64Clean = photoUrl.split(',')[1];
        imagesToUpload.push({
          name: `${itemId}_${idx}.jpg`,
          base64: base64Clean
        });
      });
    });

    fetchData('returnResource', {
      sessionId: session.id,
      returnTime: now,
      returner: returnForm.returner,
      itemDetails: returningItemsMap,
      notes: returnForm.notes,
      images: imagesToUpload
    }).then(res => {
      if (res.status === 'success') {
        // Update Local State
        setHistory(prev => [newHistoryEntry, ...prev].slice(0, 100));

        const updatedReturnedItemsMap = { ...session.returnedItems };
        Object.entries(returningItemsMap).forEach(([id, detail]) => {
          updatedReturnedItemsMap[id] = { ...detail, returner: returnForm.returner, time: now };
        });

        const updatedSession = { ...session, returnedItems: updatedReturnedItemsMap };
        const isFullyReturned = session.items.every(id => !!updatedSession.returnedItems[id]);

        if (isFullyReturned) {
          setSessions(sessions.filter(s => s.id !== activeSessionId));
        } else {
          setSessions(sessions.map(s => s.id === activeSessionId ? updatedSession : s));
        }

        setWorkflow('return_success');
      } else {
        alert('歸還失敗: ' + res.message);
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {zoomImg && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} className="max-w-full max-h-full rounded-lg" alt="Zoom" />
        </div>
      )}

      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">資源管理系統</h2>
          <p className="text-sm text-slate-500 font-bold">即時追蹤車間設備、工具及鑰匙狀態</p>
        </div>
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl border">
          {[
            { id: 'status', label: '即時狀態', icon: '📊' },
            { id: 'borrow', label: '借用登記', icon: '📝' },
            { id: 'return', label: '歸還登記', icon: '↩️' },
            { id: 'history', label: '點檢歷史', icon: '📜' }
          ].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id as any)} className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all ${subTab === t.id ? 'bg-white text-blue-700 shadow' : 'text-slate-500'}`}>
              <span className="mr-2">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Tab 1: Status (Categorized) */}
      {subTab === 'status' && (
        <div className="space-y-10">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-xs text-blue-800 font-bold shadow-sm flex items-center gap-3">
            <span className="text-xl">💡</span>
            操作提示：點選「借用登記」分頁即可開始選取多項物件進行借用手續。
          </div>

          {CATEGORIES.map(cat => (
            <div key={cat} className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-black text-slate-500 border-l-4 border-blue-600 pl-3 uppercase tracking-widest">{cat}</h3>
                <span className="text-[10px] font-bold text-slate-400">Total: {RESOURCES.filter(r => r.category === cat).length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {RESOURCES.filter(r => r.category === cat).map(item => {
                  const isBorrowed = borrowedItemIds.has(item.id);
                  const session = sessions.find(s => s.items.includes(item.id) && !s.returnedItems[item.id]);
                  const holder = session ? (session.transferLogs.length > 0 ? session.transferLogs[session.transferLogs.length - 1].to : session.borrower) : '';
                  return (
                    <div key={item.id} className={`p-5 rounded-3xl border-2 transition-all h-32 flex flex-col justify-between ${isBorrowed ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'}`}>
                      <div>
                        <h4 className="font-black text-slate-800 line-clamp-2 leading-snug">{item.name}</h4>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full text-white ${isBorrowed ? 'bg-rose-600' : 'bg-emerald-600'}`}>{isBorrowed ? '已借出' : '在庫'}</span>
                        {isBorrowed && <span className="text-[10px] font-bold text-rose-800 truncate max-w-[100px]">持有: {holder}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Borrow (Categorized) */}
      {subTab === 'borrow' && (
        <div className="space-y-10">
          <div className="flex justify-between items-center bg-white p-4 rounded-3xl shadow-md border sticky top-[100px] z-20">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-black tracking-widest">REGISTRATION</span>
                <span className="font-black text-slate-800">{getDateTime()}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-sm font-bold text-slate-500">已選取 <span className="text-blue-600 font-black">{selectedItemIds.length}</span> 項</div>
            </div>
            <button disabled={selectedItemIds.length === 0} onClick={() => setWorkflow('borrow_preview')} className={`px-8 py-3 rounded-2xl font-black text-sm transition-all ${selectedItemIds.length > 0 ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>確認借用清單</button>
          </div>

          {CATEGORIES.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="text-sm font-black text-slate-500 border-l-4 border-slate-300 pl-3 uppercase tracking-widest">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {RESOURCES.filter(r => r.category === cat).map(item => {
                  const isBorrowed = borrowedItemIds.has(item.id);
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <button key={item.id} disabled={isBorrowed} onClick={() => setSelectedItemIds(p => isSelected ? p.filter(id => id !== item.id) : [...p, item.id])} className={`p-5 rounded-3xl border-2 text-left h-32 flex flex-col justify-between transition-all ${isBorrowed ? 'opacity-30 grayscale cursor-not-allowed' : isSelected ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/10' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <h4 className={`font-black line-clamp-2 leading-snug ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{item.name}</h4>
                      <div className="flex justify-between items-center">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white text-[10px]' : 'border-slate-300'}`}>{isSelected && '✓'}</div>
                        {isBorrowed && <span className="text-[10px] font-black text-rose-500 uppercase italic">In Use</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Return */}
      {subTab === 'return' && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-bold border-2 border-dashed rounded-3xl">目前無任何借用中的資源單據</div>
          ) : (
            sessions.map(s => {
              return (
                <div key={s.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">ORDER ID: {s.id}</span>
                        <span className="font-black text-slate-800 text-lg">{s.borrower} ({s.dept})</span>
                        <span className="text-slate-400 text-xs font-bold ml-auto md:ml-0 italic">借用: {s.borrowTime}</span>
                      </div>

                      {/* 移轉履歷渲染 */}
                      {s.transferLogs.length > 0 && (
                        <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">移轉履歷 (Transfer Log)</span>
                          <div className="space-y-1">
                            {s.transferLogs.map((log, idx) => (
                              <div key={idx} className="text-[10px] text-slate-600 italic">
                                🕒 {log.time}：<span className="font-bold">{log.from}</span> 移轉給 <span className="font-bold text-blue-600">{log.to}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {s.items.map(id => (
                          <span key={id} className={`text-[10px] font-bold px-2 py-1 rounded border ${s.returnedItems[id] ? 'bg-emerald-50 text-emerald-600 border-emerald-100 opacity-50' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{RESOURCES.find(r => r.id === id)?.name} {s.returnedItems[id] && '✓'}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 border-r">
                        <span className="text-[10px] font-black text-slate-400 block">歸還進度</span>
                        <span className="text-lg font-black text-blue-600">{Object.keys(s.returnedItems).length} / {s.items.length}</span>
                      </div>
                      <button onClick={() => { setActiveSessionId(s.id); setWorkflow('transfer_form'); }} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-all">🤝 物件移轉</button>
                      <button onClick={() => {
                        setActiveSessionId(s.id);
                        setReturnForm({ returner: userInfo.name, notes: '', itemDetails: {} });
                        setWorkflow('return_form');
                      }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 transition-all">📦 辦理歸還</button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab 4: History */}
      {subTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] text-slate-500 font-bold">
            ⚠️ 紀錄規則：僅保留近 30 天單品歸還紀錄，尚未歸還之原始借用紀錄將持續保存至歸還完成。
          </div>
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-bold border-2 border-dashed rounded-3xl">尚無點檢紀錄</div>
            ) : (
              history.map(h => {
                const hasMissing = (Object.values(h.items) as { isIntact: boolean; photos: string[] }[]).some(d => !d.isIntact);
                return (
                  <div key={h.id} className={`p-6 rounded-3xl border shadow-sm transition-all ${hasMissing ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full text-white ${hasMissing ? 'bg-rose-600 shadow-lg shadow-rose-200' : 'bg-emerald-600'}`}>{hasMissing ? '工具遺失' : '✅ 完好歸還'}</span>
                        <h4 className="font-black text-slate-800 text-lg">{h.returner} 歸還了 {h.borrower} 的物品</h4>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] text-slate-400 font-bold italic">借用: {h.borrowTime}</span>
                        <span className="text-[10px] text-slate-400 font-bold italic">歸還: {h.returnTime}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">移轉路徑:</div>
                          {h.transferLogs.length > 0 ? (
                            <div className="space-y-1">
                              {h.transferLogs.map((l, i) => <div key={i} className="text-xs text-slate-600 font-medium italic">➔ {l.time}: {l.from} ➔ {l.to}</div>)}
                            </div>
                          ) : <div className="text-xs text-slate-400">直接歸還 (無中間移轉)</div>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">備註內容:</div>
                          <p className="text-sm text-slate-600 font-medium">{h.notes || '無填寫備註'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(h.items) as [string, { isIntact: boolean; photos: string[] }][]).map(([id, det]) => {
                          const item = RESOURCES.find(r => r.id === id);
                          return (
                            <div key={id} className={`p-3 rounded-2xl border flex flex-col gap-2 min-w-[140px] ${det.isIntact ? 'bg-white border-slate-100' : 'bg-rose-100 border-rose-400'}`}>
                              <span className="text-[10px] font-black text-slate-800">{item?.name}</span>
                              <div className="flex gap-1">
                                {det.photos.map((p, idx) => (
                                  <img key={idx} src={p} onClick={() => setZoomImg(p)} className="w-10 h-10 rounded-lg object-cover cursor-zoom-in hover:opacity-80 transition-opacity border border-slate-200" alt="Inspect" />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- Modals (Consistent Logic) --- */}
      {workflow === 'borrow_preview' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-blue-900 p-6 text-white text-center"><h3 className="text-xl font-black tracking-widest uppercase">借用報單確認</h3></div>
            <div className="p-8 space-y-4">
              <div className="flex justify-between border-b pb-2"><span className="text-slate-500 font-bold">借用同仁</span><span className="font-black">{userInfo.name}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-slate-500 font-bold">登記時間</span><span className="font-black">{getDateTime()}</span></div>
              <div className="space-y-2">
                <span className="text-slate-500 font-bold block">借用清單:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedItemIds.map(id => <span key={id} className="text-[10px] font-black bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">{RESOURCES.find(r => r.id === id)?.name}</span>)}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setWorkflow('none')} className="flex-1 py-4 border rounded-2xl font-black text-slate-500 hover:bg-white transition-all">返回修改</button>
              <button onClick={handleConfirmBorrow} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">確認借用</button>
            </div>
          </div>
        </div>
      )}

      {(workflow === 'borrow_success' || workflow === 'return_success') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">✓</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">登記成功</h3>
            <p className="text-slate-500 font-bold mb-8">雲端資料庫已同步完成</p>
            <button onClick={() => { setWorkflow('none'); setSubTab('status'); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">回到即時狀態</button>
          </div>
        </div>
      )}

      {workflow === 'transfer_form' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-800 p-6 text-white text-center"><h3 className="text-xl font-black tracking-widest">物件移轉</h3></div>
            <div className="p-8 space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">接收同事姓名</label>
              <input type="text" value={transferTarget} onChange={e => setTransferTarget(e.target.value)} className="w-full p-4 border rounded-2xl font-bold focus:ring-4 focus:ring-blue-500/10 outline-none" placeholder="請輸入姓名" />
            </div>
            <div className="p-6 bg-slate-50 border-t flex gap-3">
              <button onClick={() => setWorkflow('none')} className="flex-1 py-3 border rounded-xl font-bold text-slate-500">取消</button>
              <button onClick={handleTransfer} disabled={!transferTarget} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold disabled:opacity-50 transition-all">確認移轉</button>
            </div>
          </div>
        </div>
      )}

      {workflow === 'return_form' && activeSessionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="bg-blue-900 p-6 text-white text-center"><h3 className="text-xl font-black uppercase tracking-widest">歸還點檢流程</h3></div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">歸還人姓名</label><input type="text" value={returnForm.returner} onChange={e => setReturnForm({ ...returnForm, returner: e.target.value })} className="w-full p-3 border rounded-xl font-bold outline-none focus:ring-4 focus:ring-blue-500/10" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">辦理時間</label><div className="p-3 bg-slate-50 border rounded-xl font-bold text-slate-500">{getDateTime()}</div></div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-700 border-l-4 border-blue-600 pl-3 uppercase tracking-tighter">選擇要歸還的項目</h4>
                {sessions.find(s => s.id === activeSessionId)?.items.filter(id => !sessions.find(s => s.id === activeSessionId)?.returnedItems[id]).map(id => {
                  const item = RESOURCES.find(r => r.id === id);
                  const isTool = item?.category === '工具類';
                  const det = returnForm.itemDetails[id];
                  return (
                    <div key={id} className={`p-4 rounded-2xl border-2 transition-all ${det ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={!!det} onChange={() => {
                            const newDetails = { ...returnForm.itemDetails };
                            if (det) delete newDetails[id];
                            else newDetails[id] = { isIntact: true, photos: [] };
                            setReturnForm({ ...returnForm, itemDetails: newDetails });
                          }} className="w-5 h-5 rounded-lg cursor-pointer" />
                          <span className="font-black text-slate-800">{item?.name}</span>
                        </div>
                        {det && isTool && (
                          <div className="flex gap-2">
                            <button onClick={() => setReturnForm({ ...returnForm, itemDetails: { ...returnForm.itemDetails, [id]: { ...det, isIntact: true } } })} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${det.isIntact ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>完好</button>
                            <button onClick={() => setReturnForm({ ...returnForm, itemDetails: { ...returnForm.itemDetails, [id]: { ...det, isIntact: false } } })} className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${!det.isIntact ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>遺失</button>
                          </div>
                        )}
                      </div>
                      {det && isTool && (
                        <div className="mt-4 flex items-center gap-2 overflow-x-auto p-1">
                          {det.photos.map((p, i) => <img key={i} src={p} className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-sm" alt="Upload" />)}
                          {det.photos.length < 4 && (
                            <label className="w-14 h-14 border-2 border-dashed rounded-xl flex items-center justify-center text-slate-400 cursor-pointer hover:border-blue-500 hover:text-blue-500 transition-all">
                              <span className="text-xl">+</span>
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleReturnItemPhoto(id, e)} />
                            </label>
                          )}
                          {det.photos.length === 0 && <span className="text-[9px] text-rose-500 font-black tracking-widest animate-pulse uppercase ml-2 italic">⚠️ 工具類必填照片</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">備註補充 (可不填)</label>
                <textarea value={returnForm.notes} onChange={e => setReturnForm({ ...returnForm, notes: e.target.value })} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" rows={2} placeholder="如：工具微損、外殼髒污...等"></textarea>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setWorkflow('none')} className="flex-1 py-4 border rounded-2xl font-black text-slate-500 transition-all hover:bg-white">取消</button>
              <button
                onClick={() => setWorkflow('return_preview')}
                disabled={Object.keys(returnForm.itemDetails).length === 0 || (Object.entries(returnForm.itemDetails) as [string, { isIntact: boolean; photos: string[] }][]).some(([id, d]) => RESOURCES.find(r => r.id === id)?.category === '工具類' && d.photos.length === 0)}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-50 transition-all"
              >
                下一步：預覽
              </button>
            </div>
          </div>
        </div>
      )}

      {workflow === 'return_preview' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-emerald-600 p-6 text-white text-center"><h3 className="text-xl font-black uppercase tracking-widest">歸還確認預覽</h3></div>
            <div className="p-8 space-y-4">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex justify-between text-sm border-b pb-2"><span className="text-slate-500 font-bold">辦理歸還者</span><span className="font-black text-slate-800">{returnForm.returner}</span></div>
                <div className="flex justify-between text-sm border-b pb-2"><span className="text-slate-500 font-bold">歸還品項數</span><span className="font-black text-blue-700">{Object.keys(returnForm.itemDetails).length} 項</span></div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter italic">Items List:</span>
                  {(Object.entries(returnForm.itemDetails) as [string, { isIntact: boolean; photos: string[] }][]).map(([id, d]) => (
                    <div key={id} className="text-xs font-bold flex justify-between">
                      <span>• {RESOURCES.find(r => r.id === id)?.name}</span>
                      <span className={d.isIntact ? 'text-emerald-600' : 'text-rose-600'}>{d.isIntact ? '完好' : '遺失'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setWorkflow('return_form')} className="flex-1 py-4 border rounded-2xl font-black text-slate-500">返回修改</button>
              <button onClick={handleExecuteReturn} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">確認完成歸還</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
