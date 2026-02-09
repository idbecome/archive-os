import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { db as api } from './services/database';
import { TOTAL_SLOTS, getStatusStyle } from './utils/constants'; // Import constants
import { checkPermission, APP_MODULES } from './utils/permissions';
import { performAdvancedOCR } from './utils/ocr';
import Sidebar from './components/layout/Sidebar';
import Modal from './components/common/Modal';

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
  Upload,            // Icon Upload
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
  Paperclip,
  Menu,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Documents from './pages/Documents';
import TaxMonitoring from './pages/TaxMonitoring';
import TaxSummary from './pages/TaxSummary';
import TaxCalculation from './pages/TaxCalculation';
import MasterData from './pages/MasterData';
import Profile from './pages/Profile';

// --- API URL (Keep for local explicit use if needed, but db uses it internally) ---
const API_URL = 'http://localhost:5000/api';
// The `db` object definition is removed here as it is imported.
// The `// --- DATABASE ADAPTER (LAYER DATA) ---` block is removed.


// Database adapter imported from ./services/database

// Constants imported from ./utils/constants
// Permissions logic imported from ./utils/permissions

// --- COMPONENTS ---

// Modal imported from ./components/common/Modal

// --- MAIN APPLICATION ---

export default function App() {
  // UI State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('archive_theme');
    return saved ? saved === 'dark' : true;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
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
  const invoiceFileInputRef = useRef(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

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

  // --- OCR GLOBAL POLLING ---
  const [ocrStats, setOcrStats] = useState({ counts: { active: 0, waiting: 0, completed: 0, failed: 0 }, activeJobs: [] });
  const lastOcrCompletedRef = useRef(0);

  useEffect(() => {
    if (!currentUser) return;

    const fetchOcrStatus = async () => {
      try {
        const res = await fetch(`/api/ocr/status`);
        if (!res.ok) return;
        const data = await res.json();

        // Check for new completions to trigger auto-refresh
        const newCompleted = data?.counts?.completed || 0;
        if (lastOcrCompletedRef.current > 0 && newCompleted > lastOcrCompletedRef.current) {
          console.log("OCR Job Completed! Refreshing data...");
          fetchInventory(); // Refresh Inventory
          fetchDocs();      // Refresh Documents
          fetchLogs();      // Refresh Logs
        }
        lastOcrCompletedRef.current = newCompleted;
        setOcrStats(data || { counts: { active: 0, waiting: 0, completed: 0, failed: 0 }, activeJobs: [] });
      } catch (err) {
        console.error("Failed to fetch OCR status:", err);
      }
    };

    const interval = setInterval(fetchOcrStatus, 2000); // Poll every 2s
    fetchOcrStatus();

    return () => clearInterval(interval);
  }, [currentUser]); // Dependency on currentUser ensures it runs only when logged in

  // --- DATA INITIALIZATION FROM API ---
  const fetchDocs = async () => {
    const data = await api.getDocs();
    setDocList(data);
  };

  const fetchFolders = async () => {
    const data = await api.getFolders();
    setFolders(data);
  };

  const fetchLogs = async () => {
    const data = await api.getLogs();
    setLogs(data);
  };

  const fetchTaxAudits = async () => {
    const data = await api.getTaxAudits();
    setTaxAudits(data);
  };

  const fetchInventory = async () => {
    try {
      const data = await api.getInventory();
      setInventory(data);
      const extData = await api.getExternalItems();
      setExternalItems(extData);

      const emptyCount = data.filter(s => (s.status || 'EMPTY').toUpperCase() === 'EMPTY').length;
      const borrowedCount = data.filter(s => (s.status || '').toUpperCase() === 'BORROWED').length;
      const auditCount = data.filter(s => (s.status || '').toUpperCase() === 'AUDIT').length;
      const storedCount = data.filter(s => (s.status || '').toUpperCase() === 'STORED').length;
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
        api.getTaxSummaries().then(setTaxSummaries),
        api.getUsers().then(setUsers),
        api.getRoles().then(setRoles),
        api.getDepartments().then(setDepartments)
      ]);
      // Initialize OCR completion count
      try {
        const ocrRes = await fetch(`/api/ocr/status`);
        const ocrData = await ocrRes.json();
        lastOcrCompletedRef.current = ocrData?.counts?.completed || 0;
      } catch (e) { console.warn("Initial OCR status fetch failed", e); }

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
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');
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
  const [newInvoice, setNewInvoice] = useState({ invoiceNo: '', vendor: '', paymentDate: '', file: null, fileName: '', ocrContent: '', isProcessing: false });
  const [expandedOrdnerIds, setExpandedOrdnerIds] = useState([]);

  // --- INITIALIZATION ---



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
    return checkPermission(currentUser, roles, moduleId, action);
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

  const handleUpdateProfile = (updatedUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('archive_user', JSON.stringify(updatedUser));
    // Update users list if needed
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  // --- WAREHOUSE HANDLERS (API INTEGRATED) ---

  const handleSlotClick = (slot) => {
    console.log("Slot Clicked:", slot.id, "Status:", slot.status);
    console.log("Slot BoxData:", JSON.stringify(slot.boxData));

    setSelectedSlotId(slot.id);
    if (slot.status === 'EMPTY') {
      setBoxForm({ boxId: `BOX-${new Date().getFullYear()}-${String(slot.id).padStart(3, '0')}`, ordners: [] });
    } else {
      setBoxForm({ boxId: slot.boxData.id, ordners: slot.boxData.ordners || [] });
    }
    setNewOrdner({ noOrdner: '', period: '' });
    setNewInvoice({ invoiceNo: '', vendor: '', paymentDate: '', file: null, fileName: '', ocrContent: '', isProcessing: false });
    setExpandedOrdnerIds(slot.status !== 'EMPTY' ? slot.boxData.ordners.map(o => o.id) : []);
    setEditingItem(null);
    setShowMoveInput(false);
    setMoveTargetSlot('');

    setShowExternalForm(false);
    setExternalDate('');
    setModalTab('details');
    setIsModalOpen(true);
  };

  // --- SYNC BOX FORM WITH INVENTORY UPDATE (Auto-Refresh OCR) ---
  useEffect(() => {
    if (selectedSlotId && inventory.length > 0) {
      const currentSlot = inventory.find(s => s.id === selectedSlotId);
      if (currentSlot && currentSlot.boxData) {
        // Only update if we are not currently editing to avoid overwriting user input
        // But for OCR status, we mainly need to update the invoice list
        setBoxForm(prev => ({
          ...prev,
          ordners: currentSlot.boxData.ordners || []
        }));
      }
    }
  }, [inventory, selectedSlotId]);

  const addOrdner = () => {
    if (!newOrdner.noOrdner || !newOrdner.period) return;
    if (editingItem && editingItem.type === 'ordner') {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === editingItem.id ? { ...o, noOrdner: newOrdner.noOrdner, period: newOrdner.period } : o) }));
      setEditingItem(null);
    } else {
      const ordId = Date.now();
      setBoxForm(prev => ({ ...prev, ordners: [...prev.ordners, { ...newOrdner, id: ordId, invoices: [] }] }));
      setExpandedOrdnerIds(prev => [...prev, ordId]);
    }
    setNewOrdner({ noOrdner: '', period: '' });
  };

  const editOrdner = (ord) => { setNewOrdner({ noOrdner: ord.noOrdner, period: ord.period }); setEditingItem({ type: 'ordner', id: ord.id }); };
  const removeOrdner = (id) => { if (window.confirm("Hapus ordner?")) setBoxForm(prev => ({ ...prev, ordners: prev.ordners.filter(o => o.id !== id) })); };

  const addInvoice = (ordnerId) => {
    if (!newInvoice.invoiceNo || !newInvoice.vendor) return;

    const invoicePayload = {
      invoiceNo: newInvoice.invoiceNo,
      vendor: newInvoice.vendor,
      paymentDate: newInvoice.paymentDate,
      file: newInvoice.file,
      fileName: newInvoice.fileName,
      ocrContent: newInvoice.ocrContent,
      rawFile: newInvoice.rawFile // Pass raw file
    };

    if (editingItem && editingItem.type === 'invoice') {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === ordnerId ? { ...o, invoices: o.invoices.map(i => i.id === editingItem.id ? { ...i, ...invoicePayload, id: i.id } : i) } : o) }));
      setEditingItem(null);
    } else {
      setBoxForm(prev => ({ ...prev, ordners: prev.ordners.map(o => o.id === ordnerId ? { ...o, invoices: [...o.invoices, { ...invoicePayload, id: Date.now() }] } : o) }));
    }
    setNewInvoice({ invoiceNo: '', vendor: '', paymentDate: '', file: null, fileName: '', ocrContent: '', isProcessing: false, rawFile: null });
  };

  const editInvoice = (inv, ordId) => { setNewInvoice({ invoiceNo: inv.invoiceNo, vendor: inv.vendor, paymentDate: inv.paymentDate || '', file: inv.file || null, fileName: inv.fileName || '', ocrContent: inv.ocrContent || '', isProcessing: false, rawFile: null }); setEditingItem({ type: 'invoice', id: inv.id, parentId: ordId }); };
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
    const currentSlot = inventory.find(s => Number(s.id) === Number(selectedSlotId));
    if (!currentSlot) return;

    // --- BATCH UPLOAD START ---
    let updatedOrdners = [...boxForm.ordners];
    let uploadCount = 0;

    // We need to traverse and upload any invoice that has a rawFile
    // Use for...of loop for async/await
    try {
      for (let oIdx = 0; oIdx < updatedOrdners.length; oIdx++) {
        let ordner = updatedOrdners[oIdx];
        if (ordner.invoices && ordner.invoices.length > 0) {
          let updatedInvoices = [...ordner.invoices];

          for (let iIdx = 0; iIdx < updatedInvoices.length; iIdx++) {
            let inv = updatedInvoices[iIdx];
            if (inv.rawFile) {
              // Show loading state manually if needed, or use a toast
              console.log(`Uploading invoice ${inv.invoiceNo}...`);
              const uploadRes = await api.uploadFile(inv.rawFile);

              if (uploadRes && uploadRes.success) {
                // Update invoice with real URL and remove rawFile to prevent re-upload
                updatedInvoices[iIdx] = {
                  ...inv,
                  file: uploadRes.url,
                  rawFile: undefined // Clear raw file
                };
                uploadCount++;
              } else {
                throw new Error(`Gagal upload invoice ${inv.invoiceNo}`);
              }
            }
          }
          updatedOrdners[oIdx] = { ...ordner, invoices: updatedInvoices };
        }
      }
    } catch (err) {
      console.error("Batch Upload Failed:", err);
      alert("Gagal menyimpan: Error saat upload foto/dokumen. " + err.message);
      return;
    }

    if (uploadCount > 0) {
      console.log(`Berhasil mengupload ${uploadCount} dokumen baru.`);
    }
    // --- BATCH UPLOAD END ---

    const isNew = (currentSlot.status || 'EMPTY').toUpperCase() === 'EMPTY';
    const oldBoxId = currentSlot.boxData?.id;

    let newHistory = isNew
      ? [createHistoryItem('CREATED', `Kardus baru: ${boxForm.boxId}`), createHistoryItem('STORED', `Masuk Slot #${selectedSlotId}`)]
      : [createHistoryItem('UPDATED', oldBoxId !== boxForm.boxId ? `Rename: ${oldBoxId} -> ${boxForm.boxId}` : `Update data ${boxForm.boxId}`)];

    const updatedSlot = {
      ...currentSlot,
      status: (currentSlot.status || 'EMPTY').toUpperCase() === 'EMPTY' ? 'STORED' : currentSlot.status.toUpperCase(),
      lastUpdated: new Date().toISOString(),
      history: [...(currentSlot.history || []), ...newHistory],
      boxData: { id: boxForm.boxId, ordners: updatedOrdners }
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
    setExpandedOrdnerIds(item.boxData?.ordners?.map(o => o.id) || []);
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

  const handleInvoiceFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Remove 10MB limit check as server supports 50MB
    // if (file.size > 10 * 1024 * 1024) { ... }

    // DEFER UPLOAD: Store raw file for upload on "Simpan Data"
    setNewInvoice(prev => ({
      ...prev,
      isProcessing: false,
      fileName: file.name,
      file: null, // Clear old URL if any
      rawFile: file // Store File object
    }));
  };

  const handleViewInvoice = (inv) => {
    setSelectedInvoice(inv);
    setModalTab('invoice-detail');
    setIsModalOpen(true);
  };

  const handleDownloadInvoice = (inv) => {
    console.log("Downloading Invoice:", inv.fileName, "URL:", inv.file);
    if (!inv.file) return alert("Tidak ada file lampiran.");
    try {
      const link = document.createElement('a');
      link.href = inv.file;
      link.download = inv.fileName || `Invoice-${inv.invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert("Gagal download: " + e.message); }
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
      await api.deleteUser(id);
      setUsers(await api.getUsers());
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

    let perms = role.permissions || role.access || {};
    if (typeof perms === 'string') {
      try { perms = JSON.parse(perms); } catch { perms = {}; }
    }

    setRoleForm({ name: role.label || role.name, permissions: perms });
    setModalTab('role-edit');
    setIsModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      const payload = {
        ...roleForm,
        label: roleForm.name,
        access: roleForm.permissions
      };

      if (editingRole) {
        await api.updateRole(editingRole.id, payload);
      } else {
        await api.createRole(payload);
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



  // --- DOC HANDLERS (API INTEGRATED) ---

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      alert("File terlalu besar! Maksimal ukuran file adalah 30MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

    // WARN: Peringatan jika file terlalu besar (> 5MB) untuk mencegah timeout/payload error
    if (file.size > 10 * 1024 * 1024) {
      alert("Peringatan: Ukuran file cukup besar (> 10MB). Pastikan koneksi stabil agar upload berhasil.");
    }

    // Read Base64
    const fileBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });

    setUploadForm(prev => ({
      ...prev,
      title: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize,
      fileData: file,
      fileBase64: fileBase64,
      isProcessing: false, // Don't block yet
      processingMessage: '',
      previewUrl: file.type.includes('image') ? fileBase64 : null,
      ocrContent: ''
    }));
  };

  // NEW: Fungsi Manual untuk menjalankan OCR (Updated for Advanced OCR)
  const handleRunOCR = async () => {
    const file = uploadForm.fileData;
    if (!file) return alert("Harap pilih file terlebih dahulu!");

    setUploadForm(prev => ({ ...prev, isProcessing: true, processingMessage: 'Memulai OCR Canggih...' }));

    let text = "";
    try {
      // Menggunakan Utility OCR Baru yang mendukung PDF (Scan/Digital), Word, Excel, PPTX, Gambar
      text = await performAdvancedOCR(file, (msg, progress) => {
        setUploadForm(prev => ({ ...prev, processingMessage: msg }));
      });
    } catch (err) {
      console.error(err);
      text = "Error ekstraksi: " + err.message;
    }

    setUploadForm(prev => ({ ...prev, ocrContent: text, isProcessing: false, processingMessage: '' }));
  };

  const handleProcessDoc = async () => {
    // 1. Prioritaskan file baru yang diupload (fileBase64)
    // 2. Jika edit dan tidak ada file baru, gunakan file lama
    let fileContent = uploadForm.fileBase64;
    if (!fileContent && uploadForm.editMode && uploadForm.originalDoc) {
      fileContent = uploadForm.originalDoc?.fileData || uploadForm.originalDoc?.file_data;
    }

    // DEBUG: Cek ukuran data sebelum dikirim
    console.log("Persiapan Upload - Ukuran File Base64:", fileContent ? fileContent.length : 0);

    if (fileContent && fileContent.length < 100) {
      if (!window.confirm("PERINGATAN: Data file tampaknya kosong atau sangat kecil. File asli mungkin tidak akan tersimpan. Lanjutkan?")) return;
    }

    if (!fileContent && !uploadForm.editMode) {
      alert("File belum dipilih atau gagal terbaca. Pastikan file PDF/Gambar valid.");
      return;
    }

    // Simplified: Processing is now automatic on select

    const newDoc = {
      // Gunakan ID lama jika edit, atau buat ID baru jika upload baru
      id: uploadForm.editMode ? uploadForm.id : String(Date.now()),
      title: uploadForm.title,
      uploadDate: new Date().toISOString(),
      ocrContent: uploadForm.ocrContent,
      size: uploadForm.fileSize,
      type: uploadForm.fileType,
      previewUrl: uploadForm.previewUrl,
      fileData: fileContent, // Format camelCase (Default)
      file_data: fileContent, // RESTORED: Backend mungkin menggunakan snake_case
      filedata: fileContent, // RESTORED: Backend mungkin menggunakan lowercase (Wajib ada jika backend minta ini)
      uploader: currentUser?.name || 'Admin',
      folderId: currentFolderId,
      version: 1,
      versionsHistory: uploadForm.editMode ? (uploadForm.originalDoc?.versionsHistory || []) : [],
      locked: false
    };

    try {
      setUploadForm(prev => ({ ...prev, isProcessing: true, processingMessage: 'Sedang Mengupload Dokumen...' }));

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
    } catch (e) {
      alert(e.message);
    } finally {
      setUploadForm(prev => ({ ...prev, isProcessing: false, processingMessage: '' }));
    }
  };

  const handleEditDoc = async (e, doc) => {
    e.stopPropagation();

    let fullDoc = doc;
    // CRITICAL FIX: Jika data file kosong (karena optimasi list), ambil full data dari server dulu
    if (!doc.fileData && !doc.file_data && !doc.filedata) {
      try {
        const fetched = await api.getDocumentById(doc.id);
        if (fetched) fullDoc = fetched;
      } catch (err) {
        console.error("Gagal mengambil data lengkap dokumen untuk edit:", err);
      }
    }

    setUploadForm({
      id: fullDoc.id,
      title: fullDoc.title,
      ocrContent: fullDoc.ocrContent,
      fileType: fullDoc.type,
      fileSize: fullDoc.size,
      previewUrl: fullDoc.previewUrl,
      fileBase64: fullDoc.fileData || fullDoc.file_data || fullDoc.filedata,
      isProcessing: false,
      processingMessage: '',
      editMode: true,
      originalDoc: fullDoc
    });
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

  // --- FIXED: HANDLE VIEW DOC ---
  const handleViewDoc = async (doc) => {
    // 0. Handle Special Search Result Types
    if (doc.matchType === 'invoice') {
      handleViewInvoice({ ...(doc.data || doc), boxId: doc.boxId, folderName: doc.folderName, location: doc.folderName });
      return;
    }
    if (doc.matchType === 'external_item') {
      handleViewExternal(doc.data || doc);
      return;
    }
    if (doc.matchType === 'tax_summary') {
      setActiveTab('tax-summary');
      // Potential improvement: pass filter to TaxSummary component
      return;
    }

    // 1. Set data awal (meta data) agar modal muncul cepat
    setViewDocData(doc);
    setModalTab('doc-view');
    setIsModalOpen(true);

    // 2. Cek apakah data file (Base64) kosong? Jika ya, ambil data lengkap dari server
    if (!doc.fileData && !doc.file_data && !doc.filedata) {
      try {
        // Tampilkan status loading kecil (opsional) atau log
        console.log("Mengambil data lengkap dokumen dari server...", doc.id);

        const fullDoc = await api.getDocumentById(doc.id);

        if (fullDoc) {
          // Update state viewDocData dengan data lengkap (termasuk fileData)
          setViewDocData((prev) => ({ ...prev, ...fullDoc }));
        }
      } catch (error) {
        console.error("Gagal memuat detail dokumen:", error);
      }
    }
  };

  // --- HANDLE NAVIGATE TO FOLDER ---
  const handleNavigateToFolder = (folderId) => {
    setActiveTab('documents');
    setCurrentFolderId(folderId);
    // Optional: Add highlighting effect or scroll to folder
    console.log("Navigating to folder:", folderId);
  };

  // --- FIXED: HANDLE DOWNLOAD ---
  const handleDownload = async (doc) => {
    try {
      const element = document.createElement("a");
      let downloadUrl;
      let fileName = doc.title;

      // 1. Cek ketersediaan data file (File Data / Base64) dari parameter doc
      let base64Content = doc.fileData || doc.file_data || doc.filedata || doc.previewUrl;

      // 2. JIKA DATA KOSONG: Coba ambil paksa dari server (Fetch on Demand)
      if (!base64Content || (typeof base64Content === 'string' && base64Content.length < 1)) {
        console.log("Data file lokal kosong, mencoba fetch ulang dari server...", doc.id);
        try {
          const fullDoc = await api.getDocumentById(doc.id);
          if (fullDoc) {
            base64Content = fullDoc.fileData || fullDoc.file_data || fullDoc.filedata || fullDoc.previewUrl;
          }
        } catch (err) {
          console.error("Gagal fetch ulang:", err);
        }
      }

      // 3. Proses Base64 jika data ditemukan
      if (base64Content && typeof base64Content === 'string' && base64Content.length > 0) {
        try {
          // Cek apakah ini URL biasa (bukan base64)
          if (base64Content.startsWith('http') || base64Content.startsWith('blob:')) {
            downloadUrl = base64Content;
            element.target = "_blank";
          } else {
            let mime = doc.type || 'application/octet-stream'; // Default ke Binary Generic

            // Deteksi dan bersihkan prefix Data URI (data:application/pdf;base64,...)
            if (base64Content.includes('base64,')) {
              const parts = base64Content.split('base64,');
              if (parts.length > 1) {
                const header = parts[0];
                const mimeMatch = header.match(/data:(.*);/);
                if (mimeMatch) {
                  mime = mimeMatch[1];
                }
                base64Content = parts[1]; // Ambil isi murni setelah koma
              }
            }

            // Bersihkan spasi/enter yang mungkin ada
            const cleanBase64 = base64Content.replace(/[\n\r\s]/g, '');

            // Konversi Base64 ke Blob
            const binary = atob(cleanBase64);
            const len = binary.length;
            const buffer = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              buffer[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([buffer], { type: mime });
            downloadUrl = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.error("Gagal decode Base64:", err);
          // Jangan return, biarkan lanjut ke fallback URL/OCR
        }
      }

      // 4. Jika Blob gagal, coba URL eksternal (jika ada di masa depan)
      if (!downloadUrl && doc.url) {
        downloadUrl = doc.url;
        if (!doc.fileData) element.target = "_blank";
      }

      // 5. Fallback Terakhir: Jika file asli benar-benar hilang/corrupt
      if (!downloadUrl) {
        // Buat file teks berisi metadata dan pesan error agar user tetap mendapat sesuatu
        const errorMsg = "File asli tidak ditemukan di database (Mungkin file terlalu besar saat upload atau data corrupt).";
        const metaContent = `[METADATA DOKUMEN]\nID: ${doc.id}\nJudul: ${doc.title}\nTipe: ${doc.type}\nUkuran: ${doc.size}\nUpload: ${doc.uploadDate}\n\n[STATUS]\n${errorMsg}\n\n[OCR CONTENT]\n${doc.ocrContent || 'Tidak ada data OCR.'}`;

        const blob = new Blob([metaContent], { type: 'text/plain' });
        downloadUrl = URL.createObjectURL(blob);
        fileName += '_error_log.txt';

        alert(errorMsg + " Mengunduh log error & metadata sebagai gantinya.");
      }

      element.href = downloadUrl;
      element.download = fileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      // Clean up blob URL
      if (downloadUrl && downloadUrl.startsWith('blob:')) {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }

      addLog(currentUser?.name, 'Download', `Mengunduh file: ${doc.title}`);
    } catch (e) {
      console.error("Download error:", e);
      alert("Gagal mengunduh file: " + e.message);
    }
  };

  const handleRestoreVersion = async (docId, versionTimestamp) => {
    if (!window.confirm("Yakin ingin mengembalikan dokumen ke versi ini? Versi saat ini akan disimpan sebagai revisi baru.")) return;
    try {
      await api.restoreDocumentVersion(docId, versionTimestamp);
      fetchDocs();
      // If detail modal is open, we might need to refresh its data
      if (viewDocData && viewDocData.id === docId) {
        const updated = await api.getDocumentById(docId);
        if (updated) setViewDocData(updated);
      }
      alert("Berhasil mengembalikan versi dokumen.");
    } catch (e) {
      alert("Gagal mengembalikan versi: " + e.message);
    }
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

      // Sync to Backend for Searchability
      if (taxForm.id) {
        await api.saveTaxSummary(payload); // saveTaxSummary in database.js calls POST /api/tax-summaries with ID?
        // Wait, database.js saveTaxSummary uses POST /api/tax-summaries. Let's check if it handles PUT.
        // For now, let's assume it handles whatever is passed or we update database.js.
      } else {
        await api.saveTaxSummary(payload);
      }

      setIsModalOpen(false);
    } catch (e) { alert(e.message); }
  };

  const handleTaxImport = (importedData) => {
    setTaxSummaries(prev => {
      const newList = [...prev];
      let addedCount = 0;
      let updatedCount = 0;

      importedData.forEach(newItem => {
        const existingIndex = newList.findIndex(item =>
          item.month === newItem.month &&
          item.year === newItem.year &&
          (item.pembetulan || 0) === (newItem.pembetulan || 0) &&
          (item.type || 'PPH') === (newItem.type || 'PPH')
        );

        if (existingIndex >= 0) {
          newList[existingIndex] = { ...newItem, id: newList[existingIndex].id };
          updatedCount++;
        } else {
          newList.push({ ...newItem, id: String(Date.now() + Math.random()) });
          addedCount++;
        }
      });

      localStorage.setItem('tax_summaries', JSON.stringify(newList));
      addLog(currentUser?.name, 'Import Pajak', `Import ${addedCount} baru, ${updatedCount} update`);
      alert(`Berhasil mengimport ${addedCount + updatedCount} data.`);
      return newList;
    });
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
      await api.deleteFolder(id);
      await fetchFolders();
      await fetchLogs();
      addLog(currentUser?.name, 'Delete Folder', `ID ${id}`);
    }
  };



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


  const handleDeleteTaxRecord = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini secara permanen?")) {
      try {
        await fetch(`http://${window.location.hostname}:5000/api/tax-summaries/${id}`, { method: 'DELETE' });
        const updated = taxSummaries.filter(s => s.id !== id);
        setTaxSummaries(updated);
        localStorage.setItem('tax_summaries', JSON.stringify(updated));
      } catch (e) { alert("Gagal menghapus data dari server: " + e.message); }
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
    <div className="flex h-screen overflow-hidden p-3 gap-3 md:gap-4 md:p-4 selection:bg-indigo-500/30 selection:text-indigo-600 bg-[#F4F7FE] dark:bg-[#0B1437]">

      {/* FLOATING SIDEBAR */}
      <Sidebar
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasPermission={hasPermission}
        currentUser={currentUser}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        handleLogout={handleLogout}
      />

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

      <main className="flex-1 overflow-y-auto relative bg-transparent pt-16 md:pt-0 scroll-smooth z-10">
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {activeTab === 'dashboard' ? 'Dashboard Ikhtisar' :
                  activeTab === 'inventory' ? 'Manajemen Rak' :
                    activeTab === 'documents' ? 'Dokumen Digital' :
                      activeTab === 'tax-monitoring' ? 'Monitoring Pemeriksaan' :
                        activeTab === 'tax-summary' ? 'Kepatuhan Pajak' :
                          activeTab === 'tax-calculation' ? 'Kalkulasi Pajak' :
                            activeTab === 'master' ? 'Master Data' : 'Digital Vault'}
              </h1>
              <p className="text-gray-500 dark:text-slate-400">
                {activeTab === 'dashboard' ? 'Dashboard' :
                  activeTab === 'inventory' ? 'Gudang Arsip Utama • Lantai 1' :
                    activeTab === 'documents' ? 'Secure Digital Storage' :
                      activeTab === 'tax-monitoring' ? 'Sistem Monitoring Pemeriksaan Pajak' :
                        activeTab === 'tax-summary' ? 'Ringkasan Kepatuhan & Pembayaran' :
                          activeTab === 'tax-calculation' ? 'Kalkulasi & Pelaporan Pajak' :
                            activeTab === 'master' ? 'Pengaturan Sistem' : 'Gudang Arsip Utama'}
              </p>
            </div>
          </div>



          <div key={activeTab}>
            {activeTab === 'dashboard' && (
              <Dashboard
                stats={stats}
                docList={docList}
                docStats={docStats}
                logs={logs}
                TOTAL_SLOTS={TOTAL_SLOTS}
                isDarkMode={isDarkMode}
                handleViewDoc={handleViewDoc}
                handleNavigateToFolder={handleNavigateToFolder}
                setActiveTab={setActiveTab}
                setActiveInvTab={setActiveInvTab}
                handleDownload={handleDownload}
                handleDownloadInvoice={handleDownloadInvoice}
                ocrStats={ocrStats}
                taxSummaries={taxSummaries}
                taxAudits={taxAudits}
                users={users}
                departments={departments}
                externalItems={externalItems}
                folders={folders}
              />
            )}
            {activeTab === 'inventory' && (
              <Inventory
                inventory={inventory}
                stats={stats}
                TOTAL_SLOTS={TOTAL_SLOTS}
                getStatusStyle={getStatusStyle}
                handleSlotClick={handleSlotClick}
                handleExcelImport={handleExcelImport}
                downloadTemplate={downloadTemplate}
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
                handleDownload={handleDownload}
              />
            )}
            {activeTab === 'tax-monitoring' && (
              <TaxMonitoring
                taxAudits={taxAudits}
                onRefresh={() => { fetchTaxAudits(); fetchDocs(); fetchFolders(); fetchLogs(); }}
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
                onImport={handleTaxImport}
              />
            )}
            {activeTab === 'tax-calculation' && <TaxCalculation />}
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
            {activeTab === 'profile' && (
              <Profile
                currentUser={currentUser}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </div>

        </div>
      </main>


      {/* MODAL SYSTEM */}
      <Modal
        isOpen={showRestoreForm}
        onClose={() => setShowRestoreForm(false)}
        title="Restore Box"
        size="max-w-md"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase mt-1">
                Kembalikan ke Gudang
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Truck className="text-white" size={24} />
            </div>
          </div>

          {/* Item Summary Card */}
          <div className="bg-white/50 dark:bg-slate-800/50 rounded-2xl p-4 border border-white/40 dark:border-white/5 mb-6 flex gap-4 items-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Package size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-white text-lg">{selectedExternalItem?.boxId}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dari: <span className="font-semibold text-indigo-500">{selectedExternalItem?.destination}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                Pilih Slot Tujuan (Kosong)
              </label>
              <div className="relative">
                <select
                  className="w-full appearance-none bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer hover:bg-white/80 dark:hover:bg-slate-800/80"
                  value={restoreTargetSlot}
                  onChange={(e) => setRestoreTargetSlot(e.target.value)}
                >
                  <option value="">-- Pilih Slot Kosong --</option>
                  {inventory.filter(s => s.status === 'EMPTY').map(s => (
                    <option key={s.id} value={s.id}>Slot #{String(s.id).padStart(3, '0')}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none" size={16} />
              </div>
              {restoreTargetSlot && (
                <p className="text-[10px] text-green-500 font-bold ml-1 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                  <CheckCircle2 size={10} /> Slot tersedia
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowRestoreForm(false)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleRestoreExternal}
                disabled={!restoreTargetSlot}
                className={`
                  flex-[2] px-4 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all
                  ${!restoreTargetSlot
                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-400'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-95'
                  }
                `}
              >
                <ArrowRight size={18} />
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      </Modal>

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
                  <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
                </div>
                <h3 className="text-xl font-bold dark:text-white animate-pulse">Sedang Memproses...</h3>
                <p className="text-sm text-gray-500 mt-2">{uploadForm.processingMessage || 'Mohon tunggu...'}</p>
              </div>
            ) : (
              <>
                <div
                  className={`group relative flex flex-col items-center justify-center border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${uploadForm.fileData ? 'border-2 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}`}
                  onClick={() => fileInputRef.current.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx" />

                  <div className="mb-4 p-4 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors duration-300">
                    <UploadCloud className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors duration-300" size={32} />
                  </div>

                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {uploadForm.title || 'Klik di sini untuk upload file'}
                  </p>
                  {!uploadForm.title && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium uppercase tracking-wider">
                      Semua Jenis File (PDF, Gambar, Office) - Max 30MB
                    </p>
                  )}
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
                  {/* Tombol OCR Manual */}
                  <button
                    onClick={handleRunOCR}
                    disabled={!uploadForm.fileData}
                    className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <FileText size={16} /> Proses OCR
                  </button>
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
                  <span className="flex items-center gap-1"><User size={14} /> {viewDocData.uploader || viewDocData.owner || 'Unknown'}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {viewDocData.uploadDate ? new Date(viewDocData.uploadDate).toLocaleDateString() : '-'}</span>
                  <span className="flex items-center gap-1"><FileJson size={14} /> {viewDocData.size}</span>
                </div>
                <button onClick={() => handleDownload(viewDocData)} className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"><Download size={16} /> Download File</button>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
              <h4 className="font-bold mb-2 dark:text-white flex items-center gap-2"><FileText size={16} /> Isi Dokumen (OCR & Analisis)</h4>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto border border-gray-200 dark:border-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewDocData.ocrContent || 'Tidak ada konten OCR.'}</div>
            </div>

            {/* Version History Section - Safe Render */}
            {(() => {
              let history = [];
              try {
                if (viewDocData.versionsHistory) {
                  history = typeof viewDocData.versionsHistory === 'string'
                    ? JSON.parse(viewDocData.versionsHistory)
                    : viewDocData.versionsHistory;
                }
              } catch (e) { console.error("History parse error", e); }

              if (Array.isArray(history) && history.length > 0) {
                return (
                  <div className="border-t border-gray-200 dark:border-slate-700 pt-4">
                    <h4 className="font-bold mb-3 dark:text-white flex items-center gap-2"><History size={16} /> Riwayat Versi & Revisi</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {history.slice().reverse().map((ver, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                          <div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Versi {new Date(ver.timestamp).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500">Oleh: {ver.user} • {ver.size} • {ver.title}</div>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(viewDocData.id, ver.timestamp)}
                            className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-md font-bold transition-colors"
                          >
                            RESTORE
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

            {/* Header Box ID - Capsule Style */}
            <div className="bg-white/40 dark:bg-slate-900/40 p-5 rounded-[2rem] border border-white/60 dark:border-white/5 shadow-sm mb-8 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-600 shadow-inner">
                  <Package size={24} />
                </div>
                <div className="flex flex-col min-w-[120px]">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5">Status Lokasi</span>
                  <span className="font-black text-slate-800 dark:text-white text-sm whitespace-nowrap">{selectedSlotId ? `INTERNAL SLOT #${selectedSlotId}` : 'EXTERNAL ITEM'}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2"></div>
                <div className="flex-1 relative group/input">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-0.5 block ml-1">Nama Kardus</span>
                  <input
                    type="text"
                    value={boxForm.boxId}
                    onChange={(e) => setBoxForm({ ...boxForm, boxId: e.target.value })}
                    className="text-base font-black text-slate-900 dark:text-white bg-transparent border-0 focus:ring-0 w-full placeholder:text-slate-300 focus:outline-none transition-all p-1"
                    placeholder="KETIK NAMA KARDUS..."
                  />
                </div>
              </div>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-8 backdrop-blur-sm border border-white/20 dark:border-white/5">
              <button
                onClick={() => setModalTab('details')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${modalTab === 'details' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white scale-[1.02] ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
              >
                <Package size={18} /> Detail Isi Kardus
              </button>
              <button
                onClick={() => setModalTab('history')}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${modalTab === 'history' ? 'bg-white dark:bg-slate-700 shadow-xl text-indigo-600 dark:text-white scale-[1.02] ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
              >
                <History size={18} /> Riwayat Mutasi
              </button>
            </div>

            {modalTab === 'details' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
                {/* Input Area - Integrated Row */}
                {hasPermission('inventory', 'edit') && (
                  <div className="flex gap-4 items-end bg-indigo-500/5 dark:bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/10 group/input transition-all hover:bg-indigo-500/[0.08]">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-2 block tracking-[0.2em]">No Ordner</label>
                      <input
                        value={newOrdner.noOrdner}
                        onChange={e => setNewOrdner({ ...newOrdner, noOrdner: e.target.value })}
                        className="w-full px-4 py-3 border-b-2 border-transparent bg-white/50 dark:bg-slate-900/50 rounded-xl focus:border-indigo-500 dark:text-white text-sm font-black transition-all outline-none"
                        placeholder="ORD-001"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 ml-1 mb-2 block tracking-[0.2em]">Periode</label>
                      <input
                        value={newOrdner.period}
                        onChange={e => setNewOrdner({ ...newOrdner, period: e.target.value })}
                        className="w-full px-4 py-3 border-b-2 border-transparent bg-white/50 dark:bg-slate-900/50 rounded-xl focus:border-indigo-500 dark:text-white text-sm font-black transition-all outline-none"
                        placeholder="2024"
                      />
                    </div>
                    <button
                      onClick={addOrdner}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${editingItem?.type === 'ordner' ? 'bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    >
                      {editingItem?.type === 'ordner' ? <Save size={20} /> : <Plus size={20} />}
                    </button>
                  </div>
                )}

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                  {(boxForm.ordners || []).length === 0 && (
                    <div className="text-center py-16 text-slate-300">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="font-black text-sm tracking-widest uppercase opacity-40">Kardus Kosong</p>
                    </div>
                  )}
                  {(boxForm.ordners || []).map(ord => (
                    <div key={ord.id} className={`group transition-all duration-300 rounded-3xl border ${expandedOrdnerIds.includes(ord.id) ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'bg-white/40 dark:bg-slate-800/40 border-white/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-slate-800/60'}`}>
                      <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => setExpandedOrdnerIds(prev => prev.includes(ord.id) ? prev.filter(id => id !== ord.id) : [...prev, ord.id])}>
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${expandedOrdnerIds.includes(ord.id) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40'}`}>
                            {expandedOrdnerIds.includes(ord.id) ? <FolderOpen size={20} /> : <Package size={20} />}
                          </div>
                          <div>
                            <div className="font-black dark:text-white text-base text-slate-800 tracking-tight">{ord.noOrdner}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ord.period}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 mr-2">
                            {hasPermission('inventory', 'edit') && (
                              <button onClick={(e) => { e.stopPropagation(); editOrdner(ord); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 transition-all"><Edit3 size={14} /></button>
                            )}
                            {hasPermission('inventory', 'delete') && (
                              <button onClick={(e) => { e.stopPropagation(); removeOrdner(ord.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 transition-all"><Trash2 size={14} /></button>
                            )}
                          </div>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedOrdnerIds.includes(ord.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <ChevronRight size={22} className={`transition-transform duration-300 ${expandedOrdnerIds.includes(ord.id) ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      </div>

                      {/* Nested Invoice - Minimalist List */}
                      {expandedOrdnerIds.includes(ord.id) && (
                        <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          {hasPermission('inventory', 'edit') && (
                            <div className="flex gap-3 items-center bg-white/50 dark:bg-slate-900/50 p-3 rounded-2xl border border-white/50 dark:border-white/5">
                              <input placeholder="NO INVOICE" value={newInvoice.invoiceNo} onChange={e => setNewInvoice({ ...newInvoice, invoiceNo: e.target.value })} className="flex-1 min-w-[100px] px-3 py-2 text-[10px] border-0 bg-transparent dark:text-white font-black uppercase tracking-wider focus:ring-0" />
                              <input placeholder="VENDOR" value={newInvoice.vendor} onChange={e => setNewInvoice({ ...newInvoice, vendor: e.target.value })} className="flex-1 min-w-[100px] px-3 py-2 text-[10px] border-0 bg-transparent dark:text-white font-black uppercase tracking-wider focus:ring-0" />
                              <input type="date" value={newInvoice.paymentDate} onChange={e => setNewInvoice({ ...newInvoice, paymentDate: e.target.value })} className="w-28 px-3 py-2 text-[10px] border-0 bg-transparent dark:text-white font-black focus:ring-0" />

                              {/* Attachment Button */}
                              <div className="relative">
                                <input type="file" ref={invoiceFileInputRef} className="hidden" onChange={handleInvoiceFileSelect} accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx" />
                                <button onClick={() => invoiceFileInputRef.current.click()} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${newInvoice.file ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title={newInvoice.fileName || "Lampirkan File (OCR Auto)"}>
                                  {newInvoice.isProcessing ? <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /> : <Paperclip size={14} />}
                                </button>
                              </div>

                              <button onClick={() => addInvoice(ord.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 ${editingItem?.type === 'invoice' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                                {editingItem?.type === 'invoice' ? <Save size={14} /> : <Plus size={14} />}
                              </button>
                            </div>
                          )}

                          {/* Manual Refresh Button for OCR */}
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); fetchInventory(); }}
                              className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                            >
                              <RefreshCw size={12} /> Refresh Status OCR
                            </button>
                          </div>

                          <div className="space-y-1">
                            {(ord.invoices || []).map(inv => {
                              const isMatch = inventorySearchQuery && (
                                String(inv.invoiceNo || '').toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
                                String(inv.vendor || '').toLowerCase().includes(inventorySearchQuery.toLowerCase()) ||
                                String(inv.ocrContent || '').toLowerCase().includes(inventorySearchQuery.toLowerCase())
                              );
                              return (
                                <div key={inv.id} className={`group/inv flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-900/50 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5 ${isMatch ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50' : ''}`}>
                                  <div className="flex items-center gap-3">
                                    <FileText size={14} className={`transition-colors ${isMatch ? 'text-yellow-600' : 'text-slate-400 group-hover/inv:text-indigo-500'}`} />
                                    <div className="flex flex-col">
                                      <span className="font-black text-xs text-slate-700 dark:text-white tracking-tight">{inv.invoiceNo ? String(inv.invoiceNo) : '-'}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{inv.vendor ? String(inv.vendor) : ''}</span>
                                        {inv.paymentDate && <span className="text-[10px] font-black text-emerald-600 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-md">{String(inv.paymentDate)}</span>}
                                      </div>
                                      {inv.fileName && (
                                        <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1">
                                          <Paperclip size={10} /> {String(inv.fileName)}
                                          {inv.ocrContent ? (
                                            <span className="text-emerald-500 font-bold text-[8px] border border-emerald-200 dark:border-emerald-800 px-1 rounded ml-1">OCR READY</span>
                                          ) : (
                                            <span className="text-amber-500 font-bold text-[8px] border border-amber-200 dark:border-amber-800 px-1 rounded ml-1 animate-pulse">PROSES OCR...</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover/inv:opacity-100 transition-all">
                                    <button onClick={() => handleViewInvoice(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors" title="Lihat Detail"><Eye size={12} /></button>
                                    {hasPermission('inventory', 'edit') && (
                                      <button onClick={() => editInvoice(inv, ord.id)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={12} /></button>
                                    )}
                                    {hasPermission('inventory', 'delete') && (
                                      <button onClick={() => removeInvoice(ord.id, inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><X size={12} /></button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* FOOTER ACTIONS - Capsule Style */}
                <div className="bg-white/40 dark:bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-sm mt-8 backdrop-blur-sm">
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex gap-4">
                      {selectedSlotId && hasPermission('inventory', 'edit') && (
                        <button
                          onClick={() => setShowMoveInput(!showMoveInput)}
                          className={`px-8 py-4 rounded-2xl text-[10px] font-black flex items-center gap-3 transition-all active:scale-95 ${showMoveInput ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 border border-slate-200 dark:border-white/5 shadow-sm'}`}
                        >
                          <ArrowLeftRight size={18} /> PINDAH SLOT
                        </button>
                      )}
                    </div>

                    {selectedSlotId && hasPermission('inventory', 'edit') && (
                      <button
                        onClick={handleSaveBox}
                        className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-500/20 flex items-center gap-3 text-[10px] font-black transition-all hover:shadow-indigo-500/40 active:scale-95 hover:-translate-y-1"
                      >
                        <Save size={18} /> SIMPAN DATA
                      </button>
                    )}
                  </div>

                  {/* Row 2: Move Input */}
                  {showMoveInput && (
                    <div className="mt-6 flex gap-4 items-center bg-indigo-500/5 dark:bg-indigo-500/10 p-5 rounded-3xl border border-indigo-500/10 animate-in slide-in-from-top-2 duration-300">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ArrowLeftRight size={20} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300 uppercase tracking-widest block mb-1 ml-1">Slot Tujuan</span>
                        <input
                          type="number"
                          placeholder="1-100"
                          value={moveTargetSlot}
                          onChange={(e) => setMoveTargetSlot(e.target.value)}
                          className="w-full bg-transparent border-0 text-lg font-black dark:text-white placeholder:text-slate-300 focus:ring-0 p-0"
                        />
                      </div>
                      <button
                        onClick={handleMoveBox}
                        className="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                      >
                        KONFIRMASI
                      </button>
                    </div>
                  )}

                  {/* Row 3: Status & External Actions - Capsule Style */}
                  {(selectedSlotId || selectedExternalItem) && (selectedSlotId ? (inventory.find(s => s.id == selectedSlotId) || inventory[selectedSlotId - 1])?.status !== 'EMPTY' : true) && (
                    <div className="bg-white/40 dark:bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/60 dark:border-white/5 shadow-sm mt-8 backdrop-blur-sm">
                      <div className="grid grid-cols-2 gap-4">
                        {hasPermission('inventory', 'edit') && (
                          <>
                            {((inventory.find(s => s.id == selectedSlotId) || inventory[selectedSlotId - 1])?.status === 'BORROWED' || (inventory.find(s => s.id == selectedSlotId) || inventory[selectedSlotId - 1])?.status === 'AUDIT') ? (
                              <button onClick={() => handleStatusChange('STORED', 'Dikembalikan User')} className="p-5 border-2 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 group shadow-sm">
                                <CheckCircle2 size={24} className="group-hover:scale-110 transition-transform" /> KEMBALIKAN
                              </button>
                            ) : (
                              <button onClick={() => handleStatusChange('BORROWED', 'Dipinjam User')} className="p-5 border-2 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 group shadow-sm">
                                <Clock size={24} className="group-hover:scale-110 transition-transform" /> SET DIPINJAM
                              </button>
                            )}
                            <button onClick={() => handleStatusChange('AUDIT', 'Sedang Audit')} className="p-5 border-2 border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 group shadow-sm">
                              <AlertCircle size={24} className="group-hover:scale-110 transition-transform" /> SET AUDIT
                            </button>
                            <button onClick={() => {
                              setShowExternalForm(true);
                              setExternalDate(new Date().toISOString().split('T')[0]);
                            }} className="p-5 border-2 border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 group shadow-sm">
                              <Truck size={24} className="group-hover:scale-110 transition-transform" /> KIRIM KE INDOARSIP
                            </button>
                          </>
                        )}
                        {hasPermission('inventory', 'delete') && (
                          <button onClick={handleEmptySlot} className="p-5 border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-600 dark:text-red-400 rounded-3xl text-sm font-black flex items-center justify-center gap-3 transition-all transform active:scale-95 group shadow-sm">
                            <LogOut size={24} className="group-hover:scale-110 transition-transform" /> KOSONGKAN
                          </button>
                        )}
                      </div>
                    </div>
                  )}



                </div>
              </div>
            )}

            {modalTab === 'invoice-detail' && selectedInvoice && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <button onClick={() => setModalTab('details')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                  <ChevronLeft size={14} /> Kembali ke Daftar
                </button>

                <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-white/60 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nomor Invoice</span>
                      <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{selectedInvoice.invoiceNo || '-'}</h3>
                    </div>
                    {selectedInvoice.paymentDate && (
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tanggal Bayar</span>
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black">{String(selectedInvoice.paymentDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vendor</span>
                      <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{selectedInvoice.vendor || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Lokasi File (Kardus / Ordner)</span>
                      <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedInvoice.location || selectedInvoice.folderName || 'Inventory'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Lampiran File</span>
                      {selectedInvoice.fileName ? <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm"><Paperclip size={16} /> {String(selectedInvoice.fileName)}</div> : <span className="text-sm text-slate-400 italic">Tidak ada file</span>}
                    </div>
                  </div>

                  {selectedInvoice.file && <button onClick={() => handleDownloadInvoice(selectedInvoice)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"><Download size={18} /> Download Lampiran PDF/Gambar</button>}
                </div>

                {selectedInvoice.ocrContent && (
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3"><FileText size={16} className="text-indigo-500" /><h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Hasil Scan OCR</h4></div>
                    <div className="p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap">{typeof selectedInvoice.ocrContent === 'object' ? JSON.stringify(selectedInvoice.ocrContent, null, 2) : selectedInvoice.ocrContent}</div>
                  </div>
                )}
              </div>
            )}

            {modalTab === 'history' && (
              <div className="space-y-8 pl-4 py-4 animate-in fade-in duration-500 relative">
                <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-500/50 via-indigo-200/20 to-transparent dark:from-indigo-600/50 dark:via-indigo-900/20"></div>

                {(selectedSlotId ? inventory[selectedSlotId - 1]?.history : selectedExternalItem?.history)?.slice().reverse().map((hist, idx) => (
                  <div key={idx} className="relative pl-12 group">
                    <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white dark:border-slate-800 shadow-xl z-10 transition-all group-hover:scale-125 ring-4 ring-transparent group-hover:ring-indigo-500/10 ${hist.action === 'REMOVED' || hist.action === 'EXTERNAL' ? 'bg-red-500 shadow-red-500/30' :
                      hist.action === 'MOVED' ? 'bg-blue-500 shadow-blue-500/30' :
                        hist.action === 'IMPORTED' ? 'bg-emerald-500 shadow-emerald-500/30' :
                          'bg-indigo-600 shadow-indigo-500/30'
                      }`}></div>
                    <div className="bg-white/40 dark:bg-slate-800/40 p-5 rounded-3xl border border-white/40 dark:border-white/5 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest ${hist.action === 'REMOVED' ? 'bg-red-100 text-red-600' :
                          hist.action === 'MOVED' ? 'bg-blue-100 text-blue-600' :
                            hist.action === 'IMPORTED' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          }`}>
                          {hist.action}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-100/50 dark:bg-slate-900/50 px-3 py-1 rounded-full">
                          <Clock size={10} /> {new Date(hist.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">"{hist.note}"</p>
                      <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5 flex items-center justify-between">
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-300 flex items-center gap-2 font-black bg-indigo-500/10 px-3 py-1 rounded-lg">
                          <User size={12} fill="currentColor" className="opacity-40" /> {hist.user}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {(!selectedSlotId && !selectedExternalItem?.history?.length && (!inventory[selectedSlotId - 1]?.history || inventory[selectedSlotId - 1]?.history.length === 0)) && (
                  <div className="text-center py-20 text-slate-400 italic">
                    <div className="flex justify-center mb-4 opacity-20"><History size={64} /></div>
                    <p className="font-black tracking-widest uppercase text-xs">Belum ada riwayat tercatat.</p>
                  </div>
                )}
              </div>
            )}

            {/* FOOTER ACTIONS removed from common area */}
          </div>
        )
        }


        {/* MASTER DATA MODALS */}
        {
          activeTab === 'master' && (
            <>
              {modalTab === 'user-create' && (
                <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
                      <input
                        value={userForm.username}
                        onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                        className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner placeholder:text-slate-400 font-bold"
                        placeholder="Username untuk login"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner placeholder:text-slate-400"
                        placeholder={userForm.id ? "••••••••" : "Password login"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nama Lengkap</label>
                    <input
                      value={userForm.name}
                      onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                      className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner font-bold"
                      placeholder="Nama lengkap user"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role</label>
                      <div className="relative">
                        <select
                          value={userForm.role}
                          onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner appearance-none font-bold"
                        >
                          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Departemen</label>
                      <div className="relative">
                        <select
                          value={userForm.department}
                          onChange={e => setUserForm({ ...userForm, department: e.target.value })}
                          className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-800/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner appearance-none font-bold"
                        >
                          <option value="">- Pilih Dept -</option>
                          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 border-t border-white/20 dark:border-white/5">
                    <button
                      onClick={handleSaveUser}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5"
                    >
                      Simpan User
                    </button>
                  </div>
                </div>
              )}

              {modalTab === 'dept-form' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white/30 dark:bg-slate-800/30 p-6 rounded-2xl border border-white/20 dark:border-white/5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Nama Departemen</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        value={deptForm.name}
                        onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-0 bg-white/50 dark:bg-slate-900/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner font-black text-lg"
                        placeholder="Contoh: IT Support"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleSaveDept}
                      className="px-10 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5"
                    >
                      Simpan Departemen
                    </button>
                  </div>
                </div>
              )}

              {(modalTab === 'role-create' || modalTab === 'role-edit') && (
                <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-white/30 dark:bg-slate-800/30 p-6 rounded-2xl border border-white/20 dark:border-white/5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Nama Role</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        value={roleForm.name}
                        onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 border-0 bg-white/50 dark:bg-slate-900/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner font-black text-lg"
                        placeholder="Contoh: Manager"
                      />
                    </div>
                  </div>

                  <div className="border border-white/20 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-xl bg-white/20 dark:bg-slate-900/20 backdrop-blur-md">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 dark:bg-slate-800/50">
                          <th className="px-6 py-4 text-left text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Modul</th>
                          <th className="px-4 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">View</th>
                          <th className="px-4 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Create</th>
                          <th className="px-4 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Edit</th>
                          <th className="px-4 py-4 text-center text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 dark:divide-white/5">
                        {Object.values(APP_MODULES).map(mod => (
                          <tr key={mod.id} className="hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-black text-slate-700 dark:text-slate-200">{mod.label}</span>
                            </td>
                            {['view', 'create', 'edit', 'delete'].map(action => (
                              <td key={action} className="text-center py-4">
                                <label className="relative inline-flex items-center cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={roleForm.permissions[mod.id]?.includes(action) || false}
                                    onChange={() => handleTogglePermission(mod.id, action)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleSaveRole}
                      className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5 active:scale-95"
                    >
                      Simpan Role & Izin
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        }

        {/* TAX FORM MODAL */}
        {
          (modalTab === 'tax-form' || modalTab === 'tax-form-pph' || modalTab === 'tax-form-ppn') && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-3 gap-6 bg-white/30 dark:bg-slate-800/30 p-6 rounded-3xl border border-white/20 dark:border-white/5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Bulan</label>
                  <div className="relative">
                    <select
                      value={taxForm.month}
                      onChange={e => setTaxForm({ ...taxForm, month: e.target.value })}
                      className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner appearance-none font-bold"
                    >
                      <option value="">- Pilih Bulan -</option>
                      {["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronRight size={16} className="rotate-90" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tahun</label>
                  <input
                    type="number"
                    value={taxForm.year}
                    onChange={e => setTaxForm({ ...taxForm, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Pembetulan Ke-</label>
                  <input
                    type="number"
                    min="0"
                    value={taxForm.pembetulan || 0}
                    onChange={e => setTaxForm({ ...taxForm, pembetulan: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border-0 bg-white/50 dark:bg-slate-900/50 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-inner font-bold"
                  />
                </div>
              </div>

              {(modalTab === 'tax-form' || modalTab === 'tax-form-pph') && (
                <div className="bg-white/20 dark:bg-slate-900/40 p-6 rounded-[2rem] border border-white/20 dark:border-white/5 shadow-inner">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-3 text-lg">
                      <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><Percent size={18} /></div>
                      PPh (Pajak Penghasilan)
                    </h4>
                    <button type="button" onClick={() => handleAddTaxField('pphTypes')} className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-all border border-indigo-100/50">
                      <Plus size={14} /> TAMBAH FIELD
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {Object.keys(taxForm.data?.pph || {}).map(key => (
                      <div key={key} className="group relative">
                        <div className="flex justify-between items-center mb-1.5 px-1">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{key}</label>
                          <button tabIndex="-1" onClick={() => handleDeleteTaxField('pphTypes', key)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Hapus Field"><Trash2 size={12} /></button>
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
                          className="w-full px-4 py-3.5 border-0 bg-white/60 dark:bg-slate-900/60 rounded-2xl focus:ring-2 focus:ring-indigo-500 dark:text-white shadow-sm font-black text-right pr-6"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(modalTab === 'tax-form' || modalTab === 'tax-form-ppn') && (
                <div className="space-y-8">
                  <div className="bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05] p-6 rounded-[2.5rem] border border-emerald-500/10">
                    <div className="flex justify-between items-center mb-5 px-2">
                      <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-3 text-lg">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500"><ArrowDownRight size={18} /></div>
                        PPN Masukan (Input)
                      </h4>
                      <button type="button" onClick={() => handleAddTaxField('ppnInTypes')} className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-all border border-emerald-100/50">
                        <Plus size={14} /> TAMBAH FIELD
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      {Object.keys(taxForm.data?.ppnIn || {}).map(key => (
                        <div key={key} className="group relative">
                          <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{key}</label>
                            <button tabIndex="-1" onClick={() => handleDeleteTaxField('ppnInTypes', key)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Hapus Field"><Trash2 size={12} /></button>
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
                            className="w-full px-4 py-3.5 border-0 bg-white/60 dark:bg-slate-900/60 rounded-2xl focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm font-black text-right pr-6"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-500/[0.03] dark:bg-amber-500/[0.05] p-6 rounded-[2.5rem] border border-amber-500/10">
                    <div className="flex justify-between items-center mb-5 px-2">
                      <h4 className="font-black text-slate-800 dark:text-white flex items-center gap-3 text-lg">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><ArrowUpRight size={18} /></div>
                        PPN Keluaran (Output)
                      </h4>
                      <button type="button" onClick={() => handleAddTaxField('ppnOutTypes')} className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-all border border-amber-100/50">
                        <Plus size={14} /> TAMBAH FIELD
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      {Object.keys(taxForm.data?.ppnOut || {}).map(key => (
                        <div key={key} className="group relative">
                          <div className="flex justify-between items-center mb-1.5 px-1">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{key}</label>
                            <button tabIndex="-1" onClick={() => handleDeleteTaxField('ppnOutTypes', key)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Hapus Field"><Trash2 size={12} /></button>
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
                            className="w-full px-4 py-3.5 border-0 bg-white/60 dark:bg-slate-900/60 rounded-2xl focus:ring-2 focus:ring-amber-500 dark:text-white shadow-sm font-black text-right pr-6"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-8 border-t border-white/20 dark:border-white/5">
                <button
                  onClick={handleSaveTaxSummary}
                  className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-3"
                >
                  <Save size={20} />
                  SIMPAN DATA PAJAK
                </button>
              </div>
            </div>
          )
        }
      </Modal >

      {/* GLOBAL POPUPS - Root Level */}
      <Modal
        isOpen={showExternalForm}
        onClose={() => setShowExternalForm(false)}
        title="Kirim ke Indoarsip"
        size="max-w-sm"
      >
        <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/30 mx-auto mb-6">
          <Truck size={32} />
        </div>

        <p className="text-xs text-center text-slate-500 mb-8 font-black uppercase tracking-widest opacity-60">Tentukan Tanggal Pengiriman</p>

        <div className="space-y-6">
          <div className="relative group">
            <input
              type="date"
              value={externalDate}
              onChange={(e) => setExternalDate(e.target.value)}
              className="w-full px-6 py-4 text-lg font-black border-2 border-indigo-500/10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl focus:border-indigo-500 transition-all outline-none dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleExternalTransfer('Indoarsip', externalDate)}
              className="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-500/30 transition-all transform active:scale-95 uppercase tracking-widest"
            >
              Konfirmasi Pengiriman
            </button>
            <button
              onClick={() => setShowExternalForm(false)}
              className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-black rounded-2xl transition-all uppercase tracking-widest"
            >
              Batalkan
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
}