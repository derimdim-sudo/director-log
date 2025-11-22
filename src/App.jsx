import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, serverTimestamp, 
  deleteDoc, doc, updateDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  BookOpen, Clock, AlertCircle, CheckCircle2, 
  PenTool, User, Building2, Save, Search, Printer, 
  FileText, Hash, Trash2, CheckSquare, RefreshCcw, Sparkles, XCircle,
  Calendar, Filter, Download, ChevronRight, Layers, X, StickyNote,
  ChevronDown, Check
} from 'lucide-react';

// ------------------------------------------------------------------
// 🔴 ส่วนสำคัญ: ตั้งค่า FIREBASE CONFIG 🔴
// ------------------------------------------------------------------

// 1. สำหรับการรันในเครื่องตัวเอง หรือ Vercel (ให้แก้ตรงนี้ตอนก๊อปไปลงคอม)
const localFirebaseConfig = {
  apiKey: "AIzaSyBApk3_3eJHPrzIidDyhTOCkaOxkE90QZ4", // ⚠️ ใส่ API Key ของคุณที่นี่
  authDomain: "director-log-2025.firebaseapp.com",
  projectId: "director-log-2025",
  storageBucket: "director-log-2025.appspot.com",
  messagingSenderId: "123456...",
  appId: "1:123456:web:..."
};

// 2. Logic เลือก Config อัตโนมัติ (ไม่ต้องแก้ส่วนนี้)
// - ถ้ารันในหน้าเว็บนี้ (Sandbox) จะใช้ __firebase_config
// - ถ้ารันในเครื่องคุณ (Local) จะใช้ localFirebaseConfig ด้านบน
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : localFirebaseConfig;

// เริ่มต้นระบบ
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- ตั้งค่าระบบ ---
const LAST_OLD_SYSTEM_NUMBER = 339; 

const DEPARTMENTS = [
  "ฝ่ายบริหาร",
  "ส่วนทัณฑปฏิบัติ",
  "ส่วนปกครองผู้ต้องขัง",
  "ส่วนรักษาการณ์",
  "ส่วนสวัสดิการฯ",
  "ส่วนสถานพยาบาล",
  "ส่วนพัฒนาผู้ต้องขัง 1",
  "ส่วนพัฒนาผู้ต้องขัง 2",
  "หน่วยงานภายนอก/อื่นๆ"
];

const URGENCY_LEVELS = [
  { id: 'normal', label: 'ปกติ', color: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' },
  { id: 'urgent', label: 'ด่วน', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { id: 'very_urgent', label: 'ด่วนมาก', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
  { id: 'most_urgent', label: 'ด่วนที่สุด', color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' }
];

const STATUS_LEVELS = {
  'pending': { label: 'รอเสนอ', color: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', icon: Clock },
  'signed': { label: 'เซ็นแล้ว', color: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', icon: CheckSquare },
  'returned': { label: 'คืนเรื่อง/แก้ไข', color: 'bg-red-50 text-red-700 ring-1 ring-red-200', icon: RefreshCcw },
};

// --- Custom Components ---

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
    if (!value) return null;
    const selected = options.find(opt => (typeof opt === 'string' ? opt : opt.value) === value);
    return typeof selected === 'string' ? selected : selected?.label;
  };

  const displayLabel = getDisplayLabel();

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-4 py-3 bg-white border rounded-xl text-sm flex items-center justify-between transition-all duration-200 group
            ${isOpen 
              ? 'border-blue-500 ring-4 ring-blue-50/50 shadow-md' 
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'}
          `}
        >
          <div className="flex items-center gap-3 overflow-hidden">
             {Icon && (
               <div className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50'}`}>
                 <Icon size={16} />
               </div>
             )}
             <span className={`truncate font-medium ${!displayLabel ? 'text-slate-400' : 'text-slate-700'}`}>
                {displayLabel || placeholder}
             </span>
          </div>
          
          <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl shadow-slate-200/50 max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-200 origin-top p-1.5">
            {options.map((opt, idx) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = optValue === value;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                  }}
                  className={`
                    px-4 py-2.5 text-sm rounded-lg cursor-pointer transition-all flex items-center justify-between mb-0.5 last:mb-0
                    ${isSelected 
                      ? 'bg-blue-50 text-blue-700 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}
                  `}
                >
                  <span>{optLabel}</span>
                  {isSelected && <Check size={16} className="text-blue-500" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const DeleteButton = ({ onDelete }) => {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (confirming) {
      const timer = setTimeout(() => setConfirming(false), 3000); 
      return () => clearTimeout(timer);
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

  if (confirming) {
    return (
      <button 
        onClick={handleClick}
        className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-red-200 z-20 text-xs font-bold animate-in fade-in zoom-in duration-200 flex items-center gap-1 hover:bg-red-600 transition-all"
        title="กดอีกครั้งเพื่อยืนยันการลบ"
      >
        <Trash2 size={14} /> ยืนยัน?
      </button>
    );
  }

  return (
    <button 
      onClick={handleClick}
      className="absolute top-4 right-4 text-slate-300 bg-white/80 backdrop-blur-sm hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 z-10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 border border-transparent hover:border-red-100"
      title="ลบรายการ"
    >
      <Trash2 size={16} />
    </button>
  );
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
    const initAuth = async () => {
      try {
        // ใช้ Custom Token ถ้าอยู่ใน Sandbox เพื่อความเสถียร
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error", error);
        setErrorMsg("ไม่สามารถเข้าสู่ระบบได้ (ตรวจสอบ Config)");
      }
    };
    initAuth();
    
    const saved = localStorage.getItem('director_book_log_receivers');
    if (saved) {
      try {
        setSavedReceivers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved receivers");
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // ปรับ path ตาม environment
    const collectionName = 'director_submissions';
    const collectionPath = typeof __firebase_config !== 'undefined' 
      ? collection(db, 'artifacts', appId, 'public', 'data', collectionName)
      : collection(db, collectionName);
    
    const unsubscribe = onSnapshot(collectionPath, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        receivedAt: doc.data().receivedAt?.toDate() || new Date(),
        runningNumber: doc.data().runningNumber || 0,
        status: doc.data().status || 'pending',
        note: doc.data().note || '' 
      }));
      
      docs.sort((a, b) => b.runningNumber - a.runningNumber);
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching documents:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getNextRunningNumber = () => {
    const maxInDocs = documents.reduce((max, doc) => Math.max(max, doc.runningNumber || 0), 0);
    return Math.max(maxInDocs, LAST_OLD_SYSTEM_NUMBER) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !receiverName.trim()) return;
    
    setSubmitting(true);
    try {
      const trimmedName = receiverName.trim();
      if (!savedReceivers.includes(trimmedName)) {
        const newReceivers = [...savedReceivers, trimmedName].slice(-5);
        setSavedReceivers(newReceivers);
        localStorage.setItem('director_book_log_receivers', JSON.stringify(newReceivers));
      }

      const nextNumber = getNextRunningNumber();
      
      const collectionName = 'director_submissions';
      const collectionRef = typeof __firebase_config !== 'undefined' 
        ? collection(db, 'artifacts', appId, 'public', 'data', collectionName)
        : collection(db, collectionName);

      await addDoc(collectionRef, {
        runningNumber: nextNumber,
        subject,
        department,
        urgency,
        receiverName,
        note,
        status: 'pending', 
        receivedAt: serverTimestamp(),
        submittedBy: user.uid
      });

      setSubject('');
      setUrgency('normal');
      setNote('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

    } catch (error) {
      console.error("Error submitting:", error);
      setErrorMsg("บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    const demoSubjects = [
      "ขออนุมัติจัดซื้อวัสดุสำนักงาน ประจำเดือนสิงหาคม",
      "รายงานผลการดำเนินงานโครงการฝึกวิชาชีพ",
      "ขออนุญาตลาพักผ่อน (นายสมชาย)",
      "เชิญเป็นประธานในพิธีเปิดโครงการ",
      "รายงานเวรยามประจำวัน"
    ];
    setSubject(demoSubjects[Math.floor(Math.random() * demoSubjects.length)]);
    setDepartment(DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)]);
    setUrgency(URGENCY_LEVELS[Math.floor(Math.random() * URGENCY_LEVELS.length)].id);
    setReceiverName("คุณดรีม");
    setNote("เอกสารแนบ 2 ฉบับ");
  };

  const handleRemoveReceiver = (nameToRemove) => {
    const newReceivers = savedReceivers.filter(name => name !== nameToRemove);
    setSavedReceivers(newReceivers);
    localStorage.setItem('director_book_log_receivers', JSON.stringify(newReceivers));
  };

  const handleDelete = async (docId) => {
    if (!db) return;
    try {
      const collectionName = 'director_submissions';
      const docRef = typeof __firebase_config !== 'undefined' 
        ? doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId)
        : doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting document:", error);
      setErrorMsg("ลบรายการไม่สำเร็จ");
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleStatusToggle = async (docId, currentStatus) => {
    if (!db) return;
    let nextStatus = 'pending';
    if (currentStatus === 'pending') nextStatus = 'signed';
    else if (currentStatus === 'signed') nextStatus = 'returned';
    else nextStatus = 'pending';

    try {
      const collectionName = 'director_submissions';
      const docRef = typeof __firebase_config !== 'undefined' 
        ? doc(db, 'artifacts', appId, 'public', 'data', collectionName, docId)
        : doc(db, collectionName, docId);
      await updateDoc(docRef, {
        status: nextStatus
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Helper functions for formatting
  const formatTime = (date) => date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

  // Badges and Handlers
  const getUrgencyBadge = (levelId) => {
    const level = URGENCY_LEVELS.find(l => l.id === levelId) || URGENCY_LEVELS[0];
    return <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${level.color} print:border-black print:text-black print:bg-transparent`}>{level.label}</span>;
  };

  const getStatusBadge = (statusKey) => {
    const status = STATUS_LEVELS[statusKey] || STATUS_LEVELS['pending'];
    const Icon = status.icon;
    return <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer select-none transition-all hover:shadow-md hover:scale-105 active:scale-95 ${status.color}`}><Icon size={14} />{status.label}</div>;
  };

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

  const filteredDocs = documents.filter(docItem => {
    const matchesTerm = 
      docItem.subject.toLowerCase().includes(filterTerm.toLowerCase()) || 
      docItem.department.toLowerCase().includes(filterTerm.toLowerCase()) ||
      docItem.receiverName.toLowerCase().includes(filterTerm.toLowerCase()) ||
      (docItem.note && docItem.note.toLowerCase().includes(filterTerm.toLowerCase())) ||
      (docItem.runningNumber && docItem.runningNumber.toString().includes(filterTerm));

    let matchesDate = true;
    if (filterDate) {
      const d = docItem.receivedAt;
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      matchesDate = ds === filterDate;
    }
    const matchesStatus = filterStatus === 'all' ? true : docItem.status === filterStatus;
    return matchesTerm && matchesDate && matchesStatus;
  });

  const nextRunningNumberDisplay = getNextRunningNumber();

  // ถ้า Config ไม่ถูกต้อง ให้แสดงข้อความเตือน
  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-lg mb-4 inline-block">
            <XCircle size={48} className="text-red-400 mx-auto mb-2" />
            <h2 className="font-bold text-xl text-slate-700 mb-1">ยังไม่ได้ตั้งค่า Firebase</h2>
            <p className="text-sm">กรุณาใส่ API Key ในโค้ดไฟล์ App.jsx เพื่อเริ่มใช้งาน</p>
          </div>
          <p className="text-xs opacity-70">หมายเหตุ: หน้านี้จะทำงานได้เมื่อใส่ Config ถูกต้องแล้วเท่านั้น</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 1cm; size: A4; }
          body { -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .print-table { width: 100%; border-collapse: collapse; font-family: 'Sarabun', sans-serif; }
          .print-table th { background-color: #f1f5f9; font-weight: bold; border: 1px solid #000; padding: 8px; }
          .print-table td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
          .print-header { text-align: center; margin-bottom: 20px; }
          .bg-slate-50 { background-color: white !important; }
        }
        .print-only { display: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>

      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 print:bg-white selection:bg-blue-100 selection:text-blue-900 pb-10">
        {/* Printable Header */}
        <div className="print-only print-header">
          <h1 className="text-xl font-bold">บันทึกรับหนังสือเสนอผู้อำนวยการ</h1>
          <p className="text-sm">ทัณฑสถานวัยหนุ่มกลาง</p>
          <p className="text-sm mt-2">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
        </div>

        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30 no-print">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-100">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 leading-none tracking-tight">
                  ระบบรับหนังสือเสนอ ผอ.
                </h1>
                <p className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">ทัณฑสถานวัยหนุ่มกลาง</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleExportExcel} className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><Download size={16} />Excel</button>
              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
              <button onClick={handlePrint} className="p-2.5 rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"><Printer size={20} /></button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 print:block print:p-0 print-container mt-4">
          
          {/* FORM */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6 no-print">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-white overflow-hidden sticky top-24 ring-1 ring-slate-100">
              <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5"><div className="bg-blue-50 p-1.5 rounded-lg text-blue-600 shadow-sm border border-blue-100"><PenTool size={16} /></div><h2 className="font-bold text-slate-700">ลงรับหนังสือใหม่</h2></div>
                <button type="button" onClick={handleDemoFill} className="text-[10px] bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1.5 transition-all shadow-sm font-medium"><Sparkles size={12} className="text-amber-400" /> Demo</button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="flex items-center justify-center mb-4"><div className="bg-gradient-to-br from-slate-50 to-blue-50/50 px-6 py-4 rounded-xl border border-slate-100 flex flex-col items-center w-full relative overflow-hidden"><div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-400"></div><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">เลขรับถัดไป</span><span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-indigo-600 tabular-nums tracking-tight">{nextRunningNumberDisplay}</span></div></div>
                <div><label className="block text-xs font-bold text-slate-400 mb-3 ml-1">ความเร่งด่วน</label><div className="grid grid-cols-2 gap-3">{URGENCY_LEVELS.map((level) => (<button key={level.id} type="button" onClick={() => setUrgency(level.id)} className={`text-xs py-3 px-2 rounded-xl font-bold transition-all border ${urgency === level.id ? `${level.color} ring-2 ring-offset-2 ring-slate-200 border-transparent shadow-sm` : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{level.label}</button>))}</div></div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-400 ml-1">เรื่อง</label><input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all" placeholder="ระบุชื่อเรื่อง..." /></div>
                <CustomSelect label="หน่วยงานเจ้าของเรื่อง" value={department} options={DEPARTMENTS} onChange={setDepartment} icon={Building2} />
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-400 ml-1">ผู้รับเอกสาร</label><div className="relative group"><input type="text" required value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="w-full pl-11 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all" placeholder="ระบุชื่อผู้รับ..." /><div className="absolute left-3.5 top-3 p-1 bg-slate-100 text-slate-400 rounded-md group-focus-within:bg-blue-100 group-focus-within:text-blue-500 transition-colors"><User size={14} /></div></div>
                {savedReceivers.length > 0 && (<div className="flex flex-wrap gap-2 mt-3 pl-1">{savedReceivers.map((name, i) => (<div key={i} className="inline-flex items-center bg-white border border-slate-200 hover:border-blue-300 rounded-lg px-2.5 py-1 cursor-pointer group/tag"><button type="button" onClick={() => setReceiverName(name)} className="text-[11px] font-semibold text-slate-500 hover:text-blue-600">{name}</button><button type="button" onClick={(e) => {e.stopPropagation(); handleRemoveReceiver(name);}} className="ml-2 text-slate-300 hover:text-red-400 opacity-0 group-hover/tag:opacity-100"><X size={10} /></button></div>))}</div>)}</div>
                <div className="space-y-1.5"><label className="block text-xs font-bold text-slate-400 ml-1">หมายเหตุ</label><div className="relative group"><textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full pl-11 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all min-h-[80px] resize-none" placeholder="..." /><div className="absolute left-3.5 top-3 p-1 bg-slate-100 text-slate-400 rounded-md group-focus-within:bg-amber-100 group-focus-within:text-amber-500 transition-colors"><StickyNote size={14} /></div></div></div>
                <div className="pt-2"><button type="submit" disabled={submitting} className={`w-full py-4 px-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all ${submitting ? 'bg-slate-400' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/40 hover:-translate-y-0.5'}`}>{submitting ? 'กำลังบันทึก...' : <><Save size={18} /> ยืนยันลงรับ</>}</button></div>
              </form>
            </div>
            {showSuccess && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 shadow-sm"><CheckCircle2 size={20} /><p className="font-bold text-sm">สำเร็จ!</p></div>}
            {errorMsg && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3 shadow-sm"><XCircle size={20} /><p className="font-bold text-sm">{errorMsg}</p></div>}
          </div>

          {/* LIST */}
          <div className="lg:col-span-7 xl:col-span-8 print:w-full">
             <div className="flex flex-col gap-5 mb-8 no-print">
               <div className="flex items-center gap-3 text-slate-800"><div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 text-blue-600"><Layers size={24} /></div><div><h2 className="font-bold text-xl text-slate-700">รายการรับวันนี้</h2><p className="text-xs text-slate-400 font-medium mt-0.5">{filteredDocs.length} รายการ</p></div></div>
               <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1 group"><Search size={18} className="absolute left-4 top-3 text-slate-300 group-focus-within:text-blue-500" /><input type="text" placeholder="ค้นหา..." value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" /></div>
                  <div className="relative w-full sm:w-auto min-w-[160px] group"><Calendar size={18} className="absolute left-4 top-3 text-slate-300 pointer-events-none group-focus-within:text-blue-500" /><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50/50 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer" /></div>
                  <div className="w-full sm:w-48"><CustomSelect value={filterStatus} options={[{ value: 'all', label: 'ทุกสถานะ' }, { value: 'pending', label: 'รอเสนอ' }, { value: 'signed', label: 'เซ็นแล้ว' }, { value: 'returned', label: 'คืนเรื่อง' }]} onChange={setFilterStatus} icon={Filter} placeholder="สถานะ" /></div>
               </div>
             </div>

             <div className="print-only">
                <table className="print-table w-full">
                  <thead><tr className="bg-gray-200"><th>เลขรับ</th><th>วัน/เวลา</th><th>ความเร่งด่วน</th><th>เรื่อง</th><th>หน่วยงาน</th><th>หมายเหตุ</th><th>สถานะ</th></tr></thead>
                  <tbody>{filteredDocs.map((docItem) => (<tr key={docItem.id}><td className="text-center font-bold">{docItem.runningNumber}</td><td>{formatDate(docItem.receivedAt)}<br/>{formatTime(docItem.receivedAt)}</td><td>{URGENCY_LEVELS.find(l => l.id === docItem.urgency)?.label}</td><td>{docItem.subject}</td><td>{docItem.department}<br/>({docItem.receiverName})</td><td>{docItem.note || '-'}</td><td>{STATUS_LEVELS[docItem.status]?.label}</td></tr>))}</tbody>
                </table>
             </div>

             <div className="no-print space-y-4">
               {loading ? <div className="flex flex-col items-center justify-center py-20 text-slate-300"><div className="w-12 h-12 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div><p>กำลังโหลด...</p></div> : filteredDocs.length === 0 ? <div className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-200 p-16 text-center"><Search size={32} className="text-slate-300 mx-auto mb-4" /><h3 className="text-slate-600 font-bold">ไม่พบรายการ</h3></div> : (
                 <div className="grid grid-cols-1 gap-4">
                   {filteredDocs.map((docItem) => (
                     <div key={docItem.id} className="bg-white rounded-2xl p-1 pr-5 shadow-sm border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 group relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${docItem.urgency === 'most_urgent' ? 'bg-red-500' : docItem.urgency === 'very_urgent' ? 'bg-orange-500' : docItem.urgency === 'urgent' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                        <div className="flex items-start gap-4 p-4 pl-5">
                            <div className="flex flex-col items-center justify-center min-w-[64px]"><div className="bg-slate-50 text-slate-700 w-16 h-16 rounded-xl flex items-center justify-center border border-slate-200/60 shadow-inner mb-1.5"><span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-700 to-slate-500">{docItem.runningNumber}</span></div><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">เลขรับ</span></div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <div className="flex flex-wrap items-center gap-2 mb-2">{getUrgencyBadge(docItem.urgency)}<span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100"><Clock size={12} /> {formatDate(docItem.receivedAt)} • {formatTime(docItem.receivedAt)} น.</span></div>
                                <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2.5 group-hover:text-blue-700 transition-colors">{docItem.subject}</h3>
                                {docItem.note && (<div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-sm px-3.5 py-2.5 rounded-xl border border-amber-100 mb-3.5"><StickyNote size={16} className="shrink-0 mt-0.5 text-amber-500" /><span><span className="font-bold">หมายเหตุ:</span> {docItem.note}</span></div>)}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3.5 border-t border-slate-50/80">
                                    <div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-sm font-medium text-slate-600"><Building2 size={14} className="text-slate-400" /><span className="truncate">{docItem.department}</span></div><div className="flex items-center gap-2 text-xs text-slate-400 font-medium"><User size={12} /> ผู้รับ: {docItem.receiverName}</div></div>
                                    <div onClick={() => handleStatusToggle(docItem.id, docItem.status)}>{getStatusBadge(docItem.status)}</div>
                                </div>
                            </div>
                        </div>
                        <DeleteButton onDelete={() => handleDelete(docItem.id)} />
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        </main>
      </div>
    </>
  );
}