import { io } from 'socket.io-client';

/**
 * Socket.IO Client Service
 * Singleton socket connection for real-time data sync across multiple browser sessions.
 */

const getServerUrl = () => {
    const { hostname, port, protocol } = window.location;
    // Dev server (Vite)
    if (port === '5173' || port === '3000') {
        return `${protocol}//${hostname}:5005`;
    }
    // Localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:5005`;
    }
    // Direct IP access (LAN)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        return `${protocol}//${hostname}:5005`;
    }
    // Production (same origin)
    return '';
};

let socket = null;

export const getSocket = () => {
    if (!socket) {
        const url = getServerUrl();
        socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socket.on('connect', () => {
            console.log('[Socket.IO] Connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket.IO] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.warn('[Socket.IO] Connection error:', err.message);
        });
    }
    return socket;
};

/**
 * Subscribe to a data:changed event for a specific channel.
 * Returns an unsubscribe function.
 */
export const onDataChange = (callback) => {
    const s = getSocket();
    s.on('data:changed', callback);
    return () => s.off('data:changed', callback);
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
