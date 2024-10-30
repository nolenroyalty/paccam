import GIF from "gif.js";
const gifWorker = new URL(
  "../node_modules/gif.js/dist/gif.worker.js",
  import.meta.url
);

class ImageSequenceConverter {
  async createGif(dataUrls, options = {}) {
    console.log(`dataUrls.length: ${dataUrls.length}`);
    console.log(`dataUrls: ${dataUrls}`);
    const gif = new GIF({
      workers: 2,
      quality: 10,
      transparent: "0x00FF00",
      threshold: 0,
      workerScript: gifWorker,
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
