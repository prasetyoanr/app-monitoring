// Coalesce bursts and allow only one route refresh at a time. A change arriving
// during a refresh is remembered, so it cannot be lost behind an older response.
export function createRefreshQueue(run: () => void, visible: () => boolean, delay = 150) {
  let dirty = false;
  let busy = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    if (disposed || !dirty || busy || timer || !visible()) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || busy || !visible()) return;
      dirty = false;
      busy = true;
      run();
    }, delay);
  }
  return {
    request() { dirty = true; schedule(); },
    complete() { busy = false; schedule(); },
    dispose() { disposed = true; clearTimeout(timer); },
  };
}
