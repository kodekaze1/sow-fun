// "Has this person launched a coin?" - remembered on this device, so the
// "My coins" nav link appears only for creators without an RPC lookup on
// every page view. Set after a successful launch, or when /my finds coins
// for the connected wallet (covers launches made on another device).

export const CREATOR_FLAG_KEY = "sowfun:creator";
const EVENT = "sowfun:creator";

export function readIsCreator(): boolean {
  try {
    return localStorage.getItem(CREATOR_FLAG_KEY) === "1";
  } catch {
    return false; // storage unavailable
  }
}

export function markCreator(): void {
  try {
    localStorage.setItem(CREATOR_FLAG_KEY, "1");
    window.dispatchEvent(new Event(EVENT)); // same-tab listeners
  } catch {
    /* storage unavailable - the nav just stays hidden */
  }
}

export function subscribeCreator(onChange: () => void): () => void {
  window.addEventListener("storage", onChange); // other tabs
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
