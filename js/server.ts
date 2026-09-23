import type { UrlResponse } from "./UrlResponseModel.js";

const LATENCY_MS = 250;
const SLOW_LATENCY_MS = 2500;

/**
 * Mock of a server that checks if a given URL exists and if a file or directory is returned.
 * Returns a directory when url ends with "/". 
 * Returns "doesnt exist" on url ending with "404"
 * 
 * The mock will take SLOW_LATENCY_MS ms if the url contains "slow"
 *
 * @param url URL to check
 * @returns UrlResponse
 */
export async function checkExists(url: URL): Promise<UrlResponse> {
    return new Promise((resolve, reject) => {

        const marker = url.href.toLowerCase();

        setTimeout(() => {
            try {
                const exists = !url.href.endsWith("404");
                const isDirectory = url.href.endsWith("/");

                const response: UrlResponse = { exists, type: isDirectory ? "directory" : "file" };
                resolve(response);
            } catch (error) {
                reject(error);
            }
        }, marker.includes("slow") ? SLOW_LATENCY_MS : LATENCY_MS
        )

    }
    )
}