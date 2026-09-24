import { test, expect, beforeEach, afterEach, vi } from "vitest";
import { createUrlChecker } from "../js/urlChecker.js";
import { stateAsText } from "../js/UIState.js";
import type { UIState } from "../js/UIState.js";
import type { UrlResponse } from "../js/UrlResponseModel.js";

const THROTTLE_MS = 500;
const TIMEOUT_MS = 10000;

function fakeServer() {
  const inFlight = new Map<string, { resolve: (response: UrlResponse) => void; reject: (error: Error) => void }>();
  const requested: string[] = [];

  return {
    requested,
    checkExists(url: URL): Promise<UrlResponse> {
      requested.push(url.href);
      return new Promise((resolve, reject) => inFlight.set(url.href, { resolve, reject }));
    },
    respond(href: string, response: UrlResponse) {
      this.take(href).resolve(response);
    },
    fail(href: string) {
      this.take(href).reject(new Error("server error"));
    },
    take(href: string) {
      const request = inFlight.get(href);
      if (!request) throw new Error(`no request in flight for ${href}`);
      inFlight.delete(href);
      return request;
    },
  };
}

function setup() {
  const server = fakeServer();
  const uiState: UIState[] = [];
  const onInput = createUrlChecker({
    checkExists: url => server.checkExists(url),
    render: state => uiState.push(state),
    throttleMs: THROTTLE_MS,
    timeoutMs: TIMEOUT_MS,
  });
  const shown = () => {
    const last = uiState.at(-1);
    return last ? stateAsText(last) : "";
  };
  return { server, rendered: uiState, onInput, shown };
}

// Let pending promise callbacks run
const realSetTimeout = setTimeout;
const flush = () => new Promise<void>(resolve => realSetTimeout(resolve));

const FILE: UrlResponse = { exists: true, type: "file" };
const DIRECTORY: UrlResponse = { exists: true, type: "directory" };
const NOT_FOUND: UrlResponse = { exists: false, type: "file" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test("a late response for an abandoned URL is never rendered", async () => {
  const { server, rendered, onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS);
  expect(server.requested).toEqual(["https://a.example/"]);

  onInput("https://b.example/");
  server.respond("https://a.example/", FILE);
  await flush();

  expect(shown()).toBe("Checking...");

  vi.advanceTimersByTime(THROTTLE_MS);
  server.respond("https://b.example/", NOT_FOUND);
  await flush();

  expect(shown()).toBe("https://b.example/ does not exist.");
  expect(rendered.filter(s => s.status === "checked").map(s => s.href)).toEqual(["https://b.example/"]);
});

test("a late response is not rendered after the input was cleared or made invalid", async () => {
  const { server, rendered, onInput, shown } = setup();

  onInput("https://b.example/");
  vi.advanceTimersByTime(THROTTLE_MS);

  onInput("");
  server.respond("https://b.example/", FILE);
  await flush();
  expect(shown()).toBe("");

  onInput("https://c.example/");
  vi.advanceTimersByTime(THROTTLE_MS);
  onInput("not a url");
  server.respond("https://c.example/", FILE);
  await flush();
  expect(shown()).toBe("Invalid URL format.");
  expect(rendered.some(s => s.status === "checked")).toBe(false);
});

test("state resets synchronously on input change", async () => {
  const { server, onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS);
  server.respond("https://a.example/", FILE);
  await flush();
  expect(shown()).toBe("https://a.example/ exists and is a file.");

  // Now the new input must be updating the UI immediately
  onInput("https://b.example/");
  expect(shown()).toBe("Checking...");

  onInput("not a url");
  expect(shown()).toBe("Invalid URL format.");

  onInput("");
  expect(shown()).toBe("");
});


test.each([
  ["directory", "https://a.example/dir/", DIRECTORY, "https://a.example/dir/ exists and is a directory."],
  ["not-found", "https://a.example/404", NOT_FOUND, "https://a.example/404 does not exist."],
  ["file", "https://a.example/file.txt", FILE, "https://a.example/file.txt exists and is a file."],
] as const)("%s renders a message", async (_name, href, response, message) => {
  const { server, onInput, shown } = setup();

  onInput(href);
  vi.advanceTimersByTime(THROTTLE_MS);
  server.respond(href, response);
  await flush();

  expect(shown()).toBe(message);
});

test("throttle checks the last input even while a previous check is in flight", async () => {
  const { server, rendered, onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS);

  // a is still in flight; type two more URLs within one throttle window
  onInput("https://b.example/");
  onInput("https://c.example/");
  vi.advanceTimersByTime(THROTTLE_MS);

  expect(server.requested).toEqual(["https://a.example/", "https://c.example/"]);

  server.respond("https://c.example/", DIRECTORY);
  await flush();
  expect(shown()).toBe("https://c.example/ exists and is a directory.");

  server.respond("https://a.example/", FILE);
  await flush();
  expect(shown()).toBe("https://c.example/ exists and is a directory.");
  expect(rendered.filter(s => s.status === "checked").map(s => s.href)).toEqual(["https://c.example/"]);
});

test("clearing the input within the throttle window sends no request", () => {
  const { server, onInput } = setup();

  onInput("https://a.example/");
  onInput("");
  vi.advanceTimersByTime(THROTTLE_MS);

  expect(server.requested).toEqual([]);
});

test("a server error renders the failure message", async () => {
  const { server, onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS);
  server.fail("https://a.example/");
  await flush();

  expect(shown()).toBe("The check failed. Please try again.");
});

test("a request that times out renders the failure message", async () => {
  const { onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS + TIMEOUT_MS);
  await flush();

  expect(shown()).toBe("The check failed. Please try again.");
});

test("a failure for an abandoned URL is not rendered", async () => {
  const { server, onInput, shown } = setup();

  onInput("https://a.example/");
  vi.advanceTimersByTime(THROTTLE_MS);
  onInput("https://b.example/");
  server.fail("https://a.example/");
  await flush();

  expect(shown()).toBe("Checking...");
});
