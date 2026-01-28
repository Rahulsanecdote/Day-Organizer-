/**
 * Database Service Tests
 * 
 * Demonstrates how to test code that depends on DatabaseService
 * by using dependency injection with mock databases.
 */

import { DatabaseServiceImpl, AppDatabase } from '../lib/database';

// Type for mock table operations
type MockTable = {
    filter: jest.Mock;
    get: jest.Mock;
    put: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
    bulkAdd: jest.Mock;
    bulkPut: jest.Mock;
    toArray: jest.Mock;
    clear: jest.Mock;
    add: jest.Mock;
    orderBy: jest.Mock;
    where: jest.Mock;
};

function createMockTable(): MockTable {
    const mockTable: MockTable = {
        filter: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        get: jest.fn().mockResolvedValue(undefined),
        put: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(1),
        count: jest.fn().mockResolvedValue(0),
        bulkAdd: jest.fn().mockResolvedValue([]),
        bulkPut: jest.fn().mockResolvedValue([]),
        toArray: jest.fn().mockResolvedValue([]),
        clear: jest.fn().mockResolvedValue(undefined),
        add: jest.fn().mockResolvedValue('id'),
        orderBy: jest.fn().mockReturnValue({
            reverse: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            })
        }),
        where: jest.fn().mockReturnValue({
            between: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([])
            })
        }),
    };
    return mockTable;
}

function createMockDatabase(): AppDatabase {
    return {
        habits: createMockTable(),
        tasks: createMockTable(),
        dailyInputs: createMockTable(),
        plans: createMockTable(),
        preferences: createMockTable(),
        history: createMockTable(),
        assistantLogs: createMockTable(),
        tomorrowSuggestions: createMockTable(),
        featureFlags: createMockTable(),
        delete: jest.fn().mockResolvedValue(undefined),
        transaction: jest.fn().mockImplementation((_mode, _tables, callback) => callback()),
    } as unknown as AppDatabase;
}

describe('DatabaseService', () => {
    let mockDb: AppDatabase;
    let service: DatabaseServiceImpl;

    beforeEach(() => {
        mockDb = createMockDatabase();
        service = new DatabaseServiceImpl(mockDb);
    });

    describe('Habits Operations', () => {
        it('should get all active habits', async () => {
            const mockHabits = [
                { id: '1', name: 'Exercise', isActive: true },
                { id: '2', name: 'Reading', isActive: true },
            ];

            (mockDb.habits.filter as jest.Mock).mockReturnValue({
                toArray: jest.fn().mockResolvedValue(mockHabits)
            });

            const habits = await service.getAllHabits();

            expect(mockDb.habits.filter).toHaveBeenCalled();
            expect(habits).toEqual(mockHabits);
        });

        it('should get a habit by id', async () => {
            const mockHabit = { id: '1', name: 'Exercise', isActive: true };
            (mockDb.habits.get as jest.Mock).mockResolvedValue(mockHabit);

            const habit = await service.getHabit('1');

            expect(mockDb.habits.get).toHaveBeenCalledWith('1');
            expect(habit).toEqual(mockHabit);
        });

        it('should save a habit', async () => {
            const mockHabit = { id: '1', name: 'Meditation', isActive: true };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await service.saveHabit(mockHabit as any);

            expect(mockDb.habits.put).toHaveBeenCalledWith(mockHabit);
        });

        it('should soft-delete a habit by setting isActive to false', async () => {
            await service.deleteHabit('1');

            expect(mockDb.habits.update).toHaveBeenCalledWith('1', { isActive: false });
        });
    });

    describe('Tasks Operations', () => {
        it('should get all active tasks', async () => {
            const mockTasks = [
                { id: '1', title: 'Task 1', isActive: true },
            ];

            (mockDb.tasks.filter as jest.Mock).mockReturnValue({
                toArray: jest.fn().mockResolvedValue(mockTasks)
            });

            const tasks = await service.getAllTasks();

            expect(mockDb.tasks.filter).toHaveBeenCalled();
            expect(tasks).toEqual(mockTasks);
        });

        it('should complete a task', async () => {
            await service.completeTask('1');

            expect(mockDb.tasks.update).toHaveBeenCalledWith('1', expect.objectContaining({
                isCompleted: true,
            }));
        });
    });

    describe('Feature Flags', () => {
        it('should get a feature flag', async () => {
            (mockDb.featureFlags.get as jest.Mock).mockResolvedValue({ key: 'test', enabled: true });

            const enabled = await service.getFeatureFlag('test');

            expect(mockDb.featureFlags.get).toHaveBeenCalledWith('test');
            expect(enabled).toBe(true);
        });

        it('should return false for non-existent feature flag', async () => {
            (mockDb.featureFlags.get as jest.Mock).mockResolvedValue(undefined);

            const enabled = await service.getFeatureFlag('nonexistent');

            expect(enabled).toBe(false);
        });

        it('should set a feature flag', async () => {
            await service.setFeatureFlag('test', true);

            expect(mockDb.featureFlags.put).toHaveBeenCalledWith({ key: 'test', enabled: true });
        });
    });

    describe('Preferences', () => {
        it('should get default preferences', async () => {
            const prefs = await service.getDefaultPreferences();

            expect(prefs).toHaveProperty('timezone');
            expect(prefs).toHaveProperty('defaultSleepStart');
            expect(prefs).toHaveProperty('defaultSleepEnd');
            expect(prefs).toHaveProperty('gymSettings');
        });

        it('should save preferences', async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockPrefs = { timezone: 'America/New_York' } as any;

            await service.savePreferences(mockPrefs);

            expect(mockDb.preferences.clear).toHaveBeenCalled();
            expect(mockDb.preferences.add).toHaveBeenCalledWith(mockPrefs);
        });
    });
});

describe('DatabaseService Dependency Injection', () => {
    it('should allow creating isolated test instances', () => {
        const mockDb1 = createMockDatabase();
        const mockDb2 = createMockDatabase();

        const service1 = new DatabaseServiceImpl(mockDb1);
        const service2 = new DatabaseServiceImpl(mockDb2);

        // Each service operates on its own database
        expect(service1).not.toBe(service2);
    });

    it('should demonstrate mocking workflow', async () => {
        // Arrange: Create a mock database with specific behavior
        const mockDb = createMockDatabase();
        const mockHabits = [{ id: '1', name: 'Test Habit' }];
        (mockDb.habits.filter as jest.Mock).mockReturnValue({
            toArray: jest.fn().mockResolvedValue(mockHabits)
        });

        // Act: Use the service with the mock
        const service = new DatabaseServiceImpl(mockDb);
        const habits = await service.getAllHabits();

        // Assert: Verify the mock was called and returned expected data
        expect(habits).toEqual(mockHabits);
        expect(mockDb.habits.filter).toHaveBeenCalled();
    });
});
