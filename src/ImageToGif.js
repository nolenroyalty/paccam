import GIF from "gif.js";
const gifWorker = new URL(
  "../node_modules/gif.js/dist/gif.worker.js",
  import.meta.url
);

class ImageToGif {
  async createGif({ frames, delay, options = {} }) {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      transparent: "0x00FF00",
      threshold: 0,
      workerScript: gifWorker,
      ...options,
    });

    return new Promise((resolve, reject) => {
      let loadedImages = 0;
      frames.forEach((dataUrl, i) => {
        const img = new Image();
        console.debug(`LOADING IMAGE ${i} / ${frames.length}`);
        img.onload = () => {
          gif.addFrame(img, { delay });
          loadedImages++;
          console.debug(`LOADED IMAGE: ${loadedImages} / ${frames.length}`);
          if (loadedImages === frames.length) {
            console.debug("rendering gif...");
            gif.render();
          }
        };
        img.src = dataUrl;
      });

      gif.on("finished", (blob) => {
        console.debug("gif render complete");
        resolve(blob);
      });

      gif.on("error", (error) => {
        console.error("GIF error", error);
        reject(error);
      });
    });
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

export default ImageToGif;
