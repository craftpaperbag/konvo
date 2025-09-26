const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let paused = false;
let cancelled = false;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const computeGrayscale = (data, width, height) => {
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return grayscale;
};

const waitWhilePaused = async () => {
  while (paused && !cancelled) {
    await sleep(50);
  }
};

const process = async ({ image, kernel, normalize, delay }) => {
  const { width, height, data } = image;
  const src = new Uint8ClampedArray(data);
  const grayscale = computeGrayscale(src, width, height);
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);
  const kernelSum = kernel.reduce((sum, value) => sum + value, 0);
  const divisor = normalize && kernelSum !== 0 ? kernelSum : 1;

  cancelled = false;
  paused = false;

  for (let y = 0; y < height; y += 1) {
    if (cancelled) {
      postMessage({ type: "cancelled" });
      return;
    }
    for (let x = 0; x < width; x += 1) {
      if (cancelled) {
        postMessage({ type: "cancelled" });
        return;
      }
      await waitWhilePaused();
      if (cancelled) {
        postMessage({ type: "cancelled" });
        return;
      }

      let acc = 0;
      for (let ky = -half; ky <= half; ky += 1) {
        for (let kx = -half; kx <= half; kx += 1) {
          const sampleX = clamp(x + kx, 0, width - 1);
          const sampleY = clamp(y + ky, 0, height - 1);
          const sampleIndex = sampleY * width + sampleX;
          const kernelValue = kernel[(ky + half) * kernelSize + (kx + half)];
          acc += grayscale[sampleIndex] * kernelValue;
        }
      }

      const value = clamp(Math.round(acc / divisor), 0, 255);
      const idx = (y * width + x) * 4;

      postMessage({ type: "progress", idx, value, x, y });
      if (delay > 0) {
        await sleep(delay);
      }
    }
  }

  postMessage({ type: "done" });
};

self.onmessage = async (event) => {
  const { type } = event.data;
  switch (type) {
    case "start":
      await process(event.data);
      break;
    case "pause":
      paused = true;
      break;
    case "resume":
      paused = false;
      break;
    case "reset":
      cancelled = true;
      paused = false;
      break;
    default:
      break;
  }
};
