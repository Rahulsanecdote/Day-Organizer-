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

/**
 * Compile-time exhaustiveness check for discriminated unions.
 * Place in the `default` branch of a switch over a union discriminator.
 * TypeScript will report a compile error if any variant is unhandled.
 */
export function assertNever(value: never, message?: string): never {
    throw new Error(message ?? `Unhandled variant: ${JSON.stringify(value)}`);
}
