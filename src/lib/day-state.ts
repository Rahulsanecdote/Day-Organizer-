import { format } from 'date-fns';
import { DataService } from './sync/DataService';

export type DayState = 'uninitialized' | 'active' | 'review';

export class DayStateService {
    static async getCurrentState(): Promise<DayState> {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Check if plan exists for today
            const plan = await DataService.getPlan(today);
            if (!plan) {
                return 'uninitialized';
            }

            // Check if it's late enough for review (e.g. 9PM or all core tasks done?)
            // For now, simple time-based check could work, or explicit toggle.
            // Let's rely on time for the suggestion, but state remains 'active' until explicitly reviewed?
            // Or maybe 'review' is just a suggestion state.

            const currentHour = new Date().getHours();
            if (currentHour >= 21) { // 9 PM
                return 'review';
            }

            return 'active';
        } catch (error) {
            console.error('Failed to determine day state', error);
            return 'uninitialized';
        }
    }

    static async getDashboardRoute(): Promise<string> {
        const state = await this.getCurrentState();
        switch (state) {
            case 'uninitialized':
                return '/morning'; // New wizard route
            case 'active':
                return '/focus';   // New focus route
            case 'review':
                return '/evening'; // New review route
            default:
                return '/morning';
        }
    }
}
