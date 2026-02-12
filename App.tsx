
import React, { useState, useMemo, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './components/Login';
import { ResourceManagementSystem } from './components/ResourceManagementSystem';
import { api } from './utils/api';

// --- Constants & Types ---

const VENUES = {
  GENERAL: ['工位一', '工位二', '工位三', '工位四', '備用工位一', '備用工位二', '備用工位三', '101會議室'],
  CONFIDENTIAL: ['保密車間一(白門)', '保密車間二(灰門)', '保密車間三(B3-1)', '保密車間三(B3-2)']
};

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0');
  const min = (i % 2 === 0 ? '00' : '30');
  return `${hour}:${min}`;
});

interface Booking {
  id: string;
  venue: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  applicant: string;
  dept: string;
  carModel: string;
  purpose: string;
  password: string; // 5-digit
  excludedDates?: string[]; // For partial cancellations
}

// --- Helper Functions ---

const getFormattedDate = (date: Date) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}/${m}/${d}`;
};

const isDateInRange = (checkDate: string, startDate: string, endDate: string) => {
  return checkDate >= startDate && checkDate <= endDate;
};

const isDayStarted = (dateStr: string, startTimeStr: string) => {
  const now = new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = startTimeStr.split(':').map(Number);
  const startTime = new Date(year, month - 1, day, hour, minute);
  return now >= startTime;
};

const getDatesInRange = (startDate: string, endDate: string) => {
  const dates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

// --- Components ---

/**
 * Booking Detail Modal (View Only)
 */
const BookingDetailView: React.FC<{ booking: Booking; onClose: () => void }> = ({ booking, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-blue-900 px-6 py-4 text-white flex justify-between items-center">
          <h3 className="text-lg font-bold">預約詳細資訊</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">預約場地</span><span className="font-bold text-blue-700">{booking.venue}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">借用日期</span><span className="font-bold">{booking.startDate} ~ {booking.endDate}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">借用時段</span><span className="font-bold">{booking.startTime} - {booking.endTime}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">借用同仁</span><span className="font-bold">{booking.applicant}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">所屬部門</span><span className="font-bold">{booking.dept}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">停放車型</span><span className="font-bold">{booking.carModel}</span></div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-500">借用目的</span>
              <p className="bg-slate-50 p-3 rounded-xl border text-sm text-slate-700 italic">{booking.purpose}</p>
            </div>
            {booking.excludedDates && booking.excludedDates.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-slate-500 text-xs font-bold text-rose-500">已取消日期 (Excluded Dates)</span>
                <div className="flex flex-wrap gap-1">
                  {booking.excludedDates.map(d => (
                    <span key={d} className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded border border-rose-100">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-center">
          <button onClick={onClose} className="px-8 py-2 bg-slate-200 text-slate-700 font-bold rounded-full hover:bg-slate-300 transition-colors">關閉視窗</button>
        </div>
      </div>
    </div>
  );
};

/**
 * Cancellation Confirmation Modal
 */
const CancelConfirmationModal: React.FC<{
  booking: Booking;
  onClose: () => void;
  onConfirmCancel: (id: string, password: string, selectedDates: string[]) => Promise<boolean>;
}> = ({ booking, onClose, onConfirmCancel }) => {
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const allDates = useMemo(() => getDatesInRange(booking.startDate, booking.endDate), [booking]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Filter out dates that are already excluded
  const validDates = useMemo(() => {
    return allDates.filter(d => !booking.excludedDates?.includes(d));
  }, [allDates, booking.excludedDates]);

  const cancellableDates = useMemo(() => {
    return validDates.filter(date => !isDayStarted(date, booking.startTime));
  }, [validDates, booking.startTime]);

  const handleToggleDate = (date: string) => {
    setSelectedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
  };

  const handleSelectAll = () => {
    if (selectedDates.length === cancellableDates.length) {
      setSelectedDates([]);
    } else {
      setSelectedDates([...cancellableDates]);
    }
  };

  const handleCancelClick = () => {
    if (selectedDates.length === 0) {
      alert('請至少選擇一個尚未開始的日期進行取消。');
      return;
    }
    setShowPasswordInput(true);
  };

  const handleFinalCancel = async () => {
    setIsProcessing(true);
    const success = await onConfirmCancel(booking.id, password, selectedDates);
    setIsProcessing(false);

    if (success) {
      alert('所選預約已成功取消/更新。');
      onClose();
    } else {
      alert('密碼錯誤，請重新確認！');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-rose-600 px-8 py-6 text-white text-center">
          <h3 className="text-xl font-black tracking-tighter uppercase">取消預約申請確認</h3>
          <p className="text-xs opacity-80 mt-1 font-bold">PLEASE CONFIRM YOUR CANCELLATION</p>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          {!showPasswordInput ? (
            <>
              <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 space-y-4">
                <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500 font-bold">預約場地</span><span className="font-black text-rose-600">{booking.venue}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500 font-bold">時段</span><span className="font-bold">{booking.startTime} - {booking.endTime}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500 font-bold">申請人</span><span className="font-bold">{booking.applicant}</span></div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">選擇要取消的日期 (可複選)</span>
                    {cancellableDates.length > 1 && (
                      <button onClick={handleSelectAll} className="text-[10px] bg-white border px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100">
                        {selectedDates.length === cancellableDates.length ? '取消全選' : '全選可取消日期'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {validDates.map(date => {
                      const started = isDayStarted(date, booking.startTime);
                      const isSelected = selectedDates.includes(date);
                      return (
                        <div
                          key={date}
                          onClick={() => !started && handleToggleDate(date)}
                          className={`p-3 rounded-xl border-2 flex items-center justify-between transition-all cursor-pointer ${started ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed' :
                            isSelected ? 'bg-rose-50 border-rose-500' : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex flex-col">
                            <span className={`text-xs font-black ${isSelected ? 'text-rose-700' : 'text-slate-700'}`}>{date}</span>
                            {started && <span className="text-[9px] text-rose-400 font-bold">已過期不可取消</span>}
                          </div>
                          {!started && (
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200'}`}>
                              {isSelected && '✓'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-rose-600 font-black text-lg tracking-tighter">確定要執行取消程序嗎？</p>
                <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase">NOTICE: Only future slots can be cancelled.</p>
              </div>
            </>
          ) : (
            <div className="py-8 space-y-4 text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🔑</div>
              <h4 className="text-xl font-black text-slate-800">請輸入五位數取消密碼</h4>
              <input
                type="text"
                maxLength={5}
                value={password}
                onChange={(e) => setPassword(e.target.value.replace(/\D/g, ''))}
                placeholder="•••••"
                className="w-full max-w-xs p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-500/20 outline-none font-mono text-center tracking-[1.5em] text-2xl"
              />
              <p className="text-xs text-slate-400 font-medium">請輸入預約時設定的 5 位數密碼以利系統執行刪除</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t flex gap-4">
          <button
            onClick={() => showPasswordInput ? setShowPasswordInput(false) : onClose()}
            disabled={isProcessing}
            className="flex-1 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-white transition-all active:scale-95 disabled:opacity-50"
          >
            返回
          </button>
          {!showPasswordInput ? (
            <button
              onClick={handleCancelClick}
              disabled={selectedDates.length === 0}
              className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${selectedDates.length === 0 ? 'bg-slate-300 cursor-not-allowed opacity-50' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
            >
              我要取消選中日期
            </button>
          ) : (
            <button
              onClick={handleFinalCancel}
              disabled={password.length !== 5 || isProcessing}
              className={`flex-1 py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${password.length === 5 && !isProcessing ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-slate-300 cursor-not-allowed opacity-50'}`}
            >
              {isProcessing ? '處理中...' : '確認取消並刪除'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Calendar View Component
 */
const VenueCalendar: React.FC<{
  bookings: Booking[];
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  onViewDetail: (b: Booking) => void;
}> = ({ bookings, currentMonth, onMonthChange, onViewDetail }) => {
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth]);

  const prevMonth = () => onMonthChange(new Date(year, month - 1, 1));
  const nextMonth = () => onMonthChange(new Date(year, month + 1, 1));
  const goToday = () => onMonthChange(new Date());

  const usedDaysCount = useMemo(() => {
    const datesWithBookings = new Set<string>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const hasBooking = bookings.some(b =>
        isDateInRange(dateStr, b.startDate, b.endDate) &&
        !b.excludedDates?.includes(dateStr)
      );
      if (hasBooking) datesWithBookings.add(dateStr);
    }
    return datesWithBookings.size;
  }, [bookings, currentMonth, daysInMonth]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 p-6 flex flex-col md:flex-row items-center justify-between border-b border-slate-200 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 rounded-full transition-colors text-slate-600">◀</button>
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">{year}年 {month + 1}月</h3>
          <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 rounded-full transition-colors text-slate-600">▶</button>

          <button onClick={goToday} className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-full text-sm font-bold text-blue-600 hover:shadow-sm transition-all active:scale-95">
            <span className="text-lg">📅</span> 今日
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full border border-blue-100 font-bold text-sm">
            <span>📊 使用天數</span>
            <span className="text-lg text-blue-900">{usedDaysCount}</span>
            <span>天</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
        {['一', '二', '三', '四', '五', '六', '日'].map((d, idx) => (
          <div key={d} className={`py-3 text-center text-xs font-black uppercase tracking-widest ${idx >= 5 ? 'text-rose-500 bg-rose-50/30' : 'text-slate-400'}`}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 min-h-[600px]">
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="bg-slate-50/20 border-r border-b border-slate-100"></div>;
          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

          // Filter bookings for this day, excluding cancelled dates
          const dayBookings = bookings.filter(b =>
            isDateInRange(dateStr, b.startDate, b.endDate) &&
            !b.excludedDates?.includes(dateStr)
          );

          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          const dayOfWeek = (idx % 7);
          const isWeekend = dayOfWeek >= 5;

          return (
            <div key={day} className="min-h-[120px] border-r border-b border-slate-100 p-2 relative flex flex-col group hover:bg-slate-50/50 transition-colors">
              <span className={`text-sm font-black mb-2 flex items-center justify-center w-7 h-7 rounded-full transition-colors ${isToday ? 'bg-blue-600 text-white shadow-md' : (isWeekend ? 'text-rose-500' : 'text-slate-900')
                }`}>
                {day}
              </span>
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px] scrollbar-thin">
                {dayBookings.map(b => (
                  <button key={b.id} onClick={() => onViewDetail(b)} className="w-full text-left text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200 truncate leading-tight transition-colors shadow-sm">
                    <span className="font-bold">{b.venue}</span> - {b.applicant} - {b.startTime}~{b.endTime}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Multi-step Booking Modal
 */
const VenueBookingModal: React.FC<{
  venue: string;
  userInfo: { name: string; department: string };
  onClose: (targetMonth?: Date) => void;
  bookings: Booking[];
  onAddBooking: (b: Omit<Booking, 'id' | 'excludedDates'>) => Promise<void>;
}> = ({ venue, userInfo, onClose, bookings, onAddBooking }) => {
  const [step, setStep] = useState<'form' | 'preview' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: '08:30',
    endTime: '17:30',
    carModel: '',
    purpose: '',
    password: ''
  });

  const isSlotBooked = (date: string, time: string) => {
    return bookings.some(b =>
      b.venue === venue &&
      isDateInRange(date, b.startDate, b.endDate) &&
      !b.excludedDates?.includes(date) &&
      time >= b.startTime && time < b.endTime
    );
  };

  const isValid = formData.carModel && formData.purpose && formData.password.length === 5 && formData.startDate <= formData.endDate;

  const handleNext = () => {
    if (isValid) setStep('preview');
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await onAddBooking({
      venue,
      applicant: userInfo.name,
      dept: userInfo.department,
      ...formData
    });
    setIsSubmitting(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col relative">
        <div className="bg-blue-900 px-6 py-4 text-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h3 className="text-lg font-bold">借用登記：{venue}</h3>
            {step === 'form' && <p className="text-[10px] opacity-70 italic">請填寫詳細預約資訊</p>}
          </div>
          <button onClick={() => onClose()} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl font-light">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {step === 'form' && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-[11px] text-amber-800 leading-relaxed shadow-sm">
                <span className="font-bold flex items-center gap-1 mb-1"><span className="text-sm">💡</span> 預約提醒</span>
                如需停放過夜者請勾選 18:30~07:30，並於借用目的欄位填寫停放原因與相關滯留物品清單。
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest border-l-4 border-blue-600 pl-2">1. 選擇日期區間</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">起始日期</span>
                    <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">結束日期</span>
                    <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest border-l-4 border-blue-600 pl-2">2. 選擇時段 (00:00~24:00)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">開始時間</span>
                    <select value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner">
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t} disabled={isSlotBooked(formData.startDate, t)}>{t} {isSlotBooked(formData.startDate, t) ? '(不可選)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">結束時間</span>
                    <select value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner">
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t} disabled={isSlotBooked(formData.startDate, t)}>{t} {isSlotBooked(formData.startDate, t) ? '(不可選)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">借用同仁</label>
                  <input type="text" value={userInfo.name} readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400">所屬部門</label>
                  <input type="text" value={userInfo.department} readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest border-l-4 border-blue-600 pl-2">3. 其他資訊</label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">停放車型</span>
                    <input type="text" placeholder="請輸入車型名稱" value={formData.carModel} onChange={e => setFormData({ ...formData, carModel: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">借用目的</span>
                    <textarea rows={3} placeholder="請輸入借用目的" value={formData.purpose} onChange={e => setFormData({ ...formData, purpose: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all shadow-inner"></textarea>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">取消密碼設置 (5位數)</span>
                    <input type="text" maxLength={5} placeholder="建議輸入員工編號" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value.replace(/\D/g, '') })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center tracking-[1em] transition-all shadow-inner" />
                    <p className="text-[10px] text-slate-400 mt-1 italic text-center">如欲刪除本預約，須輸入此組密碼。</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h4 className="text-2xl font-black text-slate-800 tracking-tighter">報單預覽</h4>
                <p className="text-sm text-slate-500 font-medium">請再次確認您的預約內容</p>
              </div>
              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 space-y-4 shadow-sm">
                <div className="flex justify-between border-b border-slate-200 pb-3"><span className="text-slate-500 font-bold">預約場地</span><span className="font-black text-blue-700">{venue}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-3"><span className="text-slate-500 font-bold">日期區間</span><span className="font-bold">{formData.startDate} ~ {formData.endDate}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-3"><span className="text-slate-500 font-bold">每日時段</span><span className="font-bold">{formData.startTime} - {formData.endTime}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-3"><span className="text-slate-500 font-bold">借用同仁</span><span className="font-bold">{userInfo.name} ({userInfo.department})</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-3"><span className="text-slate-500 font-bold">停放車型</span><span className="font-bold">{formData.carModel}</span></div>
                <div className="flex flex-col gap-2">
                  <span className="text-slate-500 font-bold">借用目的</span>
                  <p className="bg-white p-4 rounded-2xl border text-sm text-slate-600 italic leading-relaxed">{formData.purpose}</p>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 py-16 animate-in fade-in scale-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl shadow-inner animate-bounce">✓</div>
              <h4 className="text-3xl font-black text-slate-800 tracking-tighter">預約成功！</h4>
              <p className="text-slate-500 text-center font-medium">您的預約已成功提交。<br />現在將引導您返回登記明細視圖。</p>
              <button onClick={() => onClose(new Date(formData.startDate))} className="px-12 py-4 bg-blue-600 text-white rounded-full font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">返回明細查看</button>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
            {step === 'preview' ? (
              <>
                <button onClick={() => setStep('form')} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-white transition-colors">上一步修改</button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 py-4 bg-emerald-600 rounded-2xl font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                >
                  {isSubmitting ? '提交中...' : '確認並提交預約'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => onClose()} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-white transition-colors">取消登記</button>
                <button onClick={handleNext} disabled={!isValid} className={`flex-1 py-4 rounded-2xl font-bold text-white shadow-lg transition-all ${isValid ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 active:scale-95' : 'bg-slate-300 cursor-not-allowed opacity-50'}`}>下一步確認報單</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const AppContent: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', department: '' });
  const [activeTab, setActiveTab] = useState<'venue' | 'resource'>('venue');
  const [venueSubTab, setVenueSubTab] = useState<'details' | 'book' | 'cancel'>('details');
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [todayDate, setTodayDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check localStorage for login
    const savedUser = localStorage.getItem('carmax_user_v1');
    if (savedUser) {
      setUserInfo(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }

    const timer = setInterval(() => setTodayDate(new Date()), 60000);
    loadData(); // Initial load
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllData();
      if (data && data.venues) {
        // Fix: Normalize dates to local YYYY-MM-DD to handle UTC timestamps from GAS
        // Fix (Time): Also normalize startTime/endTime if they are ISO strings (1899-12-30...)
        const normalizedBookings = data.venues.map((b: any) => {
          const startDate = new Date(b.startDate);
          const endDate = new Date(b.endDate);

          let st = b.startTime;
          let et = b.endTime;

          const formatTime = (t: any) => {
            // If t is string and contains T (ISO), parse it
            if (typeof t === 'string' && t.includes('T')) {
              const d = new Date(t);
              return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            return t;
          };

          return {
            ...b,
            startDate: `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`,
            endDate: `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`,
            startTime: formatTime(st),
            endTime: formatTime(et)
          };
        });
        setBookings(normalizedBookings);
        // Note: sessions and history are also available in `data`, 
        // but ResourceManagementSystem will load its own data or we can pass it down.
        // For simplicity in refactoring, we let ResourceManagementSystem call fetch on mount as well.
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (name: string, dept: string) => {
    const user = { name, department: dept };
    setUserInfo(user);
    setIsLoggedIn(true);
    localStorage.setItem('carmax_user_v1', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserInfo({ name: '', department: '' });
    setSelectedVenue(null);
    localStorage.removeItem('carmax_user_v1');
  };

  const addBooking = async (b: Omit<Booking, 'id' | 'excludedDates'>) => {
    // Optimistic UI: Generate ID and update state immediately
    const newId = Math.random().toString(36).substr(2, 9);
    const booking: Booking = { ...b, id: newId, excludedDates: [] };

    // Snapshot for rollback
    const previousBookings = [...bookings];

    // 1. Update UI immediately
    setBookings(prev => [...prev, booking]);

    // 2. Perform API call in background
    try {
      await api.bookVenue(booking);
      // 3. Sync with server to ensure consistency (e.g. timestamp)
      loadData();
    } catch (e) {
      // 4. Revert on failure
      console.error('Booking failed, reverting optimistic update', e);
      setBookings(previousBookings);
      alert('預約失敗: ' + (e instanceof Error ? e.message : e));
    }
  };

  const confirmAndCancelBooking = async (id: string, pass: string, datesToRemove: string[]): Promise<boolean> => {
    // Verify password locally first for immediate feedback
    const booking = bookings.find(b => b.id === id);
    if (!booking) return false;
    if (booking.password !== pass) {
      alert('密碼錯誤，請重新確認！'); // Early alert
      return false; // Prevent modal close
    }

    // Snapshot for rollback
    const previousBookings = [...bookings];

    // 1. Update UI immediately
    setBookings(prev => {
      return prev.map(b => {
        if (b.id === id) {
          if (datesToRemove.length > 0) {
            // Partial cancel
            const newExcluded = [...(b.excludedDates || []), ...datesToRemove];
            // Remove duplicates just in case
            return { ...b, excludedDates: [...new Set(newExcluded)] };
          } else {
            // Full cancel (remove from view)
            return null;
          }
        }
        return b;
      }).filter(Boolean) as Booking[];
    });

    // 2. Perform API call in background
    // We return true immediately to allow Modal to close
    api.cancelBooking(id, pass, datesToRemove)
      .then(() => loadData()) // Sync after success
      .catch(e => {
        // Revert on failure
        console.error('Cancellation failed, reverting', e);
        setBookings(previousBookings);
        alert('取消失敗: ' + (e instanceof Error ? e.message : e));
      });

    return true;
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed top-4 right-4 bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-lg z-[200] flex items-center gap-2 text-xs font-bold text-slate-500 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin"></div>
          Syncing...
        </div>
      )}

      {/* Modals */}
      {selectedVenue && (
        <VenueBookingModal
          venue={selectedVenue}
          userInfo={{ name: userInfo.name, department: userInfo.department }}
          bookings={bookings}
          onAddBooking={addBooking}
          onClose={(targetMonth) => {
            setSelectedVenue(null);
            if (targetMonth) {
              setCalendarMonth(targetMonth);
              setVenueSubTab('details');
            }
          }}
        />
      )}

      {selectedBookingDetail && (
        <BookingDetailView
          booking={selectedBookingDetail}
          onClose={() => setSelectedBookingDetail(null)}
        />
      )}

      {cancellingBooking && (
        <CancelConfirmationModal
          booking={cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onConfirmCancel={confirmAndCancelBooking}
        />
      )}

      {activeTab === 'venue' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600 font-black">
              <span className="text-xl">📅</span>
              <span className="tracking-tight">{getFormattedDate(todayDate)}</span>
            </div>
            <div className="bg-slate-100 px-6 py-2 rounded-full text-xs font-bold text-slate-500 border border-slate-200 text-center">
              ⚠️ 資料保存規則：已完成之紀錄保留 120 天，第 121 天自動複寫；未來預約將持續保存。
            </div>
          </div>

          <header className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">車間場地預約系統</h2>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-xs bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-black shadow-sm">
                  USER: {userInfo.name} ({userInfo.department})
                </div>
              </div>
            </div>

            <div className="flex bg-slate-200/50 backdrop-blur-sm p-1.5 rounded-2xl shadow-inner border border-slate-200">
              <button onClick={() => setVenueSubTab('details')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${venueSubTab === 'details' ? 'bg-white text-blue-700 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>登記明細</button>
              <button onClick={() => setVenueSubTab('book')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${venueSubTab === 'book' ? 'bg-white text-blue-700 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>借用登記</button>
              <button onClick={() => setVenueSubTab('cancel')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${venueSubTab === 'cancel' ? 'bg-white text-rose-600 shadow-md scale-[1.02]' : 'text-slate-500 hover:text-slate-700'}`}>取消預約</button>
            </div>
          </header>

          {venueSubTab === 'details' && (
            <VenueCalendar
              bookings={bookings}
              currentMonth={calendarMonth}
              onMonthChange={setCalendarMonth}
              onViewDetail={setSelectedBookingDetail}
            />
          )}

          {venueSubTab === 'book' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
              <section className="space-y-4">
                <h3 className="font-black text-slate-700 border-l-8 border-blue-600 pl-4 tracking-tighter text-xl">一般車間 / 會議室</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {VENUES.GENERAL.map(v => (
                    <button key={v} onClick={() => setSelectedVenue(v)} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all text-left group active:scale-95">
                      <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest group-hover:text-blue-500 transition-colors text-center md:text-left">GENERAL AREA</span>
                      <span className="font-black text-slate-800 group-hover:text-blue-700 transition-colors text-lg">{v}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="font-black text-slate-700 border-l-8 border-rose-600 pl-4 tracking-tighter text-xl">保密車間 (限制區域)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {VENUES.CONFIDENTIAL.map(v => (
                    <button key={v} onClick={() => setSelectedVenue(v)} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-rose-400 hover:shadow-xl transition-all text-left group active:scale-95">
                      <span className="text-[10px] font-black text-rose-400 block mb-1 uppercase tracking-widest group-hover:text-rose-600 transition-colors text-center md:text-left">RESTRICTED ZONE</span>
                      <span className="font-black text-slate-800 group-hover:text-rose-700 transition-colors text-lg">{v}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}

          {venueSubTab === 'cancel' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">取消預約紀錄</h3>
                <p className="text-sm text-slate-500 font-medium">僅顯示您名下的申請。如借用天數大於一天者首日已開始，第二天後仍可取消部分時段。</p>
              </div>

              {bookings.filter(b => b.applicant === userInfo.name).length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 shadow-sm flex flex-col items-center gap-4">
                  <span className="text-6xl grayscale">🔍</span>
                  <p className="font-bold">目前查無您的預約紀錄</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.filter(b => b.applicant === userInfo.name).map(b => {
                    const allDates = getDatesInRange(b.startDate, b.endDate);
                    // Exclude dates that are already cancelled
                    const validDates = allDates.filter(d => !b.excludedDates?.includes(d));

                    const cancellableCount = validDates.filter(d => !isDayStarted(d, b.startTime)).length;
                    const canCancelAtLeastOne = cancellableCount > 0;

                    if (validDates.length === 0) return null; // Don't show fully cancelled bookings if they persist in memory

                    return (
                      <div key={b.id} className={`bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${!canCancelAtLeastOne ? 'opacity-60 grayscale-[0.5]' : 'hover:shadow-md'}`}>
                        <div className="space-y-1 text-center md:text-left">
                          <div className="flex flex-col md:flex-row items-center gap-3">
                            <span className={`${!canCancelAtLeastOne ? 'bg-slate-500' : 'bg-rose-600'} text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm`}>{b.venue}</span>
                            <span className="text-slate-800 font-black text-lg tracking-tighter">{b.startDate} {b.startDate !== b.endDate ? `~ ${b.endDate}` : ''}</span>
                          </div>
                          <p className="text-sm text-slate-500 font-bold ml-1">{b.startTime} - {b.endTime}</p>
                          {!canCancelAtLeastOne && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">該預約所有日期均已開始，無法執行取消</p>}
                        </div>
                        <button
                          onClick={() => setCancellingBooking(b)}
                          disabled={!canCancelAtLeastOne}
                          className={`px-6 py-3 rounded-2xl text-sm font-black transition-all active:scale-95 border ${!canCancelAtLeastOne ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100'}`}
                        >
                          🗑️ 刪除預約
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <ResourceManagementSystem userInfo={{ name: userInfo.name, dept: userInfo.department }} />
      )}
    </Layout>
  );
};

export default AppContent;
