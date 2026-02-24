const getApiUrl = () => {
    const { hostname, port, protocol } = window.location;
    if (port === '5173' || port === '3000' || hostname === 'localhost') {
        return `${protocol}//${hostname}:5000/api`;
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
                ...options.headers,
            },
        });
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
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        return response.json();
    }
};
