# Daily Organization App

A production-ready web application that helps you plan your perfect day by automatically scheduling your habits, tasks, and gym sessions around your work schedule and fixed commitments.

## 🎯 Core Features

### 📅 Smart Daily Planning
- **Input your work schedule** with quick form or paste mode
- **Automatic optimization** that schedules habits, tasks, and gym around your commitments
- **Real-time re-optimization** with drag-and-drop timeline interface
- **Buffer management** with configurable time buffers between activities

### 🔄 Habit Management
- **Persistent habit library** with frequency, duration, and priority settings
- **Flexible scheduling** with preferred time windows and energy level matching
- **Minimum viable options** for when time is tight
- **Cooldown rules** for activities like gym (avoid consecutive days)

### ✅ Task Management
- **Priority-based scheduling** with due dates and urgency scoring
- **Energy-level matching** (high-energy tasks during peak hours)
- **Splittable tasks** for better time management
- **Category organization** for different types of activities

### 💪 Specialized Gym Logic
- **Frequency-based scheduling** (configurable 3-5x per week)
- **Preferred time windows** (after work, morning, evening)
- **Minimum viable workouts** when time is limited
- **Bedtime buffer** to avoid late-night gym sessions

### 📊 Analytics & History
- **Completion tracking** with streaks and success rates
- **Weekly/monthly insights** with performance analytics
- **Pattern recognition** for optimizing future scheduling
- **Export/import functionality** for data backup

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: IndexedDB with Dexie (local-first storage)
- **State Management**: React hooks
- **Date Handling**: date-fns
- **Testing**: Jest (unit tests)

### Core Components

#### 1. Scheduling Engine (`src/lib/scheduling-engine.ts`)
The "brain" of the application that handles:

**Time Slot Calculation**
- Calculates available time slots from sleep schedule minus fixed events
- Handles sleep that crosses midnight
- Respects buffer requirements between blocks

**Priority Scoring Algorithm**
```typescript
// Scoring factors for optimal placement:
- Priority weight (1-5 scale)
- Urgency (due date proximity)
- Time window preference matching
- Energy level alignment
- Fragmentation penalty (prefer longer slots for long tasks)
- Late-night penalty (avoid scheduling near bedtime)
```

**Gym Scheduling Logic**
- Places gym in optimal time windows based on preferences
- Respects frequency requirements and cooldown periods
- Falls back to minimum viable duration when time is limited
- Avoids scheduling too close to bedtime

#### 2. Database Layer (`src/lib/database.ts`)
- **Local-first storage** with IndexedDB
- **Automatic seeding** with sample habits and tasks
- **Data persistence** across sessions
- **Export/import** for backup and migration

#### 3. UI Components
- **Responsive design** with Tailwind CSS
- **Drag-and-drop timeline** for manual adjustments
- **Real-time statistics** and progress tracking
- **Modal forms** for data entry and editing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
cd daily-organization-app
npm install
```

2. **Start the development server**
```bash
npm run dev
```

3. **Open your browser**
Navigate to `http://localhost:3000`

### Building for Production

```bash
npm run build
npm start
```

## 📱 Usage Guide

### 1. Initial Setup (Settings)
- Configure your timezone and default sleep schedule
- Set up gym preferences (frequency, duration, preferred times)
- Adjust planning constraints (buffers, downtime protection)
- Enable/disable notifications

### 2. Create Your Habit Library
- Add habits with duration, frequency, and priority
- Set preferred time windows (morning/afternoon/evening)
- Configure energy levels and flexibility
- Add cooldown rules for gym sessions

### 3. Build Your Task List
- Create tasks with estimated durations
- Set due dates and priorities
- Specify energy requirements and time preferences
- Enable splitting for large tasks

### 4. Daily Planning
- **Today Setup**: Enter your work schedule and fixed commitments
- **Two input modes**:
  - Quick form: Add events one by one
  - Paste mode: Parse text like "Work 9:30am-6pm; Lunch 12-1"
- **Generate Plan**: Algorithm creates optimized schedule
- **Review & Adjust**: Use drag-and-drop to fine-tune

### 5. Execute & Track
- Complete tasks and habits as you go
- Mark items as done with checkboxes
- Lock important blocks to preserve during re-optimization
- Track progress and view statistics

## 🧠 How the Scheduling Algorithm Works

### Step 1: Available Time Calculation
1. Start with sleep schedule (wake to sleep)
2. Subtract fixed events (work, appointments, meals)
3. Apply buffer requirements between blocks
4. Create time slots for scheduling

### Step 2: Item Prioritization
1. **Gym first** (if enabled): Places in optimal window
2. **Habits**: Sort by frequency and priority
3. **Tasks**: Sort by due date urgency and priority
4. **Energy matching**: High-energy tasks in peak hours

### Step 3: Optimal Placement
For each time slot, calculate a score:
```typescript
score = (
  priority * 20 +                    // Base priority
  urgency_bonus +                    // Due date proximity
  time_window_bonus +               // Preferred time match
  energy_match_score +              // Energy level alignment
  slot_duration_bonus -             // Prefer longer slots
  fragmentation_penalty -           // Avoid breaking up time
  late_night_penalty                // Avoid late scheduling
)
```

### Step 4: Conflict Resolution
When no perfect slot exists:
1. Try "minimum viable" duration for habits
2. Split tasks if splittable
3. Defer low-priority items to backlog
4. Suggest next-day scheduling

### Example Scheduling Flow
**Input:**
- Work: 9:30am-6:00pm
- Dinner: 7:00pm-8:00pm
- Sleep: 11:30pm-7:30am
- 3 habits, 3 tasks, gym enabled

**Algorithm decisions:**
1. **Gym**: 8:10pm-9:10pm (after dinner; after-work slot blocked by dinner + buffers)
2. **Morning habits**: 7:30am-8:45am (before work)
3. **High-priority task**: 9:20pm-9:50pm (evening energy match)
4. **Low-priority task**: Moved to tomorrow (insufficient time)

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

### Test Coverage
- **Scheduling engine**: Core algorithm logic
- **Time slot calculation**: Available time computation
- **Text parsing**: Schedule input parsing
- **Edge cases**: Full schedules, disabled features

## 📊 Data Schema

### Daily Input
```json
{
  "date": "2024-01-15",
  "timezone": "America/New_York",
  "sleep": {"start": "23:30", "end": "07:30"},
  "fixedEvents": [
    {"title": "Work", "start": "09:30", "end": "18:00", "type": "work"},
    {"title": "Dinner", "start": "19:00", "end": "20:00", "type": "meal"}
  ],
  "constraints": {
    "buffersBetweenBlocksMin": 10,
    "protectDowntimeMin": 30
  }
}
```

### Generated Plan
```json
{
  "date": "2024-01-15",
  "blocks": [
    {"title": "Morning Meditation", "start": "07:30", "end": "07:45", "type": "habit", "locked": false},
    {"title": "Stretching", "start": "07:55", "end": "08:15", "type": "habit", "locked": false},
    {"title": "Journaling", "start": "08:25", "end": "08:45", "type": "habit", "locked": false},
    {"title": "Work", "start": "09:30", "end": "18:00", "type": "work", "locked": true},
    {"title": "Dinner", "start": "19:00", "end": "20:00", "type": "meal", "locked": true},
    {"title": "Gym Workout", "start": "20:10", "end": "21:10", "type": "gym", "locked": false},
    {"title": "Task: Review emails", "start": "21:20", "end": "21:50", "type": "task", "locked": false},
    {"title": "Task: Prepare report", "start": "22:00", "end": "22:45", "type": "task", "locked": false}
  ],
  "unscheduled": [
    {"title": "Task: Deep study", "reason": "Insufficient contiguous time"}
  ],
  "explanation": "Gym placed after dinner to respect buffers; tasks placed in the late evening; maintained 10-min buffers.",
  "stats": {
    "workHours": 8.5,
    "gymMinutes": 60,
    "habitsCompleted": 3,
    "tasksCompleted": 2,
    "focusBlocks": 0,
    "freeTimeRemaining": 200
  }
}
```

## 🎛️ Configuration Options

### Gym Settings
- **Frequency**: 1-7 times per week
- **Duration**: 20-120 minutes
- **Preferred window**: After work/Morning/Evening
- **Minimum duration**: 10-60 minutes
- **Bedtime buffer**: 30-240 minutes
- **Warmup/Cooldown**: 0-15 minutes each

### Planning Constraints
- **Buffer between blocks**: 5-30 minutes
- **Downtime protection**: 0-120 minutes
- **Commute time**: Optional daily adjustment
- **Meal windows**: Configurable meal times

### Habit Configuration
- **Frequency**: Daily/Weekly/Specific days/X times per week
- **Flexibility**: Fixed/Semi-flexible/Flexible
- **Energy levels**: Low/Medium/High
- **Cooldown days**: 0-7 days between occurrences
- **Minimum viable duration**: Fallback when time is tight

## 🔧 Customization

### Adding New Habit Categories
1. Update the `Habit['category']` type in `src/types/index.ts`
2. Add corresponding icon in `src/app/(dashboard)/habits/page.tsx`
3. Update the seeding logic in `src/lib/database.ts`

### Modifying the Scoring Algorithm
Edit the `scoreItemSlot` method in `src/lib/scheduling-engine.ts`:
```typescript
private scoreItemSlot(slot: TimeSlot, item: Habit | Task, duration: number): number {
  let score = 0;
  
  // Add your custom scoring logic here
  score += customPriorityCalculation(item);
  score += customEnergyMatching(slot, item);
  
  return score;
}
```

### Extending Time Window Preferences
1. Update the `preferredTimeWindow` type
2. Modify the `getEnergyScore` method
3. Add corresponding UI options in habit/task forms

## 🚨 Troubleshooting

### Common Issues

**"No plan found for today"**
- Make sure you've set up your day in "Today Setup"
- Check that your timezone is correctly configured

**Scheduling seems suboptimal**
- Review your habit and task priorities
- Check energy level assignments
- Verify time window preferences

**Gym not being scheduled**
- Ensure gym is enabled in settings
- Check frequency and duration settings
- Verify bedtime buffer isn't too restrictive

**Performance issues**
- Clear browser cache and local storage
- Check for large numbers of habits/tasks
- Consider archiving completed items

### Browser Compatibility
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 12+)
- **Mobile browsers**: Responsive design optimized

## 🤝 Contributing

This project is designed as a complete, production-ready application. To extend functionality:

1. **Add new features** in appropriate page components
2. **Extend scheduling logic** in `scheduling-engine.ts`
3. **Add tests** for new functionality
4. **Update types** in `src/types/index.ts`

## 📄 License

This project is built as a demonstration of full-stack development capabilities and production-ready web application architecture.

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies**
