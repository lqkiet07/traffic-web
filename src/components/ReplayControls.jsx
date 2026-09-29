import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { CYCLE_LEN } from "../lib/data.js";

const SPEEDS = [1, 2, 5];

function fmtClock(totalSeconds) {
  const s = Math.max(Math.floor(totalSeconds), 0);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function iconBtn(title, onClick, children, highlight = false) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={
        highlight
          ? "flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          : "flex h-8 w-8 items-center justify-center rounded-md border border-[#1e293b] text-slate-300 hover:bg-slate-800"
      }
    >
      {children}
    </button>
  );
}

function PlaybackButtons({ player }) {
  const { cycle, isPlaying, setIsPlaying, speed, setSpeed, gotoCycle } = player;
  return (
    <div className="flex items-center gap-1.5">
      {iconBtn("Về chu kỳ đầu", () => gotoCycle(1), <RotateCcw size={15} />)}
      {iconBtn("Lùi 1 chu kỳ", () => gotoCycle(cycle - 1), <SkipBack size={15} />)}
      {iconBtn(
        isPlaying ? "Tạm dừng" : "Phát",
        () => setIsPlaying(!isPlaying),
        isPlaying ? <Pause size={17} /> : <Play size={17} />,
        true
      )}
      {iconBtn("Tiến 1 chu kỳ", () => gotoCycle(cycle + 1), <SkipForward size={15} />)}
      <div className="ml-1 flex overflow-hidden rounded-md border border-[#1e293b] font-mono text-xs">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2.5 py-1.5 font-semibold tabular-nums ${
              speed === s ? "bg-slate-700 text-slate-100" : "text-slate-500 hover:bg-slate-800"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function TimeReadout({ player }) {
  const { cycle, maxCycle, simTime, globalSimTime, vehicleCount } = player;
  return (
    <div className="ml-auto text-right font-mono text-xs tabular-nums text-slate-400">
      <div>
        CK <span className="font-bold text-slate-100">{cycle}/{maxCycle}</span>
        {"  ·  "}t {Math.round(simTime)}s/{CYCLE_LEN}s
      </div>
      <div>
        {fmtClock(globalSimTime)} / 02:00:00{"  ·  "}{vehicleCount} xe
      </div>
    </div>
  );
}

function CycleScrubber({ player }) {
  const { cycle, maxCycle, gotoCycle } = player;
  const ticks = Array.from({ length: Math.floor(maxCycle / 10) + 1 }, (_, i) =>
    Math.min(i * 10 === 0 ? 1 : i * 10, maxCycle)
  );
  return (
    <div>
      <input
        type="range"
        min={1}
        max={maxCycle}
        value={cycle}
        onChange={(e) => gotoCycle(Number(e.target.value))}
        className="transport-scrubber mt-3"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-slate-600">
        {ticks.map((tick) => (
          <span key={tick}>CK{tick}</span>
        ))}
      </div>
    </div>
  );
}

// Transport bar: single `player` prop carries the whole playback controller.
export default function ReplayControls({ player }) {
  return (
    <div className="rounded-lg border border-[#1e293b] bg-[#0f172a] p-3">
      <div className="flex items-center gap-2">
        <PlaybackButtons player={player} />
        <TimeReadout player={player} />
      </div>
      <CycleScrubber player={player} />
    </div>
  );
}
