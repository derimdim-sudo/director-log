import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, 
  deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
// ✅ เพิ่ม setPersistence และ browserSessionPersistence
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
  BookOpen, Clock, CheckCircle2, 
  PenTool, User, Building2, Save, Search, Printer, 
  Trash2, CheckSquare, RefreshCcw, XCircle,
  Calendar, Filter, Download, X, StickyNote,
  ChevronDown, Check, Edit3, AlertTriangle, FileText,
  LogOut, Lock 
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

const URGENCY_LEVELS = [
  { id: 'normal', label: 'ปกติ', color: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-700/50 hover:text-zinc-200' },
  { id: 'urgent', label: 'ด่วน', color: 'bg-orange-950/20 text-orange-400 border-orange-900/30 hover:bg-orange-900/30' },
  { id: 'very_urgent', label: 'ด่วนมาก', color: 'bg-red-950/20 text-red-400 border-red-900/30 hover:bg-red-900/30' },
  { id: 'most_urgent', label: 'ด่วนที่สุด', color: 'bg-rose-950/40 text-rose-200 border-rose-800/50 hover:bg-rose-900/50 shadow-[0_0_15px_rgba(225,29,72,0.15)]' }
];

const STATUS_LEVELS = {
  'pending': { label: 'รอเสนอ', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Clock, titleColor: 'text-zinc-200', borderColor: 'border-l-amber-500/50' },
  'signed': { label: 'เซ็นแล้ว', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckSquare, titleColor: 'text-emerald-400', borderColor: 'border-l-emerald-500/50' },
  'returned': { label: 'คืนเรื่อง', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: RefreshCcw, titleColor: 'text-red-400', borderColor: 'border-l-red-500/50' },
};

// --- Custom Components ---

const MourningSash = () => (
  <div className="fixed top-0 right-0 z-[9998] pointer-events-none w-24 h-24 overflow-hidden mix-blend-overlay opacity-80">
    <div className="absolute top-0 right-0 w-[150%] h-8 bg-black transform rotate-45 translate-x-[28%] translate-y-[50%] origin-bottom-right shadow-2xl flex items-center justify-center border-b border-white/5">
       <div className="w-3 h-3 bg-zinc-800/50 rounded-full shadow-inner ring-1 ring-white/10" />
    </div>
  </div>
);

// 🎨 Glassy Input Components
const GlassInput = (props) => (
  <input 
    {...props}
    className={`w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-sm text-zinc-200 focus:border-zinc-500/50 focus:ring-1 focus:ring-zinc-500/50 focus:bg-black/40 outline-none transition-all placeholder:text-zinc-600 hover:border-white/10 ${props.className || ''}`}
  />
);

const GlassTextArea = (props) => (
  <textarea 
    {...props}
    className={`w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-sm text-zinc-200 focus:border-zinc-500/50 focus:ring-1 focus:ring-zinc-500/50 focus:bg-black/40 outline-none transition-all placeholder:text-zinc-600 hover:border-white/10 resize-none ${props.className || ''}`}
  />
);

// 🔴 CustomSelect: Simplified & Safe (No Portal)
const CustomSelect = ({ label, value, options, onChange, icon: Icon, placeholder = "เลือกรายการ..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
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
    <div className="space-y-1.5 relative" ref={wrapperRef}>
      {label && <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 bg-black/20 border rounded-xl text-sm flex items-center justify-between transition-all duration-200 cursor-pointer group ${isOpen ? 'border-zinc-500/50 bg-black/40' : 'border-white/5 hover:border-white/10 hover:bg-black/30'}`}
      >
          <div className="flex items-center gap-3 overflow-hidden">
             {Icon && <Icon size={16} className={`transition-colors ${isOpen ? 'text-zinc-300' : 'text-zinc-600 group-hover:text-zinc-400'}`} />}
             <span className={`truncate font-medium ${value === 'all' || !value ? 'text-zinc-500' : 'text-zinc-200'}`}>
                {getDisplayLabel()}
             </span>
          </div>
          <ChevronDown size={16} className={`text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-zinc-300' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[50] w-full mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] max-h-60 overflow-auto p-1.5 animate-in fade-in zoom-in-95 duration-200 custom-scrollbar backdrop-blur-3xl ring-1 ring-white/5">
          {options.map((opt, idx) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lab = typeof opt === 'string' ? opt : opt.label;
            return (
              <div 
                key={idx} 
                onClick={(e) => { e.stopPropagation(); onChange(val); setIsOpen(false); }} 
                className={`px-3 py-2.5 text-xs rounded-lg cursor-pointer mb-0.5 flex justify-between items-center transition-all ${val === value ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
              >
                <span>{lab}</span>
                {val === value && <Check size={14} className="text-emerald-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// 🗑️ Delete Button
const DeleteButton = ({ onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  
  useEffect(() => { 
    if(confirming){
      const t = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(t);
    }
  }, [confirming]);

  const handleClick = (e) => { 
    e.stopPropagation(); 
    if (confirming) { 
      onDelete(); 
      setConfirming(false); 
    } else { 
      setConfirming(true); 
    } 
  };

  if (confirming) return (
    <button onClick={handleClick} className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:bg-red-500/30 animate-in fade-in zoom-in">
      ยืนยัน?
    </button>
  );

  return (
    <button onClick={handleClick} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
      <Trash2 size={16}/>
    </button>
  );
};

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
      if (isRegistering) await onRegister(email, password);
      else await onLogin(email, password);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError("อีเมลนี้มีผู้ใช้งานแล้ว");
      else if (err.code === 'auth/weak-password') setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      else setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-900/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-3xl border border-white/5 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] relative z-10 transition-all duration-500 ring-1 ring-white/5">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900/50 rounded-2xl mx-auto flex items-center justify-center border border-white/5 shadow-2xl mb-5 group">
             {isRegistering ? 
               <div className="relative">
                 <User size={32} className="text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-transform duration-500 group-hover:scale-110" />
                 <div className="absolute -top-1 -right-1 text-emerald-400 text-xs font-bold">+</div>
               </div> : 
               <Lock size={32} className="text-zinc-400 group-hover:text-white transition-colors duration-500" />
             }
          </div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 tracking-tight mb-2">
            {isRegistering ? "สร้างบัญชีใหม่" : "เข้าสู่ระบบ"}
          </h1>
          <p className="text-zinc-500 text-sm font-medium">ระบบรับหนังสือเสนอ ผอ.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
            <GlassInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="user@prison.go.th" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Password</label>
            <GlassInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-3.5 mt-2 text-white font-bold rounded-xl shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 ${
                isRegistering 
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/20"
                : "bg-gradient-to-r from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500 shadow-black/40"
            }`}
          >
            {loading ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> กำลังโหลด...</span> : (isRegistering ? "ยืนยันการสมัคร" : "เข้าสู่ระบบ")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
                {isRegistering ? "มีบัญชีอยู่แล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? ลงทะเบียนใหม่"}
            </button>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-[10px] text-zinc-700 font-mono">
         © 2025 Central Correctional Institution for Young Offenders
      </div>
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
    await onSave(docItem.id, { 
        subject: editSubject, note: editNote, returnReason: returnReason, department: editDepartment 
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121214] w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
        
        <div className="p-6 border-b border-white/5 flex justify-between items-start bg-zinc-900/50 backdrop-blur-xl">
          <div className="flex gap-5">
             <div className="bg-gradient-to-br from-zinc-800 to-black p-4 rounded-2xl border border-white/10 shadow-lg min-w-[80px] flex items-center justify-center">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tracking-tighter">{docItem.runningNumber || '-'}</span>
             </div>
             <div className="pt-1">
                <h3 className="text-lg font-bold text-zinc-100 leading-tight mb-1">รายละเอียดเอกสาร</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                   <Clock size={12}/> {docItem.receivedAt?.toLocaleDateString('th-TH')} {docItem.receivedAt?.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                </div>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
           <div className={`flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]`}>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">สถานะปัจจุบัน</span>
              <div className={`flex items-center gap-2 font-bold text-sm px-3 py-1.5 rounded-lg ${statusConfig.color}`}>
                 {statusConfig.icon && React.createElement(statusConfig.icon, { size: 16 })}
                 {statusConfig.label}
              </div>
           </div>

           <div>
              <label className="block text-xs font-bold text-zinc-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><FileText size={14}/> เรื่อง</label>
              <GlassTextArea value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="min-h-[80px]" />
           </div>

           <div>
              <label className="block text-xs font-bold text-zinc-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><Building2 size={14}/> หน่วยงาน</label>
              <CustomSelect value={editDepartment} options={DEPARTMENTS} onChange={setEditDepartment} icon={Building2} />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><StickyNote size={14}/> หมายเหตุ</label>
                  <GlassTextArea value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="-" className="min-h-[100px]" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-red-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2"><AlertTriangle size={14}/> เหตุผลการคืน</label>
                  <GlassTextArea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="-" className="min-h-[100px] border-red-900/20 bg-red-950/5 focus:border-red-900/50" />
               </div>
           </div>
        </div>

        <div className="p-5 border-t border-white/5 bg-zinc-900/50 backdrop-blur-xl flex justify-end gap-3">
           <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">ยกเลิก</button>
           <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 flex items-center gap-2">
              {saving ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-black rounded-full animate-spin"/> : <Check size={14}/>}
              บันทึก
           </button>
        </div>
      </div>
    </div>
  );
};

// 🏠 Dashboard: Refined Layout
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
  const [detailDoc, setDetailDoc] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('director_book_log_receivers');
    if (saved) try { setSavedReceivers(JSON.parse(saved)); } catch (e) {}
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'director_submissions');
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), receivedAt: doc.data().receivedAt?.toDate() || new Date() }));
      docs.sort((a, b) => (b.runningNumber || 0) - (a.runningNumber || 0));
      setDocuments(docs);
      setLoading(false);
    });
  }, []);

  const getNextRunningNumber = () => Math.max(documents.reduce((max, doc) => Math.max(max, doc.runningNumber || 0), 0), LAST_OLD_SYSTEM_NUMBER) + 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); 
    if (!subject.trim()) { setErrorMsg("⚠️ กรุณากรอกชื่อเรื่อง"); return; }
    if (!receiverName.trim()) { setErrorMsg("⚠️ กรุณากรอกชื่อผู้รับ"); return; }
    if (!db) { setErrorMsg("⚠️ Database Error"); return; }
    
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
  const formatDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const getUrgencyBadge = (id) => { const l = URGENCY_LEVELS.find(x=>x.id===id)||URGENCY_LEVELS[0]; return <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold ${l.color}`}>{l.label}</span> };
  
  const handleExportExcel = () => { 
    const csvHeader = "เลขรับ,วันที่,เวลา,ความเร่งด่วน,เรื่อง,หน่วยงาน,ผู้รับ,หมายเหตุ,เหตุผลการคืน,สถานะ\n";
    const csvRows = filteredDocs.map(doc => {
      return `${doc.runningNumber},${formatDate(doc.receivedAt)},${formatTime(doc.receivedAt)},${URGENCY_LEVELS.find(l=>l.id===doc.urgency)?.label},"${doc.subject.replace(/"/g,'""')}","${doc.department}","${doc.receiverName}","${(doc.note||'').replace(/"/g,'""')}","${(doc.returnReason||'').replace(/"/g,'""')}",${STATUS_LEVELS[doc.status]?.label}`;
    });
    const csvContent = "\uFEFF" + csvHeader + csvRows.join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Log_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const filteredDocs = documents.filter(d => {
    const term = filterTerm.toLowerCase();
    const matchesTerm = d.subject.toLowerCase().includes(term) || d.department.toLowerCase().includes(term) || (d.runningNumber+'').includes(term);
    let matchesDate = true;
    if (filterDate) { const dx=d.receivedAt; matchesDate = `${dx.getFullYear()}-${String(dx.getMonth()+1).padStart(2,'0')}-${String(dx.getDate()).padStart(2,'0')}` === filterDate; }
    return matchesTerm && matchesDate && (filterStatus === 'all' || d.status === filterStatus);
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&family=Dancing+Script:wght@700&display=swap');
        body { font-family: 'Sarabun', 'Inter', sans-serif; background-color: #050505; }
        ::-webkit-scrollbar { width: 6px; height: 6px; } 
        ::-webkit-scrollbar-track { background: #09090b; } 
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 3px; } 
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; }
        @media print { .no-print { display: none !important; } }
      `}</style>
      
      <MourningSash />
      {detailDoc && <DetailModal docItem={detailDoc} onClose={() => setDetailDoc(null)} onSave={handleUpdateDoc} />}

      <div className="h-screen flex flex-col bg-[#050505] text-zinc-300 overflow-hidden relative selection:bg-emerald-900 selection:text-white">
        {/* Header */}
        <header className="bg-zinc-900/40 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-zinc-800 to-black p-2 rounded-xl border border-white/10 shadow-lg"><BookOpen size={20} className="text-white" /></div>
            <div>
              <h1 className="text-base font-bold text-zinc-100 leading-none">ระบบรับหนังสือเสนอ ผอ.</h1>
              <p className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">ทัณฑสถานวัยหนุ่มกลาง</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
              <div className="hidden sm:flex bg-zinc-800/50 rounded-lg p-1 border border-white/5">
                 <button onClick={handleExportExcel} className="p-2 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white" title="Export Excel"><Download size={16}/></button>
                 <div className="w-px bg-white/10 mx-1 my-1"></div>
                 <button onClick={()=>window.print()} className="p-2 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-white" title="Print"><Printer size={16}/></button>
              </div>
              <button onClick={onLogout} className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all">
                <LogOut size={14} /> <span className="hidden sm:inline">ออกจากระบบ</span>
              </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Form */}
          <div className="w-[360px] min-w-[360px] bg-[#09090b] border-r border-white/5 flex flex-col z-20 shadow-xl relative">
             <div className="p-6 border-b border-white/5 shrink-0 flex justify-between items-center">
               <h2 className="font-bold text-zinc-200 flex items-center gap-3 text-sm"><span className="bg-white/5 p-1.5 rounded-lg border border-white/5"><PenTool size={14}/></span> ลงรับหนังสือใหม่</h2>
               <button onClick={() => { setSubject("ขออนุมัติจัดซื้อวัสดุ"); setDepartment(DEPARTMENTS[0]); setReceiverName("นางสาวธุรการ"); }} className="text-[10px] bg-white/5 border border-white/5 text-zinc-500 px-3 py-1 rounded-full hover:text-white transition-all">Demo</button>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Next Number Card */}
                <div className="bg-gradient-to-b from-zinc-800/50 to-zinc-900/50 p-6 rounded-2xl border border-white/5 flex flex-col items-center relative overflow-hidden group shadow-lg ring-1 ring-white/5">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-2 z-10">เลขรับถัดไป</span>
                   <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tighter drop-shadow-sm z-10">{getNextRunningNumber()}</span>
                </div>
                
                {/* Inputs */}
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                      {URGENCY_LEVELS.map(l=><button key={l.id} type="button" onClick={()=>setUrgency(l.id)} className={`text-[11px] py-2.5 rounded-xl font-medium border transition-all ${urgency===l.id?`${l.color} shadow-sm ring-1 ring-white/5`:'bg-black/20 text-zinc-500 border-transparent hover:bg-white/5 hover:text-zinc-300'}`}>{l.label}</button>)}
                   </div>
                   <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-1.5 block">เรื่อง</label><GlassInput value={subject} onChange={e=>setSubject(e.target.value)} placeholder="ระบุชื่อเรื่อง..." /></div>
                   <CustomSelect label="หน่วยงาน" value={department} options={DEPARTMENTS} onChange={setDepartment} icon={Building2} />
                   <div>
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-1.5 block">ผู้รับ</label>
                      <div className="relative group"><GlassInput value={receiverName} onChange={e=>setReceiverName(e.target.value)} placeholder="ระบุผู้รับ..." className="pl-10" /><User size={14} className="absolute left-3.5 top-3.5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors"/></div>
                      {savedReceivers.length>0 && <div className="flex flex-wrap gap-1.5 mt-2">{savedReceivers.map((n,i)=><span key={i} onClick={()=>setReceiverName(n)} className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded cursor-pointer text-zinc-500 hover:text-zinc-200 transition-all">{n}</span>)}</div>}
                   </div>
                   <div><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-1.5 block">หมายเหตุ</label><GlassTextArea value={note} onChange={e=>setNote(e.target.value)} placeholder="-" className="h-20" /></div>
                </div>
             </div>

             <div className="p-6 border-t border-white/5 bg-[#09090b] shrink-0 z-10">
                <button onClick={handleSubmit} disabled={submitting} className={`w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-lg flex justify-center items-center gap-2 transition-all ${submitting?'bg-zinc-800 text-zinc-500 cursor-wait':'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/20 active:scale-[0.98]'}`}>
                  {submitting ? <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> บันทึก...</span> : <><Save size={16}/> ยืนยันลงรับ</>}
                </button>
                {showSuccess && <div className="mt-3 text-xs text-center text-emerald-400 font-bold bg-emerald-500/10 py-2.5 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"><CheckCircle2 size={14}/> บันทึกสำเร็จ!</div>}
                {errorMsg && <div className="mt-3 text-xs text-center text-red-400 font-bold bg-red-500/10 py-2.5 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2"><XCircle size={14}/> {errorMsg}</div>}
             </div>
          </div>

          {/* Right Panel: List */}
          <div className="flex-1 flex flex-col bg-[#050505] overflow-hidden relative">
             <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/30 backdrop-blur-xl flex gap-3 shrink-0 items-center overflow-x-auto pr-16">
                <div className="relative flex-1 min-w-[200px] group"><Search size={16} className="absolute left-3.5 top-3 text-zinc-600 group-focus-within:text-zinc-400 transition-colors"/><input className="w-full pl-10 pr-4 py-2.5 text-sm bg-black/20 border border-white/5 rounded-xl focus:border-zinc-500/50 focus:ring-1 focus:ring-zinc-500/50 outline-none transition-all placeholder:text-zinc-700 text-zinc-300" placeholder="ค้นหา..." value={filterTerm} onChange={e=>setFilterTerm(e.target.value)}/></div>
                <div className="relative min-w-[150px]"><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-black/20 border border-white/5 rounded-xl focus:border-zinc-500/50 outline-none text-zinc-400 cursor-pointer [color-scheme:dark]" /></div>
                <div className="w-40"><CustomSelect value={filterStatus} options={[{value:'all',label:'ทุกสถานะ'},{value:'pending',label:'รอเสนอ'},{value:'signed',label:'เซ็นแล้ว'},{value:'returned',label:'คืนเรื่อง'}]} onChange={setFilterStatus} icon={Filter} placeholder="สถานะ"/></div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-24 custom-scrollbar">
                {loading ? <div className="flex flex-col items-center justify-center py-32 text-zinc-600 gap-4"><div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div><p className="text-xs font-medium">กำลังโหลดข้อมูล...</p></div> : filteredDocs.length===0 ? <div className="flex flex-col items-center justify-center py-32 text-zinc-700 border-2 border-dashed border-zinc-800/50 rounded-3xl m-4 bg-white/[0.01]"><div className="bg-zinc-800/50 p-4 rounded-full mb-3"><FileText size={24} className="text-zinc-600"/></div><p className="text-sm">ไม่พบเอกสาร</p></div> : 
                  filteredDocs.map(doc => {
                    const statusConfig = STATUS_LEVELS[doc.status] || STATUS_LEVELS['pending'];
                    const urgencyStyle = URGENCY_LEVELS.find(u=>u.id===doc.urgency);
                    return (
                      <div key={doc.id} className="group relative bg-[#0e0e10] hover:bg-[#131316] rounded-2xl border border-white/5 p-4 transition-all duration-200 hover:shadow-lg hover:border-white/10 flex gap-5">
                        {/* Left Strip Indicator */}
                        <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${urgencyStyle?.color.split(' ')[0].replace('/20','/80').replace('/50','/80') || 'bg-zinc-600'}`}></div>
                        
                        {/* Number Box */}
                        <div className="flex flex-col items-center justify-center min-w-[60px] pl-2">
                           <div className="w-14 h-14 bg-black/30 rounded-xl border border-white/5 flex items-center justify-center shadow-inner mb-1 group-hover:bg-black/50 transition-colors">
                              <span className={`text-2xl font-black ${statusConfig.titleColor}`}>{doc.runningNumber || '-'}</span>
                           </div>
                           <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">เลขรับ</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1">
                           <div className="flex items-center gap-2 mb-2">
                              {getUrgencyBadge(doc.urgency)}
                              <span className="text-[10px] font-medium text-zinc-500 flex items-center gap-1"><Clock size={10} /> {formatDate(doc.receivedAt)} • {formatTime(doc.receivedAt)}</span>
                           </div>
                           <h3 onClick={() => setDetailDoc(doc)} className={`text-base font-bold mb-2 truncate cursor-pointer hover:underline underline-offset-2 decoration-white/20 transition-all ${statusConfig.titleColor}`}>{doc.subject}</h3>
                           <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-zinc-500">
                              <span className="flex items-center gap-1.5"><Building2 size={12} className="text-zinc-600"/> {doc.department}</span>
                              <span className="text-zinc-700">•</span>
                              <span className="flex items-center gap-1.5"><User size={12} className="text-zinc-600"/> รับโดย {doc.receiverName}</span>
                           </div>
                           {(doc.note || doc.returnReason) && (
                             <div className="mt-3 flex gap-2">
                               {doc.note && <span className="text-[10px] px-2 py-1 bg-zinc-800/50 rounded text-zinc-400 border border-white/5 truncate max-w-[200px]">{doc.note}</span>}
                               {doc.returnReason && <span className="text-[10px] px-2 py-1 bg-red-950/20 rounded text-red-400 border border-red-900/20 truncate max-w-[200px]">คืน: {doc.returnReason}</span>}
                             </div>
                           )}
                        </div>

                        {/* Right Action & Status */}
                        <div className={`flex flex-col justify-between items-end pl-4 border-l ${statusConfig.borderColor} border-opacity-20 border-dashed`}>
                           <div onClick={()=>handleStatusToggle(doc.id,doc.status)} className={`cursor-pointer transform transition-transform hover:scale-105 active:scale-95 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-sm border border-white/5 ${statusConfig.color}`}>
                              {statusConfig.icon && React.createElement(statusConfig.icon, { size: 14 })} {statusConfig.label}
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setDetailDoc(doc)} className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors"><Edit3 size={16}/></button>
                              <DeleteButton onDelete={()=>handleDelete(doc.id)}/>
                           </div>
                        </div>
                      </div>
                    );
                  })
                }
             </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="fixed bottom-4 right-6 z-[100] group select-none cursor-default no-print">
           <div className="bg-zinc-900/80 backdrop-blur-md border border-white/5 pl-3 pr-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 transition-all hover:bg-black hover:border-white/10">
               <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               <span className="font-dancing text-zinc-500 text-xs tracking-widest group-hover:text-zinc-300 transition-colors">Design By Dream APL</span>
           </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ เพิ่ม Session Persistence ให้กับทั้ง Login และ Register
  const handleLogin = async (email, password) => {
    // ใช้ setPersistence และ browserSessionPersistence ที่นำเข้ามาจาก firebase/auth
    // เพื่อตั้งค่าให้ session หมดอายุเมื่อปิดเบราว์เซอร์
    const { setPersistence, browserSessionPersistence } = await import('firebase/auth'); 
    await setPersistence(auth, browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const handleRegister = async (email, password) => {
    const { setPersistence, browserSessionPersistence } = await import('firebase/auth'); 
    await setPersistence(auth, browserSessionPersistence);
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const handleLogout = () => signOut(auth);

  if (authChecking) {
    return (
      <div className="h-screen bg-[#050505] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin"></div>
         </div>
      </div>
    );
  }

  if (!user) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
