import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from './api';
import * as XLSX from 'xlsx';

import {
  Package,
  LayoutDashboard,
  Grid3X3,
  History,
  Search,
  Plus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  X,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  FileDigit,
  Trash2,
  GitCommit,
  User,
  ScanLine,
  FileKey,
  FileStack,
  UploadCloud,
  ShieldCheck,
  FileSearch,
  Eye,
  Edit3,
  FileText,
  Image as ImageIcon,
  Download,
  FileJson,
  PieChart,
  Highlighter,
  LogOut,
  ArrowLeftRight,
  Truck,
  Save,
  HardDrive,
  FileSpreadsheet, // Icon Excel
  Upload,           // Icon Upload
  Users,
  ClipboardCheck,
  Settings,
  Percent,
  FileBarChart,
  Shield,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Menu
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Documents from './pages/Documents';
import TaxMonitoring from './pages/TaxMonitoring';
import TaxSummary from './pages/TaxSummary';
import MasterData from './pages/MasterData';

// --- DATABASE ADAPTER (LAYER DATA) ---
// Saat migrasi ke MySQL/Firebase, Anda HANYA perlu mengubah isi fungsi di dalam objek ini.
// --- DATABASE ADAPTER (LAYER DATA) ---
// Saat migrasi ke MySQL/Firebase, Anda HANYA perlu mengubah isi fungsi di dalam objek ini.
const API_URL = 'http://localhost:5000/api';

const db = {
  async getInventory() {
    try {
      const response = await fetch(`${API_URL}/inventory`);
      if (!response.ok) throw new Error('Gagal mengambil data');
      const data = await response.json();

      // Pastikan format data sesuai (MySQL JSON column sudah jadi object)
      return data.map(slot => ({
        ...slot,
        history: slot.history || [],
        boxData: slot.box_data || slot.boxData // Handle penamaan snake_case dari DB
      }));
    } catch (error) {
      console.error("DB Error (Inventory):", error);
      return [];
    }
  },

  async saveInventory(data) {
    try {
      await fetch(`${API_URL}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal menyimpan inventory", e); }
  },

  async getLogs() {
    try {
      const response = await fetch(`${API_URL}/logs`);
      return await response.json();
    } catch { return []; }
  },

  async saveLogs(data) {
    try {
      // Mengambil log terbaru saja untuk disimpan (asumsi data adalah array logs)
      const latestLog = data[0];
      await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestLog)
      });
    } catch (e) { console.error("Gagal menyimpan logs", e); }
  },

  async getDocs() {
    try {
      const response = await fetch(`${API_URL}/documents`);
      const data = await response.json();
      return data.map(doc => ({
        ...doc,
        versionsHistory: doc.versions_history || []
      }));
    } catch { return []; }
  },

  async saveDocs(data) {
    try {
      await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal menyimpan dokumen", e); }

  },

  async getFolders() {
    try {
      const response = await fetch(`${API_URL}/folders`);
      return await response.json();
    } catch { return []; }
  },

  async createFolder(folder) {
    try {
      await fetch(`${API_URL}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder)
      });
    } catch (e) { console.error("Gagal membuat folder", e); }
  },

  async updateFolder(id, data) {
    try {
      await fetch(`${API_URL}/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal update folder", e); }
  },

  async deleteFolder(id) {
    try {
      await fetch(`${API_URL}/folders/${id}`, { method: 'DELETE' });
    } catch (e) { console.error("Gagal hapus folder", e); }
  },

  async getTaxAudits() {
    try {
      const response = await fetch(`${API_URL}/tax-audits`);
      return await response.json();
    } catch { return []; }
  },
  async getTaxSummaries() {
    return JSON.parse(localStorage.getItem('tax_summaries') || '[]');
  },
  async getUsers() {
    try {
      const response = await fetch(`${API_URL}/users`);
      return await response.json();
    } catch { return []; }
  },
  async getRoles() {
    try {
      const response = await fetch(`${API_URL}/roles`);
      return await response.json();
    } catch { return []; }
  },
  async getDepartments() {
    try {
      const response = await fetch(`${API_URL}/departments`);
      return await response.json();
    } catch { return []; }
  },

  async createUser(data) {
    try {
      await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal membuat user", e); }
  },

  async updateUser(id, data) {
    try {
      await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal update user", e); }
  },

  async deleteUser(id) {
    try {
      await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
    } catch (e) { console.error("Gagal hapus user", e); }
  },

  async createRole(data) {
    try {
      await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal membuat role", e); }
  },

  async updateRole(id, data) {
    try {
      await fetch(`${API_URL}/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal update role", e); }
  },

  async deleteRole(id) {
    try {
      await fetch(`${API_URL}/roles/${id}`, { method: 'DELETE' });
    } catch (e) { console.error("Gagal hapus role", e); }
  },

  async saveTaxSummary(data) {
    try {
      await fetch(`${API_URL}/tax-summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Gagal menyimpan tax summary", e); }
  },

  async createDepartment(name) {
    try {
      await fetch(`${API_URL}/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (e) { console.error("Gagal membuat dept", e); }
  },

  async deleteDepartment(id) {
    try {
      await fetch(`${API_URL}/departments/${id}`, { method: 'DELETE' });
    } catch (e) { console.error("Gagal hapus dept", e); }
  }
};

// --- INITIAL DATA & CONSTANTS ---

const TOTAL_SLOTS = 100;

const getStatusStyle = (status) => {
  switch (status) {
    case 'STORED': return {
      label: 'Tersimpan',
      color: 'bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-500/50 dark:text-emerald-400',
      icon: CheckCircle2
    };
    case 'BORROWED': return {
      label: 'Dipinjam',
      color: 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-500/20 dark:border-amber-500/50 dark:text-amber-400',
      icon: Clock
    };
    case 'AUDIT': return {
      label: 'Sedang Audit',
      color: 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-500/20 dark:border-purple-500/50 dark:text-purple-400',
      icon: AlertCircle
    };
    case 'MOVED': return {
      label: 'Pindah Rak',
      color: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/50 dark:text-blue-400',
      icon: ArrowLeftRight
    };
    case 'EXTERNAL': return {
      label: 'Indoarsip',
      color: 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/50 dark:text-indigo-400',
      icon: Truck
    };
    case 'REMOVED': return {
      label: 'Keluar',
      color: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-400',
      icon: LogOut
    };
    case 'IMPORTED': return {
      label: 'Import Excel',
      color: 'bg-green-100 border-green-300 text-green-700 dark:bg-green-500/20 dark:border-green-500/50 dark:text-green-400',
      icon: FileSpreadsheet
    };
    default: return {
      label: 'Tersedia',
      color: 'bg-slate-100 border-slate-300 text-slate-500 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-500',
      icon: null
    };
  }
};

// --- PERMISSIONS SYSTEM ---
const APP_MODULES = {
  DASHBOARD: { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  INVENTORY: { id: 'inventory', label: 'Rak Gudang', actions: ['view', 'create', 'edit', 'delete'] },
  DOCUMENTS: { id: 'documents', label: 'Dokumen Digital', actions: ['view', 'create', 'edit', 'delete'] },
  TAX_MONITORING: { id: 'tax-monitoring', label: 'Monitoring Pemeriksaan', actions: ['view', 'create', 'edit', 'delete'] },
  TAX_SUMMARY: { id: 'tax-summary', label: 'Tax Summary', actions: ['view', 'create', 'edit', 'delete'] },
  MASTER_DATA: { id: 'master', label: 'Master Data', actions: ['view', 'create', 'edit', 'delete'] }
};

// --- COMPONENTS ---

const Card = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transform hover:-translate-y-1' : ''} ${className}`}
  >
    {children}
  </div>
);

const SummaryCard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <Card className="flex items-center gap-4 relative overflow-hidden">
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={24} />
    </div>
    <div>
      <div className="text-sm text-gray-500 dark:text-slate-400 font-medium">{title}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtext && <div className="text-xs text-gray-400 mt-0.5">{subtext}</div>}
    </div>
  </Card>
);

const Modal = ({ isOpen, onClose, title, children, size = 'max-w-4xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 w-full ${size} max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 transition-colors duration-300`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function App() {
  // UI State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive_theme');
    return saved ? saved === 'dark' : true;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('details');
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalDate, setExternalDate] = useState('');
  const [showRestoreForm, setShowRestoreForm] = useState(false);
  const [restoreTargetSlot, setRestoreTargetSlot] = useState('');
  const [selectedExternalItem, setSelectedExternalItem] = useState(null);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Data State
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);

  const [docList, setDocList] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderHistory, setFolderHistory] = useState([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigateFolder = (folderId) => {
    const newHistory = folderHistory.slice(0, historyIndex + 1);
    newHistory.push(folderId);
    setFolderHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentFolderId(folderId);
  };

  const navigateBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(folderHistory[newIndex]);
    }
  };

  const navigateForward = () => {
    if (historyIndex < folderHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(folderHistory[newIndex]);
    }
  };


  // New Features State
  const [taxAudits, setTaxAudits] = useState([]);
  const [taxSummaries, setTaxSummaries] = useState([]);
  const [activeInvTab, setActiveInvTab] = useState('internal'); // 'internal' | 'external'
  const [externalItems, setExternalItems] = useState([]);

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [masterTab, setMasterTab] = useState('users');
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ name: '', permissions: {} });
  // NEW STATE FOR MASTER DATA
  const [userForm, setUserForm] = useState({ id: null, username: '', password: '', name: '', role: 'staff', department: '' });
  const [deptForm, setDeptForm] = useState({ id: null, name: '' });

  const [showTaxForm, setShowTaxForm] = useState(false);
  const [taxForm, setTaxForm] = useState({
    id: '',
    type: 'PPH',
    month: '',
    year: new Date().getFullYear(),
    pembetulan: 0,
    data: {
      pph: {},
      ppnIn: {},
      ppnOut: {}
    }
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('archive_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [isLoading, setIsLoading] = useState(!!currentUser); // Start loading only if user is logged in
  const [stats, setStats] = useState({ stored: 0, borrowed: 0, audit: 0, empty: 0, occupancy: 0 });


  // --- DATA INITIALIZATION FROM API ---
  const fetchDocs = async () => {
    const data = await db.getDocs();
    setDocList(data);
  };

  const fetchFolders = async () => {
    const data = await db.getFolders();
    setFolders(data);
  };

  const fetchLogs = async () => {
    const data = await db.getLogs();
    setLogs(data);
  };

  const fetchTaxAudits = async () => {
    const data = await db.getTaxAudits();
    setTaxAudits(data);
  };

  const fetchInventory = async () => {
    try {
      const data = await api.getInventory();
      setInventory(data);
      const extData = await api.getExternalItems();
      setExternalItems(extData);

      const emptyCount = data.filter(s => s.status === 'EMPTY').length;
      const borrowedCount = data.filter(s => s.status === 'BORROWED').length;
      const auditCount = data.filter(s => s.status === 'AUDIT').length;
      const storedCount = data.filter(s => s.status === 'STORED').length;
      const occupancyRate = ((TOTAL_SLOTS - emptyCount) / TOTAL_SLOTS) * 100;

      setStats({
        stored: storedCount,
        borrowed: borrowedCount,
        audit: auditCount,
        empty: emptyCount,
        occupancy: occupancyRate
      });
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return; // Only fetch data if logged in

    const initData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchDocs(),
        fetchFolders(),
        fetchLogs(),
        fetchTaxAudits(),
        fetchInventory(),
        db.getTaxSummaries().then(setTaxSummaries),
        db.getUsers().then(setUsers),
        db.getRoles().then(setRoles),
        db.getDepartments().then(setDepartments)
      ]);
      setIsLoading(false);
    };
    initData();
  }, [currentUser]);

  // Theme Effect
  useEffect(() => {
    localStorage.setItem('archive_theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Warehouse Form State
  const [boxForm, setBoxForm] = useState({
    boxId: '',
    ordners: []
  });

  const [editingItem, setEditingItem] = useState(null);
  const [moveTargetSlot, setMoveTargetSlot] = useState('');
  const [showMoveInput, setShowMoveInput] = useState(false);

  // Digital Doc Upload/Edit/View State
  const [uploadForm, setUploadForm] = useState({
    id: '', title: '', ocrContent: '', fileType: '', fileSize: '',
    previewUrl: null, fileData: null, isProcessing: false,
    processingMessage: '', editMode: false, originalDoc: null
  });

  const [viewDocData, setViewDocData] = useState(null);

  // Temp State
  const [newOrdner, setNewOrdner] = useState({ noOrdner: '', period: '' });
  const [newInvoice, setNewInvoice] = useState({ invoiceNo: '', vendor: '', paymentDate: '' });
  const [activeOrdnerId, setActiveOrdnerId] = useState(null);

  // --- INITIALIZATION ---

  useEffect(() => {
    // 1. Load PDF.js
    const loadPdfJs = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.async = true;
        script.onload = () => {
          if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        };
        document.body.appendChild(script);
      }
    };
    loadPdfJs();
  }, []);

  // --- HELPERS ---



  // --- PDF TEXT EXTRACTION ---




  const getSearchSnippet = (text, query) => {
    if (!query) return text.substring(0, 120) + "...";
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    if (index === -1) return text.substring(0, 120) + "...";
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + query.length + 60);
    return "..." + text.substring(start, end) + "...";
  };

  // --- HANDLERS: WAREHOUSE ---

  // --- PERMISSIONS HELPERS ---
  const hasPermission = (moduleId, action = 'view') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Check granular permissions from roles state
    const userRoleData = roles.find(r => r.id === currentUser.role);
    // Note: The database column is 'access', heavily dependent on server/db.js schema.
    // Let's support both 'access' (from DB) and 'permissions' (legacy state?)
    const rolePerms = userRoleData ? (userRoleData.access || userRoleData.permissions) : null;

    if (rolePerms && rolePerms[moduleId]) {
      return rolePerms[moduleId].includes(action);
    }

    // Simple role-based fallback
    if (currentUser.role === 'staff') {
      if (moduleId === 'master') return false;
      if (action === 'delete') return false;
      return true;
    }
    return false;
  };

  // --- HELPERS (RESTORED) ---

  const addLog = async (user, action, details) => {
    try {
      await api.createLog({ user, action, details });
      const updatedLogs = await api.getLogs();
      setLogs(updatedLogs);
    } catch (error) {
      console.error("Failed to add log:", error);
    }
  };

  const createHistoryItem = (action, note) => ({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    action,
    note,
    user: currentUser?.name || 'Admin'
  });

  const docStats = useMemo(() => {
    if (!Array.isArray(docList)) return { totalDocs: 0, totalRevisions: 0, totalSizeMB: '0' };
    const totalDocs = docList.length;
    const totalRevisions = docList.reduce((acc, doc) => acc + (doc.versionsHistory?.length || 0), 0);
    const totalSizeMB = docList.reduce((acc, doc) => acc + parseFloat(doc.size || '0'), 0);
    return { totalDocs, totalRevisions, totalSizeMB: totalSizeMB.toFixed(1) };
  }, [docList]);

  // --- AUTH HANDLERS ---

  const handleLogin = (username, password, onError) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('archive_user', JSON.stringify(user));
      addLog(user.name, 'Login', 'User logged in');
    } else if (username === 'admin' && password === 'admin') {
      const adminUser = { name: 'Administrator', role: 'admin', username: 'admin' };
      setCurrentUser(adminUser);
      localStorage.setItem('archive_user', JSON.stringify(adminUser));
      addLog('Admin', 'Login', 'Admin logged in');
    } else {
      if (onError) onError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('archive_user');
    addLog(currentUser?.name, 'Logout', 'User logged out');
  };

  // --- WAREHOUSE HANDLERS (API INTEGRATED) ---

  const handleSlotClick = (slot) => {
    setSelectedSlotId(slot.id);
    if (slot.status === 'EMPTY') {
      setBoxForm({ boxId: `BOX-${new Date().getFullYear()}-${String(slot.id).padStart(3, '0')}`, ordners: [] });
    } else {
      setBoxForm({ boxId: slot.boxData.id, ordners: slot.boxData.ordners });
    }
    setNewOrdner({ noOrdner: '', period: '' });
    setNewInvoice({ invoiceNo: '', vendor: '' });
    setActiveOrdnerId(null);
    setEditingItem(null);
    setShowMoveInput(false);
    setMoveTargetSlot('');
    setMoveTargetSlot('');
    setShowExternalForm(false);
    setExternalDate('');
    setModalTab('details');
    setIsModalOpen(true);
  };

  const addOrdner = () => {
    if (!newOrdner.noOrdner || !newOrdner.period) return;
    if (editingItem && editingItem.type === 'ordner') {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === editingItem.id ? { ...o, noOrdner: newOrdner.noOrdner, period: newOrdner.period } : o) }));
      setEditingItem(null);
    } else {
      setBoxForm(prev => ({ ...prev, ordners: [...prev.ordners, { ...newOrdner, id: Date.now(), invoices: [] }] }));
    }
    setNewOrdner({ noOrdner: '', period: '' });
  };

  const editOrdner = (ord) => { setNewOrdner({ noOrdner: ord.noOrdner, period: ord.period }); setEditingItem({ type: 'ordner', id: ord.id }); };
  const removeOrdner = (id) => { if (window.confirm("Hapus ordner?")) setBoxForm(prev => ({ ...prev, ordners: prev.ordners.filter(o => o.id !== id) })); };

  const addInvoice = (ordnerId) => {
    if (!newInvoice.invoiceNo || !newInvoice.vendor) return;
    if (editingItem && editingItem.type === 'invoice') {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === ordnerId ? { ...o, invoices: o.invoices.map(i => i.id === editingItem.id ? { ...i, invoiceNo: newInvoice.invoiceNo, vendor: newInvoice.vendor } : i) } : o) }));
      setEditingItem(null);
    } else {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === ordnerId ? { ...o, invoices: [...o.invoices, { ...newInvoice, id: Date.now() }] } : o) }));
    }
    setNewInvoice({ invoiceNo: '', vendor: '' });
  };

  const editInvoice = (inv, ordId) => { setNewInvoice({ invoiceNo: inv.invoiceNo, vendor: inv.vendor, paymentDate: inv.paymentDate || '' }); setEditingItem({ type: 'invoice', id: inv.id, parentId: ordId }); };
  const removeInvoice = (ordnerId, invoiceId) => { if (window.confirm("Hapus invoice?")) setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === ordnerId ? { ...o, invoices: o.invoices.filter(i => i.id !== invoiceId) } : o) })); };

  const handleSaveBox = async () => {
    // Validation: Unique Box ID Check
    const activeDuplicate = inventory.find(slot =>
      slot.boxData?.id === boxForm.boxId && slot.id !== selectedSlotId
    );
    const externalDuplicate = externalItems.find(item => item.boxId === boxForm.boxId);

    if (activeDuplicate) {
      alert(`Box ID "${boxForm.boxId}" sudah ada di Slot #${activeDuplicate.id}. ID Box harus unik.`);
      return;
    }
    if (externalDuplicate) {
      alert(`Box ID "${boxForm.boxId}" sudah ada di Indoarsip/Eksternal. ID Box harus unik.`);
      return;
    }

    if (!selectedSlotId) return;
    const slotIndex = selectedSlotId - 1;
    const currentSlot = inventory[slotIndex];
    if (!currentSlot) return;

    const isNew = currentSlot.status === 'EMPTY';
    const oldBoxId = currentSlot.boxData?.id;

    let newHistory = isNew
      ? [createHistoryItem('CREATED', `Kardus baru: ${boxForm.boxId}`), createHistoryItem('STORED', `Masuk Slot #${selectedSlotId}`)]
      : [createHistoryItem('UPDATED', oldBoxId !== boxForm.boxId ? `Rename: ${oldBoxId} -> ${boxForm.boxId}` : `Update data ${boxForm.boxId}`)];

    const updatedSlot = {
      ...currentSlot,
      status: currentSlot.status === 'EMPTY' ? 'STORED' : currentSlot.status,
      lastUpdated: new Date().toISOString(),
      history: [...(currentSlot.history || []), ...newHistory],
      boxData: { id: boxForm.boxId, ordners: boxForm.ordners }
    };

    try {
      await api.updateInventory(selectedSlotId, updatedSlot);
      const updatedData = await api.getInventory();
      setInventory(updatedData);
      addLog(currentUser?.name || 'Admin', isNew ? 'Masuk Barang' : 'Update Barang', `Kardus ${boxForm.boxId} di Slot #${selectedSlotId}`);
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal menyimpan: " + error.message);
    }
  };

  const handleStatusChange = async (newStatus, label) => {
    const slotIndex = selectedSlotId - 1;
    const currentSlot = inventory[slotIndex];

    const updatedSlot = {
      ...currentSlot,
      status: newStatus,
      lastUpdated: new Date().toISOString(),
      history: [...(currentSlot.history || []), createHistoryItem(newStatus, `Status: ${label}`)]
    };

    try {
      await api.updateInventory(selectedSlotId, updatedSlot);
      const updatedData = await api.getInventory();
      setInventory(updatedData);
      addLog(currentUser?.name || 'Admin', 'Ubah Status', `Slot #${selectedSlotId} status: ${label}`);
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal update status: " + error.message);
    }
  };

  const handleMoveBox = async () => {
    const targetId = parseInt(moveTargetSlot);
    if (!targetId || targetId < 1 || targetId > TOTAL_SLOTS || inventory[targetId - 1].status !== 'EMPTY') { alert("Slot tujuan tidak valid/penuh."); return; }

    const sourceSlot = inventory[selectedSlotId - 1];
    const targetSlot = inventory[targetId - 1];

    const updatedTarget = { ...targetSlot, status: sourceSlot.status, boxData: sourceSlot.boxData, lastUpdated: new Date().toISOString(), history: [...(targetSlot.history || []), createHistoryItem('MOVED', `Pindahan dr Slot #${selectedSlotId}`)] };
    const updatedSource = { ...sourceSlot, status: 'EMPTY', boxData: null, lastUpdated: new Date().toISOString(), history: [...(sourceSlot.history || []), createHistoryItem('MOVED', `Pindah ke Slot #${targetId}`)] };

    try {
      await api.updateInventory(targetId, updatedTarget);
      await api.updateInventory(selectedSlotId, updatedSource);
      const updatedData = await api.getInventory();
      setInventory(updatedData);
      addLog(currentUser?.name || 'Admin', 'Pindah Rak', `Kardus ${sourceSlot.boxData.id} -> Slot ${targetId}`);
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal memindahkan box: " + error.message);
    }
  };

  const handleExternalTransfer = async (destination, date) => {
    if (!window.confirm(`Kirim ke ${destination} pada tanggal ${date}?`)) return;
    const currentSlot = inventory[selectedSlotId - 1];

    try {
      // 1. Save to External Items
      if (currentSlot.boxData) {
        await api.createExternalItem({
          boxId: currentSlot.boxData.id,
          destination: destination,
          sentDate: date ? new Date(date).toISOString() : new Date().toISOString(),
          sender: currentUser?.name || 'Admin',
          boxData: currentSlot.boxData,
          history: currentSlot.history || []
        });
      }

      // 2. Clear Internal Slot
      const updatedSlot = { ...currentSlot, status: 'EMPTY', boxData: null, lastUpdated: new Date().toISOString(), history: [...(currentSlot.history || []), createHistoryItem(destination === 'Indoarsip' ? 'EXTERNAL' : 'REMOVED', `Dikirim ke ${destination} (${date})`)] };

      await api.updateInventory(selectedSlotId, updatedSlot);
      await fetchInventory();
      addLog(currentUser?.name || 'Admin', 'Barang Keluar', `Kardus ke ${destination}`);
      setIsModalOpen(false);
      setShowExternalForm(false);
    } catch (error) {
      alert("Gagal transfer keluar: " + error.message);
    }
  };

  const handleRestoreExternal = async () => {
    if (!restoreTargetSlot) return alert("Pilih slot tujuan!");
    const targetId = parseInt(restoreTargetSlot);
    if (isNaN(targetId) || targetId < 1 || targetId > TOTAL_SLOTS) return alert("Slot tidak valid!");

    const targetSlot = inventory[targetId - 1];
    if (targetSlot.status !== 'EMPTY') return alert(`Slot #${targetId} tidak kosong!`);

    if (!window.confirm(`Kembalikan Box ${selectedExternalItem.boxId} ke Slot #${targetId}?`)) return;

    try {
      // 1. Update Inventory Slot
      const updatedSlot = {
        ...targetSlot,
        status: 'STORED',
        boxData: { ...selectedExternalItem.boxData }, // Restore box data
        lastUpdated: new Date().toISOString(),
        history: [...(selectedExternalItem.history || []), createHistoryItem('RESTORED', `Dikembalikan dari ${selectedExternalItem.destination}`)]
      };

      await api.updateInventory(targetId, updatedSlot);

      // 2. Delete from External
      await api.deleteExternalItem(selectedExternalItem.id);

      await fetchInventory();
      addLog(currentUser?.name || 'Admin', 'Barang Masuk (Restore)', `Restore ${selectedExternalItem.boxId} dari ${selectedExternalItem.destination}`);

      setShowRestoreForm(false);
      setRestoreTargetSlot('');
      setSelectedExternalItem(null);
      setIsModalOpen(false); // Close generic modal if open?
    } catch (error) {
      alert("Gagal restore: " + error.message);
    }
  };

  const handleViewExternal = (item) => {
    setBoxForm({ boxId: item.boxId, ordners: item.boxData?.ordners || [] });
    setSelectedExternalItem(item); // Set this so we can access history
    setModalTab('details');
    setSelectedSlotId(null);
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEmptySlot = async () => {
    if (!window.confirm("Kosongkan slot? Data kardus akan dihapus.")) return;
    const currentSlot = inventory[selectedSlotId - 1];

    const updatedSlot = { ...currentSlot, status: 'EMPTY', boxData: null, lastUpdated: new Date().toISOString(), history: [...(currentSlot.history || []), createHistoryItem('REMOVED', `Dikosongkan manual`)] };

    try {
      await api.updateInventory(selectedSlotId, updatedSlot);
      const updatedData = await api.getInventory();
      setInventory(updatedData);
      addLog(currentUser?.name || 'Admin', 'Kosongkan Slot', `Slot #${selectedSlotId}`);
      setIsModalOpen(false);
    } catch (error) {
      alert("Gagal mengosongkan slot: " + error.message);
    }
  };

  const handlePrintLabel = (boxId) => {
    addLog(currentUser?.name, 'Cetak Label', `Mencetak label untuk Kardus: ${boxId}`);
    alert(`Label untuk ${boxId} telah dikirim ke printer antrean.`);
  };



  const handleTogglePermission = (modId, action) => {
    const currentPerms = roleForm.permissions[modId] || [];
    const newPerms = currentPerms.includes(action)
      ? currentPerms.filter(a => a !== action)
      : [...currentPerms, action];

    setRoleForm({
      ...roleForm,
      permissions: {
        ...roleForm.permissions,
        [modId]: newPerms
      }
    });
  };



  const handleSaveTaxForm = async (e) => {
    e.preventDefault();
    try {
      await api.saveTaxSummary(taxForm);
      setTaxSummaries(await api.getTaxSummaries());
      setShowTaxForm(false);
      addLog(currentUser?.name, 'Update Pajak', `${taxForm.month} ${taxForm.year}`);
    } catch (e) { alert(e.message); }
  };

  // --- MASTER DATA HANDLERS ---





  const [inventorySearchQuery, setInventorySearchQuery] = useState('');

  const handleExcelImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of jsonData) {
          const slotId = parseInt(row['No Slot'] || row['Slot']);
          const boxId = row['No Kardus'] || row['Box ID'];
          const status = row['Status'];
          // New fields support: Tgl Pembayaran for invoices? 
          // Simplified import: checks if slot is invalid or occupied

          if (slotId && slotId <= TOTAL_SLOTS && boxId) {
            const currentSlot = inventory[slotId - 1];

            // VALIDATION: Skip if slot is not EMPTY (and not just updating same box)
            if (currentSlot.status !== 'EMPTY' && currentSlot.boxData?.id !== boxId) {
              console.warn(`Slot ${slotId} is occupied. Skipped.`);
              skippedCount++;
              continue;
            }

            const newStatus = status === 'KOSONG' ? 'EMPTY' : 'IMPORTED';

            // Create box data if not empty
            let boxData = null;
            if (newStatus !== 'EMPTY') {
              const invNo = row['No Invoice'];
              const vendor = row['Vendor'];
              const payDate = row['Tgl Pembayaran'];
              const ordnerNo = row['No Ordner'];
              const period = row['Periode'];

              const newInvoice = invNo ? {
                id: Date.now() + Math.random(),
                invoiceNo: invNo,
                vendor: vendor || '-',
                paymentDate: payDate || ''
              } : null;

              const existingBox = currentSlot.boxData || { id: boxId, ordners: [] };
              let ordners = existingBox.ordners || [];

              // Determine target ordner
              const targetOrdnerName = ordnerNo || 'Imported';
              const targetPeriod = period || 'Imported';

              let targetOrdner = ordners.find(o => o.noOrdner === targetOrdnerName);

              if (!targetOrdner) {
                targetOrdner = {
                  id: Date.now(),
                  noOrdner: targetOrdnerName,
                  period: targetPeriod,
                  invoices: []
                };
                ordners.push(targetOrdner);
              }

              if (newInvoice) {
                // Avoid duplicates
                if (!targetOrdner.invoices) targetOrdner.invoices = [];
                targetOrdner.invoices.push(newInvoice);
              }

              boxData = {
                id: boxId,
                ordners: ordners
              };
            }

            const updatedSlot = {
              ...currentSlot,
              status: 'IMPORTED',
              boxData: boxData,
              lastUpdated: new Date().toISOString(),
              history: [...(currentSlot.history || []), createHistoryItem('IMPORTED', `Import: ${boxId}`)]
            };

            await api.updateInventory(slotId, updatedSlot);
            importedCount++;
          }
        }
        setInventory(await api.getInventory());
        let msg = `Berhasil import ${importedCount} data kardus!`;
        if (skippedCount > 0) msg += `\n${skippedCount} slot dilewati karena sudah terisi.`;
        alert(msg);
        addLog(currentUser?.name, 'Import Excel', `Import ${importedCount}, Skip ${skippedCount}`);
      } catch (error) {
        console.error("Excel import error:", error);
        alert(`Gagal membaca file Excel: ${error.message || error}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportInventory = () => {
    // Flatten data logic
    const exportData = [];
    inventory.forEach(slot => {
      if (slot.status === 'EMPTY') {
        exportData.push({
          "No Slot": slot.id,
          "Status": "KOSONG",
          "No Kardus": "-",
          "No Ordner": "-",
          "No Invoice": "-",
          "Vendor": "-",
          "Tgl Pembayaran": "-"
        });
      } else if (slot.boxData) {
        if (slot.boxData.ordners && slot.boxData.ordners.length > 0) {
          slot.boxData.ordners.forEach(ord => {
            if (ord.invoices && ord.invoices.length > 0) {
              ord.invoices.forEach(inv => {
                exportData.push({
                  "No Slot": slot.id,
                  "Status": slot.status,
                  "No Kardus": slot.boxData.id,
                  "No Ordner": ord.noOrdner,
                  "Periode": ord.period,
                  "No Invoice": inv.invoiceNo,
                  "Vendor": inv.vendor,
                  "Tgl Pembayaran": inv.paymentDate || "-"
                });
              });
            } else {
              exportData.push({
                "No Slot": slot.id,
                "Status": slot.status,
                "No Kardus": slot.boxData.id,
                "No Ordner": ord.noOrdner,
                "Periode": ord.period,
                "No Invoice": "(Kosong)",
                "Vendor": "-",
                "Tgl Pembayaran": "-"
              });
            }
          });
        } else {
          exportData.push({
            "No Slot": slot.id,
            "Status": slot.status,
            "No Kardus": slot.boxData.id,
            "No Ordner": "(Kosong)",
            "No Invoice": "-",
            "Vendor": "-",
            "Tgl Pembayaran": "-"
          });
        }
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Detail");
    XLSX.writeFile(wb, `Laporan_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
    addLog(currentUser?.name, 'Export Excel', 'Download laporan inventory info');
  };

  const downloadTemplate = () => {
    const templateData = [
      { "No Slot": 1, "No Kardus": "BOX-2024-001", "Status": "TERISI", "No Ordner": "ORD-001", "Periode": "Jan 2024", "No Invoice": "INV/001", "Vendor": "Vendor A", "Tgl Pembayaran": "2024-01-31" },
      { "No Slot": 2, "No Kardus": "BOX-2024-002", "Status": "TERISI", "No Ordner": "", "Periode": "", "No Invoice": "", "Vendor": "", "Tgl Pembayaran": "" }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Arsip.xlsx");
  };

  // --- MASTER DATA HANDLERS ---

  const handleCreateUser = () => {
    setUserForm({ id: null, username: '', password: '', name: '', role: 'staff', department: '' });
    setModalTab('user-create');
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setUserForm({ ...user, password: '' }); // Don't show password
    setModalTab('user-create'); // Reuse same form
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (userForm.id) {
        await api.updateUser(userForm.id, userForm);
      } else {
        await api.createUser(userForm);
      }
      setUsers(await api.getUsers());
      setIsModalOpen(false);
      addLog(currentUser?.name, userForm.id ? 'Update User' : 'Create User', userForm.username);
    } catch (e) { alert(e.message); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Hapus user ini?")) return;
    try {
      await db.deleteUser(id);
      setUsers(await db.getUsers());
      addLog(currentUser?.name, 'Delete User', `ID ${id}`);
    } catch (e) { alert(e.message); }
  };

  const handleEditDept = (dept) => {
    setDeptForm({ id: dept.id, name: dept.name });
    setModalTab('dept-form');
    setIsModalOpen(true);
  };

  const handleCreateDept = () => {
    setDeptForm({ id: null, name: '' });
    setModalTab('dept-form');
    setIsModalOpen(true);
  };

  const handleSaveDept = async () => {
    try {
      if (deptForm.id) {
        await api.updateDepartment(deptForm.id, deptForm.name);
      } else {
        await api.createDepartment(deptForm.name);
      }
      setDepartments(await api.getDepartments());
      setIsModalOpen(false);
    } catch (e) { alert(e.message); }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm("Hapus dept?")) return;
    try { await api.deleteDepartment(id); setDepartments(await api.getDepartments()); } catch (e) { alert(e.message); }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', permissions: {} });
    setModalTab('role-create');
    setIsModalOpen(true);
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, permissions: { ...role.permissions } });
    setModalTab('role-edit');
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleForm);
      } else {
        await api.createRole(roleForm);
      }
      setRoles(await api.getRoles());
      setIsModalOpen(false);
      setEditingRole(null);
    } catch (e) { alert(e.message); }
  };

  const handleDeleteRole = async (id) => {
    if (!window.confirm("Hapus role?")) return;
    try { await api.deleteRole(id); setRoles(await api.getRoles()); } catch (e) { alert(e.message); }
  };

  // --- PDF TEXT EXTRACTION (RESTORED) ---
  const extractTextFromPDF = async (file) => {
    if (!window.pdfjsLib) return "Engine OCR PDF sedang dimuat...";
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      let totalChars = 0;

      const metadata = await pdf.getMetadata().catch(e => null);
      fullText += `[ANALISIS DOKUMEN DIGITAL]\nNama File: ${file.name}\n`;
      if (metadata?.info?.Title) fullText += `Judul Meta: ${metadata.info.Title}\n`;
      fullText += `------------------------------------------------\n\n[EKSTRAKSI TEKS ISI]\n`;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        totalChars += pageText.length;
        fullText += `--- Halaman ${i} ---\n${pageText.trim() ? pageText : "(Gambar/Kosong)"}\n\n`;
      }
      const summary = `[RINGKASAN]\nTotal Karakter: ${totalChars}\nStatus OCR: ${totalChars > 50 ? "Berhasil" : "Terbatas"}\n\n`;
      return summary + fullText;
    } catch (e) {
      return "Gagal membaca PDF. File mungkin rusak.";
    }
  };

  // --- DOC HANDLERS (API INTEGRATED) ---

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

    // Read Base64
    const fileBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

    setUploadForm(prev => ({ ...prev, title: file.name, fileType: file.type, fileSize, fileData: file, fileBase64, isProcessing: true, processingMessage: 'Membaca file...', previewUrl: null }));

    setTimeout(async () => {
      let text = "";
      try {
        if (file.type === 'application/pdf') {
          setUploadForm(prev => ({ ...prev, processingMessage: 'OCR PDF...' }));
          text = await extractTextFromPDF(file);
        } else if (file.type.includes('text')) {
          text = await file.text();
        } else text = "[Konten biner]";
      } catch (err) { text = "Error ekstraksi"; }
      setUploadForm(prev => ({ ...prev, ocrContent: text, isProcessing: false, processingMessage: '' }));
      if (file.type.includes('image')) setUploadForm(prev => ({ ...prev, previewUrl: fileBase64 }));
    }, 800);
  };

  const handleProcessDoc = async () => {
    const newDoc = {
      id: String(Date.now()), // Fix for 'id cannot be null'
      title: uploadForm.title,
      uploadDate: new Date().toISOString(),
      ocrContent: uploadForm.ocrContent,
      size: uploadForm.fileSize,
      type: uploadForm.fileType,
      previewUrl: uploadForm.previewUrl,
      fileData: uploadForm.fileBase64, // Send Base64
      uploader: currentUser?.name || 'Admin',
      folderId: currentFolderId,
      version: 1,
      versionsHistory: [],
      locked: false
    };

    try {
      if (uploadForm.editMode && uploadForm.id) {
        await api.updateDocument(uploadForm.id, newDoc);
        addLog(currentUser?.name, 'Revisi Dokumen', `Revisi ${newDoc.title}`);
      } else {
        await api.createDocument(newDoc);
        addLog(currentUser?.name, 'Upload Dokumen', `Dokumen baru ${newDoc.title}`);
      }
      await fetchDocs();
      await fetchLogs();
      setIsModalOpen(false);
    } catch (e) { alert(e.message); }
  };

  const handleEditDoc = (e, doc) => {
    e.stopPropagation();
    setUploadForm({ id: doc.id, title: doc.title, ocrContent: doc.ocrContent, fileType: doc.type, fileSize: doc.size, previewUrl: doc.previewUrl, fileBase64: doc.fileData, isProcessing: false, processingMessage: '', editMode: true, originalDoc: doc });
    setModalTab('upload');
    setIsModalOpen(true);
  };

  const handleDeleteDoc = async (e, docId) => {
    e.stopPropagation();
    if (window.confirm('Hapus dokumen?')) {
      try {
        await api.deleteDocument(docId);
        await fetchDocs();
        await fetchLogs();
        addLog(currentUser?.name, 'Hapus Dokumen', `ID ${docId}`);
      } catch (e) { alert(e.message); }
    }
  };

  const handleViewDoc = (doc) => { setViewDocData(doc); setModalTab('doc-view'); setIsModalOpen(true); };

  const handleDownload = (doc) => {
    const element = document.createElement("a");
    // If fileData (Base64) exists, use it. Else create blob from OCR text.
    element.href = doc.fileData || doc.previewUrl || URL.createObjectURL(new Blob([doc.ocrContent], { type: 'text/plain' }));
    element.download = doc.title;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addLog(currentUser?.name, 'Download', `Mengunduh file: ${doc.title}`);
  };

  const handleSaveTaxSummary = async () => {
    try {
      // 1. Uniqueness Check (Month + Year + Pembetulan + Type)
      const currentType = taxForm.type || 'PPH';
      const duplicate = taxSummaries.find(s =>
        s.month === taxForm.month &&
        s.year === taxForm.year &&
        (s.pembetulan || 0) === (taxForm.pembetulan || 0) &&
        (s.type || 'PPH') === currentType &&
        s.id !== taxForm.id
      );

      if (duplicate) {
        alert(`Data ${currentType} untuk ${taxForm.month} ${taxForm.year} (Pembetulan ${taxForm.pembetulan || 0}) sudah ada.`);
        return;
      }

      // Ensure data structure integrity
      const payload = {
        ...taxForm,
        type: currentType,
        // Fallback for legacy fields if needed by backend
        pph23: taxForm.data?.pph?.['PPh 23'] || 0,
        pph42: taxForm.data?.pph?.['PPh 4(2)'] || 0,
      };

      let updatedList;
      if (taxForm.id) {
        // Edit
        updatedList = taxSummaries.map(s => s.id === taxForm.id ? payload : s);
        addLog(currentUser?.name, 'Update Pajak', `${taxForm.type} - ${taxForm.month} ${taxForm.year}`);
      } else {
        // Create - Ensure ID
        const newRecord = { ...payload, id: Date.now().toString() };
        updatedList = [...taxSummaries, newRecord];
        addLog(currentUser?.name, 'Create Pajak', `${taxForm.type} - ${taxForm.month} ${taxForm.year}`);
      }

      setTaxSummaries(updatedList);
      localStorage.setItem('tax_summaries', JSON.stringify(updatedList));
      setIsModalOpen(false);
    } catch (e) { alert(e.message); }
  };

  const handleCreateFolder = async (folderData) => {
    // folderData = { name, privacy, allowedDepts, allowedUsers }
    if (!folderData || !folderData.name) return;

    try {
      await api.createFolder({
        ...folderData,
        parent_id: currentFolderId,
        owner: currentUser?.name || 'Admin'
      });
      await fetchFolders();
      await fetchLogs();
      addLog(currentUser?.name, 'Create Folder', `Folder: ${folderData.name} (${folderData.privacy})`);
    } catch (e) { alert(e.message); }
  };

  const handleEditFolder = async (e, folder, newData) => {
    // newData = { name, privacy, allowedDepts, allowedUsers }
    if (e) e.stopPropagation();
    if (!newData || !newData.name) return;

    try {
      await api.updateFolder(folder.id, newData);
      setFolders(await api.getFolders());
      addLog(currentUser?.name, 'Update Folder', `${folder.name} -> ${newData.name}`);
    } catch (e) { alert(e.message); }
  };

  const handleRenameDoc = async (e, doc) => {
    e.stopPropagation();
    const newTitle = prompt("Nama File Baru:", doc.title);
    if (newTitle && newTitle !== doc.title) {
      try {
        const updatedDoc = { ...doc, title: newTitle };
        await api.updateDocument(doc.id, updatedDoc);
        await fetchDocs();
        await fetchLogs();
        addLog(currentUser?.name, 'Rename File', `${doc.title} -> ${newTitle}`);
      } catch (err) { alert(err.message); }
    }
  };

  const handleDeleteFolder = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Hapus folder ini beserta isinya?")) {
      await db.deleteFolder(id);
      await fetchFolders();
      await fetchLogs();
      addLog(currentUser?.name, 'Delete Folder', `ID ${id}`);
    }
  };

  // --- IMPROVED RENDER FUNCTIONS ---








  // --- TAX CONFIGURATION STATE ---
  const [taxConfig, setTaxConfig] = useState(() => {
    const saved = localStorage.getItem('tax_config');
    return saved ? JSON.parse(saved) : {
      pphTypes: ['PPh 23', 'PPh 4(2)', 'PPh 21', 'PPh 26', 'PPh Final'],
      ppnInTypes: ['PIB', 'PPN Masukan', 'Dokumen Lain', 'Kelebihan Bayar Bulan Lalu', 'Lain-lain'],
      ppnOutTypes: ['Sales', 'PEB', 'Promotion Material', 'Manual Invoice']
    };
  });

  const saveTaxConfig = (newConfig) => {
    setTaxConfig(newConfig);
    localStorage.setItem('tax_config', JSON.stringify(newConfig));
  };

  const handleAddTaxField = (category) => {
    const name = prompt("Masukkan nama field baru:");
    if (!name) return;

    // Check if exists
    if (taxConfig[category].includes(name)) {
      alert("Field sudah ada!");
      return;
    }

    // Update Config
    const newConfig = {
      ...taxConfig,
      [category]: [...taxConfig[category], name]
    };
    saveTaxConfig(newConfig);

    // Update Current Form Data to include this new field with 0 value
    const categoryKey = category === 'pphTypes' ? 'pph' : category === 'ppnInTypes' ? 'ppnIn' : 'ppnOut';
    setTaxForm(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [categoryKey]: {
          ...prev.data?.[categoryKey],
          [name]: 0
        }
      }
    }));
  };

  const handleDeleteTaxField = (category, name) => {
    if (!window.confirm(`Hapus field "${name}" secara permanen? Data tersimpan di field ini mungkin akan hilang.`)) return;

    // Remove from Config
    const newConfig = {
      ...taxConfig,
      [category]: taxConfig[category].filter(t => t !== name)
    };
    saveTaxConfig(newConfig);

    // Remove from Current Form
    const categoryKey = category === 'pphTypes' ? 'pph' : category === 'ppnInTypes' ? 'ppnIn' : 'ppnOut';
    const newDataIsGroup = { ...taxForm.data[categoryKey] };
    delete newDataIsGroup[name];

    setTaxForm(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [categoryKey]: newDataIsGroup
      }
    }));
  };


  const handleDeleteTaxRecord = (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini secara permanen?")) {
      const updated = taxSummaries.filter(s => s.id !== id);
      setTaxSummaries(updated);
      localStorage.setItem('tax_summaries', JSON.stringify(updated));
    }
  };

  const handleRenameTaxType = (category, oldName) => {
    const newName = prompt("Nama Baru:", oldName);
    if (!newName || newName === oldName) return;
    if (taxConfig[category].includes(newName)) {
      alert("Nama tersebut sudah digunakan.");
      return;
    }

    // 1. Update Config
    const newConfig = {
      ...taxConfig,
      [category]: taxConfig[category].map(t => t === oldName ? newName : t)
    };
    saveTaxConfig(newConfig);

    // 2. Update Current Form Data (if applicable)
    // We need to migrate the value from oldName to newName in the current form state
    const categoryKey = category === 'pphTypes' ? 'pph' : category === 'ppnInTypes' ? 'ppnIn' : 'ppnOut';
    const oldVal = taxForm.data[categoryKey][oldName] || 0;

    // Create new data object for that category
    const categoryData = { ...taxForm.data[categoryKey] };
    delete categoryData[oldName]; // Remove old key
    categoryData[newName] = oldVal; // Add new key with old value

    setTaxForm(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [categoryKey]: categoryData
      }
    }));
  };

  // --- AUTO CALCULATE PREVIOUS MONTH BALANCE ---

  useEffect(() => {
    // Only run if modal is open and we have a valid date
    if (!isModalOpen || !taxForm.month || !taxForm.year) return;

    // Only skip calculation if we are EDITING an existing record (prevents overwriting saved manual adjustments)
    // BUT user asked for "auto enter", so we might want to do it always or be smart.
    // For now, let's do it if the field is empty or 0 to be safe.

    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let prevMonthIndex = months.indexOf(taxForm.month) - 1;
    let prevYear = taxForm.year;

    if (prevMonthIndex < 0) {
      prevMonthIndex = 11;
      prevYear -= 1;
    }
    const prevMonthName = months[prevMonthIndex];

    // Find previous record
    const prevRecord = taxSummaries.find(r => r.month === prevMonthName && r.year === prevYear);

    let overpaymentAmount = 0;

    if (prevRecord) {
      // Calculate PPN In Total
      const totalIn = taxConfig.ppnInTypes.reduce((sum, t) => {
        // Handle both structure versions if needed, but assuming data structure is consistent
        const val = prevRecord.data?.ppnIn?.[t] ?? 0;
        return sum + val;
      }, 0);

      // Calculate PPN Out Total
      const totalOut = taxConfig.ppnOutTypes.reduce((sum, t) => {
        const val = prevRecord.data?.ppnOut?.[t] ?? 0;
        return sum + val;
      }, 0);

      // Net = Out - In
      const net = totalOut - totalIn;

      // If Net is Negative, it means OVERPAYMENT (Lebih Bayar).
      // e.g. Out 100, In 150 -> Net -50. Overpayment = 50.
      if (net < 0) {
        overpaymentAmount = Math.abs(net);
      }
    }

    // Update Form
    // Only update if the value is different to avoid infinite loops, and maybe only if 0?
    // User requirement: "otomatis akan masuk". Let's force update it.
    const currentVal = taxForm.data?.ppnIn?.['Kelebihan Bayar Bulan Lalu'] ?? 0;

    if (currentVal !== overpaymentAmount) {
      setTaxForm(prev => ({
        ...prev,
        data: {
          ...prev.data,
          ppnIn: {
            ...prev.data?.ppnIn,
            'Kelebihan Bayar Bulan Lalu': overpaymentAmount
          }
        }
      }));
    }

  }, [taxForm.month, taxForm.year, isModalOpen, taxSummaries, taxConfig]);




  // --- LOGIN SCREEN ---

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-slate-400 font-medium">Memuat Database...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return (
    <Login
      onLogin={handleLogin}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-transparent text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">
      <div className="flex h-screen overflow-hidden">

        <aside
          className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} 
            bg-white/40 dark:bg-slate-900/60 backdrop-blur-xl border-r border-white/20 dark:border-white/10
            transition-all duration-300 ease-in-out flex flex-col fixed md:relative z-30 h-full shadow-2xl
            ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
          `}
        >
          <div className="p-6 flex items-center justify-between">
            <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <img src="/vite.svg" alt="Logo" className="w-10 h-10 drop-shadow-lg" />
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-slate-400">
                    Archive OS
                  </h1>
                  <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold tracking-widest mt-0.5">ENTERPRISE</p>
                </div>
              )}
            </div>
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden md:block p-1.5 rounded-lg hover:bg-white/30 dark:hover:bg-slate-800/30 text-gray-400 transition-colors">
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'inventory', icon: Grid3X3, label: 'Gudang' },
              { id: 'documents', icon: ScanLine, label: 'Dokumen Digital' },
              { id: 'tax-monitoring', icon: ClipboardCheck, label: 'Pemeriksaan' },
              { id: 'tax-summary', icon: FileBarChart, label: 'Tax Summary' },
              { id: 'master', icon: Settings, label: 'Master Data' },
            ].filter(item => {
              if (item.id === 'master') return hasPermission('master', 'view');
              return true;
            }).map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 768) setIsSidebarCollapsed(true);
                }}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group
                  ${activeTab === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 font-bold'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'stroke-[2.5px]' : ''} />
                {!isSidebarCollapsed && <span className="whitespace-nowrap tracking-wide text-sm">{item.label}</span>}

                {isSidebarCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none uppercase tracking-tighter shadow-xl">
                    {item.label}
                  </div>
                )}
              </button>
            ))}
          </nav>
          <div className="p-4 mx-4 mb-6 rounded-2xl bg-white/20 dark:bg-slate-800/20 border border-white/20 dark:border-white/5 backdrop-blur-sm">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-2.5 rounded-xl text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors`}>
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              {!isSidebarCollapsed && <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </button>
            <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'} gap-3 p-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors mt-1`}>
              <LogOut size={20} />
              {!isSidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </aside>

        {/* MOBILE OVERLAY */}
        {!isSidebarCollapsed && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 md:hidden animate-in fade-in duration-300"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* MOBILE HEADER */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/20 dark:border-white/10 flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-2">
            <img src="/vite.svg" alt="Logo" className="w-8 h-8" />
            <span className="font-bold text-lg dark:text-white tracking-tight">Archive OS</span>
          </div>
          <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 text-gray-500 dark:text-white">
            <Menu size={24} />
          </button>
        </div>

        <main className="flex-1 overflow-y-auto relative bg-transparent pt-16 md:pt-0 scroll-smooth">
          <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {activeTab === 'dashboard' ? 'Dashboard Ikhtisar' :
                    activeTab === 'inventory' ? 'Manajemen Slot' :
                      activeTab === 'documents' ? 'Dokumen Digital' :
                        activeTab === 'tax-monitoring' ? 'Monitoring Pemeriksaan' :
                          activeTab === 'tax-summary' ? 'Kepatuhan Pajak' :
                            activeTab === 'master' ? 'Master Data' : 'Digital Vault'}
                </h1>
                <p className="text-gray-500 dark:text-slate-400">
                  {activeTab === 'dashboard' ? 'Gudang Arsip Utama • Lantai 1' :
                    activeTab === 'inventory' ? 'Gudang Arsip Utama • Lantai 1' :
                      activeTab === 'documents' ? 'Secure Digital Storage' :
                        activeTab === 'tax-monitoring' ? 'Sistem Monitoring Pemeriksaan Pajak' :
                          activeTab === 'tax-summary' ? 'Ringkasan Kepatuhan & Pembayaran' :
                            activeTab === 'master' ? 'Pengaturan Sistem' : 'Gudang Arsip Utama'}
                </p>
              </div>
            </div>



            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                docList={docList}
                docStats={docStats}
                logs={logs}
                TOTAL_SLOTS={TOTAL_SLOTS}
                isDarkMode={isDarkMode}
                handleViewDoc={handleViewDoc}
              />
            )}
            {activeTab === 'inventory' && (
              <Inventory
                inventory={inventory}
                stats={stats}
                TOTAL_SLOTS={TOTAL_SLOTS}
                getStatusStyle={getStatusStyle}
                handleSlotClick={handleSlotClick}
                handleExcelImport={handleExcelImport} // Note: handleExcelImport might need to be created if it was inline or missing? wait, checking
                downloadTemplate={downloadTemplate} // check if exists
                excelInputRef={excelInputRef}
                handleExportInventory={handleExportInventory}
                inventorySearchQuery={inventorySearchQuery}
                setInventorySearchQuery={setInventorySearchQuery}
                hasPermission={hasPermission}
                activeInvTab={activeInvTab}
                setActiveInvTab={setActiveInvTab}
                externalItems={externalItems}
                onRestoreExternal={(item) => {
                  setSelectedExternalItem(item);
                  setRestoreTargetSlot(''); // Reset selection
                  setShowRestoreForm(true);
                }}
                onViewExternal={handleViewExternal}
              />
            )}
            {activeTab === 'documents' && (
              <Documents
                docList={docList}
                folders={folders}
                currentFolderId={currentFolderId}
                setCurrentFolderId={setCurrentFolderId}
                folderHistory={folderHistory}
                historyIndex={historyIndex}
                navigateFolder={navigateFolder}
                navigateBack={navigateBack}
                navigateForward={navigateForward}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleCreateFolder={handleCreateFolder}
                handleDeleteFolder={handleDeleteFolder}
                // handleRenameFolder removed, replaced by handleEditFolder passed below
                // handleRenameFolder={handleRenameFolder} 
                handleViewDoc={handleViewDoc}
                handleEditDoc={handleEditDoc}
                handleDeleteDoc={handleDeleteDoc}
                handleRenameDoc={handleRenameDoc}
                setUploadForm={setUploadForm}
                setModalTab={setModalTab}
                setIsModalOpen={setIsModalOpen}
                hasPermission={hasPermission}
                docStats={docStats}
                getSearchSnippet={getSearchSnippet}
                logs={logs}
                onRefresh={() => { fetchDocs(); fetchFolders(); fetchLogs(); }}
                users={users}
                departments={departments}
                currentUser={currentUser}
                handleEditFolder={handleEditFolder}
              />
            )}
            {activeTab === 'tax-monitoring' && (
              <TaxMonitoring
                taxAudits={taxAudits}
                onRefresh={fetchTaxAudits}
                hasPermission={hasPermission}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'tax-summary' && (
              <TaxSummary
                taxSummaries={taxSummaries}
                hasPermission={hasPermission}
                setTaxForm={setTaxForm}
                setModalTab={setModalTab}
                setIsModalOpen={setIsModalOpen}
                config={taxConfig}
                saveConfig={saveTaxConfig}
                handleDeleteRecord={handleDeleteTaxRecord}
                handleRenameTaxType={handleRenameTaxType}
              />
            )}
            {activeTab === 'master' && (
              <MasterData
                masterTab={masterTab}
                setMasterTab={setMasterTab}
                users={users}
                roles={roles}
                departments={departments}
                userSearchQuery={userSearchQuery}
                setUserSearchQuery={setUserSearchQuery}
                handleDeleteUser={handleDeleteUser}
                handleCreateUser={handleCreateUser}
                handleEditUser={handleEditUser}
                handleEditRole={handleEditRole}
                handleDeleteRole={handleDeleteRole}
                handleCreateRole={handleCreateRole}
                handleCreateDept={handleCreateDept}
                handleEditDept={handleEditDept}
                handleDeleteDept={handleDeleteDept}
                setIsModalOpen={setIsModalOpen}
                setModalTab={setModalTab}
                setRoles={setRoles}
                setDepartments={setDepartments}
                hasPermission={hasPermission}
              />
            )}

          </div>
        </main>
      </div>

      {/* MODAL SYSTEM */}
      {/* Restore Modal Overlay - Moved to Top Level */}
      {showRestoreForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl p-6 rounded-3xl shadow-3xl w-full max-w-sm border border-white/40 dark:border-white/10 ring-1 ring-black/5">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Kembalikan ke Gudang Internal</h3>
            <p className="text-sm text-gray-500 mb-4">Pilih slot kosong untuk menyimpan kembali Box <b>{selectedExternalItem?.boxId}</b>:</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Pilih Slot Kosong:</label>
                <select
                  className="w-full border rounded p-2 dark:bg-slate-800 dark:text-white text-sm"
                  value={restoreTargetSlot}
                  onChange={(e) => setRestoreTargetSlot(e.target.value)}
                >
                  <option value="">-- Pilih Slot --</option>
                  {inventory.filter(s => s.status === 'EMPTY').map(s => (
                    <option key={s.id} value={s.id}>Slot #{s.id}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowRestoreForm(false)} className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded text-sm">Batal</button>
                <button
                  onClick={handleRestoreExternal}
                  disabled={!restoreTargetSlot}
                  className={`px-3 py-2 text-white rounded text-sm ${!restoreTargetSlot ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  Konfirmasi Masuk Gudang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          activeTab === 'master'
            ? (modalTab === 'user-create' ? 'Manajemen User'
              : modalTab === 'role-create' || modalTab === 'role-edit' ? 'Manajemen Role'
                : modalTab === 'dept-form' ? 'Manajemen Departemen'
                  : 'Master Data')
            : modalTab === 'tax-form' ? 'Input Data Pajak'
              : modalTab === 'tax-form-pph' ? 'Input Data PPh'
                : modalTab === 'tax-form-ppn' ? 'Input Data PPN'
                  : activeTab === 'documents'
                    ? (modalTab === 'upload' ? 'Upload Dokumen' : 'Detail Dokumen')
                    : selectedSlotId ? `Slot #${selectedSlotId}` : `Detail Box Eksternal: ${boxForm?.boxId || ''}`
        }
      >
        {activeTab === 'documents' && modalTab === 'upload' && (
          <div className="space-y-6">
            {uploadForm.isProcessing ? (
              <div className="text-center py-12">
                <div className="relative mx-auto mb-4 w-16 h-16">
                  <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
                </div>
                <h3 className="text-xl font-bold dark:text-white animate-pulse">Sedang Memproses...</h3>
                <p className="text-sm text-gray-500 mt-2">{uploadForm.processingMessage || 'Mohon tunggu...'}</p>
              </div>
            ) : (
              <>
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${uploadForm.fileData ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-300 dark:border-slate-700'}`}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                  <UploadCloud className="mx-auto text-blue-500 mb-2" size={48} />
                  <p className="text-sm dark:text-white">{uploadForm.title || 'Klik untuk pilih file'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Judul Dokumen</label>
                  <input
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={handleProcessDoc} className="px-6 py-2 bg-blue-600 text-white rounded-lg">{uploadForm.editMode ? 'Simpan Revisi' : 'Upload Baru'}</button>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'documents' && modalTab === 'doc-view' && viewDocData && (
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                {viewDocData.type.includes('pdf') ? <FileDigit size={40} className="text-red-500" /> : <ImageIcon size={40} />}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold dark:text-white">{viewDocData.title}</h3>
                <div className="flex gap-4 text-sm text-gray-500 mt-2">
                  <span className="flex items-center gap-1"><User size={14} /> {viewDocData.uploader}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {new Date(viewDocData.uploadDate).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><FileJson size={14} /> {viewDocData.size}</span>
                </div>
                <button onClick={() => handleDownload(viewDocData)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"><Download size={16} /> Download File</button>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <h4 className="font-bold mb-2 dark:text-white flex items-center gap-2"><ScanLine size={16} /> Isi Dokumen (OCR & Analisis)</h4>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewDocData.ocrContent}</div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Package size={16} /> {selectedSlotId ? `Slot #${selectedSlotId}` : 'External Item'}
                <ChevronRight size={14} />
                <input
                  type="text"
                  value={boxForm.boxId}
                  onChange={(e) => setBoxForm({ ...boxForm, boxId: e.target.value })}
                  className="font-bold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-slate-700 focus:outline-none focus:border-indigo-500 w-full"
                  placeholder="Ketik Nama Kardus..."
                />
              </div>

              <div className="flex border-b border-gray-200 dark:border-slate-800 mb-4">
                <button onClick={() => setModalTab('details')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${modalTab === 'details' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500'}`}>Isi Kardus</button>
                <button onClick={() => setModalTab('history')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${modalTab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500'}`}>Riwayat Mutasi (Flow Trail)</button>
              </div>

              {modalTab === 'details' && (
                <div className="space-y-4">
                  {/* Input Area - Changes based on edit mode */}
                  {hasPermission('inventory', 'edit') && (
                    <div className="flex gap-2 items-end bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 ml-1">No Ordner</label>
                        <input value={newOrdner.noOrdner} onChange={e => setNewOrdner({ ...newOrdner, noOrdner: e.target.value })} className="w-full px-3 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="Contoh: ORD-01" />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 ml-1">Periode</label>
                        <input value={newOrdner.period} onChange={e => setNewOrdner({ ...newOrdner, period: e.target.value })} className="w-full px-3 py-1.5 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm" placeholder="Tahun" />
                      </div>
                      <button onClick={addOrdner} className={`p-2 rounded text-white ${editingItem?.type === 'ordner' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                        {editingItem?.type === 'ordner' ? <Save size={18} /> : <Plus size={18} />}
                      </button>
                    </div>
                  )}

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {boxForm.ordners.map(ord => (
                      <div key={ord.id} className="border border-gray-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800/50">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setActiveOrdnerId(activeOrdnerId === ord.id ? null : ord.id)}>
                          <div className="flex items-center gap-2">
                            <FolderOpen size={18} className="text-amber-500" />
                            <div>
                              <span className="font-bold dark:text-white text-sm">{ord.noOrdner}</span>
                              <span className="text-xs bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-gray-500 ml-2">{ord.period}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {hasPermission('inventory', 'edit') && (
                              <button onClick={(e) => { e.stopPropagation(); editOrdner(ord); }} className="p-1 hover:text-blue-500 text-gray-400"><Edit3 size={14} /></button>
                            )}
                            {hasPermission('inventory', 'delete') && (
                              <button onClick={(e) => { e.stopPropagation(); removeOrdner(ord.id); }} className="p-1 hover:text-red-500 text-gray-400"><Trash2 size={14} /></button>
                            )}
                            <ChevronRight size={16} className={`transform transition-transform ${activeOrdnerId === ord.id ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        {/* Nested Invoice */}
                        {activeOrdnerId === ord.id && (
                          <div className="mt-3 pl-3 border-l-2 border-indigo-200 dark:border-slate-700 space-y-2 animate-in slide-in-from-top-1">
                            {hasPermission('inventory', 'edit') && (
                              <>
                                <div className="flex gap-2 items-center mb-2 flex-wrap">
                                  <input placeholder="No Invoice" value={newInvoice.invoiceNo} onChange={e => setNewInvoice({ ...newInvoice, invoiceNo: e.target.value })} className="flex-1 min-w-[100px] px-2 py-1 text-xs border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                  <input placeholder="Vendor" value={newInvoice.vendor} onChange={e => setNewInvoice({ ...newInvoice, vendor: e.target.value })} className="flex-1 min-w-[100px] px-2 py-1 text-xs border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                  <input type="date" value={newInvoice.paymentDate} onChange={e => setNewInvoice({ ...newInvoice, paymentDate: e.target.value })} className="w-24 px-2 py-1 text-xs border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" title="Tgl Pembayaran" />
                                  <button onClick={() => addInvoice(ord.id)} className={`px-2 py-1 rounded text-white text-xs ${editingItem?.type === 'invoice' ? 'bg-amber-500' : 'bg-emerald-600'}`}>
                                    {editingItem?.type === 'invoice' ? 'Save' : 'Add'}
                                  </button>
                                </div>
                              </>
                            )}
                            {ord.invoices.map(inv => (
                              <div key={inv.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 p-1 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded">
                                <div className="flex items-center gap-2">
                                  <FileText size={12} />
                                  <span className="font-mono font-medium">{inv.invoiceNo}</span>
                                  <span className="text-gray-300">|</span>
                                  <span>{inv.vendor}</span>
                                  {inv.paymentDate && <span className="text-gray-400">({inv.paymentDate})</span>}
                                </div>
                                <div className="flex gap-1">
                                  {hasPermission('inventory', 'edit') && (
                                    <button onClick={() => editInvoice(inv, ord.id)} className="text-gray-400 hover:text-blue-500"><Edit3 size={12} /></button>
                                  )}
                                  {hasPermission('inventory', 'delete') && (
                                    <button onClick={() => removeInvoice(ord.id, inv.id)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalTab === 'history' && (
                <div className="space-y-4 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900 ml-2">
                  {(selectedSlotId ? inventory[selectedSlotId - 1]?.history : selectedExternalItem?.history)?.slice().reverse().map((hist, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${hist.action === 'REMOVED' || hist.action === 'EXTERNAL' ? 'bg-red-500' : hist.action === 'MOVED' ? 'bg-blue-500' : hist.action === 'IMPORTED' ? 'bg-green-500' : 'bg-indigo-600'}`}></div>
                      <div className="text-sm">
                        <span className={`font-bold ${hist.action === 'REMOVED' ? 'text-red-500' : hist.action === 'MOVED' ? 'text-blue-500' : hist.action === 'IMPORTED' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>{hist.action}</span>
                        <span className="text-xs text-gray-500 ml-2">{new Date(hist.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{hist.note}</p>
                      <div className="text-xs text-indigo-500 mt-1 flex items-center gap-1"><User size={10} /> {hist.user}</div>
                    </div>
                  ))}
                  {(!selectedSlotId && !selectedExternalItem?.history?.length && (!inventory[selectedSlotId - 1]?.history || inventory[selectedSlotId - 1]?.history.length === 0)) && <p className="text-gray-500 italic">Belum ada riwayat.</p>}
                </div>
              )}
            </div>

            {/* FOOTER ACTIONS */}
            <div className="pt-4 border-t border-gray-200 dark:border-slate-800 space-y-3">
              {/* Row 1: Save & Primary Actions */}
              <div className="flex justify-end gap-2">
                {selectedSlotId && hasPermission('inventory', 'edit') && (
                  <button onClick={() => setShowMoveInput(!showMoveInput)} className="px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-sm font-medium flex items-center gap-2">
                    <ArrowLeftRight size={16} /> Pindah Slot
                  </button>
                )}
                <button onClick={() => handlePrintLabel(boxForm.boxId)} className="px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg text-sm font-medium flex items-center gap-2">
                  <Printer size={16} /> Cetak Label
                </button>
                {selectedSlotId && hasPermission('inventory', 'edit') && (
                  <button onClick={handleSaveBox} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2">
                    <CheckCircle2 size={16} /> Simpan Data
                  </button>
                )}
              </div>

              {/* Row 2: Move Input (Conditional) */}
              {showMoveInput && (
                <div className="flex gap-2 items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg animate-in slide-in-from-top-1">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Pindah ke Slot:</span>
                  <input
                    type="number"
                    placeholder="No. Slot (1-100)"
                    value={moveTargetSlot}
                    onChange={(e) => setMoveTargetSlot(e.target.value)}
                    className="w-32 px-2 py-1 text-sm border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                  <button onClick={handleMoveBox} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Konfirmasi Pindah</button>
                </div>
              )}

              {/* Row 3: Status & External Actions (Only if stored or borrowed) */}
              {selectedSlotId && inventory[selectedSlotId - 1]?.status !== 'EMPTY' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200 dark:border-slate-800">
                  {hasPermission('inventory', 'edit') && (
                    <>
                      {(inventory[selectedSlotId - 1]?.status === 'BORROWED' || inventory[selectedSlotId - 1]?.status === 'AUDIT') ? (
                        <button onClick={() => handleStatusChange('STORED', 'Dikembalikan User')} className="p-2 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 rounded text-xs flex items-center justify-center gap-1">
                          <CheckCircle2 size={14} /> Kembalikan (Return)
                        </button>
                      ) : (
                        <button onClick={() => handleStatusChange('BORROWED', 'Dipinjam User')} className="p-2 border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 rounded text-xs flex items-center justify-center gap-1">
                          <Clock size={14} /> Set Dipinjam
                        </button>
                      )}
                      <button onClick={() => handleStatusChange('AUDIT', 'Sedang Audit')} className="p-2 border border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-400 rounded text-xs flex items-center justify-center gap-1">
                        <AlertCircle size={14} /> Set Audit
                      </button>
                      <button onClick={() => {
                        setShowExternalForm(true);
                        setExternalDate(new Date().toISOString().split('T')[0]);
                      }} className="p-2 border border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-400 rounded text-xs flex items-center justify-center gap-1">
                        <Truck size={14} /> Kirim ke Indoarsip
                      </button>
                    </>
                  )}
                  {hasPermission('inventory', 'delete') && (
                    <button onClick={handleEmptySlot} className="p-2 border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 rounded text-xs flex items-center justify-center gap-1">
                      <LogOut size={14} /> Hapus / Kosongkan
                    </button>
                  )}
                </div>
              )}

              {/* Date Picker for External Transfer */}
              {showExternalForm && (
                <div className="flex gap-2 items-center bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg animate-in slide-in-from-top-1">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Tanggal Kirim:</span>
                  <input
                    type="date"
                    value={externalDate}
                    onChange={(e) => setExternalDate(e.target.value)}
                    className="text-sm px-2 py-1 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                  />
                  <button
                    onClick={() => handleExternalTransfer('Indoarsip', externalDate)}
                    className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                  >
                    Kirim
                  </button>
                  <button
                    onClick={() => setShowExternalForm(false)}
                    className="px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-slate-400 text-xs"
                  >
                    Batal
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MASTER DATA MODALS */}
        {activeTab === 'master' && (
          <>
            {modalTab === 'user-create' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-white">Username</label>
                  <input
                    value={userForm.username}
                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Username untuk login"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-white">Password</label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder={userForm.id ? "Kosongkan jika tidak ingin mengubah" : "Password login"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-white">Nama Lengkap</label>
                  <input
                    value={userForm.name}
                    onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Role</label>
                    <select
                      value={userForm.role}
                      onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-white">Departemen</label>
                    <select
                      value={userForm.department}
                      onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    >
                      <option value="">- Pilih Dept -</option>
                      {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={handleSaveUser} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan User</button>
                </div>
              </div>
            )}

            {modalTab === 'dept-form' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-white">Nama Departemen</label>
                  <input
                    value={deptForm.name}
                    onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    placeholder="Contoh: Finance"
                  />
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={handleSaveDept} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan Departemen</button>
                </div>
              </div>
            )}

            {(modalTab === 'role-create' || modalTab === 'role-edit') && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-white">Nama Role</label>
                  <input
                    value={roleForm.name}
                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2 text-left dark:text-white">Modul</th>
                        <th className="px-4 py-2 text-center dark:text-white">View</th>
                        <th className="px-4 py-2 text-center dark:text-white">Create</th>
                        <th className="px-4 py-2 text-center dark:text-white">Edit</th>
                        <th className="px-4 py-2 text-center dark:text-white">Delete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {Object.values(APP_MODULES).map(mod => (
                        <tr key={mod.id} className="dark:bg-slate-900">
                          <td className="px-4 py-3 font-medium dark:text-white">{mod.label}</td>
                          {['view', 'create', 'edit', 'delete'].map(action => (
                            <td key={action} className="text-center">
                              <input
                                type="checkbox"
                                checked={roleForm.permissions[mod.id]?.includes(action) || false}
                                onChange={() => handleTogglePermission(mod.id, action)}
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={handleSaveRole} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan Role</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAX FORM MODAL */}
        {(modalTab === 'tax-form' || modalTab === 'tax-form-pph' || modalTab === 'tax-form-ppn') && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">Bulan</label>
                <select
                  value={taxForm.month}
                  onChange={e => setTaxForm({ ...taxForm, month: e.target.value })}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                >
                  <option value="">- Pilih Bulan -</option>
                  {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">Tahun</label>
                <input
                  type="number"
                  value={taxForm.year}
                  onChange={e => setTaxForm({ ...taxForm, year: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-white">Pembetulan Ke-</label>
                <input
                  type="number"
                  min="0"
                  value={taxForm.pembetulan || 0}
                  onChange={e => setTaxForm({ ...taxForm, pembetulan: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
            </div>

            {(modalTab === 'tax-form' || modalTab === 'tax-form-pph') && (
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold dark:text-white flex items-center gap-2"><Percent size={16} className="text-indigo-500" /> PPh (Pajak Penghasilan)</h4>
                  <button type="button" onClick={() => handleAddTaxField('pphTypes')} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                    <Plus size={12} /> Tambah Field
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(taxForm.data?.pph || {}).map(key => (
                    <div key={key}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{key}</label>
                        <button tabIndex="-1" onClick={() => handleDeleteTaxField('pphTypes', key)} className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus Field"><Trash2 size={10} /></button>
                      </div>
                      <input
                        type="text"
                        value={taxForm.data?.pph?.[key] ? taxForm.data.pph[key].toLocaleString('id-ID') : ''}
                        onChange={e => {
                          const val = e.target.value.replace(/[^\d]/g, '');
                          setTaxForm({
                            ...taxForm,
                            data: {
                              ...taxForm.data,
                              pph: { ...taxForm.data.pph, [key]: val ? parseInt(val, 10) : 0 }
                            }
                          })
                        }}
                        className="w-full p-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(modalTab === 'tax-form' || modalTab === 'tax-form-ppn') && (
              <>
                <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold dark:text-white flex items-center gap-2"><ArrowDownRight size={16} className="text-emerald-500" /> PPN Masukan (Input)</h4>
                    <button type="button" onClick={() => handleAddTaxField('ppnInTypes')} className="text-xs flex items-center gap-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-medium px-2 py-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                      <Plus size={12} /> Tambah Field
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(taxForm.data?.ppnIn || {}).map(key => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{key}</label>
                          <button tabIndex="-1" onClick={() => handleDeleteTaxField('ppnInTypes', key)} className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus Field"><Trash2 size={10} /></button>
                        </div>
                        <input
                          type="text"
                          value={taxForm.data?.ppnIn?.[key] ? taxForm.data.ppnIn[key].toLocaleString('id-ID') : ''}
                          onChange={e => {
                            const val = e.target.value.replace(/[^\d]/g, '');
                            setTaxForm({
                              ...taxForm,
                              data: {
                                ...taxForm.data,
                                ppnIn: { ...taxForm.data.ppnIn, [key]: val ? parseInt(val, 10) : 0 }
                              }
                            })
                          }}
                          className="w-full p-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold dark:text-white flex items-center gap-2"><ArrowUpRight size={16} className="text-amber-500" /> PPN Keluaran (Output)</h4>
                    <button type="button" onClick={() => handleAddTaxField('ppnOutTypes')} className="text-xs flex items-center gap-1 text-amber-600 hover:text-amber-800 dark:text-amber-400 font-medium px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                      <Plus size={12} /> Tambah Field
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.keys(taxForm.data?.ppnOut || {}).map(key => (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{key}</label>
                          <button tabIndex="-1" onClick={() => handleDeleteTaxField('ppnOutTypes', key)} className="text-gray-300 hover:text-red-500 transition-colors" title="Hapus Field"><Trash2 size={10} /></button>
                        </div>
                        <input
                          type="text"
                          value={taxForm.data?.ppnOut?.[key] ? taxForm.data.ppnOut[key].toLocaleString('id-ID') : ''}
                          onChange={e => {
                            const val = e.target.value.replace(/[^\d]/g, '');
                            setTaxForm({
                              ...taxForm,
                              data: {
                                ...taxForm.data,
                                ppnOut: { ...taxForm.data.ppnOut, [key]: val ? parseInt(val, 10) : 0 }
                              }
                            })
                          }}
                          className="w-full p-2 border rounded-lg text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end pt-6">
              <button onClick={handleSaveTaxSummary} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20">Simpan Data Pajak</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}