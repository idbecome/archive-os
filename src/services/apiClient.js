const getApiUrl = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '5173' || port === '3000') {
        return `${protocol}//${hostname}:5005/api`;
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:5005/api`;
    }
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return `${protocol}//${hostname}:5005/api`;
    }
    return '/api';
};

export const API_URL = getApiUrl();

export const apiClient = {
    async fetchJson(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('archive_token') ? `Bearer ${localStorage.getItem('archive_token')}` : '',
                ...options.headers,
            },
        });
        // Auto-logout on 401: clear stale token and reload to login page
        if (response.status === 401) {
            console.warn('[apiClient] 401 Unauthorized - clearing stale token');
            localStorage.removeItem('archive_token');
            localStorage.removeItem('archive_user');
            window.location.reload();
            throw new Error('Session expired. Please login again.');
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Request failed with status ${response.status}`);
        }
        return response.json();
    },

    async fetchRaw(url, options = {}) {
        const response = await fetch(url, options);
        if (!response.ok) throw response;
        return response;
    },

    async upload(url, formData) {
        const token = localStorage.getItem('archive_token');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    }
};
