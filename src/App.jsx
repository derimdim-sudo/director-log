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
  ChevronDown, Check, Edit3, AlertTriangle, FileText
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

// ธีมสี: Dark Mode
const URGENCY_LEVELS = [
  { id: 'normal', label: 'ปกติ', color: 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200' },
  { id: 'urgent', label: 'ด่วน', color: 'bg-orange-950/40 text-orange-400 border-orange-900/50 hover:bg-orange-900/60' },
  { id: 'very_urgent', label: 'ด่วนมาก', color: 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-900/60' },
  { id: 'most_urgent', label: 'ด่วนที่สุด', color: 'bg-gradient-to-r from-red-900 to-rose-900 text-white border-red-800 hover:from-red-800 hover:to-rose-800 shadow-[0_0_10px_rgba(225,29,72,0.3)]' }
];

const STATUS_LEVELS = {
  'pending': { label: 'รอเสนอ', color: 'bg-amber-950/30 text-amber-500 ring-1 ring-amber-900/50', icon: Clock },
  'signed': { label: 'เซ็นแล้ว', color: 'bg-emerald-950/30 text-emerald-500 ring-1 ring-emerald-900/50', icon: CheckSquare },
  'returned': { label: 'คืนเรื่อง', color: 'bg-red-950/30 text-red-500 ring-1 ring-red-900/50', icon: RefreshCcw },
};

// --- Custom Components ---

// 🎗️ Mourning Sash
const MourningSash = () => (
  <div className="fixed top-0 right-0 z-[9998] pointer-events-none w-24 h-24 overflow-hidden">
    <div className="absolute top-0 right-0 w-[150%] h-8 bg-[#000000] transform rotate-45 translate-x-[28%] translate-y-[50%] origin-bottom-right shadow-[0_0_15px_rgba(0,0,0,1)] flex items-center justify-center border-b border-zinc-800">
       <div className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center shadow-inner ring-1 ring-zinc-700">
          <svg width="10" height="14" viewBox="0 0 24 24" fill="#52525b" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.8 1.5C9.5 1.5 7.5 3.2 7.5 5.5C7.5 7.2 8.5 8.8 9.8 9.8L7 18.5L11.8 16L16.6 18.5L13.8 9.8C15.1 8.8 16.1 7.2 16.1 5.5C16.1 3.2 14.1 1.5 11.8 1.5ZM11.8 8.5C10.1 8.5 8.8 7.2 8.8 5.5C8.8 3.8 10.1 2.5 11.8 2.5C13.5 2.5 14.8 3.8 14.8 5.5C14.8 7.2 13.5 8.5 11.8 8.5Z" />
          </svg>
       </div>
    </div>
  </div>
);

// 📝 Detail/Edit Modal (หน้าต่างดูรายละเอียดและแก้ไข)
const DetailModal = ({ docItem, onClose, onSave }) => {
  const [editSubject, setEditSubject] = useState(docItem.subject);
  const [editNote, setEditNote] = useState(docItem.note || '');
  const [returnReason, setReturnReason] = useState(docItem.returnReason || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(docItem.id, { 
        subject: editSubject, 
        note: editNote,
        returnReason: returnReason
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181b] w-full max-w-lg rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="flex items-center gap-3">
             <div className="bg-zinc-800 p-2.5 rounded-xl border border-zinc-700 shadow-inner">
                <span className="text-2xl font-black text-white tracking-tight">{docItem.runningNumber}</span>
             </div>
             <div>
                <h3 className="text-base font-bold text-zinc-200 leading-none">รายละเอียดเอกสาร</h3>
                <p className="text-[11px] text-zinc-500 mt-1">{docItem.department}</p>
             </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-all"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
           {/* Status Banner */}
           <div className={`flex items-center justify-between p-3.5 rounded-xl border ${STATUS_LEVELS[docItem.status]?.color.replace('ring-1', 'border bg-opacity-20')}`}>
              <span className="text-xs font-bold opacity-70 uppercase tracking-wider">สถานะปัจจุบัน</span>
              <div className="flex items-center gap-2 font-bold text-sm">
                 {STATUS_LEVELS[docItem.status]?.icon && React.createElement(STATUS_LEVELS[docItem.status].icon, { size: 18 })}
                 {STATUS_LEVELS[docItem.status]?.label}
              </div>
           </div>

           {/* Subject (Editable) */}
           <div>
              <label className="block text-xs font-bold text-zinc-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2">
                 <FileText size={14}/> เรื่อง (แก้ไขได้)
              </label>
              <textarea 
                value={editSubject} 
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none min-h-[80px] resize-none leading-relaxed shadow-inner"
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Note (Editable) */}
               <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2">
                     <StickyNote size={14}/> หมายเหตุทั่วไป
                  </label>
                  <textarea 
                    value={editNote} 
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="ไม่มีหมายเหตุ..."
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 outline-none min-h-[100px] resize-none shadow-inner"
                  />
               </div>
               
               {/* Return Reason (Editable) - Highlighted */}
               <div>
                  <label className="block text-xs font-bold text-red-400 mb-2 ml-1 uppercase tracking-wider flex items-center gap-2">
                     <AlertTriangle size={14}/> เหตุผลการคืนเรื่อง
                  </label>
                  <textarea 
                    value={returnReason} 
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="ระบุเหตุผลที่คืนเรื่อง..."
                    className="w-full p-3 bg-red-950/10 border border-red-900/30 rounded-xl text-sm text-red-200 focus:border-red-800 focus:ring-1 focus:ring-red-900 outline-none min-h-[100px] resize-none placeholder:text-red-900/40 shadow-inner"
                  />
               </div>
           </div>

           {/* Meta Info */}
           <div className="pt-4 border-t border-zinc-800/50 flex justify-between text-xs text-zinc-500 font-medium">
              <div className="flex items-center gap-2"><User size={14}/> ผู้รับ: <span className="text-zinc-300">{docItem.receiverName}</span></div>
              <div className="flex items-center gap-2"><Clock size={14}/> ลงรับเมื่อ: <span className="text-zinc-300">{docItem.receivedAt?.toLocaleDateString('th-TH')} {docItem.receivedAt?.toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</span></div>
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-sm flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-transparent hover:border-zinc-700">ยกเลิก</button>
           <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-lg hover:shadow-white/10 active:scale-95 flex items-center gap-2">
              {saving ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-black rounded-full animate-spin"/> : <Check size={16}/>}
              บันทึกการแก้ไข
           </button>
        </div>
      </div>
    </div>
  );
};

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
  if (confirming) return <button onClick={handleClick} className="bg-red-900/80 border border-red-700/50 text-red-200 px-2 py-1 rounded-lg shadow-[0_0_10px_rgba(220,38,38,0.4)] text-[10px] font-bold transition-all mt-2 whitespace-nowrap hover:bg-red-800">ยืนยันลบ?</button>;
  return <button onClick={handleClick} className="text-zinc-600 hover:text-red-500 p-1.5 transition-all mt-auto hover:bg-zinc-800 rounded"><Trash2 size={16}/></button>;
};

// --- Main App ---
export default function DirectorBookLog() {
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [urgency, setUrgency] = useState('normal');
  const [receiverName, setReceiverName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Filter & State
  const [savedReceivers, setSavedReceivers] = useState([]);
  const [filterTerm, setFilterTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); 
  
  // Detail/Edit Modal State
  const [detailDoc, setDetailDoc] = useState(null);

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
  
  const handleUpdateDoc = async (docId, newData) => {
    try {
      await updateDoc(doc(db, 'director_submissions', docId), newData);
    } catch (e) {
      alert("แก้ไขไม่สำเร็จ: " + e.message);
    }
  };

  const formatDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const getUrgencyBadge = (id) => { const l = URGENCY_LEVELS.find(x=>x.id===id)||URGENCY_LEVELS[0]; return <span className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all shadow-sm ${l.color}`}>{l.label}</span> };
  const getStatusBadge = (key) => { const s = STATUS_LEVELS[key] || STATUS_LEVELS['pending']; const I = s.icon; return <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer select-none transition-all hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 whitespace-nowrap ${s.color}`}><I size={14} />{s.label}</div>; };
  const handlePrint = () => window.print();
  const handleExportExcel = () => { 
    const csvHeader = "เลขรับ,วันที่,เวลา,ความเร่งด่วน,เรื่อง,หน่วยงานเจ้าของเรื่อง,ผู้รับ,หมายเหตุ,เหตุผลการคืน,สถานะ\n";
    const csvRows = filteredDocs.map(doc => {
      const noteText = `"${(doc.note || '').replace(/"/g, '""')}"`;
      const returnReasonText = `"${(doc.returnReason || '').replace(/"/g, '""')}"`;
      const subj = `"${doc.subject.replace(/"/g, '""')}"`;
      return `${doc.runningNumber || ''},${formatDate(doc.receivedAt)},${formatTime(doc.receivedAt)},${URGENCY_LEVELS.find(l => l.id === doc.urgency)?.label || 'ปกติ'},${subj},"${doc.department}","${doc.receiverName}",${noteText},${returnReasonText},${STATUS_LEVELS[doc.status]?.label || 'รอเสนอ'}`;
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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap');
        @media print { @page { margin: 1cm; size: A4; } body { -webkit-print-color-adjust: exact; background-color: white !important; color: black !important; } .no-print { display: none !important; } .print-only { display: block !important; } .print-table { width: 100%; border-collapse: collapse; font-family: 'Sarabun', sans-serif; } .print-table th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #000; padding: 8px; } .print-table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; } .print-header { text-align: center; margin-bottom: 20px; } .bg-slate-50 { background-color: white !important; } } .print-only { display: none; } ::-webkit-scrollbar { width: 6px; height: 6px; } ::-webkit-scrollbar-track { background: #18181b; } ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; } hover::-webkit-scrollbar-thumb { background: #52525b; }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.7); }
          50% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 10px 10px rgba(225, 29, 72, 0); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s infinite;
        }
      `}</style>
      
      <MourningSash />
      
      {/* Detail/Edit Modal */}
      {detailDoc && (
        <EditModal 
          docItem={detailDoc} 
          onClose={() => setDetailDoc(null)} 
          onSave={handleUpdateDoc}
        />
      )}

      <div className="h-screen flex flex-col bg-[#09090b] font-sans text-zinc-300 overflow-hidden selection:bg-zinc-700 selection:text-white relative">
        
        {/* Header */}
        <header className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-zinc-700/50 shrink-0 z-30 shadow-lg shadow-black/50 h-16 flex items-center justify-between px-6 no-print relative overflow-hidden">
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
          
          {/* Left Panel (Form) */}
          <div className="w-[380px] min-w-[380px] bg-[#121214] border-r border-zinc-800 flex flex-col shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20 no-print relative">
             <div className="p-5 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex justify-between items-center shrink-0 sticky top-0">
               <h2 className="font-bold text-zinc-300 flex items-center gap-2.5 text-sm"><div className="bg-zinc-800 p-1.5 rounded-lg text-zinc-400 border border-zinc-700"><PenTool size={16}/></div> ลงรับหนังสือใหม่</h2>
               <button onClick={() => { setSubject("ขออนุมัติจัดซื้อ"); setDepartment(DEPARTMENTS[0]); setReceiverName("คุณดรีม"); }} className="text-[10px] bg-zinc-800/50 border border-zinc-700 text-zinc-500 px-3 py-1.5 rounded-full hover:bg-zinc-700 hover:text-white hover:border-zinc-500 transition-all">Demo</button>
             </div>

             <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-6 rounded-2xl border border-zinc-700/50 flex flex-col items-center relative overflow-hidden group shadow-lg">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 opacity-50"></div>
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                   <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1 z-10">เลขรับถัดไป</span>
                   <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 tabular-nums tracking-tighter group-hover:scale-105 transition-transform duration-500 drop-shadow-lg z-10">{getNextRunningNumber()}</span>
                </div>
                
                <div><label className="block text-[11px] font-bold text-zinc-500 mb-2 uppercase tracking-wider ml-1">ความเร่งด่วน</label><div className="grid grid-cols-2 gap-2.5">{URGENCY_LEVELS.map(l=><button key={l.id} type="button" onClick={()=>setUrgency(l.id)} className={`text-xs py-3 rounded-xl font-semibold border transition-all duration-300 ${urgency===l.id?`${l.color} ring-1 ring-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]`:'bg-zinc-900 text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 hover:text-zinc-300'}`}>{l.label}</button>)}</div></div>
                <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">เรื่อง</label><input className="mt-1.5 w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all placeholder:text-zinc-600 font-medium text-zinc-200 shadow-inner" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="ระบุชื่อเรื่อง..." /></div>
                <CustomSelect label="หน่วยงานเจ้าของเรื่อง" value={department} options={DEPARTMENTS} onChange={setDepartment} icon={Building2} />
                <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">ผู้รับเอกสาร</label><div className="relative mt-1.5 group"><input className="w-full pl-11 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-all font-medium text-zinc-200 shadow-inner" value={receiverName} onChange={e=>setReceiverName(e.target.value)} placeholder="ระบุผู้รับ..." /><div className="absolute left-3.5 top-3 p-1 bg-zinc-800 rounded-md text-zinc-500 group-focus-within:bg-zinc-700 group-focus-within:text-white transition-colors"><User size={14}/></div></div>{savedReceivers.length>0 && <div className="flex flex-wrap gap-1.5 mt-2.5 px-1">{savedReceivers.map((n,i)=><span key={i} onClick={()=>setReceiverName(n)} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-1 rounded-lg cursor-pointer text-zinc-500 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all">{n}</span>)}</div>}</div>
                <div><label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">หมายเหตุ</label><div className="relative mt-1.5 group"><textarea className="w-full pl-11 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none h-20 resize-none transition-all font-medium text-zinc-200 shadow-inner" value={note} onChange={e=>setNote(e.target.value)} placeholder="..." /><div className="absolute left-3.5 top-3 p-1 bg-zinc-800 rounded-md text-zinc-500 group-focus-within:bg-zinc-700 group-focus-within:text-white transition-colors"><StickyNote size={14}/></div></div></div>
             </div>

             <div className="p-5 border-t border-zinc-800 bg-[#121214] shrink-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
                <button onClick={handleSubmit} disabled={submitting} className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg flex justify-center items-center gap-2.5 transition-all duration-300 ${submitting?'bg-zinc-800 cursor-not-allowed text-zinc-500':'bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98]'}`}>
                  {submitting ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin"/> กำลังบันทึก...</span> : <><Save size={18}/> ยืนยันลงรับ</>}
                </button>
                {showSuccess && <div className="mt-3 text-xs text-center text-emerald-400 font-bold bg-emerald-900/20 py-2.5 rounded-xl border border-emerald-800/50 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg"><div className="bg-emerald-900 p-0.5 rounded-full"><CheckCircle2 size={14} className="text-emerald-400"/></div> บันทึกสำเร็จ!</div>}
                {errorMsg && <div className="mt-3 text-xs text-center text-red-400 font-bold bg-red-900/30 py-2.5 rounded-xl border border-red-800/50 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 shadow-lg"><XCircle size={16}/> {errorMsg}</div>}
             </div>
          </div>

          {/* Right Panel (List) */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
             {/* Filters Bar */}
             <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl flex gap-3 shrink-0 items-center overflow-x-auto pr-16 shadow-lg">
                <div className="relative flex-1 min-w-[200px] group"><Search size={18} className="absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors"/><input className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none transition-all shadow-sm text-zinc-200 font-medium placeholder:text-zinc-600" placeholder="ค้นหา..." value={filterTerm} onChange={e=>setFilterTerm(e.target.value)}/></div>
                <div className="relative min-w-[160px] group"><Calendar size={18} className="absolute left-3.5 top-2.5 text-zinc-500 group-focus-within:text-zinc-300 transition-colors"/><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-900 border border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 outline-none text-zinc-400 font-medium cursor-pointer shadow-sm [color-scheme:dark]" /></div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
                {loading ? <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3"><div className="w-10 h-10 border-4 border-zinc-800 border-t-zinc-500 rounded-full animate-spin"></div><p className="text-sm font-medium">กำลังโหลดข้อมูล...</p></div> : filteredDocs.length===0 ? <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border-2 border-dashed border-zinc-900 rounded-3xl m-4"><div className="bg-zinc-900 p-4 rounded-full mb-3"><Search size={32}/></div><div className="font-bold text-lg text-zinc-500">ไม่พบรายการ</div><p className="text-sm text-zinc-700">ลองปรับเงื่อนไขการค้นหา</p></div> : 
                  filteredDocs.map(doc => {
                    const statusConfig = STATUS_LEVELS[doc.status] || STATUS_LEVELS['pending'];
                    return (
                      <div key={doc.id} className={`bg-zinc-900 p-1 rounded-2xl shadow-lg border hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-zinc-600 transition-all duration-300 relative group pr-4 ${statusConfig.borderColor}`}>
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
                            <h3 
                                className={`font-bold text-base leading-snug mb-2 truncate transition-colors cursor-pointer hover:underline ${statusConfig.titleColor}`}
                                onClick={() => setDetailDoc(doc)}
                                title="คลิกเพื่อดูรายละเอียดและแก้ไข"
                            >
                                {doc.subject}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                               <span className="flex items-center gap-1.5 bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700/50"><Building2 size={12} className="text-zinc-400"/> {doc.department}</span>
                               <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                               <span className="flex items-center gap-1.5"><User size={12} className="text-zinc-400"/> รับโดย: <span className="font-medium text-zinc-400">{doc.receiverName}</span></span>
                            </div>
                            {doc.note && <div className="text-[11px] text-amber-500/80 bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-900/50 flex items-start gap-2 max-w-fit"><StickyNote size={12} className="shrink-0 mt-0.5 text-amber-600"/> <span className="truncate max-w-[300px]">{doc.note}</span></div>}
                            {doc.returnReason && <div className="text-[11px] text-red-400 bg-red-950/30 px-2.5 py-1.5 rounded-lg border border-red-900/50 flex items-start gap-2 max-w-fit mt-1"><AlertTriangle size={12} className="shrink-0 mt-0.5 text-red-500"/> <span className="truncate max-w-[300px] font-bold">คืนเรื่อง: {doc.returnReason}</span></div>}
                          </div>
                          
                          <div className="flex flex-col justify-between items-end pl-4 border-l border-zinc-800/80">
                             <div onClick={()=>handleStatusToggle(doc.id,doc.status)} className={`cursor-pointer transform transition-transform hover:scale-105 active:scale-95 origin-right`}>
                                {(() => {
                                  const I = statusConfig.icon;
                                  return <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border shadow-lg backdrop-blur-md ${statusConfig.color}`}><I size={14}/>{statusConfig.label}</div>
                                })()}
                             </div>
                             <div className="flex gap-1 mt-auto">
                               <button onClick={() => setDetailDoc(doc)} className="text-zinc-600 hover:text-zinc-300 p-2 rounded-lg transition-all hover:bg-zinc-800" title="แก้ไข/ดูรายละเอียด"><Edit3 size={16}/></button>
                               <DeleteButton onDelete={()=>handleDelete(doc.id)}/>
                             </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
             </div>
          </div>
        </div>

        {/* 🟢 Credit Footer */}
        <div className="fixed bottom-3 right-4 z-[100] pointer-events-auto select-none no-print group">
           <div className="bg-black/60 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-500 hover:bg-black/80 hover:border-rose-900/50 cursor-default relative overflow-hidden">
               <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-rose-500/5 blur-md"></div>
               <span className="relative flex h-2 w-2">
                  <span className="animate-heartbeat absolute inline-flex h-full w-full rounded-full bg-rose-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_10px_#f43f5e]"></span>
               </span>
               <span className="font-handwriting text-[12px] text-zinc-500 italic tracking-wider group-hover:text-zinc-300 transition-colors relative z-10" style={{ fontFamily: "'Dancing Script', cursive" }}>
                  design By <span className="text-zinc-400 group-hover:text-rose-400 font-bold not-italic transition-colors drop-shadow-[0_0_5px_rgba(244,63,94,0.5)]">Dream APL</span>
               </span>
           </div>
        </div>

      </div>
    </>
  );
}
