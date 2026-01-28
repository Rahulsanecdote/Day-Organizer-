import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This is a utility function commonly used with shadcn/ui components.
 * 
 * @param inputs - Class values to merge
 * @returns Merged class string with Tailwind conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
