// Step 1: Hindi voice-over with Microsoft Edge's free neural TTS.
// Writes audio/<scene>.mp3 per line, audio/voice.wav (all lines joined with
// short gaps) and audio/timeline.json (when each scene starts and ends).
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const ffmpeg = require("ffmpeg-static");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const script = require("./script");

const OUT = path.join(__dirname, "audio");
fs.mkdirSync(OUT, { recursive: true });

function duration(file) {
  const r = spawnSync(ffmpeg, ["-i", file], { encoding: "utf8" });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  if (!m) throw new Error("no duration for " + file);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

(async () => {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(script.voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const timeline = [];
  let t = 0.4; // a breath before the first word
  const wavs = [];
  for (const s of script.scenes) {
    const dir = path.join(OUT, s.id);
    fs.mkdirSync(dir, { recursive: true });
    const { audioFilePath } = await tts.toFile(dir, s.say, { rate: script.rate });
    const wav = path.join(OUT, s.id + ".wav");
    // Trim leading/trailing silence so the cuts land on the words.
    execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", audioFilePath, "-af",
      "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
      "-ar", "48000", "-ac", "1", wav]);
    const d = duration(wav);
    timeline.push({ id: s.id, start: +t.toFixed(3), end: +(t + d).toFixed(3), show: s.show });
    wavs.push({ wav, at: t });
    t += d + script.gapSec;
  }
  const total = +(t + 0.9).toFixed(3); // hold the end card a moment

  // Place every line at its start time on one track.
  const inputs = wavs.flatMap((w) => ["-i", w.wav]);
  const delays = wavs.map((w, i) => `[${i}]adelay=${Math.round(w.at * 1000)}|${Math.round(w.at * 1000)}[a${i}]`).join(";");
  const mix = wavs.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${wavs.length}:normalize=0,apad,atrim=0:${total}[out]`;
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", delays + ";" + mix, "-map", "[out]", "-ar", "48000", "-ac", "2", path.join(OUT, "voice.wav")]);

  fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ total, scenes: timeline }, null, 2));
  console.log(JSON.stringify({ total, scenes: timeline.map((s) => [s.id, s.start, s.end]) }));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
