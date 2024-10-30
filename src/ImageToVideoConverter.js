import GIF from "gif.js";
// const gifWorker = new URL("gif.js/dist/gif.worker.js", import.meta.url);
// const gifWorker = require("gif.js/dist/gif.worker.js");
const gifWorker = new URL(
  "../node_modules/gif.js/dist/gif.worker.js",
  import.meta.url
);

// import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

class ImageSequenceConverter {
  constructor() {
    // this.ffmpeg = createFFmpeg({ log: true });
  }

  async init() {
    await this.ffmpeg.load();
  }

  // Get dimensions from first frame
  async getTargetDimensions(firstDataUrl) {
    const img = new Image();
    return new Promise((resolve, reject) => {
      img.src = firstDataUrl;
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve({ width: 100, height: 100 });
        console.log("Error loading image");
        reject("ZZZ");
      };
    });
  }

  async createGif(dataUrls, options = {}) {
    // const { width, height } = await this.getTargetDimensions(dataUrls[0]);
    console.log(`dataUrls.length: ${dataUrls.length}`);
    console.log(`dataUrls: ${dataUrls}`);
    const gif = new GIF({
      workers: 2,
      quality: 10,
      // width,
      // height,
      transparent: "0x00FF00",
      threshold: 0,
      workerScript: gifWorker,
      // ...options,
    });

    return new Promise((resolve, reject) => {
      let loadedImages = 0;
      dataUrls.forEach((dataUrl, i) => {
        const img = new Image();
        console.log(`loading image ${i}`);
        // console.log("dataUrl", dataUrl);
        img.onload = () => {
          gif.addFrame(img, { delay: options.delay || 100 });
          loadedImages++;
          console.log(`loadedImages: ${loadedImages} / ${dataUrls.length}`);
          if (loadedImages === dataUrls.length) {
            console.log("RENDER!");
            gif.render();
          }
        };
        img.src = dataUrl;
      });

      gif.on("finished", (blob) => {
        console.log("FINISHED");
        resolve(blob);
      });
      gif.on("error", (error) => {
        console.error("GIF error", error);
        reject(error);
      });
    });
  }

  async createMp4(dataUrls, options = {}) {
    const { width, height } = await this.getTargetDimensions(dataUrls[0]);

    // Write PNG frames
    for (let i = 0; i < dataUrls.length; i++) {
      const frameName = `frame${i}.png`;
      const binaryString = atob(dataUrls[i].split(",")[1]);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      this.ffmpeg.FS("writeFile", frameName, bytes);
    }

    // Create MP4 with fixed dimensions
    await this.ffmpeg.run(
      "-framerate",
      String(options.fps || 30),
      "-pattern_type",
      "glob",
      "-i",
      "frame*.png",
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=disable`,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "output.mp4"
    );

    const data = this.ffmpeg.FS("readFile", "output.mp4");
    return new Blob([data.buffer], { type: "video/mp4" });
  }

  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export default ImageSequenceConverter;
