import type { UrlResponse } from "./UrlResponseModel.js";

/**
 * Mock of a server that checks if a given URL exists and if a file or directory is returned.
 * Configured to take a pseudorandom amount of time to complete ( 0-1000 ms).
 * 
 * @param url URL to 
 * @returns UrlResponse
 */
export async function checkExists(url: URL): Promise<UrlResponse> {
    return new Promise((resolve, reject) => {

        setTimeout(() => {
            try {
                const typeId = Math.random();
                let type;
                let exists=true;
                if (typeId > 0.5) {
                    type = "Directory";
                    exists = false;
                } else {
                    type = "File";
                }
                const response: UrlResponse = { exists, type: type };
                resolve(response);
            } catch (error) {
                reject(error);
            }
        }, Math.random() * 1000
        )

    }
    )
}