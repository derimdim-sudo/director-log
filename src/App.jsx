import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, 
  deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  BookOpen, Clock, CheckCircle2, 
  PenTool, User, Building2, Save, Search, Printer, 
  Trash2, CheckSquare, RefreshCcw, Sparkles, XCircle,
  Calendar, Filter, Download, Layers, X, StickyNote,
  ChevronDown, Check
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
const appId = 'director-log-app'; 

// --- Constants ---
const LAST_OLD_SYSTEM_NUMBER = 339; 

const DEPARTMENTS = [
  "ฝ่ายบริหาร", "ส่วนทัณฑปฏิบัติ", "ส่วนปกครองผู้ต้องขัง", "ส่วนรักษาการณ์",
  "ส่วนสวัสดิการฯ", "ส่วนสถานพยาบาล", "ส่วนพัฒนาผู้ต้องขัง 1", "ส่วนพัฒนาผู้ต้องขัง 2", "หน่วยงานภายนอก/อื่นๆ"
];

const URGENCY_LEVELS = [
  { id: 'normal', label: 'ปกติ', color: 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500' },
  { id: 'urgent', label: 'ด่วน', color: 'bg-orange-900/30 text-orange-400 border-orange-800/50 hover:bg-orange-900/50' },
  { id: 'very_urgent', label: 'ด่วนมาก', color: 'bg-red-900/30 text-red-400 border-red-800/50 hover:bg-red-900/50' },
  { id: 'most_urgent', label: 'ด่วนที่สุด', color: 'bg-gradient-to-r from-red-900 to-rose-800 text-white border-rose-700 hover:from-red-800 hover:to-rose-700 shadow-[0_0_15px_rgba(225,29,72,0.4)]' }
];

const STATUS_LEVELS = {
  'pending': { label: 'รอเสนอ', color: 'bg-amber-900/30 text-amber-400 border border-amber-800/50', icon: Clock, numGradient: 'from-zinc-400 to-zinc-600', titleColor: 'text-zinc-200', borderColor: 'border-zinc-800' },
  'signed': { label: 'เซ็นแล้ว', color: 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50', icon: CheckSquare, numGradient: 'from-emerald-400 to-emerald-600', titleColor: 'text-emerald-400', borderColor: 'border-emerald-900/50' },
  'returned': { label: 'คืนเรื่อง', color: 'bg-red-900/30 text-red-400 border border-red-800/50', icon: RefreshCcw, numGradient: 'from-red-400 to-red-600', titleColor: 'text-red-400', borderColor: 'border-red-900/50' },
};

// --- Custom Components ---

// 🎗️ Component: แถบคาดมุมขวาบน (Corner Sash)
const MourningSash = () => (
  <div className="fixed top-0 right-0 z-[9999] pointer-events-none w-24 h-24 overflow-hidden no-print">
    <div className="absolute top-0 right-0 w-[150%] h-8 bg-black transform rotate-45 translate-x-[28%] translate-y-[50%] origin-bottom-right shadow-[0_0_20px_rgba(0,0,0,1)] flex items-center justify-center border-b border-zinc-800/50">
       <div className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center shadow-inner ring-1 ring-zinc-700">
          <svg width="10" height="14" viewBox="0 0 24 24" fill="#e4e4e7" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.8 1.5C9.5 1.5 7.5 3.2 7.5 5.5C7.5 7.2 8.5 8.8 9.8 9.8L7 18.5L11.8 16L16.6 18.5L13.8 9.8C15.1 8.8 16.1 7.2 16.1 5.5C16.1 3.2 14.1 1.5 11.8 1.5ZM11.8 8.5C10.1 8.5 8.8 7.2 8.8 5.5C8.8 3.8 10.1 2.5 11.8 2.5C13.5 2.5 14.8 3.8 14.8 5.5C14.8 7.2 13.5 8.5 11.8 8.5Z" />
          </svg>
       </div>
    </div>
  </div>
);

const CustomSelect = ({ label, value, options, onChange, icon: Icon, placeholder = "เลือกรายการ..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
    document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  const getDisplayLabel = () => { const s = options.find(o => (typeof o === 'string' ? o : o.value) === value); return typeof s === 'string' ? s : s?.label; };

  return (
    <div className="space-y-1.5 relative" ref={wrapperRef}>
      {label && <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{label}</label>}
      <div className="relative">
        <button type="button" onClick={() => setIsOpen(!isOpen)} className={`w-full px-3 py-3 bg-zinc-900 border rounded-xl text-sm flex items-center justify-between transition-all duration-300 group ${isOpen ? 'border-zinc-500 ring-1 ring-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'}`}>
          <div className="flex items-center gap-3 overflow-hidden">
             {Icon && <div className={`p-1.5 rounded-md transition-colors ${isOpen ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}><Icon size={14} /></div>}
             <span className={`truncate font-medium ${!getDisplayLabel() ? 'text-zinc-600' : 'text-zinc-300'}`}>{getDisplayLabel() || placeholder}</span>
          </div>
          <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-[9999] w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-black max-h-60 overflow-auto p-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
            {options.map((opt, idx) => (
              <div key={idx} onClick={() => { onChange(typeof opt === 'string' ? opt : opt.value); setIsOpen(false); }} className={`px-3 py-2.5 text-xs rounded-lg cursor-pointer mb-0.5 flex justify-between items-center transition-colors ${((typeof opt==='string'?opt:opt.value)===value)?'bg-zinc-800 text-white font-bold shadow-inner':'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}>
                <span>{typeof opt === 'string' ? opt : opt.label}</span>
                {(typeof opt === 'string' ? opt : opt.value) === value && <Check size={14} className="text-emerald-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DeleteButton = ({ onDelete }) => {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { if(confirming){const t=setTimeout(()=>setConfirming(false),3000);return()=>clearTimeout(t)}},[confirming]);
  const handleClick = (e) => { e.stopPropagation(); if (confirming) { onDelete(); setConfirming(false); } else { setConfirming(true); } };
  if (confirming) return <button onClick={handleClick} className="bg-red-900/80 border border-red-700 text-red-200 px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.4)] text-[10px] font-bold transition-all mt-2 whitespace-nowrap hover:bg-red-800 hover:text-white">ยืนยันลบ</button>;
  return <button onClick={handleClick} className="text-zinc-600 hover:text-red-400 p-2 rounded-lg transition-all mt-auto hover:bg-red-900/20"><Trash2 size={16}/></button>;
};

// --- Main App ---
export default function DirectorBookLog() {
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    signInAnonymously(auth).catch((err) => console.error(err));
    const saved = localStorage.getItem('director_book_log_receivers');
    if (saved) try { setSavedReceivers(JSON.parse(saved)); } catch (e) {}
    return onAuthStateChanged(auth, (u) => setUser(u));
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
  }, [user]);

  const getNextRunningNumber = () => Math.max(documents.reduce((max, doc) => Math.max(max, doc.runningNumber || 0), 0), LAST_OLD_SYSTEM_NUMBER) + 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); 
    
    if (!subject.trim()) { setErrorMsg("⚠️ กรุณากรอกชื่อเรื่องครับ"); return; }
    if (!receiverName.trim()) { setErrorMsg("⚠️ กรุณากรอกชื่อผู้รับครับ"); return; }
    if (!db) { setErrorMsg("⚠️ ไม่พบการเชื่อมต่อฐานข้อมูล"); return; }
    
    setSubmitting(true);
    try {
      const trimmedName = receiverName.trim();
      if (!savedReceivers.includes(trimmedName)) {
        const newRecs = [...savedReceivers, trimmedName].slice(-5);
        setSavedReceivers(newRecs);
        localStorage.setItem('director_book_log_receivers', JSON.stringify(newRecs));
      }
      const nextNum = getNextRunningNumber();
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000));
      
      await Promise.race([
        addDoc(collection(db, 'director_submissions'), {
          runningNumber: nextNum, subject, department, urgency, receiverName, note, 
          status: 'pending', receivedAt: serverTimestamp(), submittedBy: user?.uid || 'anon'
        }), timeoutPromise
      ]);

      setSubject(''); 
      setUrgency('normal'); 
      setNote(''); 
      setShowSuccess(true); 
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { 
      console.error(err);
      setErrorMsg("บันทึกไม่สำเร็จ: " + err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const handleStatusToggle = async (docId, status) => {
    const next = status === 'pending' ? 'signed' : status === 'signed' ? 'returned' : 'pending';
    try { await updateDoc(doc(db, 'director_submissions', docId), { status: next }); } catch(e){}
  };
  const handleDelete = async (id) => { try { await deleteDoc(doc(db, 'director_submissions', id)); } catch(e){} };

  const formatDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const getUrgencyBadge = (id) => { const l = URGENCY_LEVELS.find(x=>x.id===id)||URGENCY_LEVELS[0]; return <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all shadow-sm ${l.color}`}>{l.label}</span> };
  const getStatusBadge = (key) => { const s = STATUS_LEVELS[key] || STATUS_LEVELS['pending']; const I = s.icon; return <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer select-none transition-all hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 whitespace-nowrap ${s.color}`}><I size={14} />{s.label}</div>; };
  const handlePrint = () => window.print();
  const handleExportExcel = () => { 
    const csvHeader = "เลขรับ,วันที่,เวลา,ความเร่งด่วน,เรื่อง,หน่วยงานเจ้าของเรื่อง,ผู้รับ,หมายเหตุ,สถานะ\n";
    const csvRows = filteredDocs.map(doc => {
      const noteText = `"${(doc.note || '').replace(/"/g, '""')}"`;
      const subj = `"${doc.subject.replace(/"/g, '""')}"`;
      return `${doc.runningNumber || ''},${formatDate(doc.receivedAt)},${formatTime(doc.receivedAt)},${URGENCY_LEVELS.find(l => l.id === doc.urgency)?.label || 'ปกติ'},${subj},"${doc.department}","${doc.receiverName}",${noteText},${STATUS_LEVELS[doc.status]?.label || 'รอเสนอ'}`;
    });
    const csvContent = "\uFEFF" + csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `รายงานรับหนังสือ_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDocs = documents.filter(d => {
    const term = filterTerm.toLowerCase();
    const matchesTerm = d.subject.toLowerCase().includes(term) || d.department.toLowerCase().includes(term) || (d.runningNumber+'').includes(term);
    let matchesDate = true;
    if (filterDate) { const dx=d.receivedAt; matchesDate = `${dx.getFullYear()}-${String(dx.getMonth()+1).padStart(2,'0')}-${String(dx.getDate()).padStart(2,'0')}` === filterDate; }
    return matchesTerm && matchesDate && (filterStatus === 'all' || d.status === filterStatus);
  });

  const nextRunningNumberDisplay = getNextRunningNumber();

  return (
    <>
      <style>{`@media print { @page { margin: 1cm; size: A4; } body { -webkit-print-color-adjust: exact; background-color: white !important; color: black !important; } .no-print { display: none !important; } .print-only { display: block !important; } .print-table { width: 100%; border-collapse: collapse; font-family: 'Sarabun', sans-serif; } .print-table th { background-color: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; color: #334155; } .print-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; vertical-align: top; font-size: 12px; color: #1e293b; } .print-header { text-align: center; margin-bottom: 30px; color: black; } .bg-zinc-950 { background-color: white !important; } } .print-only { display: none; } ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #18181b; } ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } hover::-webkit-scrollbar-thumb { background: #52525b; }`}</style>
      
      <MourningSash />

      <div className="h-screen flex flex-col bg-zinc-950 font-sans text-zinc-200 overflow-hidden selection:bg-zinc-700 selection:text-white">
        
        {/* Header: Metallic Silver Gradient */}
        <header className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-zinc-700/50 shrink-0 z-30 shadow-lg shadow-black/50 h-16 flex items-center justify-between px-6 no-print relative overflow-hidden">
          {/* Glossy effect overlay */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-3 z-10">
            <div className="bg-gradient-to-br from-zinc-700 to-black p-2 rounded-xl shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-zinc-600"><BookOpen size={20} className="text-zinc-300" /></div>
            <div>
              <h1 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 leading-none tracking-tight drop-shadow-sm">ระบบรับหนังสือเสนอ ผอ.</h1>
              <p className="text-[10px] text-zinc-500 font-medium tracking-wide mt-1">ทัณฑสถานวัยหนุ่มกลาง</p>
            </div>
          </div>
          <div className="flex gap-3 pr-12 z-10">
             <button onClick={handleExportExcel} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-700 hover:text-white hover:border-zinc-500 transition-all shadow-lg"><Download size={16}/> Excel</button>
             <button onClick={()=>window.print()} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-zinc-700 transition-all shadow-lg"><Printer size={18} /></button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Panel (Form): Dark Metallic Panel */}
          <div className="w-[380px] min-w-[380px] bg-[#121214] border-r border-zinc-800 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20 no-print relative">
             <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex justify-between items-center shrink-0 sticky top-0">
               <h2 className="font-bold text-zinc-300 flex items-center gap-2.5 text-sm"><div className="bg-zinc-800 p-1.5 rounded-lg text-zinc-400 border border-zinc-700"><PenTool size={16}/></div> ลงรับหนังสือใหม่</h2>
               <button onClick={() => { setSubject("ขออนุมัติจัดซื้อ"); setDepartment(DEPARTMENTS[0]); setReceiverName("คุณดรีม"); }} className="text-[10px] bg-zinc-800/50 border border-zinc-700 text-zinc-500 px-3 py-1.5 rounded-full hover:bg-zinc-700 hover:text-white hover:border-zinc-500 transition-all">Demo</button>
             </div>

             <div className="flex-1 overflow-y-auto p-5 space-y-5">
               {/* Next Number Card: Metallic Look */}
               <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl border border-zinc-700/50 flex flex-col items-center relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 opacity-50"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1 z-10">เลขรับถัดไป</span>
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tabular-nums tracking-tighter group-hover:scale-105 transition-transform duration-500 drop-shadow-lg z-10">{getNextRunningNumber()}</span>
               </div>
               
               <div><label className="block text-[11px] font-bold text-zinc-500 mb-2 uppercase tracking-wider ml-1">ความเร่งด่วน</label><div className="grid grid-cols-2 gap-2.5">{URGENCY_LEVELS.map(l=><button key={l.id} type="button" onClick={()=>setUrgency(l.id)} className={`text-xs py-3 rounded-xl font-semibold border transition-all duration-300 ${urgency===l.id?`${l.color} ring-1 ring-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]`:'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}>{l.label}</button>)}</div></div>
               
               <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">เรื่อง</label><input className="mt-1.5 w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all placeholder:text-zinc-600 font-medium text-zinc-200 shadow-inner" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="ระบุชื่อเรื่อง..." /></div>
               
               <CustomSelect label="หน่วยงานเจ้าของเรื่อง" value={department} options={DEPARTMENTS} onChange={setDepartment} icon={Building2} />
               
               <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">ผู้รับเอกสาร</label><div className="relative mt-1.5 group"><input className="w-full pl-11 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all font-medium text-zinc-200 shadow-inner" value={receiverName} onChange={e=>setReceiverName(e.target.value)} placeholder="ระบุผู้รับ..." /><div className="absolute left-3.5 top-3 p-1 bg-zinc-800 rounded-md text-zinc-500 group-focus-within:bg-zinc-700 group-focus-within:text-white transition-colors"><User size={14}/></div></div>
               {savedReceivers.length>0 && <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">{savedReceivers.map((n,i)=><span key={i} onClick={()=>setReceiverName(n)} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg cursor-pointer text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all">{n}</span>)}</div>}</div>
               
               <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">หมายเหตุ</label><div className="relative mt-1.5 group"><textarea className="w-full pl-11 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none h-20 resize-none transition-all font-medium text-zinc-200 shadow-inner" value={note} onChange={e=>setNote(e.target.value)} placeholder="..." /><div className="absolute left-3.5 top-3 p-1 bg-zinc-800 rounded-md text-zinc-500 group-focus-within:bg-zinc-700 group-focus-within:text-white transition-colors"><StickyNote size={14}/></div></div></div>
             </div>

             {/* Form Footer: Sticky Bottom */}
             <div className="p-5 border-t border-zinc-800 bg-[#121214] shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
                <button onClick={handleSubmit} disabled={submitting} className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg flex justify-center items-center gap-2.5 transition-all duration-300 ${submitting?'bg-zinc-800 cursor-not-allowed text-zinc-500':'bg-gradient-to-r from-zinc-200 to-zinc-400 text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-[0.98]'}`}>
                  {submitting ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"/> กำลังบันทึก...</span> : <><Save size={18}/> ยืนยันลงรับ</>}
                </button>
                
                {showSuccess && <div className="mt-3 text-xs text-center text-emerald-400 font-bold bg-emerald-900/30 py-2.5 rounded-xl border border-emerald-800/50 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg"><div className="bg-emerald-900 p-0.5 rounded-full"><CheckCircle2 size={14} className="text-emerald-400"/></div> บันทึกสำเร็จ!</div>}
                {errorMsg && <div className="mt-3 text-xs text-center text-red-400 font-bold bg-red-900/30 py-2.5 rounded-xl border border-red-800/50 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg"><XCircle size={16}/> {errorMsg}</div>}
             </div>
          </div>

          {/* Right Panel (List) */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
             {/* Filters Bar */}
             <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex gap-3 shrink-0 items-center overflow-x-auto pr-16 shadow-lg">
                <div className="relative flex-1 min-w-[200px] group"><Search size={18} className="absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:text-white transition-colors"/><input className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-all shadow-sm text-zinc-200 font-medium placeholder:text-zinc-600" placeholder="ค้นหา..." value={filterTerm} onChange={e=>setFilterTerm(e.target.value)}/></div>
                <div className="relative min-w-[160px] group"><Calendar size={18} className="absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:text-white transition-colors"/><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none text-zinc-400 font-medium cursor-pointer shadow-sm [color-scheme:dark]" /></div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
                {loading ? <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3"><div className="w-10 h-10 border-4 border-zinc-800 border-t-zinc-500 rounded-full animate-spin"></div><p className="text-sm font-medium">กำลังโหลดข้อมูล...</p></div> : filteredDocs.length===0 ? <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-3xl m-4"><div className="bg-zinc-900 p-4 rounded-full mb-3"><Search size={32}/></div><div className="font-bold text-lg text-zinc-500">ไม่พบรายการ</div><p className="text-sm text-zinc-700">ลองปรับเงื่อนไขการค้นหา</p></div> : 
                  filteredDocs.map(doc => {
                    // Status styling logic
                    const statusConfig = STATUS_LEVELS[doc.status] || STATUS_LEVELS['pending'];
                    
                    return (
                      <div key={doc.id} className={`bg-zinc-900 p-1 rounded-2xl shadow-lg border hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-zinc-600 transition-all duration-300 relative group pr-4 ${statusConfig.borderColor}`}>
                        {/* Urgency Stripe */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${URGENCY_LEVELS.find(u=>u.id===doc.urgency)?.color.split(' ')[0].replace('/30', '/80') || 'bg-zinc-700'}`}></div>
                        
                        <div className="flex gap-4 pl-4 py-3">
                          <div className="text-center min-w-[50px] flex flex-col justify-center">
                             <div className="bg-zinc-800 w-12 h-12 rounded-xl flex items-center justify-center border border-zinc-700/50 shadow-inner mb-1 group-hover:bg-zinc-700/50 transition-colors">
                                <span className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br ${statusConfig.numGradient}`}>{doc.runningNumber}</span>
                             </div>
                             <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">เลขรับ</div>
                          </div>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex gap-2 mb-1.5 items-center">
                               {getUrgencyBadge(doc.urgency)}
                               <span className="text-[11px] font-bold text-zinc-500 flex items-center gap-1 bg-zinc-800/50 px-2 py-0.5 rounded-md border border-zinc-800"><Clock size={12} /> {formatDate(doc.receivedAt)} <span className="opacity-30">|</span> {formatTime(doc.receivedAt)} น.</span>
                            </div>
                            <h3 className={`font-bold text-base leading-snug mb-2 truncate transition-colors ${statusConfig.titleColor}`}>{doc.subject}</h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                               <span className="flex items-center gap-1.5 bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700/50"><Building2 size={12} className="text-zinc-400"/> {doc.department}</span>
                               <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                               <span className="flex items-center gap-1.5"><User size={12} className="text-zinc-400"/> รับโดย: <span className="font-medium text-zinc-400">{doc.receiverName}</span></span>
                            </div>
                            {doc.note && <div className="text-[11px] text-amber-500/80 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/50 flex items-start gap-2 max-w-fit"><StickyNote size={12} className="shrink-0 mt-0.5 text-amber-600"/> <span className="truncate max-w-[300px]">{doc.note}</span></div>}
                          </div>
                          
                          <div className="flex flex-col justify-between items-end pl-4 border-l border-zinc-800/80">
                             <div onClick={()=>handleStatusToggle(doc.id,doc.status)} className={`cursor-pointer transform transition-transform hover:scale-105 active:scale-95 origin-right`}>
                                {(() => {
                                  const I = statusConfig.icon;
                                  return <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border shadow-lg backdrop-blur-md ${statusConfig.color}`}><I size={14}/>{statusConfig.label}</div>
                                })()}
                             </div>
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

        {/* 🟢 Credit: Design By Dream APL */}
        <div className="fixed bottom-3 right-3 z-[50] pointer-events-none select-none no-print">
            <div className="bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-2 group transition-all duration-500 hover:bg-black/60 hover:border-white/10 pointer-events-auto">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] group-hover:text-zinc-400 transition-colors">
                    Design By <span className="text-zinc-400 group-hover:text-emerald-400 transition-colors">Dream APL</span>
                </span>
            </div>
        </div>
</div>
      </div>
    </>
  );
}
