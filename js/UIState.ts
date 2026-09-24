import type { UrlResponse } from "./UrlResponseModel.js";

export type UIState =
    | { status: "idle" }
    | { status: "invalid" }
    | { status: "checking" }
    | { status: "checked"; href: string; response: UrlResponse }
    | { status: "failed" };

export function stateAsText(state: UIState): string {
    switch (state.status) {
        case "idle":
            return "";
        case "invalid":
            return "Invalid URL format.";
        case "checking":
            return "Checking...";
        case "checked":
            return state.response.exists
                ? `${state.href} exists and is a ${state.response.type}.`
                : `${state.href} does not exist.`;
        case "failed":
            return "The check failed. Please try again.";
    }
}
