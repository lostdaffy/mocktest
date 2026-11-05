// Step 2: renders reel.html frame by frame in Chrome, then joins the frames
// with the voice-over into rankveer-reel.mp4 (1080x1920, 30 fps).
//   node render.js            full render
//   node render.js 2 7 13     only stills at those seconds (preview/*.jpg)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const puppeteer = require("puppeteer-core");
const ffmpeg = require("ffmpeg-static");

const FPS = 30;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const TL = JSON.parse(fs.readFileSync(path.join(__dirname, "audio/timeline.json"), "utf8"));
const stills = process.argv.slice(2).map(Number);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files", "--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((tl) => { window.TL = tl; }, TL);
  page.on("pageerror", (e) => console.error("page error:", e.message));
  await page.goto("file:///" + path.join(__dirname, "reel.html").replace(/\\/g, "/"), { waitUntil: "networkidle0" });
  await page.evaluate(() => window.READY);

  const shoot = async (t, file) => {
    await page.evaluate((x) => window.setTime(x), t);
    await page.screenshot({ path: file, type: "jpeg", quality: 92 });
  };

  if (stills.length) {
    const dir = path.join(__dirname, "preview");
    fs.mkdirSync(dir, { recursive: true });
    for (const t of stills) await shoot(t, path.join(dir, `t${String(t).replace(".", "_")}.jpg`));
    await browser.close();
    console.log("stills:", stills.join(", "));
    return;
  }

  const frames = path.join(__dirname, "frames");
  fs.rmSync(frames, { recursive: true, force: true });
  fs.mkdirSync(frames);
  const n = Math.ceil(TL.total * FPS);
  for (let i = 0; i < n; i++) {
    await shoot(i / FPS, path.join(frames, String(i).padStart(5, "0") + ".jpg"));
    if (i % 150 === 0) console.log(`frame ${i}/${n}`);
  }
  await browser.close();

  const out = path.join(__dirname, "rankveer-reel.mp4");
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(frames, "%05d.jpg"),
    "-i", path.join(__dirname, "audio/voice.wav"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "160k", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000",
    "-shortest", "-movflags", "+faststart", out]);
  console.log("done:", out, Math.round(fs.statSync(out).size / 1024) + " KB");
})().catch((e) => { console.error(e); process.exit(1); });
