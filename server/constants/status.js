/**
 * Centralized Status Constants
 * 
 * Use these constants instead of string literals to prevent
 * inconsistencies between controllers, workers, and queries.
 */

// --- OCR Job Queue Statuses (job_queue table) ---
export const JOB_STATUS = {
    WAITING: 'waiting',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// --- Document Statuses (documents table) ---
export const DOC_STATUS = {
    READY: 'ready',
    PROCESSING: 'processing', // OCR sedang berjalan
    DONE: 'done'              // OCR selesai
};

// --- Approval Statuses (approvals table) ---
export const APPROVAL_STATUS = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected'
};
