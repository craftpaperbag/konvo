const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const kernelGrid = document.getElementById("kernel-grid");
const normalizeToggle = document.getElementById("normalize-toggle");
const speedInput = document.getElementById("speed-input");
const playBtn = document.getElementById("play-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const progressEl = document.getElementById("progress");
const statusText = document.getElementById("status-text");
const sourceCanvas = document.getElementById("source-canvas");
const resultCanvas = document.getElementById("result-canvas");
const sourceCtx = sourceCanvas.getContext("2d");
const resultCtx = resultCanvas.getContext("2d");

const worker = new Worker("worker.js");
const CANVAS_SIZE = 100;

const KERNEL_PRESETS = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  edge: [1, 0, -1, 0, 0, 0, -1, 0, 1],
  blur: [1, 1, 1, 1, 1, 1, 1, 1, 1],
};

const kernelInputs = [];
for (let i = 0; i < 9; i += 1) {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.value = KERNEL_PRESETS.identity[i];
  input.classList.add("kernel-input");
  kernelGrid.appendChild(input);
  kernelInputs.push(input);
}

let imageData = null;
let resultImageData = null;
let totalPixels = 0;
let processedPixels = 0;
let paused = false;
let running = false;

const updateStatus = (text) => {
  statusText.textContent = text;
};

const resetResultCanvas = () => {
  resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  if (resultImageData) {
    resultImageData = resultCtx.createImageData(
      resultCanvas.width,
      resultCanvas.height,
    );
  }
};

const getKernelValues = () =>
  kernelInputs.map((input) => Number.parseFloat(input.value) || 0);

const applyPreset = (name) => {
  const values = KERNEL_PRESETS[name];
  if (!values) return;
  values.forEach((value, index) => {
    kernelInputs[index].value = value;
  });
};

const enableControls = ({
  canPlay = false,
  canPause = false,
  canReset = false,
} = {}) => {
  playBtn.disabled = !canPlay;
  pauseBtn.disabled = !canPause;
  resetBtn.disabled = !canReset;
};

const prepareCanvas = (canvas, context) => {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);
};

prepareCanvas(sourceCanvas, sourceCtx);
prepareCanvas(resultCanvas, resultCtx);

const handleFiles = (files) => {
  const [file] = files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      sourceCanvas.width = CANVAS_SIZE;
      sourceCanvas.height = CANVAS_SIZE;
      resultCanvas.width = CANVAS_SIZE;
      resultCanvas.height = CANVAS_SIZE;
      sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
      sourceCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      imageData = sourceCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      resultImageData = resultCtx.createImageData(
        imageData.width,
        imageData.height,
      );
      totalPixels = imageData.width * imageData.height;
      processedPixels = 0;
      progressEl.max = totalPixels;
      progressEl.value = 0;
      enableControls({ canPlay: true });
      updateStatus("カーネルを設定して再生してください。");
      resetResultCanvas();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

const startConvolution = () => {
  if (!imageData || running) return;
  const kernel = getKernelValues();
  const normalize = normalizeToggle.checked;
  const delay = Number.parseInt(speedInput.value, 10);

  worker.postMessage({
    type: "start",
    image: {
      width: imageData.width,
      height: imageData.height,
      data: Array.from(imageData.data),
    },
    kernel,
    normalize,
    delay: Number.isNaN(delay) ? 0 : Math.max(0, delay),
  });

  running = true;
  paused = false;
  processedPixels = 0;
  progressEl.value = 0;
  pauseBtn.textContent = "一時停止";
  updateStatus("処理を開始しました。");
  enableControls({ canPause: true, canReset: true });
};

const pauseConvolution = () => {
  if (!running) return;
  if (!paused) {
    worker.postMessage({ type: "pause" });
    paused = true;
    pauseBtn.textContent = "再開";
    updateStatus("一時停止中です。");
  } else {
    worker.postMessage({ type: "resume" });
    paused = false;
    pauseBtn.textContent = "一時停止";
    updateStatus("処理を再開しました。");
  }
};

const resetConvolution = () => {
  worker.postMessage({ type: "reset" });
  running = false;
  paused = false;
  pauseBtn.textContent = "一時停止";
  processedPixels = 0;
  progressEl.value = 0;
  if (imageData) {
    updateStatus("リセットしました。再度再生できます。");
  } else {
    updateStatus("画像を読み込んでください。");
  }
  enableControls({ canPlay: Boolean(imageData) });
  resetResultCanvas();
};

worker.onmessage = (event) => {
  const { type } = event.data;
  switch (type) {
    case "progress": {
      if (!imageData) {
        break;
      }
      const { idx, value, x, y } = event.data;
      if (!resultImageData) {
        resultImageData = resultCtx.createImageData(
          imageData.width,
          imageData.height,
        );
      }
      resultImageData.data[idx] = value;
      resultImageData.data[idx + 1] = value;
      resultImageData.data[idx + 2] = value;
      resultImageData.data[idx + 3] = 255;
      resultCtx.putImageData(resultImageData, 0, 0);
      processedPixels += 1;
      progressEl.value = processedPixels;
      updateStatus(
        `処理中: (${x + 1}, ${y + 1}) / ${imageData.width}×${imageData.height}`,
      );
      break;
    }
    case "done": {
      running = false;
      paused = false;
      pauseBtn.textContent = "一時停止";
      enableControls({ canPlay: true, canReset: true });
      updateStatus("完了しました。");
      break;
    }
    case "cancelled": {
      running = false;
      paused = false;
      pauseBtn.textContent = "一時停止";
      enableControls({ canPlay: Boolean(imageData) });
      updateStatus("キャンセルしました。");
      break;
    }
    default:
      break;
  }
};

playBtn.addEventListener("click", startConvolution);
pauseBtn.addEventListener("click", pauseConvolution);
resetBtn.addEventListener("click", resetConvolution);

const onDrop = (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
  if (event.dataTransfer?.files?.length) {
    handleFiles(event.dataTransfer.files);
  }
};

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", onDrop);

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", (event) => {
  if (event.target.files?.length) {
    handleFiles(event.target.files);
  }
});

document
  .querySelectorAll(".preset-buttons button")
  .forEach((button) =>
    button.addEventListener("click", () => applyPreset(button.dataset.preset)),
  );

resetConvolution();
