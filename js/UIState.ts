import type { UrlResponse } from "./UrlResponseModel.js";

export type UIState =
    | { status: "idle" }
    | { status: "invalid" }
    | { status: "checking" }
    | { status: "checked"; href: string; response: UrlResponse }
    | { status: "failed" };
