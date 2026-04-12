/**
 * @jest-environment jsdom
 *
 * Sync Conflict Resolution Tests
 *
 * The SyncService uses a "local-wins" conflict resolution strategy:
 * if a record has a pending local change, incoming remote data for the
 * same record is skipped. These tests verify that queuing, deduplication,
 * status tracking, and subscription management all work correctly.
 *
 * jsdom is required so that the real localStorage API is available
 * (SyncService reads/writes localStorage for pending change persistence).
 */

import { SyncService } from '../lib/sync/SyncService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset singleton and wipe localStorage between tests. */
function reset() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (SyncService as any).instance = undefined;
    localStorage.clear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncService — queue & status', () => {
    beforeEach(reset);

    it('starts with no pending changes', () => {
        const service = SyncService.getInstance();
        const status = service.getStatus();
        expect(status.pendingCount).toBe(0);
        expect(status.isSyncing).toBe(false);
        expect(status.lastSyncAt).toBeNull();
    });

    it('queueChange increments pending count', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'habit-1', 'insert', { name: 'Meditation' });
        expect(service.getStatus().pendingCount).toBe(1);
    });

    it('queueChange replaces an existing pending change for the same record', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'habit-1', 'insert', { name: 'Old Name' });
        service.queueChange('habits', 'habit-1', 'update', { name: 'New Name' });
        // Deduplication: same record → still 1 pending entry
        expect(service.getStatus().pendingCount).toBe(1);
    });

    it('different records produce separate pending entries', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'habit-1', 'insert', { name: 'Habit A' });
        service.queueChange('habits', 'habit-2', 'insert', { name: 'Habit B' });
        expect(service.getStatus().pendingCount).toBe(2);
    });

    it('persists pending changes to localStorage', () => {
        const service = SyncService.getInstance();
        service.queueChange('tasks', 'task-1', 'insert', { title: 'Task A' });
        const stored = localStorage.getItem('sync_pending_changes');
        expect(stored).not.toBeNull();
        expect(stored).toContain('task-1');
    });

    it('loads persisted pending changes on construction', () => {
        // Populate localStorage BEFORE constructing the new instance
        const existingChanges = [{
            id: 'tasks-task-99-000',
            table: 'tasks',
            recordId: 'task-99',
            operation: 'insert',
            data: { title: 'Persisted Task' },
            timestamp: new Date().toISOString(),
            retryCount: 0,
        }];
        localStorage.setItem('sync_pending_changes', JSON.stringify(existingChanges));

        const freshService = SyncService.getInstance();
        expect(freshService.getStatus().pendingCount).toBe(1);
    });
});

describe('SyncService — conflict resolution policy (local-wins)', () => {
    beforeEach(reset);

    it('queuing a change for a record marks it as locally modified', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'habit-1', 'insert', { name: 'Local Version' });
        expect(service.getStatus().pendingCount).toBeGreaterThan(0);
    });

    it('only the latest change for a record is retained (no stale data leak)', () => {
        const service = SyncService.getInstance();
        service.queueChange('tasks', 'task-1', 'insert', { title: 'First Write' });
        service.queueChange('tasks', 'task-1', 'update', { title: 'Second Write' });

        const stored = JSON.parse(localStorage.getItem('sync_pending_changes') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].data.title).toBe('Second Write');
    });

    it('a delete operation supersedes a prior insert for the same record', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'habit-1', 'insert', { name: 'Alive' });
        service.queueChange('habits', 'habit-1', 'delete', {});

        const stored = JSON.parse(localStorage.getItem('sync_pending_changes') || '[]');
        expect(stored).toHaveLength(1);
        expect(stored[0].operation).toBe('delete');
    });

    it('changes from different tables are tracked independently', () => {
        const service = SyncService.getInstance();
        service.queueChange('habits', 'record-1', 'insert', {});
        service.queueChange('tasks', 'record-1', 'insert', {});
        // Same recordId but different tables → two entries
        expect(service.getStatus().pendingCount).toBe(2);
    });
});

describe('SyncService — status subscriptions', () => {
    beforeEach(reset);

    it('notifies subscribers when a change is queued', () => {
        const service = SyncService.getInstance();
        const listener = jest.fn();
        service.onStatusChange(listener);
        service.queueChange('tasks', 'task-1', 'insert', { title: 'Test' });
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ pendingCount: 1 }));
    });

    it('supports multiple subscribers independently', () => {
        const service = SyncService.getInstance();
        const listener1 = jest.fn();
        const listener2 = jest.fn();
        service.onStatusChange(listener1);
        service.onStatusChange(listener2);
        service.queueChange('tasks', 'task-1', 'insert', { title: 'Test' });
        expect(listener1).toHaveBeenCalledTimes(1);
        expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops future notifications', () => {
        const service = SyncService.getInstance();
        const listener = jest.fn();
        const unsubscribe = service.onStatusChange(listener);
        unsubscribe();
        service.queueChange('tasks', 'task-1', 'insert', { title: 'Test' });
        expect(listener).not.toHaveBeenCalled();
    });

    it('getStatus returns the correct shape', () => {
        const service = SyncService.getInstance();
        const status = service.getStatus();
        expect(status).toHaveProperty('pendingCount');
        expect(status).toHaveProperty('isSyncing');
        expect(status).toHaveProperty('lastSyncAt');
        expect(status).toHaveProperty('lastError');
    });
});
