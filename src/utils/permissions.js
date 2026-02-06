export const checkPermission = (currentUser, roles, moduleId, action = 'view') => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;

    // Check granular permissions from roles state
    const userRoleData = roles.find(r => r.id === currentUser.role || r.name === currentUser.role || r.label === currentUser.role);
    // Note: The database column is 'access', heavily dependent on server/db.js schema.
    // Let's support both 'access' (from DB) and 'permissions' (legacy state?)
    let rolePerms = userRoleData ? (userRoleData.access || userRoleData.permissions) : null;

    // Handle stringified JSON from DB
    if (typeof rolePerms === 'string') {
        try { rolePerms = JSON.parse(rolePerms); } catch (e) { rolePerms = {}; }
    }

    if (userRoleData && rolePerms) {
        return rolePerms[moduleId] ? rolePerms[moduleId].includes(action) : false;
    }

    // Simple role-based fallback
    if (currentUser.role === 'staff') {
        if (moduleId === 'master') return false;
        if (action === 'delete') return false;
        return true;
    }
    return false;
};

export const APP_MODULES = {
    dashboard: { id: 'dashboard', label: 'Dashboard' },
    inventory: { id: 'inventory', label: 'Gudang (Inventory)' },
    documents: { id: 'documents', label: 'Dokumen Digital' },
    'tax-monitoring': { id: 'tax-monitoring', label: 'Tax Monitoring' },
    'tax-summary': { id: 'tax-summary', label: 'Tax Summary' },
    master: { id: 'master', label: 'Master Data' }
};
