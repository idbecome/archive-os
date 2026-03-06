
/**
 * Dictionary mapping informal or common terms to formal tax categories and related keywords.
 * This is used for query expansion in the AI search.
 */
const synonymMap = {
    // 1. Professional & Financial Services
    "dividen": "deviden, saham, bagi hasil, keuntungan investasi, pph 23 dividen",
    "aktuaris": "jasa aktuaris, asuransi, perhitungan resiko, pph 23 aktuaris, profesi ahli",
    "akuntan": "jasa akuntansi, pembukuan, atestasi, laporan keuangan, audit, kap, pph 23 akuntansi",
    "akuntansi": "pembukuan, atestasi, audit, laporan keuangan, pph 23",
    "audit": "pemeriksaan keuangan, akuntan publik, kap, atestasi, pph 23",
    "hukum": "jasa hukum, pengacara, legal, konsultan hukum, advokat, notaris, pph 23 hukum",
    "arsitek": "jasa arsitektur, desain bangunan, perencanaan konstruksi, arsitek, landscape, pph 23 arsitek",
    "arsitektur": "jasa arsitek, desain bangunan, landscape, perencanaan kota",
    "penilai": "appraisal, jasa penilai, pph 23, penilaian aset",
    "appraisal": "penilai, jasa penilaian, pph 23",

    // 2. Construction Sector (Broadened)
    "konstruksi": "pembangunan, renovasi, sbu, skk, kualifikasi kecil, kualifikasi menengah, terintegrasi, kontraktor, pemborong, pph 4(2) konstruksi",
    "pembangunan": "konstruksi, bangun gedung, renovasi, jasa pelaksana konstruksi",
    "renovasi": "perbaikan bangunan, konstruksi, perbaikan kantor, pph 4(2)",
    "sbu": "sertifikat badan usaha, konstruksi, kualifikasi kaku, pph 4(2)",
    "skk": "sertifikat kompetensi kerja, konstruksi, orang perseorangan, pph 4(2)",
    "terintegrasi": "konstruksi terintegrasi, epc, design and build, pph 4(2)",
    "landscape": "arsitektur landscape, taman, perencanaan kota, pph 4(2)",

    // 3. Shipping & Aviation (PPh 15 & 23)
    "pelayaran": "kapal laut, pelayaran dalam negeri, pelayaran luar negeri, charter kapal, pph 15, angkutan laut",
    "penerbangan": "pesawat udara, maskapai, charter pesawat, pph 15, angkutan udara",
    "charter": "sewa kapal, sewa pesawat, pph 15, charter laut, charter udara",
    "kapal": "pelayaran, sewa kapal, charter kapal, pph 15",
    "pesawat": "penerbangan, sewa pesawat, charter pesawat, pph 15",
    "freight": "freight forwarding, ekspedisi, logistik, pengiriman barang, pph 23",

    // 4. Oil, Gas & Mining (Hulu Migas)
    "migas": "minyak dan gas bumi, hulu migas, drilling, hulu energi, pph 23 migas",
    "drilling": "pengeboran, drilling migas, penambangan, pph 23 pengeboran",
    "uplift": "uplift hulu migas, pengangkatan, pph 23 migas",
    "eksplorasi": "eksplorasi migas, pencarian migas, participating interest, pph 23",
    "eksploitasi": "eksploitasi migas, produksi migas, participating interest, pph 23",
    "batubara": "tambang batubara, mineral logam, iup, emas, pph 22",
    "mineral": "tambang mineral, logam, batubara, iup, emas batangan",
    "emas": "emas batangan, perhiasan emas, antam, logam mulia, pph 22",

    // 5. Industry & Distribution
    "semen": "industri semen, penjualan semen, distributor semen, pph 22",
    "baja": "industri baja, penjualan baja, distributor baja, pph 22",
    "otomotif": "industri otomotif, mobil, motor, kendaraan bermotor, atpm, apm, dealer, pph 22",
    "farmasi": "industri farmasi, obat-obatan, distributor farmasi, pph 22",
    "kertas": "industri kertas, penjualan kertas, distributor kertas, pph 22",
    "atpm": "agen tunggal pemegang merek, otomotif, importir kendaraan, pph 22",

    // 6. Fuel & Energy
    "bbm": "bahan bakar minyak, pertamina, premium, solar, dex, pertalite, pph 22 bbm",
    "bbg": "bahan bakar gas, pertamina, gas lpg, pph 22 bbg",
    "pertamina": "bbm, bbg, pelumas, penjualan bbm, pph 22 pertamina",
    "spbu": "pom bensin, bbm, solar, pertalite, pph 22 spbu",
    "pulsa": "penjualan pulsa, kartu perdana, distributor pulsa, pph 22 pulsa",

    // 7. IT, Crypto & Electronics
    "kripto": "crypto, aset kripto, bitcoin, pedagang fisik kripto, blockchain, pph 22 kripto",
    "software": "perangkat lunak, lisensi, it support, maintenance software, pph 23",
    "hardware": "perangkat keras, komputer, laptop, pph 23 hardware",
    "internet": "jasa internet, penyedia data, bandwidth, pph 23 internet",
    "kabel": "tv kabel, instalasi kabel, pemasangan cctv, pph 23",

    // 8. Employment & Human Resources (PPh 21)
    "gaji": "upah, imbalan pegawai, honorarium, pph 21 bulanan",
    "upah": "gaji, imbalan harian, imbalan mingguan, upah satuan, upah borongan, pph 21",
    "honorarium": "honor, komisi, imbalan jasa, pph 21 honorarium",
    "pesangon": "uang pesangon, pph 21 pesangon, berhenti kerja",
    "pensiun": "dana pensiun, jht, tht, pht, pph 21 pensiun",
    "atlet": "olahragawan, peserta lomba, hadiah atlet, pph 21",
    "artis": "influencer, selebgram, blogger, vlogger, penyanyi, artis, pembawa acara, pph 21",
    "influencer": "selebgram, content creator, vlogger, blogger, pph 21",
    "pns": "pegawai negeri sipil, asn, pph 21 pns, golongan 3, golongan 4",
    "tni": "tentara, pph 21 tni, polri, bintara, tamtama",

    // 9. Others & Multi-Cases
    "hadiah": "penghargaan, undian, bonus, pph 23 hadiah, pph 21 hadiah",
    "katering": "tata boga, jasa makan, catering, nasi box, pph 23 katering",
    "limbah": "pengolahan limbah, sampah, septic tank, pph 23 limbah",
    "outsourcing": "penyedia tenaga kerja, tenaga ahli, pph 23 outsourcing",
    "sewa": "menyewa, sewa mobil, sewa gudang, sewa gedung, sewa bangunan, rental, pph 23, pph 4(2)",
    // Warehouse & Logistics (Ambiguity Handling)
    "gudang": "sewa dan penghasilan lain sehubungan dengan penggunaan harta, jasa pelaksanaan konstruksi, jasa perencanaan konstruksi, jasa pengawasan konstruksi, penyimpanan, storage, pph 4(2), logistik",
    "storage": "sewa gudang, sewa tempat penyimpanan, sewa ruangan, pph 4(2), pergudangan, jasa logistik",
    "pantry": "sewa ruangan, sewa bangunan, konsumsi kantor",
    "kantor": "sewa kantor, sewa ruangan, sewa bangunan, perbaikan kantor, maintenance gedung",
    "lapangan": "sewa tanah, sewa lahan, persewaan lapangan",
    "ruangan": "sewa ruangan, sewa bangunan, sewa gedung, meeting room",
    "logistik": "jasa pengiriman, ekspedisi, kurir, sewa gudang, freight forwarding, pph 23 jasa pengiriman",

    // Specialized & Sector Specific (New List Rules)
    "proyek": "apbn, apbd, hibah, pinjaman luar negeri, kontraktor utama, bendaharawan, pph 22, pph 23",
    "ikn": "ibu kota nusantara, pajak ikn, fasilitas ikn, pph 0 ikn",

    // Common Phrases (Deep Mapping)
    "sewa mobil": "sewa kendaraan, sewa mobil operasional, pph 23 sewa harta",
    "sewa kapal": "pelayaran, charter kapal, pph 15 pelayaran",
    "bangun gedung": "konstruksi, jasa pelaksana konstruksi, pembangunan kantor, pph 4(2)",
    "cetak banner": "percetakan, jasa cetak, promosi, pph 23 cetak",
    "bayar gaji": "upah, pph 21 pegawai, gaji karyawan",
    "audit kantor": "audit keuangan, kap, akuntan publik, pph 23 audit",

    // 10. Specialized & Sector Specific (New List)
    "uplift": "uplift hulu migas, pengangkatan, pph 23 migas",
    "interest": "participating interest, eksplorasi, eksploitasi, hulu migas, pph 23",
    "sipp": "sistem informasi pengadaan pemerintah, bela pengadaan, pengadaan barang, pph 22",
    "kripto": "aset kripto, bitcoin, pedagang fisik kripto, blockchain, pph 22 kripto",
    "emas": "emas batangan, perhiasan emas, antam, logam mulia, bulion, pph 22",
    "ikn": "ibu kota nusantara, pajak ikn, fasilitas ikn, pph 0 ikn, pp umkm ikn",
    "umkm": "peredaran bruto tertentu, pp 23 2018, pp 55 2022, pajak final umkm",
    "royalti": "hak cipta, lisensi, royalti buku, royalti musik, pph 23 royalti",
    "pensiun": "uang manfaat pensiun, jht, tht, pensiun berkala, pph 21",
    "pesangon": "uang pesangon, pph 21 pesangon, php, berhenti kerja",
    "maklon": "jasa maklon, contract manufacturing, produksi titipan, pph 23 maklon",
    "hibah": "proyek hibah, pinjaman luar negeri, phln, pph ditanggung pemerintah",
    "dhe": "devisa hasil ekspor, instrumen moneter, valas, tenor deposito, pph final dhe",

    // 11. Shipping & Construction Case Mapping (User List)
    "sewa kapal luar negeri": "charter kapal laut, penerbangan luar negeri, pph 15, but indonesia, phln",
    "sewa pesawat luar negeri": "charter pesawat udara, penerbangan luar negeri, pph 15, but indonesia, phln",
    "pembangunan gedung ikn": "jasa konstruksi ikn, pph 0 ikn, konstruksi pembangunan",
    "pengalihan hak tanah": "jual beli tanah, balik nama sertifikat, pph final pengalihan hak, bumn bumd",
    "participating interest": "migas, hulu migas, eksplorasi, eksploitasi, pph 23 hulu migas",
    "bunga koperasi": "simpanan anggota, koperasi, bunga simpanan, pph final bunga koperasi",
    "aset kripto": "kripto, bitcoin, pedagang fisik kripto, blockchain, pph 22 kripto",
    "emas batangan": "logam mulia, antam, bulion, pph 22 emas",
    "lelang barang bumn": "pembelian barang bumn, pengadaan bumn, pph 22 bumn",
};

const stopWords = new Set(["saya", "mau", "ingin", "ada", "di", "ke", "dari", "untuk", "dengan", "dan", "atau", "yang", "itu", "ini", "bisa", "sudah", "akan", "lewat", "melalui", "kami", "mereka", "kita", "kamu"]);

/**
 * Expands a query by checking phrases and individual words against the synonym map.
 * @param {string} query The original query string.
 * @returns {string} The expanded query string.
 */
export function expandQuery(query) {
    if (!query) return "";
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
    let extraTerms = new Set();

    // 1. Sliding window for phrases (2-3 words)
    for (let len = 3; len >= 2; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (synonymMap[phrase]) {
                synonymMap[phrase].split(',').forEach(term => extraTerms.add(term.trim()));
            }
        }
    }

    // 2. Individual word matching (filtering stop words)
    words.forEach(word => {
        if (!stopWords.has(word) && synonymMap[word]) {
            synonymMap[word].split(',').forEach(term => extraTerms.add(term.trim()));
        }
    });

    if (extraTerms.size === 0) return query;
    // Combine original query with expansion, ensuring no duplicates
    const expansion = Array.from(extraTerms).join(' ');
    return `${query} ${expansion}`;
}

/**
 * Checks if any part of the query was expanded.
 * @param {string} query 
 * @returns {string[]} List of matched keywords/phrases that triggered expansion
 */
export function getMatchedKeywords(query) {
    if (!query) return [];
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ');
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
    let matched = new Set();

    // Check phrases first
    for (let len = 3; len >= 2; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const phrase = words.slice(i, i + len).join(' ');
            if (synonymMap[phrase]) matched.add(phrase);
        }
    }

    // Check words
    words.forEach(word => {
        if (!stopWords.has(word) && synonymMap[word]) matched.add(word);
    });

    return Array.from(matched);
}

export default synonymMap;
