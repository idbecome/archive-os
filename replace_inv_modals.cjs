const fs = require('fs');
const path = 'c:/Project/archive-os/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = "{(modalTab === 'details' || modalTab === 'history' || modalTab === 'invoice-detail') && (";
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
    console.log('Start pattern not found');
    process.exit(1);
}

// The next block after this is MasterDataModals
const endStr = "{/* MASTER DATA MODALS */}";
const endIdx = content.indexOf(endStr, startIdx);

if (endIdx === -1) {
    console.log('End pattern not found');
    process.exit(1);
}

// Find the precise closing bracket before the MASTER DATA MODALS comment.
const beforeEnd = content.substring(startIdx, endIdx);
const lastBraceIndex = beforeEnd.lastIndexOf('}'); // Actually `        }`
const finalEndIdx = startIdx + lastBraceIndex + 1; // plus 1 for the '}'

const replacement = `<InventoryModals
          modalTab={modalTab} setModalTab={setModalTab}
          selectedSlotId={selectedSlotId} selectedExternalItem={selectedExternalItem} inventory={inventory}
          boxForm={boxForm} setBoxForm={setBoxForm} hasPermission={hasPermission}
          newOrdner={newOrdner} setNewOrdner={setNewOrdner} addOrdner={addOrdner} editOrdner={editOrdner} removeOrdner={removeOrdner}
          expandedOrdnerIds={expandedOrdnerIds} setExpandedOrdnerIds={setExpandedOrdnerIds}
          newInvoice={newInvoice} setNewInvoice={setNewInvoice} addInvoice={addInvoice} editInvoice={editInvoice} removeInvoice={removeInvoice} handleViewInvoice={handleViewInvoice}
          editingItem={editingItem} showMoveInput={showMoveInput} setShowMoveInput={setShowMoveInput}
          moveTargetSlot={moveTargetSlot} setMoveTargetSlot={setMoveTargetSlot} handleMoveBox={handleMoveBox} handleSaveBox={handleSaveBox}
          handleStatusChange={handleStatusChange} setShowExternalForm={setShowExternalForm} setExternalDate={setExternalDate} handleEmptySlot={handleEmptySlot}
          invoiceFileInputRef={invoiceFileInputRef} handleInvoiceFileSelect={handleInvoiceFileSelect} fetchInventory={fetchInventory}
          selectedInvoice={selectedInvoice} handleDownloadInvoice={handleDownloadInvoice} isGeneratingPreview={isGeneratingPreview}
          getFullUrl={getFullUrl} pdfBlobUrl={pdfBlobUrl} previewHtml={previewHtml}
        />`;

content = content.substring(0, startIdx - 8) + replacement + '\n\n        ' + content.substring(finalEndIdx);

// Also add import for InventoryModals
content = content.replace("import MasterDataModals from './components/modals/MasterDataModals';", "import MasterDataModals from './components/modals/MasterDataModals';\nimport InventoryModals from './components/modals/InventoryModals';");

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully replaced InventoryModals in App.jsx');
