/**
 * Check if a given string is a valid URL.
 * 
 * @param url string to be checked
 * @returns URL or Error
 */
export function verifyUrl(url: string): URL | Error {
    try {
        return new URL(url);
    } catch (error) {
        console.error(error);
        return error instanceof Error ? error : new Error(String(error));
    }
} 