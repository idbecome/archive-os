import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCw, Save, ToggleLeft, ToggleRight, Keyboard, Copy, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';

export default function TaxCalculation() {
    const [dpp, setDpp] = useState('');
    const [rate, setRate] = useState('');
    const [pph, setPph] = useState(0);
    const [copied, setCopied] = useState(false); // Track copy status

    const [isCalcMode, setIsCalcMode] = useState(false); // Toggle for calculator mode

    useEffect(() => {
        let dppValue = 0;

        if (isCalcMode) {
            // In calculator mode, strip dots to get valid number/expression
            // 1.000.000 -> 1000000
            const raw = dpp.toString().replace(/\./g, '');

            // Try to evaluate if it's a valid expression or number
            try {
                const sanitized = raw.replace(/[^0-9+\-*/().\s]/g, '');
                if (sanitized) {
                    // eslint-disable-next-line no-new-func
                    const result = new Function('return ' + sanitized)();
                    if (isFinite(result)) {
                        dppValue = result;
                    }
                }
            } catch (e) {
                // ignore partial expressions while typing
            }
        } else {
            // In normal mode, dpp is already clean number string
            dppValue = parseFloat(dpp) || 0;
        }

        const rateValue = parseFloat(rate) || 0;
        const calculatedPph = dppValue * (rateValue / 100);
        setPph(calculatedPph);
    }, [dpp, rate, isCalcMode]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleReset = () => {
        setDpp('');
        setRate('');
        setPph(0);
    };

    const evaluateExpression = () => {
        try {
            // Sanitize input: allow only numbers and operators
            // FIRST: remove dots (thousands separators) completely so 100.000 becomes 100000
            const raw = dpp.toString().replace(/\./g, '');
            const sanitized = raw.replace(/[^0-9+\-*/().\s]/g, '');

            if (!sanitized) return;

            // Evaluate safely
            // eslint-disable-next-line no-new-func
            const result = new Function('return ' + sanitized)();

            if (isFinite(result)) {
                // Format result back to string with dots
                const formattedResult = Math.floor(result).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                setDpp(formattedResult);

                // Also trigger PPh calc immediately with raw number
                const rateValue = parseFloat(rate) || 0;
                setPph(result * (rateValue / 100)); // Use result (number) not dpp (string)
            }
        } catch (e) {
            console.error("Invalid expression");
        }
    };

    const handleKeyDown = (e) => {
        if (isCalcMode && e.key === 'Enter') {
            e.preventDefault();
            evaluateExpression();
        }
    };

    const formatDisplayValue = (val) => {
        if (!val) return '';
        // If valid number, format with dots
        if (!isNaN(val) && !val.toString().includes('+') && !val.toString().includes('-') && !val.toString().includes('*') && !val.toString().includes('/')) {
            return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        }
        return val;
    };

    const handleDppChange = (e) => {
        let val = e.target.value;
        if (isCalcMode) {
            // Calculator Mode: Format numbers with dots while preserving operators
            // 1. Remove existing dots to get raw numbers
            const raw = val.replace(/\./g, '');
            // 2. Format every number sequence
            const formatted = raw.replace(/\d+/g, (match) => {
                return match.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            });
            setDpp(formatted);
        } else {
            // Normal Mode: Remove non-digits
            const cleanVal = val.replace(/\./g, '').replace(/[^0-9]/g, '');
            setDpp(cleanVal);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calculator className="text-indigo-600" />
                    Tax Calculation
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 border-b pb-2 dark:border-gray-700">
                        Simulasi Perhitungan PPh
                    </h3>

                    <div className="space-y-6">
                        {/* DPP Input */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Dasar Pengenaan Pajak (DPP)
                                </label>
                                <button
                                    onClick={() => setIsCalcMode(!isCalcMode)}
                                    className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-all ${isCalcMode ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}
                                    title={isCalcMode ? "Matikan Mode Rumus" : "Aktifkan Mode Rumus (Hitung Cepat)"}
                                >
                                    {isCalcMode ? <Keyboard size={14} /> : <Calculator size={14} />}
                                    {isCalcMode ? 'Mode Input' : 'Mode Rumus'}
                                </button>
                            </div>
                            <div className="relative">
                                {!isCalcMode && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">Rp</span>}
                                <input
                                    type="text"
                                    value={isCalcMode ? dpp : formatDisplayValue(dpp)}
                                    onChange={handleDppChange}
                                    onKeyDown={handleKeyDown}
                                    className={`w-full ${isCalcMode ? 'pl-4 font-mono text-indigo-600' : 'pl-10'} pr-4 py-3 rounded-xl border ${isCalcMode ? 'border-indigo-300 ring-2 ring-indigo-500/20' : 'border-gray-200'} dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white`}
                                    placeholder={isCalcMode ? "Ketik rumus (cth: 1000000+500000) lalu ENTER" : "0"}
                                />
                                {isCalcMode && (
                                    <button
                                        onClick={evaluateExpression}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                                    >
                                        HITUNG
                                    </button>
                                )}
                            </div>

                            {/* Operator Buttons (Calculator Mode Only) */}
                            {isCalcMode && (
                                <div className="grid grid-cols-4 gap-2 mt-2 animate-in slide-in-from-top-1">
                                    {['+', '-', '*', '/'].map((op) => (
                                        <button
                                            key={op}
                                            onClick={() => setDpp(prev => prev + op)}
                                            className="py-2 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-indigo-900/30 font-mono font-bold rounded-lg transition-colors border border-gray-200 dark:border-slate-700"
                                        >
                                            {op === '*' ? 'x' : op === '/' ? '÷' : op}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Percentage Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Persentase Tarif (%)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value)}
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                            </div>
                        </div>

                        {/* Result Display */}
                        <div className="pt-4 border-t dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                                Estimasi PPh Terutang
                            </label>
                            <div className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between">
                                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Total PPh</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                        {formatCurrency(pph)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            if (pph > 0) {
                                                navigator.clipboard.writeText(Math.floor(pph).toString());
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }
                                        }}
                                        className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-800 rounded-lg text-indigo-600 dark:text-indigo-400 transition-colors flex items-center gap-1"
                                        title="Salin Angka (Tanpa Format)"
                                    >
                                        {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                                        {copied && <span className="text-xs font-semibold text-green-600 animate-in fade-in">Tersalin!</span>}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <RefreshCw size={16} /> Reset
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Information Card (Optional) */}
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none">
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
        </div>
    );
}
