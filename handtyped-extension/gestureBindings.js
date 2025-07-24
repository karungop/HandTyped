export async function addGesture(name, landmarks, key) {
  const gesture = { name, landmarks, boundKey: key };
  const bindings = await getAllBindings();
  bindings.push(gesture);
  chrome.storage.local.set({ gestures: bindings });
}

export function getAllBindings() {
  return new Promise((resolve) => {
    chrome.storage.local.get("gestures", (data) => {
      resolve(data.gestures || []);
    });
  });
}
