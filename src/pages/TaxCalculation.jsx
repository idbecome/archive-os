import React, { useState, useEffect } from 'react';
import { Calculator, User, FileText, Building2, CreditCard, Database, Save, Trash2, Search, Upload, Download } from 'lucide-react';
import { Card } from '../components/ui/Card';
import TaxCalculator from '../components/tax/TaxCalculator';

export default function TaxCalculation() {
    const [activeTab, setActiveTab] = useState('simulation'); // 'simulation', 'object', 'database'
    const [savedData, setSavedData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [calcData, setCalcData] = useState({ dpp: 0, rate: 0, pph: 0 });
    const [editingId, setEditingId] = useState(null);
    const [showObjectDropdown, setShowObjectDropdown] = useState(false);
    const [masterData, setMasterData] = useState([]);
    const [isImporting, setIsImporting] = useState(false);

    // Form State for "Objek Pajak"
    const [formData, setFormData] = useState({
        idType: 'NPWP',
        identityNumber: '',
        name: '',
        taxType: '21',
        taxObjectCode: '',
        taxObjectName: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const fetchDatabase = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/tax-objects');
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
            const res = await fetch('http://localhost:5000/api/master-tax-objects');
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

    const handleDownloadTemplate = () => {
        window.open('http://localhost:5000/api/master-tax-objects/template', '_blank');
    };

    const handleExportDatabase = () => {
        window.open('http://localhost:5000/api/tax-objects/export', '_blank');
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsImporting(true);
        try {
            const res = await fetch('http://localhost:5000/api/master-tax-objects/import', {
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
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                dpp: calcData.dpp,
                rate: calcData.rate,
                pph: calcData.pph
            };

            const url = editingId
                ? `http://localhost:5000/api/tax-objects/${editingId}`
                : 'http://localhost:5000/api/tax-objects';

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
                    taxType: '21',
                    taxObjectCode: '',
                    taxObjectName: ''
                });
                setCalcData({ dpp: 0, rate: 0, pph: 0 });
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
            taxType: item.tax_type,
            taxObjectCode: item.tax_object_code,
            taxObjectName: item.tax_object_name
        });
        setCalcData({
            dpp: item.dpp,
            rate: item.rate,
            pph: item.pph
        });
        setActiveTab('object');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus data ini?')) return;
        try {
            await fetch(`http://localhost:5000/api/tax-objects/${id}`, { method: 'DELETE' });
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
        (item.tax_object_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
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

            {/* SIMULATION TAB */}
            {activeTab === 'simulation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <TaxCalculator />

                    {/* Information Card */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none h-fit">
                        <h3 className="text-xl font-bold mb-4">Informasi Pajak</h3>
                        <p className="text-white/80 mb-6">
                            Gunakan kalkulator ini untuk melakukan estimasi perhitungan PPh berdasarkan DPP dan tarif yang berlaku.
                            Perhitungan ini hanya simulasi dan bukan merupakan bukti potong resmi.
                        </p>

                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <h4 className="font-semibold mb-2 text-white">Rumus Perhitungan</h4>
                            <code className="text-sm font-mono bg-black/20 px-2 py-1 rounded">
                                PPh = (DPP x Tarif) / 100
                            </code>
                        </div>
                    </Card>
                </div>
            )}

            {/* OBJEK PAJAK TAB */}
            {activeTab === 'object' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Form Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className={`relative ${showObjectDropdown ? 'z-30' : 'z-10'}`}>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 border-b pb-2 dark:border-gray-700 flex items-center gap-2">
                                <User size={20} className="text-indigo-600" />
                                Data Subjek & Objek Pajak
                            </h3>

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
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
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
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        placeholder={formData.idType === 'NPWP' ? '00.000.000.0-000.000' : '320123...'}
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
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                        placeholder="Nama Lengkap / Badan Usaha"
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
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="21">PPh 21</option>
                                        <option value="23">PPh 23</option>
                                        <option value="4(2)">PPh 4(2)</option>
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
                                            handleInputChange(e);
                                            setShowObjectDropdown(true);
                                        }}
                                        onFocus={() => setShowObjectDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowObjectDropdown(false), 200)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
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
                                                )
                                            ).length === 0 ? (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    Tidak ada data ditemukan. <br />
                                                    <button onClick={() => setActiveTab('database')} className="text-indigo-600 hover:underline mt-1">
                                                        Import Master Data?
                                                    </button>
                                                </div>
                                            ) : (
                                                masterData.filter(item =>
                                                    String(item.tax_type) === String(formData.taxType) && (
                                                        (item.name || '').toLowerCase().includes((formData.taxObjectName || '').toLowerCase()) ||
                                                        (item.code || '').toLowerCase().includes((formData.taxObjectName || '').toLowerCase())
                                                    )
                                                ).map((item) => (
                                                    <button
                                                        key={item.id}
                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0"
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                taxObjectName: item.name,
                                                                taxObjectCode: item.code,
                                                                taxType: item.tax_type
                                                            }));
                                                            // Auto-fill rate in calcData
                                                            if (item.rate !== undefined && item.rate !== null) {
                                                                setCalcData(prev => ({
                                                                    ...prev,
                                                                    rate: item.rate
                                                                }));
                                                            }
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
                        />

                        {/* Submit Button */}
                        <div className="flex justify-end gap-3">
                            {editingId && (
                                <button
                                    onClick={() => {
                                        setEditingId(null);
                                        setFormData({
                                            idType: 'NPWP',
                                            identityNumber: '',
                                            name: '',
                                            taxType: '21',
                                            taxObjectCode: '',
                                            taxObjectName: ''
                                        });
                                        setCalcData({ dpp: 0, rate: 0, pph: 0 });
                                    }}
                                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-all"
                                >
                                    Batal Edit
                                </button>
                            )}
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={20} />
                                {isLoading ? 'Menyimpan...' : editingId ? 'Update Data' : 'Simpan Data to Database WP'}
                            </button>
                        </div>
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
                                    <div className="border-t pt-2 mt-2 flex justify-between">
                                        <span className="text-gray-500">DPP:</span>
                                        <span className="font-medium">{formatCurrency(calcData.dpp)}</span>
                                    </div>
                                    <div className="flex justify-between text-indigo-600 font-bold">
                                        <span>Total PPh:</span>
                                        <span>{formatCurrency(calcData.pph)}</span>
                                    </div>
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
                                    onClick={handleDownloadTemplate}
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
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleImport}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        disabled={isImporting}
                                    />
                                    <button
                                        className={`px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors border border-blue-200 ${isImporting ? 'opacity-50 cursor-wait' : ''}`}
                                        title="Import Master Data dari Excel"
                                    >
                                        <Upload size={14} /> {isImporting ? 'Uploading...' : 'Import Excel'}
                                    </button>
                                </div>
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
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Wajib Pajak</th>
                                    <th className="px-4 py-3 whitespace-nowrap">Jenis Pajak</th>
                                    <th className="px-4 py-3 text-right">Tarif</th>
                                    <th className="px-4 py-3">Objek Pajak</th>
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
                                    filteredData.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-gray-200">{item.name || '-'}</div>
                                                <div className="text-xs text-gray-500">{item.id_type}: {item.identity_number}</div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-600 text-xs font-medium">
                                                    PPh {item.tax_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                                {item.rate}%
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-gray-700 dark:text-gray-300">{item.tax_object_name || '-'}</div>
                                                <div className="text-xs text-gray-500 font-mono">{item.tax_object_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Hapus Data"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
