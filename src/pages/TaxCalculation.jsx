import React, { useState, useEffect, useRef } from 'react';
import { Calculator, User, FileText, Building2, CreditCard, Database, Save, Trash2, Search, Upload, Download, Sparkles, TrendingUp, AlertCircle, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import TaxCalculator from '../components/tax/TaxCalculator';

export default function TaxCalculation({ onCopy, hasPermission }) {
    const [activeTab, setActiveTab] = useState('simulation'); // 'simulation', 'object', 'database'
    const [savedData, setSavedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcData, setCalcData] = useState({ dpp: 0, rate: 0, pph: 0, ppn: 0, totalPayable: 0, discount: 0, dppNet: 0, markupMode: 'none', isPph21BukanPegawai: false, usePpn: true });
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 15;
    const [editingId, setEditingId] = useState(null);
    const [showObjectDropdown, setShowObjectDropdown] = useState(false);
    const [masterData, setMasterData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const masterFileInputRef = useRef(null);

    const canEdit = hasPermission ? hasPermission('tax-calculation', 'edit') : true;
    const canCreate = hasPermission ? hasPermission('tax-calculation', 'create') : true;
    const canDelete = hasPermission ? hasPermission('tax-calculation', 'delete') : true;
    const isReadOnly = !canEdit && !canCreate;

    // Form State for "Objek Pajak"
    const [formData, setFormData] = useState({
        idType: 'NPWP',
        identityNumber: '',
        name: '',
        email: '',
        taxType: '23',
        taxObjectCode: '',
        taxObjectName: '',
        markupMode: 'none',
        isPph21BukanPegawai: false,
        usePpn: true
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            let sanitizedValue = value;
            if (name === 'identityNumber') {
                sanitizedValue = value.replace(/\D/g, '').slice(0, 16);
            }
            const newData = { ...prev, [name]: sanitizedValue };

            // Automation for PPh 21
            if (name === 'taxType' || (name === 'idType' && value === 'KTP' && newData.taxType === '23')) {
                if (name === 'idType' && value === 'KTP' && newData.taxType === '23') {
                    newData.taxType = '21';
                }
                const isPph21 = newData.taxType === '21';
                newData.isPph21BukanPegawai = isPph21;
                newData.usePpn = !isPph21;

                // Also update calculation data to stay in sync
                setCalcData(c => ({ ...c, isPph21BukanPegawai: isPph21, usePpn: !isPph21 }));
            }

            return newData;
        });
    };

    const fetchDatabase = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/tax-objects`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setSavedData(data);
            } else {
                console.error("Fetch tax-objects returned non-array:", data);
                setSavedData([]);
            }
        } catch (error) {
            console.error("Failed to fetch tax objects:", error);
            setSavedData([]);
        }
    };

    const fetchMasterData = async () => {
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/master-tax-objects`);
            const data = await res.json();
            if (Array.isArray(data)) {
                setMasterData(data);
            } else {
                console.error("Fetch master-tax-objects returned non-array:", data);
                setMasterData([]);
            }
        } catch (error) {
            console.error("Failed to fetch master tax objects:", error);
            setMasterData([]);
        }
    };

    useEffect(() => {
        if (activeTab === 'database') {
            fetchDatabase();
        }
        // Fetch master data once on mount or when switching to object/database
        if (activeTab === 'object' || activeTab === 'database') {
            if (masterData.length === 0) fetchMasterData();
        }
    }, [activeTab]);

    // Reset ke halaman 1 saat mencari atau pindah tab
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeTab]);

    // --- DATABASE WP HANDLERS ---
    const handleDownloadDatabaseTemplate = () => {
        window.open(`http://${window.location.hostname}:5000/api/tax-objects/template`, '_blank');
    };

    const handleExportDatabase = () => {
        window.open(`http://${window.location.hostname}:5000/api/tax-objects/export`, '_blank');
    };

    const handleImportDatabase = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsImporting(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/tax-objects/import`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (res.ok) {
                alert(result.message);
                fetchDatabase();
            } else {
                alert('Gagal import: ' + result.error);
            }
        } catch (error) {
            console.error("Import error:", error);
            alert('Terjadi kesalahan saat upload.');
        } finally {
            setIsImporting(false);
            e.target.value = null; // Reset input
        }
    };

    // --- MASTER DATA HANDLERS (Objek Pajak) ---
    const handleDownloadMasterTemplate = () => {
        window.open(`http://${window.location.hostname}:5000/api/master-tax-objects/template`, '_blank');
    };

    const handleImportMaster = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsImporting(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/master-tax-objects/import`, {
                method: 'POST',
                body: formData
            });
            const result = await res.json();
            if (res.ok) {
                alert(result.message);
                fetchMasterData();
            } else {
                alert('Gagal import: ' + result.error);
            }
        } catch (error) {
            console.error("Import error:", error);
            alert('Terjadi kesalahan saat upload.');
        } finally {
            setIsImporting(false);
            e.target.value = null; // Reset input
        }
    };

    const handleSave = async () => {
        if (!formData.identityNumber || !formData.name) {
            alert('Nomor Identitas dan Nama Wajib Pajak wajib diisi!');
            return;
        }

        if (formData.identityNumber.length !== 16) {
            alert('Nomor Identitas (NPWP/NIK) harus berjumlah 16 digit angka!');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                dpp: calcData.dpp,
                rate: calcData.rate,
                pph: calcData.pph,
                ppn: calcData.ppn,
                totalPayable: calcData.totalPayable,
                discount: calcData.discount,
                dppNet: calcData.dppNet,
                markup_mode: calcData.markupMode,
                is_pph21_bukan_pegawai: calcData.isPph21BukanPegawai ? 1 : 0,
                use_ppn: calcData.usePpn ? 1 : 0,
                email: formData.email
            };

            const url = editingId
                ? `http://${window.location.hostname}:5000/api/tax-objects/${editingId}`
                : `http://${window.location.hostname}:5000/api/tax-objects`;

            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`Data berhasil ${editingId ? 'diperbarui' : 'disimpan'} ke Database WP!`);
                setEditingId(null);
                setFormData({
                    idType: 'NPWP',
                    identityNumber: '',
                    name: '',
                    email: '',
                    taxType: '23',
                    taxObjectCode: '',
                    taxObjectName: '',
                    isPph21BukanPegawai: false,
                    usePpn: true
                });
                setCalcData({ dpp: 0, rate: 0, pph: 0, ppn: 0, totalPayable: 0, discount: 0, dppNet: 0, markupMode: 'none', isPph21BukanPegawai: false, usePpn: true });
                setActiveTab('database');
            } else {
                alert('Gagal menyimpan data.');
            }
        } catch (error) {
            console.error("Error saving data:", error);
            alert('Terjadi kesalahan saat menyimpan data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            idType: item.id_type,
            identityNumber: item.identity_number,
            name: item.name,
            email: item.email || '',
            taxType: item.tax_type,
            taxObjectCode: item.tax_object_code,
            taxObjectName: item.tax_object_name,
            markupMode: item.markup_mode || 'none',
            isPph21BukanPegawai: !!item.is_pph21_bukan_pegawai,
            usePpn: item.use_ppn !== undefined ? !!item.use_ppn : true
        });
        setCalcData({
            dpp: item.dpp,
            rate: item.rate,
            pph: item.pph,
            ppn: item.ppn || (!!item.use_ppn ? (((11 / 12) * (item.dpp - (item.discount || 0))) * 0.12) : 0),
            discount: item.discount || 0,
            dppNet: !!item.use_ppn ? ((11 / 12) * (item.dpp - (item.discount || 0))) : 0,
            markupMode: item.markup_mode || 'none',
            isPph21BukanPegawai: !!item.is_pph21_bukan_pegawai,
            usePpn: item.use_ppn !== undefined ? !!item.use_ppn : true,
            totalPayable: item.total_payable || item.totalPayable ||
                Math.ceil((item.dpp - (item.discount || 0)) +
                    (item.ppn || (!!item.use_ppn ? (((11 / 12) * (item.dpp - (item.discount || 0))) * 0.12) : 0)) -
                    item.pph)
        });
        setActiveTab('object');
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('PERINGATAN: Anda akan menghapus SELURUH data di Database WP. Tindakan ini tidak dapat dibatalkan. Lanjutkan?')) return;
        if (!canDelete) return alert('Anda tidak memiliki izin untuk menghapus data.');

        setIsLoading(true);
        try {
            const res = await fetch(`http://${window.location.hostname}:5000/api/tax-objects-all`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert('Seluruh data Database WP berhasil dihapus.');
                fetchDatabase();
            } else {
                alert('Gagal menghapus data.');
            }
        } catch (error) {
            console.error("Delete all error:", error);
            alert('Terjadi kesalahan saat menghapus data.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus data ini?')) return;
        if (!canDelete) return alert('Anda tidak memiliki izin untuk menghapus data.');
        try {
            await fetch(`http://${window.location.hostname}:5000/api/tax-objects/${id}`, { method: 'DELETE' });
            fetchDatabase();
        } catch (error) {
            console.error("Error deleting data:", error);
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const filteredData = savedData.filter(item =>
        (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.identity_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tax_object_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tax_object_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Logika Paginasi
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const getSmartInsight = () => {
        // 1. Konteks Pencarian
        if (searchTerm) {
            return {
                text: `Analisis Pencarian: Menampilkan ${filteredData.length} hasil untuk "${searchTerm}". AI memindai nama WP, nomor identitas, dan nama objek pajak.`,
                icon: <Search className="text-indigo-500" size={20} />,
                color: "border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-200"
            };
        }

        // 2. Analisis Master Data
        if (masterData.length === 0) {
            return {
                text: `Data Master Kosong: Gunakan fitur 'Import Master' untuk memuat daftar kode objek pajak resmi agar pengisian data lebih cepat dan akurat.`,
                icon: <AlertCircle className="text-amber-500" size={20} />,
                color: "border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-200"
            };
        }

        // 3. Analisis Kalkulasi Aktif
        if (calcData.pph > 0) {
            return {
                text: `Kalkulasi Terdeteksi: Anda memiliki perhitungan PPh senilai ${formatCurrency(calcData.pph)}. Gunakan tab 'Objek Pajak' untuk menyimpan data ini ke database.`,
                icon: <TrendingUp className="text-emerald-500" size={20} />,
                color: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-200"
            };
        }

        // 4. Analisis Kapasitas Database
        if (savedData.length > 50) {
            return {
                text: `Optimasi Database: Terdapat ${savedData.length} record Wajib Pajak. Gunakan fitur 'Export Excel' secara berkala untuk backup data offline.`,
                icon: <Database className="text-blue-500" size={20} />,
                color: "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-200"
            };
        }

        // 5. Default Tips
        const tips = [
            "Tips Efisiensi: Anda dapat mencari objek pajak berdasarkan kode (misal: 21-100-01) atau nama deskripsi.",
            "Info AI: Sistem otomatis mendeteksi tarif pajak yang berlaku berdasarkan kode objek yang Anda pilih.",
            "Saran: Pastikan nomor NPWP/NIK valid untuk menghindari kesalahan pelaporan pada sistem e-Bupot.",
            "Sistem Optimal: Database WP tersinkronisasi secara real-time dengan modul pelaporan pajak."
        ];
        return {
            text: tips[new Date().getHours() % tips.length],
            icon: <Sparkles className="text-indigo-500" size={20} />,
            color: "border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-800 dark:text-indigo-200"
        };
    };

    const insight = getSmartInsight();

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calculator className="text-indigo-600" />
                    Tax Calculation
                </h2>

                {/* Tabs */}
                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
                    {[
                        { id: 'simulation', label: 'Simulasi PPh', icon: Calculator },
                        { id: 'object', label: 'Objek Pajak', icon: FileText },
                        { id: 'database', label: 'Database WP', icon: Database },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI SMART INSIGHT BANNER */}
            <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-4 animate-in slide-in-from-top-4 duration-700 ${insight.color}`}>
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm shrink-0">
                    {insight.icon}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Smart Assistant</span>
                        <div className="w-1 h-1 rounded-full bg-current opacity-40"></div>
                        <span className="text-[10px] font-bold opacity-60">Tax Intelligence</span>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">{insight.text}</p>
                </div>
            </div>

            {/* SIMULATION TAB */}
            {activeTab === 'simulation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TaxCalculator
                        onCalculate={setCalcData}
                        onCopy={onCopy}
                        initialRate={calcData.rate}
                        initialIsPph21BukanPegawai={calcData.isPph21BukanPegawai}
                        initialUsePpn={calcData.usePpn}
                        initialMarkupMode={calcData.markupMode}
                    />

                    {/* Information Card */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none h-full">
                        <h3 className="text-xl font-bold mb-4">Informasi Pajak</h3>
                        <p className="text-white/80 mb-6">
                            Gunakan kalkulator ini untuk melakukan estimasi perhitungan PPh berdasarkan DPP dan tarif yang berlaku.
                            Perhitungan ini hanya simulasi dan bukan merupakan bukti potong resmi.
                        </p>
                    </Card>
                </div>
            )}

            {/* OBJEK PAJAK TAB */}
            {activeTab === 'object' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className={`relative ${showObjectDropdown ? 'z-30' : 'z-10'}`}>
                            <div className="flex justify-between items-center mb-6 border-b pb-2 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <User size={20} className="text-indigo-600" />
                                    Data Subjek & Objek Pajak
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDownloadMasterTemplate}
                                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors"
                                        title="Download Template Master Objek Pajak"
                                    >
                                        <Download size={14} /> Template Master
                                    </button>
                                    {canCreate && <button
                                        onClick={() => masterFileInputRef.current.click()}
                                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-indigo-600 transition-colors"
                                        title="Import Master Objek Pajak"
                                    >
                                        <Upload size={14} /> Import Master
                                    </button>}
                                    <input type="file" ref={masterFileInputRef} onChange={handleImportMaster} accept=".xlsx, .xls" className="hidden" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Identity Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Jenis Identitas
                                    </label>
                                    <select
                                        name="idType"
                                        value={formData.idType}
                                        onChange={handleInputChange}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    >
                                        <option value="NPWP">NPWP</option>
                                        <option value="KTP">KTP (NIK)</option>
                                    </select>
                                </div>

                                {/* Identity Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nomor Identitas
                                    </label>
                                    <input
                                        type="text"
                                        name="identityNumber"
                                        value={formData.identityNumber}
                                        onChange={handleInputChange}
                                        disabled={isReadOnly}
                                        maxLength={16}
                                        inputMode="numeric"
                                        placeholder="16 digit angka"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nama Wajib Pajak
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                        placeholder="Nama Lengkap / Badan Usaha"
                                    />
                                </div>

                                {/* Email */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Wajib Pajak
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                        placeholder="contoh@email.com"
                                    />
                                </div>

                                {/* Tax Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Jenis Pajak
                                    </label>
                                    <select
                                        name="taxType"
                                        value={formData.taxType}
                                        onChange={handleInputChange}
                                        disabled={isReadOnly}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                    >
                                        <option value="23" disabled={formData.idType === 'KTP'}>PPh 23 {formData.idType === 'KTP' ? '(Hanya NPWP)' : ''}</option>
                                        <option value="4(2)">PPh 4(2)</option>
                                        <option value="21">PPh 21</option>
                                        <option value="26">PPh 26</option>
                                    </select>
                                </div>

                                {/* Tax Object Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Kode Objek Pajak
                                    </label>
                                    <input
                                        type="text"
                                        name="taxObjectCode"
                                        value={formData.taxObjectCode}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-gray-300 cursor-not-allowed"
                                        placeholder="Auto-fill dari Nama Objek"
                                        readOnly
                                    />
                                </div>

                                {/* Tax Object Name (Searchable Dropdown) */}
                                <div className="md:col-span-2 relative">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Nama Objek Pajak (Cari & Pilih)
                                    </label>
                                    <input
                                        type="text"
                                        name="taxObjectName"
                                        value={formData.taxObjectName}
                                        onChange={(e) => {
                                            if (isReadOnly) return;
                                            handleInputChange(e);
                                            setShowObjectDropdown(true);
                                        }}
                                        onFocus={() => !isReadOnly && setShowObjectDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowObjectDropdown(false), 200)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                                        placeholder="Ketik untuk mencari objek pajak..."
                                        autoComplete="off"
                                    />

                                    {/* Dropdown List */}
                                    {showObjectDropdown && (
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                            {masterData.filter(item =>
                                                String(item.tax_type) === String(formData.taxType) && (
                                                    (item.name || '').toLowerCase().includes((formData.taxObjectName || '').toLowerCase()) ||
                                                    (item.code || '').toLowerCase().includes((formData.taxObjectName || '').toLowerCase())
                                                ) && !(formData.idType === 'KTP' && String(item.tax_type) === '23')
                                            ).length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    Tidak ada data ditemukan. <br />
                                                    <button onClick={() => masterFileInputRef.current.click()} className="text-indigo-600 hover:underline mt-1">
                                                        Import Master Data Sekarang?
                                                    </button>
                                                </div>
                                            ) : (
                                                masterData.filter(item => {
                                                    const search = (formData.taxObjectName || '').toLowerCase();
                                                    const matchesSearch = (item.name || '').toLowerCase().includes(search) || 
                                                                        (item.code || '').toLowerCase().includes(search);
                                                    const matchesType = String(item.tax_type) === String(formData.taxType);
                                                    const ktpRestriction = !(formData.idType === 'KTP' && String(item.tax_type) === '23');
                                                    return matchesSearch && matchesType && ktpRestriction;
                                                }).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                                                        onClick={() => {
                                                            const isPph21 = String(item.tax_type) === '21';
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                taxObjectName: item.name,
                                                                taxObjectCode: item.code,
                                                                taxType: item.tax_type,
                                                                isPph21BukanPegawai: isPph21,
                                                                usePpn: !isPph21
                                                            }));
                                                            // Auto-fill rate in calcData and apply toggles
                                                            setCalcData(prev => ({
                                                                ...prev,
                                                                rate: item.rate !== undefined && item.rate !== null ? item.rate : prev.rate,
                                                                isPph21BukanPegawai: isPph21,
                                                                usePpn: !isPph21
                                                            }));
                                                            setShowObjectDropdown(false);
                                                        }}
                                                    >
                                                        <div className="font-medium text-gray-800 dark:text-gray-200">{item.name}</div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                            <span className="bg-gray-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 font-mono">
                                                                {item.code}
                                                            </span>
                                                            <span className="text-indigo-500 font-medium">PPh {item.tax_type}</span>
                                                            {item.rate !== undefined && item.rate !== null && (
                                                                <span className="bg-indigo-100 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-bold ml-auto">
                                                                    {item.rate}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Reusable Calculator Section */}
                        <TaxCalculator
                            title="Perhitungan Pajak"
                            onCalculate={setCalcData}
                            initialDpp={calcData.dpp || ''}
                            initialRate={calcData.rate || ''}
                            initialDiscount={calcData.discount || ''}
                            initialMarkupMode={calcData.markupMode}
                            initialIsPph21BukanPegawai={calcData.isPph21BukanPegawai}
                            initialUsePpn={calcData.usePpn}
                            onCopy={onCopy}
                            isReadOnly={isReadOnly}
                        />

                        {/* Submit Button */}
                        {!isReadOnly && <div className="flex justify-end gap-3">
                            {editingId && (
                                <button
                                    onClick={() => {
                                        setEditingId(null);
                                        setFormData({
                                            idType: 'NPWP',
                                            identityNumber: '',
                                            name: '',
                                            taxType: '23',
                                            taxObjectCode: '',
                                            taxObjectName: '',
                                            markupMode: 'none',
                                            isPph21BukanPegawai: false,
                                            usePpn: true
                                        });
                                        setCalcData({ dpp: 0, rate: 0, pph: 0, ppn: 0, totalPayable: 0, discount: 0, dppNet: 0, markupMode: 'none', isPph21BukanPegawai: false, usePpn: true });
                                    }}
                                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                                >
                                    Batal Edit
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isLoading || !formData.identityNumber || !formData.name}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                            >
                                <Save size={20} />
                                {isLoading ? 'Menyimpan...' : editingId ? 'Update Data' : 'Simpan Data to Database WP'}
                            </button>
                        </div>}
                    </div>

                    {/* Summary / Info Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-slate-50 dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-700 h-full flex flex-col justify-center items-center text-center p-8 text-gray-500">
                            <FileText size={48} className="mb-4 text-slate-300" />
                            <p className="font-medium">Summary Data</p>
                            <p className="text-sm mt-2 mb-4">
                                Isi formulir dan lakukan perhitungan untuk melihat ringkasan disini.
                            </p>

                            {(calcData.dpp > 0 || formData.name) && (
                                <div className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Nama:</span>
                                        <span className="font-medium">{formData.name || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Jenis:</span>
                                        <span className="font-medium">PPh {formData.taxType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tarif:</span>
                                        <span className="font-medium">{calcData.rate}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Gross Up:</span>
                                        <span className={`font-bold uppercase ${calcData.markupMode !== 'none' ? 'text-indigo-600' : 'text-gray-500'}`}>
                                            {calcData.markupMode}
                                        </span>
                                    </div>
                                    {calcData.isPph21BukanPegawai && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Kategori:</span>
                                            <span className="font-black text-amber-600 text-[10px] uppercase">Bukan Pegawai</span>
                                        </div>
                                    )}
                                    {calcData.markupMode !== 'none' && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Total Dibukukan:</span>
                                            <span className="font-bold text-indigo-600">{new Intl.NumberFormat('id-ID').format(Math.round(calcData.totalDibukukan || 0))}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Diterima:</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(calcData.totalPayable)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-100 dark:border-slate-700 pt-2 mt-1">
                                        <span className="text-gray-500">DPP + PPN:</span>
                                        <span className="font-bold text-indigo-600">{formatCurrency((calcData.calculationDpp || 0) + (calcData.ppn || 0))}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">DPP - PPh:</span>
                                        <span className="font-bold text-rose-600">{formatCurrency((calcData.calculationDpp || 0) - (calcData.pph || 0))}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Gunakan PPN:</span>
                                        <span className={`font-bold ${calcData.usePpn ? 'text-green-600' : 'text-red-500'}`}>
                                            {calcData.usePpn ? 'Ya (12%)' : 'Tidak'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 italic mt-4">
                                        Hasil perhitungan otomatis muncul di panel kalkulator di sebelah kiri.
                                    </p>

                                    {/* Breakdown Section for Formula */}
                                    {calcData.breakdown && calcData.breakdown.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-dashed border-gray-200 dark:border-slate-700">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Detail Penjumlah:</p>
                                            <div className="space-y-2.5">
                                                {calcData.breakdown.map((item, i) => (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] animate-in slide-in-from-left-2" style={{ animationDelay: `${i * 50}ms` }}>
                                                        <div className="flex justify-between font-black text-slate-700 dark:text-slate-200 mb-1.5">
                                                            <span className="opacity-60">Item {i + 1}: {item.label}</span>
                                                            <span>{formatCurrency(item.value)}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                                                                <span>PPN:</span>
                                                                <span>+{formatCurrency(item.ppn)}</span>
                                                            </div>
                                                            <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                                                                <span>PPh:</span>
                                                                <span>-{formatCurrency(item.pph)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Total Breakdown Row */}
                                                <div className="bg-indigo-600 dark:bg-indigo-500 p-3 rounded-xl border border-indigo-400 text-[11px] text-white shadow-lg mt-2 animate-in slide-in-from-bottom-2">
                                                    <div className="flex justify-between font-black mb-1.5">
                                                        <span className="uppercase tracking-wider">Total Penjumlahan</span>
                                                        <span>{formatCurrency(calcData.totalBreakdown?.value || 0)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 border-t border-white/20 pt-1.5">
                                                        <div className="flex justify-between font-bold text-indigo-100">
                                                            <span>Total PPN:</span>
                                                            <span>+{formatCurrency(calcData.totalBreakdown?.ppn || 0)}</span>
                                                        </div>
                                                        <div className="flex justify-between font-bold text-rose-100">
                                                            <span>Total PPh:</span>
                                                            <span>-{formatCurrency(calcData.totalBreakdown?.pph || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}
            {/* DATABASE WP TAB */}
            {activeTab === 'database' && (
                <Card>
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                Database Wajib Pajak
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadDatabaseTemplate}
                                    className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-600 hover:bg-green-100 rounded-lg flex items-center gap-1 transition-colors border border-green-200"
                                    title="Download Template Excel"
                                >
                                    <Download size={14} /> Template
                                </button>
                                <button
                                    onClick={handleExportDatabase}
                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                                    title="Export Semua Database ke Excel"
                                >
                                    <FileText size={14} /> Export Excel
                                </button>
                                {canCreate && <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleImportDatabase}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={isImporting}
                                    />
                                    <button
                                        className={`px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors border border-blue-200 ${isImporting ? 'opacity-50 cursor-wait' : ''}`}
                                        title="Import Database WP dari Excel"
                                    >
                                        <Upload size={14} /> {isImporting ? 'Uploading...' : 'Import Excel'}
                                    </button>
                                </div>}
                                {canDelete && <button
                                    onClick={handleDeleteAll}
                                    disabled={isLoading || savedData.length === 0}
                                    className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded-lg flex items-center gap-1 transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Hapus Seluruh Database WP"
                                >
                                    <Trash2 size={14} /> Hapus Semua
                                </button>
                                }
                            </div>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Cari Nama / Identitas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium border-b dark:border-slate-700">
                                <tr>
                                    <th className="px-4 py-3">Nama Wajib Pajak</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Jenis Pajak</th>
                                    <th className="px-4 py-3 text-right">Tarif</th>
                                    <th className="px-4 py-3">NPWP/NIK</th>
                                    <th className="px-4 py-3">Kode Objek Pajak</th>
                                    <th className="px-4 py-3">Email</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                            Tidak ada data ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map((item, idx) => (
                                        <tr key={item.id}
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                            className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors animate-in zoom-in-95 fade-in fill-mode-both duration-500"
                                        >
                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-200">
                                                {item.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-medium">
                                                    PPh {item.tax_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                                {item.rate}%
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <span>{item.id_type}: {item.identity_number}</span>
                                                    {item.identity_number && (
                                                        <button
                                                            onClick={() => onCopy(item.identity_number, "NPWP/NIK")}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                                                            title="Salin NPWP/NIK"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <span>{item.tax_object_code || '-'}</span>
                                                    {item.tax_object_code && (
                                                        <button
                                                            onClick={() => onCopy(item.tax_object_code, "Kode Objek Pajak")}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                                                            title="Salin Kode Objek"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-indigo-500 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate max-w-[120px]" title={item.email}>
                                                        {item.email || '-'}
                                                    </span>
                                                    {item.email && (
                                                        <button
                                                            onClick={() => onCopy(item.email, "Email")}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-all shrink-0"
                                                            title="Salin Email"
                                                        >
                                                            <Copy size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {canEdit && <button
                                                        onClick={() => handleEdit(item)}
                                                        className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    >
                                                        Edit
                                                    </button>}
                                                    {canDelete && <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus Data"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Pagination UI */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/30 rounded-b-xl">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">
                                        Showing <span className="font-bold text-indigo-600">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-bold text-indigo-600">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> of <span className="font-bold text-indigo-600">{filteredData.length}</span> entries
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px bg-white dark:bg-slate-800 p-1 border border-gray-200 dark:border-slate-700" aria-label="Pagination">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-lg text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>

                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            // Tampilkan halaman pertama, terakhir, dan sekitar halaman aktif
                                            if (totalPages > 7 && page !== 1 && page !== totalPages && (page < currentPage - 1 || page > currentPage + 1)) {
                                                if (page === currentPage - 2 || page === currentPage + 2) return <span key={page} className="px-2 py-2 text-gray-400">...</span>;
                                                return null;
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-lg text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 disabled:opacity-30 transition-colors"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
