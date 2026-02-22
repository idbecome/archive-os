const fs = require('fs');
const path = 'c:/Project/archive-os/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

const startStr = '{/* MASTER DATA MODALS */}';
const endStr = '{/* TAX FORM MODAL */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `{/* MASTER DATA MODALS */}
        <MasterDataModals
          modalTab={modalTab}
          userForm={userForm} setUserForm={setUserForm} handleSaveUser={handleSaveUser}
          deptForm={deptForm} setDeptForm={setDeptForm} handleSaveDept={handleSaveDept}
          roleForm={roleForm} setRoleForm={setRoleForm} handleSaveRole={handleSaveRole}
          handleTogglePermission={handleTogglePermission}
          roles={roles} departments={departments} APP_MODULES={APP_MODULES}
        />

        `;
    content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully replaced MasterDataModals in App.jsx');
} else {
    console.log('Pattern not found');
}
