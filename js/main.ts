import { checkExists } from "./server.js";
import { createUrlChecker } from "./urlChecker.js";
import { stateAsText } from "./UIState.js";

// ####### CONFIG #############
const THROTTLE_MS = 500;
const REQUEST_TIMEOUT_MS = 10000;

// ######## MAIN ############

const inputUrl = document.getElementById("input_url") as HTMLInputElement;
if (!inputUrl) throw new Error("#input_url not found in DOM");

const resultElmnt = document.getElementById("data_result") as HTMLElement;
if (!resultElmnt) throw new Error("#data_result not found in DOM");

const onInput = createUrlChecker({
  checkExists,
  render: state => { resultElmnt.textContent = stateAsText(state); },
  throttleMs: THROTTLE_MS,
  timeoutMs: REQUEST_TIMEOUT_MS,
});

inputUrl.addEventListener("input", () => onInput(inputUrl.value));
