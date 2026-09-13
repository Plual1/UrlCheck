import type { UrlResponse } from "./UrlResponseModel";

export interface UIState {
    urlResponse: UrlResponse | null,
    error: boolean,
    loading: boolean
}