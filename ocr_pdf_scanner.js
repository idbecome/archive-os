'use strict';

const { createWorker, createScheduler } = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Menggunakan pdfjs-dist sebagai alternatif pdf-img-convert
// Library ini sudah tersedia di project Anda (digunakan di worker.js)
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

/**
 * Fungsi untuk mengekstrak gambar dari PDF tanpa render canvas.
 * Sangat efisien untuk PDF hasil scan (image-only).
 */
async function extractImagesFromPdf(pdfPath, maxPages = 15) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;
  
  const images = [];
  const pagesToProcess = Math.min(pdfDocument.numPages, maxPages);

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdfDocument.getPage(i);
    const operatorList = await page.getOperatorList();

    for (let j = 0; j < operatorList.fnArray.length; j++) {
      const fn = operatorList.fnArray[j];
      // Cek operator PaintImage (XObject)
      if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
        const objId = operatorList.argsArray[j][0];
        try {
          const img = await page.objs.get(objId);
          if (img && img.width > 100) { // Filter noise/garis kecil
            const channels = Math.floor(img.data.length / (img.width * img.height)) || 1;
            
            // Pre-processing gambar untuk meningkatkan akurasi OCR
            const buffer = await sharp(img.data, { 
              raw: { width: img.width, height: img.height, channels: channels }
            })
            .resize(img.width * 2) // Upscale gambar agar teks lebih jelas
            .grayscale()           // Ubah ke abu-abu
            .linear(1.5, -0.2)     // Meningkatkan kontras
            .threshold(150)        // Binarization: Paksa jadi Hitam-Putih murni (menghilangkan noise latar)
            .png()
            .toBuffer();

            images.push({ page: i, buffer });
          }
        } catch (e) {}
      }
    }
  }
  return images;
}

async function renderPdfPagesToImages(pdfPath, maxPages = 15) {
  // Requires optional dependency 'canvas' (node-canvas) for PDF rendering in Node
  let Canvas;
  try { Canvas = require('canvas'); } catch (e) { throw new Error('Module canvas tidak terinstal'); }

  const dataBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdfDocument = await loadingTask.promise;
  const pagesToProcess = Math.min(pdfDocument.numPages, maxPages);
  const images = [];

  for (let i = 1; i <= pagesToProcess; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = Canvas.createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    const renderContext = { canvasContext: ctx, viewport };
    await page.render(renderContext).promise;
    const buffer = canvas.toBuffer('image/png');
    images.push({ page: i, buffer });
  }
  return images;
}

/**
 * Fungsi untuk melakukan OCR pada file PDF
 * @param {string} pdfPath - Path absolut ke file PDF
 * @param {string} lang - Kode bahasa (contoh: 'ind' atau 'eng')
 */
async function processPdfOcr(pdfPath, lang = 'ind+eng') {
  console.log(`Membaca PDF: ${pdfPath}`);

  // 1. Ambil gambar dari PDF menggunakan teknik ekstraksi objek gambar
  const pdfImages = await extractImagesFromPdf(pdfPath);
  // Jika tidak ada gambar ter-embedded, coba render tiap halaman (fallback)
  if (pdfImages.length === 0) {
    console.log('Tidak ada gambar embedded. Mencoba render halaman sebagai gambar (fallback)...');
    try {
      const rendered = await renderPdfPagesToImages(pdfPath);
      if (rendered.length > 0) {
        rendered.forEach(r => pdfImages.push(r));
      }
    } catch (e) {
      console.warn('Rendering fallback gagal atau module canvas tidak tersedia:', e.message || e);
    }
  }

  if (pdfImages.length === 0) {
    console.log("Tidak ditemukan gambar hasil scan dalam PDF ini.");
    return;
  }

  // Gunakan satu worker, jalankan beberapa PSM dan pilih hasil terbaik berdasarkan confidence
  const psmCandidates = ['1', '3', '6', '11'];

  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage(lang);
  await worker.initialize(lang);
  // default params
  await worker.setParameters({
    tessjs_create_tsv: '1',
    tessjs_create_hocr: '0',
    preserve_interword_spaces: '1'
  });

  console.log(`Memulai OCR pada ${pdfImages.length} halaman...`);

  try {
    const results = [];
    for (const img of pdfImages) {
      // base preprocessing (no rotation)
      const base = await sharp(img.buffer)
        .resize({ width: 1654 })
        .grayscale()
        .normalize()
        .sharpen()
        .median(1)
        .threshold(150)
        .png()
        .toBuffer();

      const angles = [0, 90, 180, 270];
      let best = { text: '', confidence: -1, psm: null, angle: 0 };
      const confidencesLog = [];

      // coba rotasi utama 0/90/180/270
      for (const angle of angles) {
        const rotated = await sharp(base).rotate(angle).png().toBuffer();
        for (const psm of psmCandidates) {
          await worker.setParameters({ tessedit_pageseg_mode: psm });
          const ret = await worker.recognize(rotated);

          // determine confidence: prefer ret.data.confidence, fallback to TSV parsing
          let conf = -1;
          if (ret?.data?.confidence) conf = ret.data.confidence;
          else if (ret?.data?.tsv) {
            const lines = ret.data.tsv.split('\n');
            let sum = 0, cnt = 0;
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split('\t');
              const c = parseInt(cols[9]);
              if (!isNaN(c)) { sum += c; cnt++; }
            }
            if (cnt > 0) conf = sum / cnt;
          }

          confidencesLog.push({ angle, psm, conf });

          if (conf > best.confidence) {
            best = { text: ret.data?.text || '', confidence: conf, psm, angle };
          }
        }
      }

      // jika confidence masih rendah, coba pencarian sudut kecil -5..+5 derajat
      if (best.confidence < 60) {
        for (let a = -5; a <= 5; a++) {
          const rotated = await sharp(base).rotate(a).png().toBuffer();
          for (const psm of psmCandidates) {
            await worker.setParameters({ tessedit_pageseg_mode: psm });
            const ret = await worker.recognize(rotated);

            let conf = -1;
            if (ret?.data?.confidence) conf = ret.data.confidence;
            else if (ret?.data?.tsv) {
              const lines = ret.data.tsv.split('\n');
              let sum = 0, cnt = 0;
              for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split('\t');
                const c = parseInt(cols[9]);
                if (!isNaN(c)) { sum += c; cnt++; }
              }
              if (cnt > 0) conf = sum / cnt;
            }

            confidencesLog.push({ angle: a, psm, conf });

            if (conf > best.confidence) {
              best = { text: ret.data?.text || '', confidence: conf, psm, angle: a };
            }
          }
        }
      }

      // simple post-cleaning: replace common OCR garbage and trim
      const cleaned = best.text
        .replace(/[^\S\n]+/g, ' ') // normalize whitespace
        .replace(/[^\w\s\p{P}\p{N}]+/gu, '')
        .replace(/\b0([A-Z])\b/g, 'O$1')
        .trim();

      console.log(`\n--- Halaman ${img.page} | Angle dipilih: ${best.angle} | PSM: ${best.psm} | Confidence: ${Math.round(best.confidence)} ---`);
      console.log('Percobaan confidences:', confidencesLog.slice(-10).map(c=>`${c.angle}°/${c.psm}:${Math.round(c.conf)}`).join(' | '));
      console.log(cleaned || best.text);

      results.push({ page: img.page, text: cleaned || best.text, confidence: best.confidence, psm: best.psm, angle: best.angle });
    }

  } catch (error) {
    console.error('Terjadi kesalahan saat proses OCR:', error);
  } finally {
    try { await worker.terminate(); } catch (e) {}
  }
}

// Contoh penggunaan
const targetPdf = path.resolve(__dirname, 'dokumen_scan.pdf');
processPdfOcr(targetPdf);