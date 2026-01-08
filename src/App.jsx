import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, 
  deleteDoc, doc, updateDoc, limit, orderBy, where 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth'; 
import { 
  BookOpen, Clock, CheckCircle, 
  PenTool, User, Building2, Save, Search, Printer, 
  Trash2, CheckSquare, RefreshCcw, AlertCircle, 
  Calendar, Filter, Download, X, StickyNote,
  ChevronDown, Check, Edit, 
  AlertTriangle, FileText,
  LogOut, Lock, LogIn, Eraser
} from 'lucide-react';

// ------------------------------------------------------------------
// 🔴 FIREBASE CONFIG (ใช้งานจริง) 🔴
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBApk3_3eJHPrzIidDyhTOCkaOxkE90QZ4",
  authDomain: "director-book-log.firebaseapp.com",
  projectId: "director-book-log",
  storageBucket: "director-book-log.firebasestorage.app",
  messagingSenderId: "183084714920",
  appId: "1:183084714920:web:d72d28e6c95bdb82002b9d",
  measurementId: "G-ZCY2MW3KC6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants ---
const LAST_OLD_SYSTEM_NUMBER = 338; 

const DEPARTMENTS = [
  "ฝ่ายบริหาร", "ส่วนทัณฑปฏิบัติ", "ส่วนปกครองผู้ต้องขัง", "ส่วนรักษาการณ์",
  "ส่วนสวัสดิการฯ", "ส่วนสถานพยาบาล", "ส่วนพัฒนาผู้ต้องขัง 1", "ส่วนพัฒนาผู้ต้องขัง 2", "หน่วยงานภายนอก/อื่นๆ"
];

// Theme Colors (Deep Twilight - Muted & Modern)
const URGENCY_LEVELS = [
  { id: 'normal', label: 'ปกติ', color: 'bg-slate-700/30 text-slate-300 border-slate-600/30 hover:bg-slate-600/40' },
  { id: 'urgent', label: 'ด่วน', color: 'bg-orange-500/10 text-orange-200 border-orange-500/20 hover:bg-orange-500/20' },
  { id: 'very_urgent', label: 'ด่วนมาก', color: 'bg-rose-500/10 text-rose-200 border-rose-500/20 hover:bg-rose-500/20' },
  { id: 'most_urgent', label: 'ด่วนที่สุด', color: 'bg-red-500/20 text-red-100 border-red-500/30 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse-slow' }
];

const STATUS_LEVELS = {
  'pending': { label: 'รอเสนอ', color: 'bg-amber-500/10 text-amber-200 border-amber-500/20', icon: Clock, titleColor: 'text-slate-100', borderColor: 'border-amber-500/30' },
  'signed': { label: 'เซ็นแล้ว', color: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20', icon: CheckSquare, titleColor: 'text-emerald-300', borderColor: 'border-emerald-500/30' },
  'returned': { label: 'คืนเรื่อง', color: 'bg-red-500/10 text-red-200 border-red-500/20', icon: RefreshCcw, titleColor: 'text-red-300', borderColor: 'border-red-500/30' },
};

// --- Custom Components ---

const MourningSash = () => (
  <div className="fixed top-0 right-0 z-[9998] pointer-events-none w-24 h-24 overflow-hidden mix-blend-overlay opacity-50">
    <div className="absolute top-0 right-0 w-[150%] h-8 bg-black transform rotate-45 translate-x-[28%] translate-y-[50%] origin-bottom-right shadow-2xl flex items-center justify-center border-b border-white/5">
       <div className="w-2 h-2 bg-slate-500 rounded-full shadow-inner ring-1 ring-white/10" />
    </div>
  </div>
);

// 🎨 Twilight Glass Inputs
const GlassInput = (props) => (
  <input 
    {...props}
    className={`w-full px-4 py-3 bg-[#1e293b]/40 border border-white/5 rounded-xl text-sm text-slate-200 focus:border-indigo-400/30 focus:ring-1 focus:ring-indigo-400/20 focus:bg-[#1e293b]/60 outline-none transition-all placeholder:text-slate-500 hover:border-white/10 shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
  />
);

const GlassTextArea = (props) => (
  <textarea 
    {...props}
    className={`w-full px-4 py-3 bg-[#1e293b]/40 border border-white/5 rounded-xl text-sm text-slate-200 focus:border-indigo-400/30 focus:ring-1 focus:ring-indigo-400/20 focus:bg-[#1e293b]/60 outline-none transition-all placeholder:text-slate-500 hover:border-white/10 resize-none shadow-inner disabled:opacity-50 disabled:cursor-not-allowed ${props.className || ''}`}
  />
);

// 🎨 Twilight Glass Card
const GlassCard = ({ children, className = "" }) => (
  <div className={`bg-[#0f172a]/60 backdrop-blur-xl border border-white/[0.05] shadow-2xl rounded-2xl ${className}`}>
    {children}
  </div>
);

// Custom Select - Twilight Style
const CustomSelect = ({ label, value, options, onChange, icon: Icon, placeholder = "เลือกรายการ...", disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const getDisplayLabel = () => { 
      const selected = options.find(o => (typeof o === 'string' ? o : o.value) === value); 
      if (!selected) return placeholder;
      return typeof selected === 'string' ? selected : selected.label;
  };

  return (
    <div className={`space-y-1.5 relative ${disabled ? 'opacity-50 pointer-events-none' : ''}`} ref={wrapperRef}>
      {label && <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-[#1e293b]/40 border rounded-xl text-sm flex items-center justify-between transition-all duration-200 cursor-pointer group shadow-sm ${isOpen ? 'border-indigo-400/30 bg-[#1e293b]/60' : 'border-white/5 hover:border-white/10 hover:bg-[#1e293b]/50'}`}
      >
          <div className="flex items-center gap-3 overflow-hidden">
             {Icon && <Icon size={16} className={`transition-colors ${isOpen ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'}`} />}
             <span className={`truncate font-medium ${value === 'all' || !value ? 'text-slate-500' : 'text-slate-200'}`}>
                {getDisplayLabel()}
             </span>
          </div>
          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-300' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-[#1e293b] border border-white/5 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] max-h-60 overflow-auto p-1.5 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar ring-1 ring-white/5">
          {options.map((opt, idx) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lab = typeof opt === 'string' ? opt : opt.label;
            return (
              <div 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); onChange(val); setIsOpen(false); }} 
                className={`px-3 py-2.5 text-xs rounded-lg cursor-pointer mb-0.5 flex justify-between items-center transition-all ${val === value ? 'bg-indigo-500/20 text-indigo-200 font-medium border border-indigo-500/10' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
              >
                <span>{lab}</span>
                {val === value && <Check size={14} className="text-indigo-300" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DeleteButton = ({ onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if(confirming){ const t = setTimeout(() => setConfirming(false), 3000); return () => clearTimeout(t);} }, [confirming]);
  const handleClick = (e) => { e.stopPropagation(); if (confirming) { onDelete(); setConfirming(false); } else { setConfirming(true); } };

  if (confirming) return (
    <button onClick={handleClick} className="bg-red-500/10 text-red-300 border border-red-500/30 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:bg-red-500/20 animate-in fade-in zoom-in">
      ยืนยัน?
    </button>
  );
  return (
    <button onClick={handleClick} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
      <Trash2 size={16}/>
    </button>
  );
};

// 🔥 Optimized: Document Card
const DocumentCard = React.memo(({ doc, setDetailDoc, handleStatusToggle, handleDelete }) => {
  const statusConfig = STATUS_LEVELS[doc.status] || STATUS_LEVELS['pending'];
  const urgencyStyle = URGENCY_LEVELS.find(u => u.id === doc.urgency);
  
  const formatDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  
  const getUrgencyBadge = () => <span className={`text-[9px] px-2.5 py-1 rounded-md border font-medium ${urgencyStyle?.color || ''}`}>{urgencyStyle?.label || 'ปกติ'}</span>;

  return (
    <div className="group relative bg-[#1e293b]/30 hover:bg-[#1e293b]/60 rounded-xl border border-white/[0.05] p-4 transition-all duration-200 hover:border-indigo-500/20 hover:shadow-lg flex gap-5">
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full ${urgencyStyle?.color.split(' ')[0].replace('/40','').replace('/10','') || 'bg-slate-600'}`}></div>
      
      <div className="flex flex-col items-center justify-center min-w-[50px] pl-1">
          <span className={`text-xl font-bold ${statusConfig.titleColor} tracking-tight`}>{doc.runningNumber || '-'}</span>
          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">เลขรับ</span>
      </div>

      <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2 mb-1.5">
            {getUrgencyBadge()}
            <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1"><Clock size={10} /> {formatDate(doc.receivedAt)} • {formatTime(doc.receivedAt)}</span>
          </div>
          <h3 onClick={() => setDetailDoc(doc)} className={`text-sm font-bold mb-1.5 truncate cursor-pointer hover:text-white transition-colors ${statusConfig.titleColor}`}>{doc.subject}</h3>
          <div className="flex flex-wrap gap-y-1 gap-x-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Building2 size={10} className="text-slate-500"/> {doc.department}</span>
            <span className="flex items-center gap-1"><User size={10} className="text-slate-500"/> รับโดย {doc.receiverName}</span>
          </div>
          {(doc.note || doc.returnReason) && (
            <div className="mt-2 flex gap-2">
              {doc.note && <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 border border-slate-700/50 truncate max-w-[200px]">{doc.note}</span>}
              {doc.returnReason && <span className="text-[9px] px-1.5 py-0.5 bg-red-900/20 rounded text-red-300 border border-red-500/20 truncate max-w-[200px]">คืน: {doc.returnReason}</span>}
            </div>
          )}
      </div>

      <div className={`flex flex-col justify-between items-end pl-4 border-l border-white/[0.05]`}>
          <div onClick={() => handleStatusToggle(doc.id, doc.status)} className={`cursor-pointer transform transition-transform hover:scale-105 active:scale-95 px-2.5 py-1 rounded-md text-[9px] font-bold flex items-center gap-1.5 ${statusConfig.color}`}>
            {statusConfig.icon && React.createElement(statusConfig.icon, { size: 12 })} {statusConfig.label}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setDetailDoc(doc)} className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-white/5 rounded-md transition-colors"><Edit size={14}/></button>
            <DeleteButton onDelete={() => handleDelete(doc.id)}/>
          </div>
      </div>
    </div>
  );
});

// 🔐 Login Screen
const LoginScreen = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await setPersistence(auth, browserSessionPersistence);
      if (isRegistering) await onRegister(email, password);
      else await onLogin(email, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError("อีเมลนี้มีผู้ใช้งานแล้ว");
      else if (err.code === 'auth/weak-password') setError("รหัสผ่านสั้นเกินไป");
      else setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen opacity-40"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>

      <GlassCard className="w-full max-w-sm p-8 relative z-10 !bg-slate-900/70 border border-slate-700/30">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl mx-auto flex items-center justify-center border border-white/5 shadow-lg mb-6">
             {isRegistering ? <User className="text-indigo-300" size={28} /> : <Lock className="text-indigo-300" size={28} />}
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-2">
            {isRegistering ? "ลงทะเบียน" : "เข้าสู่ระบบ"}
          </h1>
          <p className="text-slate-400 text-xs tracking-wide">ระบบรับหนังสือเสนอ ผอ.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Email</label>
            <GlassInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="user@prison.go.th" className="!bg-black/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
            <GlassInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="!bg-black/20" />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs text-center flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-2 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/10 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 border border-white/10"
          >
            {loading ? "..." : (isRegistering ? "ยืนยัน" : "เข้าใช้งาน")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
            <button onClick={() => { setIsRegistering(!isRegistering); setError(null); }} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                {isRegistering ? "กลับไปหน้าเข้าสู่ระบบ" : "ลงทะเบียนผู้ใช้ใหม่"}
            </button>
        </div>
      </GlassCard>
    </div>
  );
};

// 📝 Detail Modal
const DetailModal = ({ docItem, onClose, onSave }) => {
  const [editSubject, setEditSubject] = useState(docItem.subject || '');
  const [editNote, setEditNote] = useState(docItem.note || '');
  const [returnReason, setReturnReason] = useState(docItem.returnReason || '');
  const [editDepartment, setEditDepartment] = useState(docItem.department || DEPARTMENTS[0]);
  const [saving, setSaving] = useState(false);

  const statusConfig = STATUS_LEVELS[docItem.status] || STATUS_LEVELS['pending'];

  const handleSave = async () => {
    setSaving(true);
    await onSave(docItem.id, { subject: editSubject, note: editNote, returnReason: returnReason, department: editDepartment });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <GlassCard className="w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden bg-[#1e293b]/95 !border-slate-700/30">
        <div className="p-6 border-b border-white/[0.05] flex justify-between items-start bg-slate-900/30">
          <div className="flex gap-5">
             <div className="bg-[#0f172a]/50 p-4 rounded-2xl border border-white/5 shadow-inner min-w-[80px] flex items-center justify-center">
                <span className="text-3xl font-black text-slate-200 tracking-tighter">{docItem.runningNumber || '-'}</span>
             </div>
             <div className="pt-1">
                <h3 className="text-lg font-bold text-slate-100 leading-tight mb-1">แก้ไขข้อมูล</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                   <Clock size={12}/> {docItem.receivedAt?.toLocaleDateString('th-TH')} {docItem.receivedAt?.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                </div>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-2 rounded-full hover:bg-white/5 transition-all"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-[#0f172a]/20">
           <div className={`flex items-center justify-between p-4 rounded-xl border border-white/[0.05] bg-white/[0.01]`}>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">สถานะ</span>
              <div className={`flex items-center gap-2 font-bold text-sm px-3 py-1.5 rounded-lg border border-white/5 ${statusConfig.color}`}>
                 {statusConfig.icon && React.createElement(statusConfig.icon, { size: 16 })}
                 {statusConfig.label}
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><FileText size={14}/> เรื่อง</label>
              <GlassTextArea value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="min-h-[80px]" />
           </div>

           <div>
              <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><Building2 size={14}/> หน่วยงาน</label>
              <CustomSelect value={editDepartment} options={DEPARTMENTS} onChange={setEditDepartment} icon={Building2} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><StickyNote size={14}/> หมายเหตุ</label>
                  <GlassTextArea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="-" className="min-h-[100px]" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-red-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14}/> เหตุผลการคืน</label>
                  <GlassTextArea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="-" className="min-h-[100px] border-red-500/20 bg-red-500/5 focus:border-red-500/40" />
               </div>
           </div>
        </div>

        <div className="p-5 border-t border-white/[0.05] bg-slate-900/30 backdrop-blur-xl flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">ยกเลิก</button>
           <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center gap-2">
              {saving ? "บันทึก..." : "บันทึก"}
           </button>
        </div>
      </GlassCard>
    </div>
  );
};

// 🏠 Dashboard
const Dashboard = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [urgency, setUrgency] = useState('normal');
  const [receiverName, setReceiverName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedReceivers, setSavedReceivers] = useState([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  // ✅ เพิ่ม State สำหรับกรองส่วนงาน
  const [filterDepartment, setFilterDepartment] = useState('all'); 
  const [detailDoc, setDetailDoc] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('director_book_log_receivers');
    if (saved) try { setSavedReceivers(JSON.parse(saved)); } catch (e) {}
  }, []);

  // 🔥 Intelligent Data Fetching (Smart Mode)
  useEffect(() => {
    if (!db) return;
    setLoading(true);

    let q;

    if (filterDate) {
      // 📅 Mode: ค้นหาตามวันที่ (โหลดไม่อั้นสำหรับวันนั้น)
      const dateObj = new Date(filterDate);
      const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0);
      const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59);

      q = query(
        collection(db, 'director_submissions'), 
        where('receivedAt', '>=', startOfDay),
        where('receivedAt', '<=', endOfDay),
        orderBy('receivedAt', 'desc')
      );
    } else {
      // 🚀 Mode: ปกติ (โหลดแค่ 50 รายการล่าสุด)
      q = query(
        collection(db, 'director_submissions'), 
        orderBy('runningNumber', 'desc'), 
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), receivedAt: doc.data().receivedAt?.toDate() || new Date() }));
      setDocuments(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filterDate]); // ✅ Re-run query when date changes

  const getNextRunningNumber = () => {
    if (documents.length === 0) return LAST_OLD_SYSTEM_NUMBER + 1;
    return Math.max(...documents.map(d => d.runningNumber || 0), LAST_OLD_SYSTEM_NUMBER) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); 
    if (!subject.trim()) { setErrorMsg("⚠️ ระบุเรื่อง"); return; }
    if (!receiverName.trim()) { setErrorMsg("⚠️ ระบุผู้รับ"); return; }
    
    setSubmitting(true);
    try {
      const trimmedName = receiverName.trim();
      if (!savedReceivers.includes(trimmedName)) {
        const newRecs = [...savedReceivers, trimmedName].slice(-5);
        setSavedReceivers(newRecs);
        localStorage.setItem('director_book_log_receivers', JSON.stringify(newRecs));
      }
      const nextNum = getNextRunningNumber();
      await addDoc(collection(db, 'director_submissions'), {
          runningNumber: nextNum, subject, department, urgency, receiverName, note, 
          status: 'pending', receivedAt: serverTimestamp(), submittedBy: user?.uid || 'admin'
      });
      setSubject(''); setUrgency('normal'); setNote(''); 
      setShowSuccess(true); setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { setErrorMsg("Error: " + err.message); } finally { setSubmitting(false); }
  };

  const handleStatusToggle = async (docId, status) => {
    const next = status === 'pending' ? 'signed' : status === 'signed' ? 'returned' : 'pending';
    try { await updateDoc(doc(db, 'director_submissions', docId), { status: next }); } catch(e){}
  };
  const handleDelete = async (id) => { try { await deleteDoc(doc(db, 'director_submissions', id)); } catch(e){} };
  const handleUpdateDoc = async (docId, newData) => { try { await updateDoc(doc(db, 'director_submissions', docId), newData); } catch (e) { alert(e.message); }};
  
  const handleExportExcel = () => { 
    // Format Date Helper inside export
    const fmt = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtT = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let table = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head><body><table>
      <thead><tr><th>เลขรับ</th><th>วันที่</th><th>เวลา</th><th>ความเร่งด่วน</th><th>เรื่อง</th><th>หน่วยงาน</th><th>ผู้รับ</th><th>หมายเหตุ</th><th>คืนเรื่อง</th><th>สถานะ</th></tr></thead>
      <tbody>${filteredDocs.map(doc => `<tr><td>${doc.runningNumber||'-'}</td><td>${fmt(doc.receivedAt)}</td><td>${fmtT(doc.receivedAt)}</td><td>${URGENCY_LEVELS.find(l=>l.id===doc.urgency)?.label}</td><td>${doc.subject}</td><td>${doc.department}</td><td>${doc.receiverName}</td><td>${doc.note||''}</td><td>${doc.returnReason||''}</td><td>${STATUS_LEVELS[doc.status]?.label}</td></tr>`).join('')}</tbody>
      </table></body></html>`;
    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Log_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🔥 Optimized Filtering
  const filteredDocs = useMemo(() => {
    return documents.filter(d => {
      const term = filterTerm.toLowerCase();
      const matchesTerm = d.subject.toLowerCase().includes(term) || d.department.toLowerCase().includes(term) || (d.runningNumber+'').includes(term);
      const matchesDepartment = filterDepartment === 'all' || d.department === filterDepartment; // ✅ เพิ่ม Logic กรองส่วนงาน
      // Date filtering is now handled by Firestore query, so we just check filterStatus here
      return matchesTerm && matchesDepartment && (filterStatus === 'all' || d.status === filterStatus);
    });
  }, [documents, filterTerm, filterStatus, filterDepartment]); // ✅ เพิ่ม filterDepartment เป็น dependency

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Dancing+Script:wght@700&display=swap');
        body { font-family: 'Sarabun', 'Inter', sans-serif; background-color: #0f172a; color: #cbd5e1; }
        ::-webkit-scrollbar { width: 5px; height: 5px; } 
        ::-webkit-scrollbar-track { background: #0f172a; } 
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; } 
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
        @media print { .no-print { display: none !important; } }
      `}</style>
      
      <MourningSash />
      {detailDoc && <DetailModal docItem={detailDoc} onClose={() => setDetailDoc(null)} onSave={handleUpdateDoc} />}

      <div className="h-screen flex flex-col bg-[#0f172a] overflow-hidden relative selection:bg-indigo-500/40 selection:text-white">
        {/* Header */}
        <header className="bg-[#1e293b]/70 backdrop-blur-xl border-b border-white/[0.05] h-16 flex items-center justify-between px-6 z-30 shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><BookOpen size={18} className="text-white" /></div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-none">ระบบรับหนังสือเสนอ ผอ.</h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">ทัณฑสถานวัยหนุ่มกลาง</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
              <div className="hidden sm:flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
                 <button onClick={handleExportExcel} className="p-2 hover:bg-white/5 rounded-md transition-colors text-slate-400 hover:text-slate-200" title="Export Excel"><Download size={16}/></button>
                 <div className="w-px bg-white/5 mx-1 my-1"></div>
                 <button onClick={()=>window.print()} className="p-2 hover:bg-white/5 rounded-md transition-colors text-slate-400 hover:text-slate-200" title="Print"><Printer size={16}/></button>
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-bold hover:bg-red-500/20 transition-all">
                <LogOut size={14} /> 
              </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Form */}
          <div className="w-[340px] min-w-[340px] bg-[#111827] border-r border-white/[0.05] flex flex-col z-20 relative shadow-2xl">
             <div className="p-5 border-b border-white/[0.05] shrink-0 flex justify-between items-center bg-[#1e293b]/30">
               <h2 className="font-bold text-slate-300 flex items-center gap-2 text-xs uppercase tracking-wider"><PenTool size={12} className="text-indigo-400"/> ลงรับใหม่</h2>
               {/* ปุ่ม Demo */}
               <button onClick={() => { setSubject("ขออนุมัติจัดซื้อวัสดุ"); setDepartment(DEPARTMENTS[0]); setReceiverName("นางสาวธุรการ"); }} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded hover:bg-slate-700 hover:text-slate-200 transition-all">Demo</button>
             </div>

             <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {/* Next Number Card */}
                <div className={`bg-gradient-to-br p-5 rounded-2xl border flex flex-col items-center relative overflow-hidden group shadow-lg transition-all ${filterDate ? 'from-slate-800 to-slate-900 border-white/5 opacity-50 grayscale' : 'from-[#1e293b] to-[#0f172a] border-white/5'}`}>
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03]"></div>
                   <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-1 z-10">{filterDate ? 'โหมดค้นหาประวัติ' : 'เลขรับถัดไป'}</span>
                   <span className="text-5xl font-black text-slate-100 tracking-tighter z-10 drop-shadow-md">{filterDate ? '-' : getNextRunningNumber()}</span>
                </div>
                
                {/* Inputs: Disabled when searching history */}
                <div className={`space-y-4 ${filterDate ? 'opacity-50 pointer-events-none' : ''}`}>
                   <div className="grid grid-cols-2 gap-2">
                      {URGENCY_LEVELS.map(l=><button key={l.id} type="button" onClick={()=>setUrgency(l.id)} className={`text-[10px] py-2.5 rounded-xl font-medium border transition-all ${urgency===l.id?`${l.color} shadow-sm border-white/5 ring-1 ring-white/5`:'bg-[#1e293b]/40 text-slate-500 border-transparent hover:bg-slate-800 hover:text-slate-300'}`}>{l.label}</button>)}
                   </div>
                   <div><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">เรื่อง</label><GlassInput value={subject} onChange={e=>setSubject(e.target.value)} placeholder="ระบุชื่อเรื่อง..." /></div>
                   <CustomSelect label="หน่วยงาน" value={department} options={DEPARTMENTS} onChange={setDepartment} icon={Building2} />
                   <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">ผู้รับ</label>
                      <div className="relative group"><GlassInput value={receiverName} onChange={e=>setReceiverName(e.target.value)} placeholder="ระบุผู้รับ..." className="pl-9" /><User size={14} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-slate-300 transition-colors"/></div>
                      {savedReceivers.length>0 && <div className="flex flex-wrap gap-1.5 mt-2">{savedReceivers.map((n,i)=><span key={i} onClick={()=>setReceiverName(n)} className="text-[9px] bg-slate-800/50 border border-slate-700/50 px-1.5 py-0.5 rounded cursor-pointer text-slate-400 hover:text-slate-200 transition-all">{n}</span>)}</div>}
                   </div>
                   <div><label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">หมายเหตุ</label><GlassTextArea value={note} onChange={e=>setNote(e.target.value)} placeholder="-" className="h-20" /></div>
                </div>
             </div>

             <div className="p-5 border-t border-white/[0.05] bg-[#111827] shrink-0 z-10">
                {filterDate ? (
                  <button onClick={() => setFilterDate('')} className="w-full py-3 rounded-xl text-slate-300 text-xs font-bold border border-white/10 hover:bg-white/5 transition-all flex justify-center items-center gap-2">
                    <Eraser size={14}/> เคลียร์การค้นหาเพื่อลงรับใหม่
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting} className={`w-full py-3 rounded-xl text-white text-xs font-bold shadow-lg shadow-indigo-900/20 flex justify-center items-center gap-2 transition-all ${submitting?'bg-slate-800 text-slate-500 cursor-wait':'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98]'}`}>
                    {submitting ? "กำลังบันทึก..." : <><Save size={14}/> ยืนยัน</>}
                  </button>
                )}
                
                {showSuccess && <div className="mt-3 text-[10px] text-center text-emerald-400 font-bold flex items-center justify-center gap-1 animate-in fade-in slide-in-from-bottom-1"><CheckCircle size={12}/> บันทึกแล้ว</div>}
                {errorMsg && <div className="mt-3 text-[10px] text-center text-red-400 font-bold flex items-center justify-center gap-1 animate-in fade-in slide-in-from-bottom-1"><AlertCircle size={12}/> {errorMsg}</div>}
             </div>
          </div>

          {/* Right Panel: List */}
          <div className="flex-1 flex flex-col bg-[#0f172a] overflow-hidden relative">
             <div className="px-6 py-4 border-b border-white/[0.05] flex gap-3 shrink-0 items-center overflow-x-auto pr-16 bg-[#0f172a]">
                <div className="relative flex-1 min-w-[180px] group"><Search size={14} className="absolute left-3 top-3.5 text-slate-500 group-focus-within:text-slate-300 transition-colors"/><input className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-indigo-500/50 focus:bg-slate-900 outline-none transition-all placeholder:text-slate-600 text-slate-200" placeholder="ค้นหาชื่อเรื่อง..." value={filterTerm} onChange={e=>setFilterTerm(e.target.value)}/></div>
                {/* 📅 Date Picker */}
                <div className="relative min-w-[130px] group">
                   <div className={`absolute inset-0 bg-indigo-500/20 blur-md rounded-xl transition-opacity ${filterDate ? 'opacity-100' : 'opacity-0'}`}></div>
                   <input 
                      type="date" 
                      value={filterDate} 
                      onChange={(e) => setFilterDate(e.target.value)} 
                      className={`relative w-full px-4 py-2.5 text-sm rounded-xl focus:border-indigo-500/50 outline-none cursor-pointer transition-all ${filterDate ? 'bg-indigo-900/40 border-indigo-500 text-white' : 'bg-slate-900/50 border-slate-700/50 text-slate-200'}`} 
                   />
                </div>
                {/* ✅ Department Filter */}
                <div className="w-40">
                  <CustomSelect 
                    value={filterDepartment} 
                    options={[{value:'all',label:'ทุกส่วนงาน'}, ...DEPARTMENTS.map(d => ({value: d, label: d}))]} 
                    onChange={setFilterDepartment} 
                    icon={Building2} 
                    placeholder="ส่วนงาน"
                  />
                </div>
                {/* Status Filter */}
                <div className="w-36">
                  <CustomSelect 
                    value={filterStatus} 
                    options={[{value:'all',label:'ทุกสถานะ'},{value:'pending',label:'รอเสนอ'},{value:'signed',label:'เซ็นแล้ว'},{value:'returned',label:'คืนเรื่อง'}]} 
                    onChange={setFilterStatus} 
                    icon={Filter} 
                    placeholder="สถานะ"
                  />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-24 custom-scrollbar">
                {loading ? <div className="flex flex-col items-center justify-center py-32 text-slate-600 gap-4"><div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div></div> : filteredDocs.length===0 ? <div className="flex flex-col items-center justify-center py-32 text-slate-600 border-2 border-dashed border-slate-800 rounded-3xl m-4"><div className="bg-slate-800/50 p-4 rounded-full mb-3"><FileText size={20} className="text-slate-500"/></div><p className="text-xs">{filterDate ? `ไม่พบเอกสารของวันที่ ${new Date(filterDate).toLocaleDateString('th-TH')}` : 'ไม่พบเอกสาร'}</p></div> : 
                  filteredDocs.map(doc => (
                    <DocumentCard 
                      key={doc.id} 
                      doc={doc} 
                      setDetailDoc={setDetailDoc} 
                      handleStatusToggle={handleStatusToggle} 
                      handleDelete={handleDelete}
                    />
                  ))
                }
             </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="fixed bottom-3 right-6 z-[100] group select-none cursor-default no-print opacity-50 hover:opacity-100 transition-opacity">
           <div className="flex items-center gap-2">
               <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
               </span>
               <span className="font-dancing text-slate-500 text-[10px] tracking-widest group-hover:text-indigo-400 transition-colors">Design By Dream APL</span>
           </div>
        </div>
      </div>
    </>
  );
}
