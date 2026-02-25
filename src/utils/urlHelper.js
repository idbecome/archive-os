export const getFullUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    const { hostname, port, protocol } = window.location;
    const isDev = port === '3000' || port === '5173' || hostname === 'localhost';
    const backendPort = '5005';

    let cleanUrl = url;
    if (cleanUrl.includes(':' + backendPort + '/uploads/')) {
        cleanUrl = '/uploads/' + cleanUrl.split('/uploads/')[1];
    } else if (url.startsWith('uploads/')) {
        cleanUrl = '/' + url;
    }

    // Ambil token terbaru dari storage untuk menghindari 401 setelah reset
    const token = localStorage.getItem('archive_token') || '';
    const authQuery = token ? `token=${token}` : '';

    if (cleanUrl.startsWith('/uploads/')) {
        const baseUrl = isDev ? `${protocol}//${hostname}:${backendPort}` : '';
        const separator = cleanUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${cleanUrl}${authQuery ? separator + authQuery : ''}`;
    }
    return cleanUrl;
};