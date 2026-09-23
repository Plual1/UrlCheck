import { checkExists } from "./server.js";
import { verifyUrl } from "./urlValidator.js";
import type { UIState } from "./UIState.js";

// ####### CONFIG #############
const THROTTLE_MS = 500;
const REQUEST_TIMEOUT_MS = 10000;

// ######## MAIN ############

const inputUrl = document.getElementById("input_url") as HTMLInputElement;
if (!inputUrl) throw new Error("#input_url not found in DOM");

const resultElmnt = document.getElementById("data_result") as HTMLElement;
if (!resultElmnt) throw new Error("#data_result not found in DOM");

// the current url that will be transmitted to the server as soon as the throttle allows
let pendingUrl: URL | null = null;
let throttleActive: boolean = false;

inputUrl.addEventListener("input", () => {
  if (inputUrl.value === "") {
    pendingUrl = null;
    render({ status: "idle" });
    return;
  }

  const url = verifyUrl(inputUrl.value);

  if (url instanceof Error) {
    pendingUrl = null;
    render({ status: "invalid" });
    return;
  }

  render({ status: "checking" });
  scheduleCheck(url);
});

/*
 * Manages the request by throttling the url. 
 * If a URL is updated while waiting for the throttle to complete, that url replaces the current pending.
 * 
 * @param url URL to check once the throttle window expires
 */
function scheduleCheck(url: URL) {
  pendingUrl = url;

  if (throttleActive) return;
  throttleActive = true;

  setTimeout(() => {
    throttleActive = false;

    const target = pendingUrl;
    pendingUrl = null;

    if (target) check(target);
  }, THROTTLE_MS);
}

/**
 * requests the server for an existence check
 *
 * @param url URL to check
 */
function check(url: URL) {
  withTimeout(checkExists(url), REQUEST_TIMEOUT_MS)
    .then(
      (response): UIState => ({ status: "checked", href: url.href, response }),
      (error): UIState => {
        console.error("Error:", error);
        return { status: "failed" };
      }
    )
    .then(state => {
      const current = verifyUrl(inputUrl.value);
      const stale = current instanceof Error || current.href !== url.href;
      console.log(`Response for ${url.href} (${stale ? "stale, dropped" : "applied"}):`, state);
      if (stale) return;

      render(state);
    });
}


async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timeout after ${ms} ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}


function render(state: UIState) {
  switch (state.status) {
    case "idle":
      resultElmnt.textContent = "";
      break;
    case "invalid":
      resultElmnt.textContent = "Invalid URL format.";
      break;
    case "checking":
      resultElmnt.textContent = "Checking...";
      break;
    case "checked":
      resultElmnt.textContent = state.response.exists
        ? `${state.href} exists and is a ${state.response.type}.`
        : `${state.href} does not exist.`;
      break;
    case "failed":
      resultElmnt.textContent = "The check failed. Please try again.";
      break;
  }
}
