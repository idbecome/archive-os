const fs = require('fs');
const path = 'c:/Project/archive-os/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = "{modalTab === 'doc-view' && viewDocData && (";
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
    console.log('Start pattern not found');
    process.exit(1);
}

// Find the matching closing bracket for the modalTab === 'doc-view' condition
// The start string is `{modalTab === 'doc-view' && viewDocData && (` (length 46)
// We need to look for the next `)}` that balances the parenthesis block.

// Instead of complex AST parsing, we know the next sibling condition is `{(modalTab === 'details' || modalTab === 'history' || modalTab === 'invoice-detail') && (`
const nextSiblingStr = "{(modalTab === 'details' || modalTab === 'history' || modalTab === 'invoice-detail') && (";
const indexSibling = content.indexOf(nextSiblingStr, startIdx);

if (indexSibling === -1) {
    console.log('Next sibling not found');
    process.exit(1);
}

// The replacement should be injected right before the next sibling.
// Wait! Let's just find the closing bracket `)}` just prior to the nextSiblingStr.
const beforeSibling = content.substring(startIdx, indexSibling);
const lastBraceIndex = beforeSibling.lastIndexOf(')}');

if (lastBraceIndex === -1) {
    console.log('End pattern not found');
    process.exit(1);
}

const finalEndIdx = startIdx + lastBraceIndex + 2;

const replacement = `<DocumentViewerModal
          modalTab={modalTab}
          viewDocData={viewDocData}
          handleDownload={handleDownload}
          isGeneratingPreview={isGeneratingPreview}
          getFullUrl={getFullUrl}
          pdfBlobUrl={pdfBlobUrl}
          previewHtml={previewHtml}
          handleRestoreVersion={handleRestoreVersion}
        />
        `;

content = content.substring(0, startIdx - 9) + replacement + content.substring(finalEndIdx);

// Also add import for DocumentViewerModal
content = content.replace("import MasterDataModals from './components/modals/MasterDataModals';", "import MasterDataModals from './components/modals/MasterDataModals';\nimport DocumentViewerModal from './components/modals/DocumentViewerModal';");

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully replaced DocumentViewerModal in App.jsx');
