'use client';

import { useState, useEffect } from 'react';
import { format, parse, differenceInMinutes } from 'date-fns';
import { DatabaseService } from '@/lib/database';
import { PlanOutput, ScheduledBlock, UserPreferences } from '@/types';

export default function PlanPage() {
  const [plan, setPlan] = useState<PlanOutput | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    const prefs = await DatabaseService.getPreferences();
    if (prefs) setPreferences(prefs);

    const today = format(new Date(), 'yyyy-MM-dd');
    const existingPlan = await DatabaseService.getPlan(today);

    if (existingPlan) {
      setPlan(existingPlan);
    } else {
      window.location.href = '/today-setup';
    }
  };

  const handleReoptimize = async () => {
    if (!preferences) return;

    setIsOptimizing(true);

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const dailyInput = await DatabaseService.getDailyInput(today, preferences.timezone);

      if (!dailyInput) {
        alert('No daily input found. Please set up your day first.');
        return;
      }

      const habits = await DatabaseService.getAllHabits();
      const tasks = await DatabaseService.getAllTasks();

      const { SchedulingEngine } = await import('@/lib/scheduling-engine');
      const scheduler = new SchedulingEngine(
        dailyInput,
        habits,
        tasks,
        preferences.gymSettings,
        preferences
      );
      const newPlan = scheduler.generatePlan();

      await DatabaseService.savePlan(newPlan);
      setPlan(newPlan);
    } catch (error) {
      console.error('Failed to reoptimize:', error);
      alert('Failed to reoptimize plan. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleToggleCompletion = async (blockId: string) => {
    if (!plan) return;

    const updatedBlocks = plan.blocks.map(block =>
      block.id === blockId
        ? { ...block, completed: !block.completed }
        : block
    );

    const updatedPlan = { ...plan, blocks: updatedBlocks };
    setPlan(updatedPlan);
    await DatabaseService.savePlan(updatedPlan);
  };

  const handleToggleLock = (blockId: string) => {
    if (!plan) return;

    const updatedBlocks = plan.blocks.map(block =>
      block.id === blockId
        ? { ...block, locked: !block.locked }
        : block
    );

    setPlan({ ...plan, blocks: updatedBlocks });
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();

    if (!plan || !draggedBlock || draggedBlock === targetBlockId) return;

    const draggedIndex = plan.blocks.findIndex(b => b.id === draggedBlock);
    const targetIndex = plan.blocks.findIndex(b => b.id === targetBlockId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newBlocks = [...plan.blocks];
    const draggedBlockItem = newBlocks[draggedIndex];

    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlockItem);

    const updatedBlocks = updateBlockTimes(newBlocks);

    setPlan({ ...plan, blocks: updatedBlocks });
    setDraggedBlock(null);
  };

  const updateBlockTimes = (blocks: ScheduledBlock[]): ScheduledBlock[] => {
    const updatedBlocks = [...blocks];
    let currentTime = parse('06:00', 'HH:mm', new Date());

    for (let i = 0; i < updatedBlocks.length; i++) {
      const block = updatedBlocks[i];
      const duration = differenceInMinutes(
        parse(block.end, 'HH:mm', new Date()),
        parse(block.start, 'HH:mm', new Date())
      );

      const newStart = format(currentTime, 'HH:mm');
      const newEnd = format(new Date(currentTime.getTime() + duration * 60000), 'HH:mm');

      updatedBlocks[i] = {
        ...block,
        start: newStart,
        end: newEnd,
      };

      currentTime = new Date(currentTime.getTime() + (duration + 10) * 60000);
    }

    return updatedBlocks;
  };

  const getBlockStyle = (type: ScheduledBlock['type']) => {
    const styles: Record<string, { bg: string; border: string; accent: string }> = {
      work: { bg: 'rgba(122, 158, 159, 0.08)', border: 'var(--color-work)', accent: 'var(--color-work)' },
      gym: { bg: 'rgba(139, 159, 130, 0.08)', border: 'var(--color-gym)', accent: 'var(--color-gym)' },
      habit: { bg: 'rgba(155, 138, 160, 0.08)', border: 'var(--color-habit)', accent: 'var(--color-habit)' },
      task: { bg: 'rgba(196, 163, 90, 0.08)', border: 'var(--color-task)', accent: 'var(--color-task)' },
      meal: { bg: 'rgba(201, 150, 126, 0.08)', border: 'var(--color-meal)', accent: 'var(--color-meal)' },
      break: { bg: 'rgba(163, 158, 154, 0.08)', border: 'var(--color-break)', accent: 'var(--color-break)' },
      sleep: { bg: 'rgba(136, 146, 168, 0.08)', border: 'var(--color-sleep)', accent: 'var(--color-sleep)' },
    };
    return styles[type] || styles.break;
  };

  const getBlockIcon = (type: ScheduledBlock['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'work':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
          </svg>
        );
      case 'gym':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
        );
      case 'habit':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      case 'task':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
      case 'meal':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-.75A2.25 2.25 0 0 0 6.75 6H6A2.25 2.25 0 0 1 3.75 3.75v-.75" />
          </svg>
        );
      case 'break':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
        );
      case 'sleep':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        );
    }
  };

  if (!plan) {
    return (
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-xl p-12 text-center"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)'
          }}
        >
          <p style={{ color: 'var(--color-slate)' }}>No plan found for today. Please set up your day first.</p>
          <button
            onClick={() => window.location.href = '/today-setup'}
            className="mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
            }}
          >
            Set Up Today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div
        className="rounded-xl p-8 flex justify-between items-start"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <div>
          <h1
            className="text-3xl mb-2"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Today's Plan
          </h1>
          <p style={{ color: 'var(--color-slate)' }}>
            {format(new Date(plan.date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              color: 'var(--color-stone)',
              border: '1px solid var(--color-border)'
            }}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
          <button
            onClick={handleReoptimize}
            disabled={isOptimizing}
            className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
            style={{
              background: isOptimizing ? 'var(--color-ivory)' : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
              color: isOptimizing ? 'var(--color-mist)' : 'white',
              boxShadow: isOptimizing ? 'none' : '0 2px 8px rgba(184, 151, 107, 0.3)'
            }}
          >
            {isOptimizing ? 'Optimizing...' : 'Re-optimize'}
          </button>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div
          className="rounded-xl p-8"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <h2
            className="text-lg mb-6"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Daily Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { value: `${plan.stats.workHours}h`, label: 'Work', color: 'var(--color-work)' },
              { value: `${plan.stats.gymMinutes}m`, label: 'Exercise', color: 'var(--color-gym)' },
              { value: plan.stats.habitsCompleted, label: 'Habits', color: 'var(--color-habit)' },
              { value: plan.stats.tasksCompleted, label: 'Tasks', color: 'var(--color-task)' },
              { value: plan.stats.focusBlocks, label: 'Focus Blocks', color: 'var(--color-gold)' },
              { value: `${plan.stats.freeTimeRemaining}m`, label: 'Free Time', color: 'var(--color-mist)' },
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className="text-3xl font-light mb-1"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: stat.color
                  }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs uppercase tracking-wider"
                  style={{ color: 'var(--color-mist)' }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <h2
          className="text-lg mb-8"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-charcoal)'
          }}
        >
          Timeline
        </h2>

        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute left-[3.5rem] top-0 bottom-0 w-px"
            style={{ background: 'var(--color-border)' }}
          />

          <div className="space-y-4">
            {plan.blocks.map((block) => {
              const style = getBlockStyle(block.type);
              return (
                <div
                  key={block.id}
                  draggable={!block.locked}
                  onDragStart={(e) => handleDragStart(e, block.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, block.id)}
                  className="relative flex items-center gap-6 group transition-all duration-200"
                  style={{ opacity: block.completed ? 0.6 : 1 }}
                >
                  {/* Time indicator */}
                  <div className="relative z-10 flex-shrink-0 w-14 text-right">
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--color-stone)' }}
                    >
                      {block.start}
                    </span>
                  </div>

                  {/* Timeline dot */}
                  <div
                    className="relative z-10 flex-shrink-0 w-3 h-3 rounded-full border-2"
                    style={{
                      background: block.completed ? style.accent : 'var(--color-surface)',
                      borderColor: style.accent
                    }}
                  />

                  {/* Block card */}
                  <div
                    className="flex-1 p-5 rounded-xl transition-all duration-200 cursor-pointer"
                    style={{
                      background: style.bg,
                      borderLeft: `3px solid ${style.border}`,
                      boxShadow: block.locked ? 'none' : 'var(--shadow-soft)'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span style={{ color: style.accent }}>
                          {getBlockIcon(block.type)}
                        </span>
                        <div>
                          <h3
                            className="font-medium mb-0.5"
                            style={{
                              color: 'var(--color-charcoal)',
                              textDecoration: block.completed ? 'line-through' : 'none'
                            }}
                          >
                            {block.title}
                          </h3>
                          <p
                            className="text-sm"
                            style={{ color: 'var(--color-slate)' }}
                          >
                            {block.start} – {block.end}
                            {block.energyLevel && (
                              <span style={{ color: 'var(--color-mist)' }}> · {block.energyLevel} energy</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleToggleLock(block.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{
                            background: block.locked ? 'var(--color-ivory)' : 'transparent',
                            color: block.locked ? 'var(--color-gold-dark)' : 'var(--color-mist)'
                          }}
                          title={block.locked ? 'Unlock' : 'Lock'}
                        >
                          {block.locked ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => handleToggleCompletion(block.id)}
                          className="p-2 rounded-lg transition-colors"
                          style={{
                            background: block.completed ? 'rgba(139, 159, 130, 0.15)' : 'transparent',
                            color: block.completed ? 'var(--color-gym)' : 'var(--color-mist)'
                          }}
                          title={block.completed ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {block.completed ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div
        className="rounded-xl p-8"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-soft)'
        }}
      >
        <h2
          className="text-lg mb-4"
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            color: 'var(--color-charcoal)'
          }}
        >
          Schedule Notes
        </h2>
        <p style={{ color: 'var(--color-stone)', lineHeight: 1.7 }}>{plan.explanation}</p>
      </div>

      {/* Unscheduled Items */}
      {plan.unscheduled.length > 0 && (
        <div
          className="rounded-xl p-8"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <h2
            className="text-lg mb-6"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Unscheduled Items
          </h2>
          <div className="space-y-3">
            {plan.unscheduled.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg"
                style={{
                  background: 'rgba(196, 163, 90, 0.06)',
                  border: '1px solid rgba(196, 163, 90, 0.2)'
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      className="font-medium"
                      style={{ color: 'var(--color-charcoal)' }}
                    >
                      {item.title}
                    </h4>
                    <p
                      className="text-sm mt-1"
                      style={{ color: 'var(--color-slate)' }}
                    >
                      {item.reason}
                    </p>
                  </div>
                  {item.priority && (
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: 'rgba(196, 163, 90, 0.15)',
                        color: 'var(--color-gold-dark)'
                      }}
                    >
                      Priority {item.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Day Suggestions */}
      {plan.nextDaySuggestions && plan.nextDaySuggestions.length > 0 && (
        <div
          className="rounded-xl p-8"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <h2
            className="text-lg mb-6"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: 'var(--color-charcoal)'
            }}
          >
            Suggestions for Tomorrow
          </h2>
          <ul className="space-y-3">
            {plan.nextDaySuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3">
                <span
                  className="mt-0.5"
                  style={{ color: 'var(--color-gold)' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </span>
                <span style={{ color: 'var(--color-stone)' }}>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}