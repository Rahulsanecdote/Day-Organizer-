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

// ============================================================================
// Types
// ============================================================================

export interface DatePickerProps {
    /** Currently selected date */
    value?: Date;
    /** Callback when date changes */
    onChange?: (date: Date) => void;
    /** Minimum selectable date */
    minDate?: Date;
    /** Maximum selectable date */
    maxDate?: Date;
    /** Number of visible items in each wheel (should be odd) */
    visibleItems?: number;
    /** Item height in pixels */
    itemHeight?: number;
    /** Custom class name */
    className?: string;
    /** Accessibility label */
    "aria-label"?: string;
}

export interface DatePickerRef {
    /** Get the currently selected date */
    getValue: () => Date;
    /** Set the date programmatically */
    setValue: (date: Date) => void;
}

interface ScrollWheelProps {
    items: { value: number; label: string }[];
    selectedValue: number;
    onChange: (value: number) => void;
    visibleItems: number;
    itemHeight: number;
    loop?: boolean;
    ariaLabel: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function clampDate(date: Date, minDate?: Date, maxDate?: Date): Date {
    let result = new Date(date);
    if (minDate && result < minDate) result = new Date(minDate);
    if (maxDate && result > maxDate) result = new Date(maxDate);
    return result;
}

// ============================================================================
// ScrollWheel Component
// ============================================================================

const ScrollWheel: React.FC<ScrollWheelProps> = ({
    items,
    selectedValue,
    onChange,
    visibleItems,
    itemHeight,
    loop = false,
    ariaLabel,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrollTop = useRef(0);
    const velocityRef = useRef(0);
    const lastTimeRef = useRef(0);
    const animationRef = useRef<number | null>(null);

    // Calculate dimensions
    const containerHeight = itemHeight * visibleItems;
    const paddingItems = Math.floor(visibleItems / 2);

    // For looping, we create a virtual list that's 3x the original
    const virtualItems = useMemo(() => {
        if (!loop) return items;
        return [...items, ...items, ...items];
    }, [items, loop]);

    // Get the scroll position for a value
    const getScrollTopForValue = useCallback(
        (value: number): number => {
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
        (scrollTop: number): number => {
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
            let targetScroll = currentScrollTop + velocity * 150;

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
            const duration = 300;
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

                    // Trigger haptic feedback simulation (visual pulse)
                    const newValue = getValueFromScrollTop(
                        containerRef.current?.scrollTop ?? 0
                    );
                    if (newValue !== selectedValue) {
                        onChange(newValue);
                    }
                    setIsScrolling(false);
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

        // Show scrolling state
        setIsScrolling(true);

        // Debounce snap
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
            snapToNearest(currentScrollTop, velocityRef.current);
            velocityRef.current = 0;
        }, 100);
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
            let newIndex = items.findIndex((item) => item.value === selectedValue);

            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    newIndex = loop
                        ? (newIndex - 1 + items.length) % items.length
                        : Math.max(0, newIndex - 1);
                    onChange(items[newIndex].value);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    newIndex = loop
                        ? (newIndex + 1) % items.length
                        : Math.min(items.length - 1, newIndex + 1);
                    onChange(items[newIndex].value);
                    break;
                case "Home":
                    e.preventDefault();
                    onChange(items[0].value);
                    break;
                case "End":
                    e.preventDefault();
                    onChange(items[items.length - 1].value);
                    break;
            }
        },
        [items, selectedValue, onChange, loop]
    );

    return (
        <div
            className="relative select-none"
            style={{ height: containerHeight }}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`wheel-item-${selectedValue}`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Gradient overlays for fade effect */}
            <div
                className="pointer-events-none absolute left-0 right-0 top-0 z-10"
                style={{
                    height: paddingItems * itemHeight,
                    background:
                        "linear-gradient(to bottom, var(--color-background, #fff) 0%, transparent 100%)",
                }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
                style={{
                    height: paddingItems * itemHeight,
                    background:
                        "linear-gradient(to top, var(--color-background, #fff) 0%, transparent 100%)",
                }}
            />

            {/* Selection highlight */}
            <div
                className="pointer-events-none absolute left-0 right-0 z-5 border-y border-zinc-300 dark:border-zinc-600"
                style={{
                    top: paddingItems * itemHeight,
                    height: itemHeight,
                    background: "rgba(128, 128, 128, 0.1)",
                }}
            />

            {/* Scrollable container */}
            <div
                ref={containerRef}
                className="h-full overflow-y-auto scrollbar-hide"
                style={{
                    scrollBehavior: "auto",
                    WebkitOverflowScrolling: "touch",
                    scrollSnapType: "y mandatory",
                }}
                onScroll={handleScroll}
            >
                {/* Top padding */}
                <div style={{ height: paddingItems * itemHeight }} />

                {/* Items */}
                {virtualItems.map((item, index) => {
                    const isSelected = item.value === selectedValue;
                    const distanceFromCenter = loop
                        ? Math.abs(
                            ((index - items.length) % items.length) -
                            items.findIndex((i) => i.value === selectedValue)
                        )
                        : Math.abs(
                            index - items.findIndex((i) => i.value === selectedValue)
                        );

                    return (
                        <div
                            key={`${item.value}-${index}`}
                            id={isSelected ? `wheel-item-${item.value}` : undefined}
                            role="option"
                            aria-selected={isSelected}
                            className={cn(
                                "flex items-center justify-center transition-all duration-150",
                                isSelected
                                    ? "text-lg font-semibold text-zinc-900 dark:text-white"
                                    : distanceFromCenter === 1
                                        ? "text-base text-zinc-500 dark:text-zinc-400"
                                        : "text-sm text-zinc-300 dark:text-zinc-600"
                            )}
                            style={{
                                height: itemHeight,
                                scrollSnapAlign: "center",
                                transform: isSelected
                                    ? "scale(1.1)"
                                    : `scale(${1 - distanceFromCenter * 0.05})`,
                                opacity: Math.max(0.3, 1 - distanceFromCenter * 0.2),
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

            {/* Haptic feedback indicator */}
            {isScrolling && (
                <div className="pointer-events-none absolute inset-0 z-20 animate-pulse opacity-0" />
            )}
        </div>
    );
};

// ============================================================================
// DatePicker Component
// ============================================================================

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

export const IOSDatePicker = forwardRef<DatePickerRef, DatePickerProps>(
    (
        {
            value,
            onChange,
            minDate,
            maxDate,
            visibleItems = 5,
            itemHeight = 44,
            className,
            "aria-label": ariaLabel = "Date picker",
        },
        ref
    ) => {
        const now = useMemo(() => new Date(), []);
        const [selectedDate, setSelectedDate] = useState<Date>(
            value ? clampDate(value, minDate, maxDate) : clampDate(now, minDate, maxDate)
        );

        // Sync with external value
        useEffect(() => {
            if (value) {
                // eslint-disable-next-line
                setSelectedDate(clampDate(value, minDate, maxDate));
            }
        }, [value, minDate, maxDate]);

        // Expose ref methods
        useImperativeHandle(
            ref,
            () => ({
                getValue: () => selectedDate,
                setValue: (date: Date) => {
                    const clamped = clampDate(date, minDate, maxDate);
                    setSelectedDate(clamped);
                    onChange?.(clamped);
                },
            }),
            [selectedDate, minDate, maxDate, onChange]
        );

        // Generate year options
        const yearItems = useMemo(() => {
            const minYear = minDate?.getFullYear() ?? now.getFullYear() - 100;
            const maxYear = maxDate?.getFullYear() ?? now.getFullYear() + 50;
            const years: { value: number; label: string }[] = [];

            for (let y = minYear; y <= maxYear; y++) {
                years.push({ value: y, label: y.toString() });
            }
            return years;
        }, [minDate, maxDate, now]);

        // Generate month options
        const monthItems = useMemo(() => {
            return MONTHS.map((name, index) => ({
                value: index,
                label: name,
            }));
        }, []);

        // Generate day options based on current month/year
        const dayItems = useMemo(() => {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const daysInMonth = getDaysInMonth(year, month);

            const days: { value: number; label: string }[] = [];
            for (let d = 1; d <= daysInMonth; d++) {
                days.push({ value: d, label: d.toString() });
            }
            return days;
        }, [selectedDate]);

        // Handle year change
        const handleYearChange = useCallback(
            (year: number) => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(year);

                // Adjust day if necessary (e.g., Feb 29 -> Feb 28)
                const maxDay = getDaysInMonth(year, newDate.getMonth());
                if (newDate.getDate() > maxDay) {
                    newDate.setDate(maxDay);
                }

                const clamped = clampDate(newDate, minDate, maxDate);
                setSelectedDate(clamped);
                onChange?.(clamped);
            },
            [selectedDate, minDate, maxDate, onChange]
        );

        // Handle month change
        const handleMonthChange = useCallback(
            (month: number) => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(month);

                // Adjust day if necessary
                const maxDay = getDaysInMonth(newDate.getFullYear(), month);
                if (newDate.getDate() > maxDay) {
                    newDate.setDate(maxDay);
                }

                const clamped = clampDate(newDate, minDate, maxDate);
                setSelectedDate(clamped);
                onChange?.(clamped);
            },
            [selectedDate, minDate, maxDate, onChange]
        );

        // Handle day change
        const handleDayChange = useCallback(
            (day: number) => {
                const newDate = new Date(selectedDate);
                newDate.setDate(day);

                const clamped = clampDate(newDate, minDate, maxDate);
                setSelectedDate(clamped);
                onChange?.(clamped);
            },
            [selectedDate, minDate, maxDate, onChange]
        );

        const containerHeight = itemHeight * visibleItems;

        return (
            <div
                className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-900",
                    className
                )}
                role="group"
                aria-label={ariaLabel}
                style={{ height: containerHeight + 32 }}
            >
                {/* Month wheel */}
                <div className="w-32">
                    <ScrollWheel
                        items={monthItems}
                        selectedValue={selectedDate.getMonth()}
                        onChange={handleMonthChange}
                        visibleItems={visibleItems}
                        itemHeight={itemHeight}
                        loop={true}
                        ariaLabel="Select month"
                    />
                </div>

                {/* Day wheel */}
                <div className="w-16">
                    <ScrollWheel
                        items={dayItems}
                        selectedValue={selectedDate.getDate()}
                        onChange={handleDayChange}
                        visibleItems={visibleItems}
                        itemHeight={itemHeight}
                        loop={true}
                        ariaLabel="Select day"
                    />
                </div>

                {/* Year wheel */}
                <div className="w-20">
                    <ScrollWheel
                        items={yearItems}
                        selectedValue={selectedDate.getFullYear()}
                        onChange={handleYearChange}
                        visibleItems={visibleItems}
                        itemHeight={itemHeight}
                        loop={false}
                        ariaLabel="Select year"
                    />
                </div>
            </div>
        );
    }
);

IOSDatePicker.displayName = "IOSDatePicker";

// ============================================================================
// Demo Component
// ============================================================================

export function DatePickerDemo() {
    const [selectedDate, setSelectedDate] = useState(new Date());

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 p-8 dark:bg-zinc-950">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                iOS Date Picker
            </h1>

            <IOSDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                minDate={new Date(1900, 0, 1)}
                maxDate={new Date(2100, 11, 31)}
            />

            <div className="text-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Selected Date:
                </p>
                <p className="text-xl font-semibold text-zinc-900 dark:text-white">
                    {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            </div>

            <div className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
                <p>
                    • Scroll or swipe to change values
                    <br />
                    • Use arrow keys for keyboard navigation
                    <br />• Days and months loop infinitely
                </p>
            </div>
        </div>
    );
}

export default IOSDatePicker;
