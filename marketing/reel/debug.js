// Prints an element's computed style at given seconds (debugging the timeline).
//   node debug.js "#knob" transform 16.5 18 19
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const [sel, prop, ...times] = process.argv.slice(2);
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
  const p = await b.newPage();
  await p.setViewport({ width: 1080, height: 1920 });
  await p.evaluateOnNewDocument((tl) => { window.TL = tl; }, JSON.parse(fs.readFileSync(path.join(__dirname, "audio/timeline.json"), "utf8")));
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto("file:///" + path.join(__dirname, "reel.html").split(path.sep).join("/"));
  await p.evaluate(() => window.READY);
  for (const t of times.map(Number)) {
    console.log(t, await p.evaluate((t, sel, prop) => {
      window.setTime(t);
      const el = document.querySelector(sel);
      return getComputedStyle(el)[prop] + " | anims " + el.getAnimations().map((a) => a.playState + "@" + a.currentTime).join(",");
    }, t, sel, prop));
  }
  await b.close();
})();
