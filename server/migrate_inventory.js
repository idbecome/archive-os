import db from './db.js';
import fs from 'fs';
import path from 'path';

// Function to wait for DB initialization
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function migrateInventory() {
    console.log("Starting Migration: Inventory JSON -> Relational Table (inventory_items)...");

    // Give time for db.js to initialize tables if they don't exist
    await wait(2000);

    // 1. Clear existing items to avoid duplicates during re-run
    console.log("Clearing old data in inventory_items...");
    await new Promise((resolve) => {
        db.run("DELETE FROM inventory_items", [], (err) => {
            if (err) console.error("Error clearing table:", err);
            resolve();
        });
    });

    // 2. Fetch all inventory slots
    console.log("Fetching inventory slots...");
    const slots = await new Promise((resolve) => {
        db.all("SELECT id, box_data, boxData FROM inventory WHERE status != 'EMPTY'", [], (err, rows) => {
            if (err) {
                console.error("Error fetching inventory:", err);
                resolve([]);
            } else {
                resolve(rows);
            }
        });
    });

    console.log(`Found ${slots.length} non-empty slots. Processing...`);

    let totalInvoices = 0;

    for (const slot of slots) {
        let rawData = slot.box_data || slot.boxData;
        if (!rawData) continue;

        let box = null;
        try {
            box = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        } catch (e) {
            console.error(`Failed to parse JSON for slot ${slot.id}:`, e.message);
            continue;
        }

        if (!box || !box.ordners) continue;

        for (const ord of box.ordners) {
            if (ord.invoices && Array.isArray(ord.invoices)) {
                for (const inv of ord.invoices) {
                    const invoiceNo = inv.invoiceNo || '';
                    const vendor = inv.vendor || '';
                    const date = inv.paymentDate || null;
                    const amount = inv.totalAmount ? parseFloat(inv.totalAmount.replace(/[^0-9.-]+/g, "")) : 0;
                    const fileUrl = inv.file || '';
                    const ocrContent = typeof inv.ocrContent === 'string' ? inv.ocrContent : JSON.stringify(inv.ocrContent || '');

                    // Insert into inventory_items
                    await new Promise((resolve) => {
                        db.run(
                            `INSERT INTO inventory_items (inventory_id, box_id, ordner_id, invoice_no, vendor, date, amount, file_url, ocr_content) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                slot.id,
                                box.boxId,
                                ord.noOrdner,
                                invoiceNo,
                                vendor,
                                date,
                                amount,
                                fileUrl,
                                ocrContent
                            ],
                            (err) => {
                                if (err) console.error(`Failed to insert invoice ${invoiceNo}:`, err.message);
                                else totalInvoices++;
                                resolve();
                            }
                        );
                    });
                }
            }
        }
    }

    console.log(`Migration Completed. Total Invoices Migrated: ${totalInvoices}`);
    process.exit(0);
}

migrateInventory();
