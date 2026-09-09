// Native Canvas resizing via the project's existing Playwright dev dependency.
const {chromium} = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const root = path.resolve(__dirname, "..");
  const source = fs.readFileSync(path.join(root,"assets/twitter-bird-transparent.png"));
  const browser = await chromium.launch({channel:"chromium",headless:true});
  try {
    const page = await browser.newPage();
    const icons = await page.evaluate(async source => {
      const image = new Image();
      image.src = "data:image/png;base64," + source;
      await image.decode();
      return Object.fromEntries([16,32,48,128].map(size => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        const scale = size / Math.max(image.width,image.height);
        const width = image.width * scale, height = image.height * scale;
        context.drawImage(image,(size-width)/2,(size-height)/2,width,height);
        return [size,canvas.toDataURL("image/png").split(",")[1]];
      }));
    },source.toString("base64"));
    const directory = path.join(root,"extension/icons");
    fs.mkdirSync(directory,{recursive:true});
    for (const [size, png] of Object.entries(icons)) {
      fs.writeFileSync(path.join(directory,`icon-${size}.png`),Buffer.from(png,"base64"));
    }
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
