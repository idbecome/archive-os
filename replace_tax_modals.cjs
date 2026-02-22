const fs = require('fs');
const path = 'c:/Project/archive-os/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = "{/* TAX FORM MODAL */}";
const startIdx = content.indexOf(startStr);

if (startIdx === -1) {
    console.log('Start pattern not found');
    process.exit(1);
}

const endStr = "</Modal>";
const endIdx = content.indexOf(endStr, startIdx);

if (endIdx === -1) {
    console.log('End pattern not found');
    process.exit(1);
}

// Find the last closing brace BEFORE </Modal>
const beforeEnd = content.substring(startIdx, endIdx);
const lastBraceIndex = beforeEnd.lastIndexOf('}');
const finalEndIdx = startIdx + lastBraceIndex + 1;

const replacement = `<TaxModals
          modalTab={modalTab}
          taxForm={taxForm}
          setTaxForm={setTaxForm}
          handleAddTaxField={handleAddTaxField}
          handleDeleteTaxField={handleDeleteTaxField}
          handleSaveTaxSummary={handleSaveTaxSummary}
        />`;

content = content.substring(0, startIdx) + replacement + '\n      ' + content.substring(endIdx);

content = content.replace("import MasterDataModals from './components/modals/MasterDataModals';", "import MasterDataModals from './components/modals/MasterDataModals';\nimport TaxModals from './components/modals/TaxModals';");

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully replaced TaxModals in App.jsx');
