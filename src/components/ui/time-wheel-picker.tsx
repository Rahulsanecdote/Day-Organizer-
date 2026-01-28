"use client";

import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useMemo,
    forwardRef,
    useImperativeHandle,
} from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export interface TimeWheelPickerProps {
    /** Current time value in "HH:mm" 24-hour format */
    value: string;
    /** Callback when time changes */
    onChange: (time: string) => void;
    /** Callback when picker closes */
    onClose: () => void;
    /** Display format: 12-hour or 24-hour */
    format?: "12h" | "24h";
    /** Minute step (1, 5, 10, 15, 30) */
    minuteStep?: 1 | 5 | 10 | 15 | 30;
    /** Label for the picker header */
    label?: string;
    /** Show sleep duration preview (requires otherTime for calculation) */
    showDuration?: boolean;
    /** Other time for duration calculation (in "HH:mm" format) */
    otherTime?: string;
    /** Whether this is bedtime (true) or wake time (false) - affects duration calculation */
    isBedtime?: boolean;
}

export interface TimeWheelPickerRef {
    /** Get the currently selected time */
    getValue: () => string;
}

interface WheelProps {
    items: { value: number | string; label: string }[];
    selectedValue: number | string;
    onChange: (value: number | string) => void;
    visibleItems: number;
    itemHeight: number;
    loop?: boolean;
    ariaLabel: string;
}

// ============================================================================
// Time Utility Functions
// ============================================================================

/**
 * Parse "HH:mm" string to { hours, minutes }
 */
export function parseTime(time: string): { hours: number; minutes: number } {
    const [h, m] = time.split(":").map(Number);
    return { hours: h || 0, minutes: m || 0 };
}

/**
 * Format hours and minutes to "HH:mm" string
 */
export function formatTime24(hours: number, minutes: number): string {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Convert 24-hour to 12-hour format
 */
export function to12Hour(hours: number): { hour12: number; period: "AM" | "PM" } {
    const period = hours >= 12 ? "PM" : "AM";
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, period };
}

/**
 * Convert 12-hour to 24-hour format
 */
export function to24Hour(hour12: number, period: "AM" | "PM"): number {
    if (period === "AM") {
        return hour12 === 12 ? 0 : hour12;
    } else {
        return hour12 === 12 ? 12 : hour12 + 12;
    }
}

/**
 * Format time for display in 12-hour format
 */
export function formatTime12(hours: number, minutes: number): string {
    const { hour12, period } = to12Hour(hours);
    return `${hour12.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Calculate sleep duration between bedtime and wake time
 * Handles midnight crossing gracefully
 */
export function calculateSleepDuration(
    bedtime: string,
    wakeTime: string
): { hours: number; minutes: number } {
    const bed = parseTime(bedtime);
    const wake = parseTime(wakeTime);

    const bedMinutes = bed.hours * 60 + bed.minutes;
    let wakeMinutes = wake.hours * 60 + wake.minutes;

    // If wake time is earlier, add 24 hours (midnight crossing)
    if (wakeMinutes <= bedMinutes) {
        wakeMinutes += 24 * 60;
    }

    const durationMinutes = wakeMinutes - bedMinutes;
    return {
        hours: Math.floor(durationMinutes / 60),
        minutes: durationMinutes % 60,
    };
}

/**
 * Format duration for display
 */
export function formatDuration(hours: number, minutes: number): string {
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}

// ============================================================================
// ScrollWheel Component (reused from date picker with time-specific tweaks)
// ============================================================================

const ScrollWheel: React.FC<WheelProps> = ({
    items,
    selectedValue,
    onChange,
    visibleItems,
    itemHeight,
    loop = false,
    ariaLabel,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrollTop = useRef(0);
    const velocityRef = useRef(0);
    const lastTimeRef = useRef(0);
    const animationRef = useRef<number | null>(null);

    // Calculate dimensions
    const containerHeight = itemHeight * visibleItems;
    const paddingItems = Math.floor(visibleItems / 2);

    // For looping, create a virtual list that's 3x the original
    const virtualItems = useMemo(() => {
        if (!loop) return items;
        return [...items, ...items, ...items];
    }, [items, loop]);

    // Get the scroll position for a value
    const getScrollTopForValue = useCallback(
        (value: number | string): number => {
            let index = items.findIndex((item) => item.value === value);
            if (index === -1) index = 0;

            if (loop) {
                // Center section (second copy)
                index += items.length;
            }

            return index * itemHeight;
        },
        [items, itemHeight, loop]
    );

    // Get the value from scroll position
    const getValueFromScrollTop = useCallback(
        (scrollTop: number): number | string => {
            const index = Math.round(scrollTop / itemHeight);
            const normalizedIndex = loop
                ? ((index % items.length) + items.length) % items.length
                : Math.max(0, Math.min(index, items.length - 1));
            return items[normalizedIndex]?.value ?? items[0]?.value;
        },
        [items, itemHeight, loop]
    );

    // Snap to nearest item
    const snapToNearest = useCallback(
        (currentScrollTop: number, velocity: number = 0) => {
            if (!containerRef.current) return;

            // Apply momentum
            let targetScroll = currentScrollTop + velocity * 120;

            // Snap to nearest item
            const nearestIndex = Math.round(targetScroll / itemHeight);
            targetScroll = nearestIndex * itemHeight;

            // Handle loop boundaries
            if (loop) {
                const minCenter = items.length * itemHeight;
                const maxCenter = items.length * 2 * itemHeight;

                if (targetScroll < minCenter - items.length * itemHeight * 0.5) {
                    targetScroll += items.length * itemHeight;
                } else if (targetScroll > maxCenter + items.length * itemHeight * 0.5) {
                    targetScroll -= items.length * itemHeight;
                }
            } else {
                targetScroll = Math.max(
                    0,
                    Math.min(targetScroll, (items.length - 1) * itemHeight)
                );
            }

            // Smooth scroll animation
            const startScroll = containerRef.current.scrollTop;
            const distance = targetScroll - startScroll;
            const duration = 250;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const easeOut = 1 - Math.pow(1 - progress, 3);

                if (containerRef.current) {
                    containerRef.current.scrollTop = startScroll + distance * easeOut;
                }

                if (progress < 1) {
                    animationRef.current = requestAnimationFrame(animate);
                } else {
                    // Normalize loop position after animation
                    if (loop && containerRef.current) {
                        const currentScroll = containerRef.current.scrollTop;
                        const minCenter = items.length * itemHeight;
                        const maxCenter = items.length * 2 * itemHeight - itemHeight;

                        if (currentScroll < minCenter || currentScroll > maxCenter) {
                            const normalizedIndex =
                                Math.round(currentScroll / itemHeight) % items.length;
                            const newScroll = (normalizedIndex + items.length) * itemHeight;
                            containerRef.current.scrollTop = newScroll;
                        }
                    }

                    // Update value
                    const newValue = getValueFromScrollTop(
                        containerRef.current?.scrollTop ?? 0
                    );
                    if (newValue !== selectedValue) {
                        onChange(newValue);
                    }
                }
            };

            animationRef.current = requestAnimationFrame(animate);
        },
        [items, itemHeight, loop, getValueFromScrollTop, onChange, selectedValue]
    );

    // Handle scroll events
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const currentScrollTop = containerRef.current.scrollTop;
        const currentTime = performance.now();

        // Calculate velocity
        const timeDelta = currentTime - lastTimeRef.current;
        if (timeDelta > 0) {
            velocityRef.current =
                (currentScrollTop - lastScrollTop.current) / timeDelta;
        }

        lastScrollTop.current = currentScrollTop;
        lastTimeRef.current = currentTime;

        // Debounce snap
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            snapToNearest(currentScrollTop, velocityRef.current);
            velocityRef.current = 0;
        }, 80);
    }, [snapToNearest]);

    // Initialize scroll position
    useEffect(() => {
        if (containerRef.current) {
            const targetScroll = getScrollTopForValue(selectedValue);
            containerRef.current.scrollTop = targetScroll;
            lastScrollTop.current = targetScroll;
        }
    }, [selectedValue, getScrollTopForValue]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            let currentIndex = items.findIndex((item) => item.value === selectedValue);

            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    currentIndex = loop
                        ? (currentIndex - 1 + items.length) % items.length
                        : Math.max(0, currentIndex - 1);
                    onChange(items[currentIndex].value);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    currentIndex = loop
                        ? (currentIndex + 1) % items.length
                        : Math.min(items.length - 1, currentIndex + 1);
                    onChange(items[currentIndex].value);
                    break;
            }
        },
        [items, selectedValue, onChange, loop]
    );

    return (
        <div
            className="relative select-none focus:outline-none"
            style={{ height: containerHeight }}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Gradient overlays */}
            <div
                className="pointer-events-none absolute left-0 right-0 top-0 z-10"
                style={{
                    height: paddingItems * itemHeight,
                    background:
                        "linear-gradient(to bottom, var(--color-surface, #1a1a1a) 0%, transparent 100%)",
                }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
                style={{
                    height: paddingItems * itemHeight,
                    background:
                        "linear-gradient(to top, var(--color-surface, #1a1a1a) 0%, transparent 100%)",
                }}
            />

            {/* Selection highlight */}
            <div
                className="pointer-events-none absolute left-0 right-0 z-5"
                style={{
                    top: paddingItems * itemHeight,
                    height: itemHeight,
                    background: "rgba(99, 102, 241, 0.15)",
                    borderTop: "1px solid rgba(99, 102, 241, 0.4)",
                    borderBottom: "1px solid rgba(99, 102, 241, 0.4)",
                }}
            />

            {/* Scrollable container */}
            <div
                ref={containerRef}
                className="h-full overflow-y-auto scrollbar-hide"
                style={{
                    scrollBehavior: "auto",
                    WebkitOverflowScrolling: "touch",
                }}
                onScroll={handleScroll}
            >
                {/* Top padding */}
                <div style={{ height: paddingItems * itemHeight }} />

                {/* Items */}
                {virtualItems.map((item, index) => {
                    const isSelected = item.value === selectedValue;

                    return (
                        <div
                            key={`${item.value}-${index}`}
                            role="option"
                            aria-selected={isSelected}
                            className={cn(
                                "flex items-center justify-center transition-all duration-100 cursor-pointer",
                                isSelected
                                    ? "text-xl font-semibold text-indigo-400"
                                    : "text-base text-zinc-500"
                            )}
                            style={{
                                height: itemHeight,
                            }}
                            onClick={() => onChange(item.value)}
                        >
                            {item.label}
                        </div>
                    );
                })}

                {/* Bottom padding */}
                <div style={{ height: paddingItems * itemHeight }} />
            </div>
        </div>
    );
};

// ============================================================================
// TimeWheelPicker Component
// ============================================================================

export const TimeWheelPicker = forwardRef<TimeWheelPickerRef, TimeWheelPickerProps>(
    (
        {
            value,
            onChange,
            onClose,
            format = "12h",
            minuteStep = 1,
            label = "Select Time",
            showDuration = false,
            otherTime,
            isBedtime = true,
        },
        ref
    ) => {
        const [mounted, setMounted] = useState(false);
        const modalRef = useRef<HTMLDivElement>(null);

        // Parse initial value
        const parsed = parseTime(value);
        const initial12 = to12Hour(parsed.hours);

        // Local state for wheels
        const [hour, setHour] = useState(
            format === "12h" ? initial12.hour12 : parsed.hours
        );
        const [minute, setMinute] = useState(parsed.minutes);
        const [period, setPeriod] = useState<"AM" | "PM">(initial12.period);

        // Generate items
        const hourItems = useMemo(() => {
            if (format === "24h") {
                return Array.from({ length: 24 }, (_, i) => ({
                    value: i,
                    label: i.toString().padStart(2, "0"),
                }));
            }
            return Array.from({ length: 12 }, (_, i) => ({
                value: i + 1,
                label: (i + 1).toString().padStart(2, "0"),
            }));
        }, [format]);

        const minuteItems = useMemo(() => {
            const items = [];
            for (let i = 0; i < 60; i += minuteStep) {
                items.push({
                    value: i,
                    label: i.toString().padStart(2, "0"),
                });
            }
            return items;
        }, [minuteStep]);

        const periodItems = [
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
        ];

        // Get current time in 24h format
        const getCurrentTime24 = useCallback((): string => {
            const hours = format === "12h" ? to24Hour(hour as number, period) : (hour as number);
            return formatTime24(hours, minute);
        }, [format, hour, minute, period]);

        // Calculate duration if needed
        const duration = useMemo(() => {
            if (!showDuration || !otherTime) return null;

            const currentTime = getCurrentTime24();
            if (isBedtime) {
                return calculateSleepDuration(currentTime, otherTime);
            } else {
                return calculateSleepDuration(otherTime, currentTime);
            }
        }, [showDuration, otherTime, isBedtime, getCurrentTime24]);

        // Expose ref
        useImperativeHandle(ref, () => ({
            getValue: getCurrentTime24,
        }));

        useEffect(() => {
            // eslint-disable-next-line
            setMounted(true);
        }, []);

        // Handle ESC key
        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    onClose();
                }
            };
            document.addEventListener("keydown", handleKeyDown);
            return () => document.removeEventListener("keydown", handleKeyDown);
        }, [onClose]);

        // Handle click outside
        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                    onClose();
                }
            };
            // Delay adding listener to prevent immediate close
            const timeout = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 100);
            return () => {
                clearTimeout(timeout);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, [onClose]);

        // Focus trap
        useEffect(() => {
            const previousFocus = document.activeElement as HTMLElement;
            modalRef.current?.focus();
            return () => {
                previousFocus?.focus();
            };
        }, []);

        // Prevent body scroll
        useEffect(() => {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }, []);

        const handleDone = () => {
            onChange(getCurrentTime24());
            onClose();
        };

        const handleCancel = () => {
            onClose();
        };

        if (!mounted) return null;

        const content = (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    aria-hidden="true"
                />

                {/* Modal */}
                <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={label}
                    tabIndex={-1}
                    className={cn(
                        "relative w-full sm:max-w-sm mx-auto",
                        "bg-zinc-900 border border-zinc-700",
                        "rounded-t-3xl sm:rounded-2xl",
                        "shadow-2xl",
                        "animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-300",
                        "focus:outline-none"
                    )}
                >
                    {/* Handle bar (mobile) */}
                    <div className="flex justify-center pt-3 sm:hidden">
                        <div className="w-12 h-1 rounded-full bg-zinc-600" />
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors rounded-lg"
                        >
                            Cancel
                        </button>
                        <h2 className="text-base font-medium text-white">{label}</h2>
                        <button
                            onClick={handleDone}
                            className="px-4 py-2 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors rounded-lg"
                        >
                            Done
                        </button>
                    </div>

                    {/* Duration preview */}
                    {showDuration && duration && (
                        <div className="px-4 py-2 bg-zinc-800/50 text-center">
                            <span className="text-sm text-zinc-400">
                                Estimated sleep:{" "}
                                <span className="text-indigo-400 font-medium">
                                    {formatDuration(duration.hours, duration.minutes)}
                                </span>
                            </span>
                        </div>
                    )}

                    {/* Wheels */}
                    <div
                        className="flex items-center justify-center gap-1 px-4 py-6"
                        style={{ background: "var(--color-surface, #1a1a1a)" }}
                    >
                        {/* Hour wheel */}
                        <div className="w-20">
                            <ScrollWheel
                                items={hourItems}
                                selectedValue={hour}
                                onChange={(v) => setHour(v as number)}
                                visibleItems={5}
                                itemHeight={44}
                                loop={true}
                                ariaLabel="Select hour"
                            />
                        </div>

                        {/* Separator */}
                        <div className="text-2xl font-bold text-zinc-500 px-1">:</div>

                        {/* Minute wheel */}
                        <div className="w-20">
                            <ScrollWheel
                                items={minuteItems}
                                selectedValue={minute}
                                onChange={(v) => setMinute(v as number)}
                                visibleItems={5}
                                itemHeight={44}
                                loop={true}
                                ariaLabel="Select minute"
                            />
                        </div>

                        {/* AM/PM wheel (12h only) */}
                        {format === "12h" && (
                            <div className="w-16 ml-2">
                                <ScrollWheel
                                    items={periodItems}
                                    selectedValue={period}
                                    onChange={(v) => setPeriod(v as "AM" | "PM")}
                                    visibleItems={3}
                                    itemHeight={44}
                                    loop={false}
                                    ariaLabel="Select AM or PM"
                                />
                            </div>
                        )}
                    </div>

                    {/* Bottom safe area (mobile) */}
                    <div className="h-6 sm:hidden" />
                </div>
            </div>
        );

        return createPortal(content, document.body);
    }
);

TimeWheelPicker.displayName = "TimeWheelPicker";

// ============================================================================
// TimePickerField Component (the clickable field that opens the picker)
// ============================================================================

interface TimePickerFieldProps {
    value: string;
    onChange: (time: string) => void;
    label: string;
    format?: "12h" | "24h";
    minuteStep?: 1 | 5 | 10 | 15 | 30;
    showDuration?: boolean;
    otherTime?: string;
    isBedtime?: boolean;
    className?: string;
}

export function TimePickerField({
    value,
    onChange,
    label,
    format = "12h",
    minuteStep = 1,
    showDuration = false,
    otherTime,
    isBedtime = true,
    className,
}: TimePickerFieldProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Format display value
    const displayValue = useMemo(() => {
        const parsed = parseTime(value);
        if (format === "12h") {
            return formatTime12(parsed.hours, parsed.minutes);
        }
        return formatTime24(parsed.hours, parsed.minutes);
    }, [value, format]);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={cn(
                    "w-full p-3 rounded-lg text-left flex items-center justify-between",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500",
                    "transition-colors hover:opacity-90",
                    className
                )}
                style={{
                    background: "var(--color-ivory)",
                    color: "var(--color-charcoal)",
                }}
                aria-label={`${label}: ${displayValue}. Click to change.`}
            >
                <span className="font-medium">{displayValue}</span>
                <svg
                    className="w-5 h-5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </button>

            {isOpen && (
                <TimeWheelPicker
                    value={value}
                    onChange={onChange}
                    onClose={() => setIsOpen(false)}
                    format={format}
                    minuteStep={minuteStep}
                    label={label}
                    showDuration={showDuration}
                    otherTime={otherTime}
                    isBedtime={isBedtime}
                />
            )}
        </>
    );
}

export default TimeWheelPicker;
