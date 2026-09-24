import { verifyUrl } from "./urlValidator.js";
import type { UIState } from "./UIState.js";
import type { UrlResponse } from "./UrlResponseModel.js";

export interface UrlCheckerOptions {
  checkExists: (url: URL) => Promise<UrlResponse>;
  render: (state: UIState) => void;
  throttleMs: number;
  timeoutMs: number;
}

/**
 * Checks the url asynchronously but renders the state syncronously. 
 * Should be called from an event listener on input.
 * 
 * @returns function to call on input
 */
export function createUrlChecker({ checkExists, render, throttleMs, timeoutMs }: UrlCheckerOptions) {
  // No access to the current value on screen, so we save the last known good input. 
  // If the input would not be good, it is catched before a request would be send and an in-flight request still gets dropped
  let currentHref: string | null = null;
  // the current url that will be transmitted to the server as soon as the throttle allows
  let pendingUrl: URL | null = null;
  let throttleActive: boolean = false;

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
    }, throttleMs);
  }

  /**
   * requests the server for an existence check
   *
   * @param url URL to check
   */
  function check(url: URL) {
    withTimeout(checkExists(url), timeoutMs)
      .then(
        (response): UIState => ({ status: "checked", href: url.href, response }),
        (error): UIState => {
          console.error("Error:", error);
          return { status: "failed" };
        }
      )
      .then(state => {
        const stale = currentHref !== url.href;
        console.log(`Response for ${url.href} (${stale ? "stale, dropped" : "applied"}):`, state);
        if (stale) return;

        render(state);
      });
  }

  return function onInput(value: string) {
    if (value === "") {
      currentHref = null;
      pendingUrl = null;
      render({ status: "idle" });
      return;
    }

    const url = verifyUrl(value);

    if (url instanceof Error) {
      currentHref = null;
      pendingUrl = null;
      render({ status: "invalid" });
      return;
    }

    currentHref = url.href;
    render({ status: "checking" });
    scheduleCheck(url);
  };
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
