import { checkExists } from "./server.js";
import { verifyUrl } from "./urlValidator.js";
import type { UIState } from "./UIState.js";
import type { UrlResponse } from "./UrlResponseModel.js";

// ####### CONFIG #############
const THROTTLE_MS = 500;

// ######## MAIN ############

const inputUrl = document.getElementById("input_url") as HTMLInputElement;
if (!inputUrl) throw new Error("#input_url not found in DOM");

let throttleActive: boolean = false;
let data: UrlResponse;
let error: boolean = false;

inputUrl.addEventListener("input", () => {
  checkResultToLiveInputAndRender(null);
});

/**
 * Verifies the current inputted URL and delegates to checkUrlWithThrottle() to check for existence.
 * Also handles rendering of the result, therefore checkUrlWithThrottle() MUST call this function back.
 * 
 * Differentiates between invalid URL, successful result with stale URL, successsful result with current URl and to-be-determined Url.
 * 
 * @param previousUrl URL of the last successful check
 */
function checkResultToLiveInputAndRender(previousUrl: URL | null) {
  const inputvalue = inputUrl.value;

  const url = verifyUrl(inputvalue);

  if (url instanceof Error) {
    render({ error: true, urlResponse: null, loading: false });
  } else if (previousUrl) {
    render({
      error,
      urlResponse: data,
      loading: true
    });
    if (previousUrl.href === url.href) {
      //render intermediate result immediately, with a loading indicator
      render({
        error,
        urlResponse: data,
        loading: false
      });
    } else {
      //As the current URL is newer, check the current URL.
      checkUrlWithThrottle(url);
    }
  } else {
    checkUrlWithThrottle(url);
  }
}

function checkUrlWithThrottle(url: URL) {
  if (throttleActive) return;
  throttleActive = true;

  setTimeout(() => {

    checkExists(url)
      .then(_response => {
        console.log(_response);
        data = _response;
        error = false;
      })
      .catch(_error => {
        console.error('Error:', _error);
        error = true;
      })
      .finally(() => {
        throttleActive = false;
        checkResultToLiveInputAndRender(url);
      });
  }, THROTTLE_MS)

}

function render(state: UIState) {
  const resultUrlElmnt = document.getElementById("input_url") as HTMLElement;
  if (!resultUrlElmnt) throw new Error("render(): #input_url not found in DOM");

  const loadingElmnt = document.getElementById("loading") as HTMLElement;
  if (!loadingElmnt) throw new Error("render(): #loading not found in DOM");

  const resultDataContainer = document.getElementById("data_result") as HTMLElement;
  if (!resultDataContainer) throw new Error("render(): #data_result not found in DOM");

  const isValid = !state.error
  const isExisting = state.urlResponse?.exists && state.urlResponse.type

  if (isValid) {
    resultUrlElmnt.style.display = "block";
    resultUrlElmnt.className = "valid";
  } else {
    resultUrlElmnt.className = "invalid";
  }

  if (isExisting) {
    const resultDataElmnt = document.getElementById("URLReturns") as HTMLElement;
    if (!resultDataElmnt) throw new Error("render(): #URLReturns not found in DOM");

    resultDataContainer.style.display = "block";
    resultDataContainer.className = "valid";
    resultDataElmnt.textContent = state.urlResponse!.type
  } else {
    resultDataContainer.className = "invalid";
    resultDataContainer.style.display = "none";
  }

  if (state.loading) {
    loadingElmnt.style.display = "inline";
  } else {
    loadingElmnt.style.display = "none";

  }
}
