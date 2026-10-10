import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Video } from "lucide-react";
import { IpmZone } from "./IpmZone.jsx";
import { PipelineStrip, PIPELINE_STAGES } from "./PipelineStrip.jsx";

export { IpmZone, PipelineStrip, PIPELINE_STAGES };

const FALLBACK_META = {
  video: {
    src: "/videos/intersection_1_roi.mp4",
    fps: 30,
    duration: 193.3,
    width: 886,
    height: 490,
  },
  anchors: {
    p1: [170, 237],
    p2: [501, 259],
    p3: [323, 484],
    p4: [3, 342],
  },
  homography: [
    [-3.6349767701590054, -5.781344005871942, 1988.124580318681],
    [0.41762914559321207, -6.283420326879693, 1418.1736627196412],
    [-0.00346295694218145, -0.01000376745018003, 1.0],
  ],
  roadAreaM2: 150,
  frames: [],
};

export function formatTimestamp(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = s.toFixed(1).padStart(4, "0");
  return `${mm}:${ss}`;
}

export function findClosestFrame(frames, currentTime) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  let effectiveTime = currentTime;
  if (frames.length > 1) {
    const maxTime = frames[frames.length - 1]?.time ?? 0;
    if (maxTime > 0 && currentTime > maxTime) {
      const rem = currentTime % maxTime;
      effectiveTime = rem === 0 ? maxTime : rem;
    }
  }
  let closest = frames[0];
  let minDiff = Math.abs((frames[0]?.time ?? 0) - effectiveTime);
  for (let i = 1; i < frames.length; i++) {
    const diff = Math.abs((frames[i]?.time ?? 0) - effectiveTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = frames[i];
    }
  }
  return closest;
}

function drawAnchorBadge(
  ctx,
  px,
  py,
  label,
  i,
  dotColor = "#f59e0b",
  badgeBorder = "#f59e0b",
  textColor = "#fbbf24"
) {
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fillStyle = dotColor;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
  const w = ctx.measureText(label).width + 8;
  const bx = Math.max(2, Math.min(ctx.canvas.width - w - 2, i % 2 === 0 ? px - w - 6 : px + 6));
  const by = Math.max(2, Math.min(ctx.canvas.height - 18, i < 2 ? py - 20 : py + 6));
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.fillRect(bx, by, w, 16);
  ctx.strokeStyle = badgeBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, w, 16);
  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + 4, by + 8);
}

function drawRoi(ctx, anchors, scaleX, scaleY) {
  if (!anchors?.p1 || !anchors?.p2 || !anchors?.p3 || !anchors?.p4) return;
  const pts = [anchors.p1, anchors.p2, anchors.p3, anchors.p4].map(([x, y]) => [
    x * scaleX,
    y * scaleY,
  ]);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = "rgba(245, 158, 11, 0.08)";
  ctx.fill();
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  pts.forEach(([px, py], i) => drawAnchorBadge(ctx, px, py, `P${i + 1}`, i));
  ctx.restore();
}

function drawCalibPoints(ctx, points, scaleX, scaleY) {
  if (!points || points.length === 0) return;
  const pts = points.map(([x, y]) => [x * scaleX, y * scaleY]);
  ctx.save();
  if (pts.length > 1) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (pts.length === 4) ctx.closePath();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    if (pts.length === 4) {
      ctx.fillStyle = "rgba(168, 85, 247, 0.15)";
      ctx.fill();
    }
    ctx.setLineDash([]);
  }
  pts.forEach(([px, py], i) => {
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#facc15";
    ctx.fill();
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2;
    ctx.stroke();
    drawAnchorBadge(ctx, px, py, `P${i + 1}`, i, "#facc15", "#a855f7", "#facc15");
  });
  ctx.restore();
}

function drawVehicleBadge(ctx, text, x, y, color) {
  ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
  const tw = ctx.measureText(text).width;
  const bw = tw + 8;
  const bx = Math.max(2, Math.min(ctx.canvas.width - bw - 2, x));
  const by = y >= 20 ? y - 18 : y + 2;
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.fillRect(bx, by, bw, 16);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, 16);
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + 4, by + 8);
}

function drawVehicles(ctx, vehicles, showBbox, showTrackId, scaleX, scaleY) {
  if (!vehicles || (!showBbox && !showTrackId)) return;
  for (const v of vehicles) {
    if (!v.bbox || v.bbox.length !== 4) continue;
    const x = v.bbox[0] * scaleX;
    const y = v.bbox[1] * scaleY;
    const w = v.bbox[2] * scaleX;
    const h = v.bbox[3] * scaleY;
    const isMoto = v.type === "moto";
    const color = isMoto ? "#10b981" : "#38bdf8";

    if (showBbox) {
      ctx.fillStyle = isMoto ? "rgba(16, 185, 129, 0.12)" : "rgba(56, 189, 248, 0.12)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
    }
    if (showTrackId) {
      drawVehicleBadge(ctx, `#${v.id} ${v.type}`, x, y, color);
    }
  }
}

function useVideoSync(videoRef, isPlaying, isScrubbing, setCurrentTime) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let vfcId = null;
    let rafId = null;
    let cancelled = false;

    const onFrame = () => {
      if (cancelled || !videoRef.current) return;
      if (!isScrubbing) setCurrentTime(videoRef.current.currentTime);
      if (!videoRef.current.paused && !videoRef.current.ended) {
        if ("requestVideoFrameCallback" in videoRef.current) {
          vfcId = videoRef.current.requestVideoFrameCallback(onFrame);
        } else {
          rafId = requestAnimationFrame(onFrame);
        }
      }
    };

    if (isPlaying) {
      if ("requestVideoFrameCallback" in video) {
        vfcId = video.requestVideoFrameCallback(onFrame);
      } else {
        rafId = requestAnimationFrame(onFrame);
      }
    }

    return () => {
      cancelled = true;
      if (vfcId !== null && videoRef.current && "cancelVideoFrameCallback" in videoRef.current) {
        try {
          videoRef.current.cancelVideoFrameCallback(vfcId);
        } catch (_) {}
      }
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isPlaying, isScrubbing, setCurrentTime, videoRef]);
}

function OverlayCanvas({
  activeFrame,
  anchors,
  showRoi,
  showBbox,
  showTrackId,
  canvasDims,
  videoDims,
  isCalibrating,
  calibPoints,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const baseW = videoDims?.width || 886;
    const baseH = videoDims?.height || 490;
    const scaleX = canvas.width / baseW;
    const scaleY = canvas.height / baseH;

    if (showRoi && anchors) drawRoi(ctx, anchors, scaleX, scaleY);
    if (isCalibrating && calibPoints?.length > 0) {
      drawCalibPoints(ctx, calibPoints, scaleX, scaleY);
    }
    if (activeFrame?.vehicles) {
      drawVehicles(ctx, activeFrame.vehicles, showBbox, showTrackId, scaleX, scaleY);
    }
  }, [
    activeFrame,
    anchors,
    showRoi,
    showBbox,
    showTrackId,
    canvasDims,
    videoDims,
    isCalibrating,
    calibPoints,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasDims.width}
      height={canvasDims.height}
      className="pointer-events-none absolute inset-0 h-full w-full object-contain"
    />
  );
}

function SpeedSelector({ playbackRate, onRateChange }) {
  const RATES = [0.5, 1, 2];
  return (
    <div className="flex overflow-hidden rounded-md border border-[#1e293b] font-mono text-xs">
      {RATES.map((rate) => (
        <button
          key={rate}
          type="button"
          onClick={() => onRateChange(rate)}
          className={`px-2 py-1 font-semibold tabular-nums transition ${
            playbackRate === rate
              ? "bg-slate-700 text-slate-100"
              : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }`}
        >
          {rate}x
        </button>
      ))}
    </div>
  );
}

function TransportControls({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  setIsScrubbing,
  playbackRate,
  onRateChange,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onTogglePlay}
        title={isPlaying ? "Tạm dừng" : "Phát"}
        className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 font-bold text-slate-950 transition hover:bg-emerald-400"
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <span className="font-mono text-xs tabular-nums text-slate-300">
        {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
      </span>
      <div className="min-w-[120px] flex-1">
        <input
          type="range"
          min={0}
          max={duration || 15}
          step={0.05}
          value={Math.min(duration || 15, Math.max(0, currentTime))}
          onChange={(e) => onSeek(Number(e.target.value))}
          onPointerDown={() => setIsScrubbing(true)}
          onPointerUp={() => setIsScrubbing(false)}
          className="transport-scrubber"
          aria-label="Tua thời gian video"
        />
      </div>
      <SpeedSelector playbackRate={playbackRate} onRateChange={onRateChange} />
    </div>
  );
}

function LayerCheckboxes({
  showBbox,
  setShowBbox,
  showTrackId,
  setShowTrackId,
  showRoi,
  setShowRoi,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
      <label className="flex cursor-pointer items-center gap-1.5 select-none text-slate-300 transition hover:text-emerald-300">
        <input
          type="checkbox"
          checked={showBbox}
          onChange={(e) => setShowBbox(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-[#1e293b] bg-slate-900 accent-emerald-500"
        />
        <span>Bbox YOLO</span>
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 select-none text-slate-300 transition hover:text-sky-300">
        <input
          type="checkbox"
          checked={showTrackId}
          onChange={(e) => setShowTrackId(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-[#1e293b] bg-slate-900 accent-sky-500"
        />
        <span>ByteTrack ID</span>
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 select-none text-slate-300 transition hover:text-amber-300">
        <input
          type="checkbox"
          checked={showRoi}
          onChange={(e) => setShowRoi(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-[#1e293b] bg-slate-900 accent-amber-500"
        />
        <span>ROI Neo P1-P4</span>
      </label>
    </div>
  );
}

function LayerToggles({
  showBbox,
  setShowBbox,
  showTrackId,
  setShowTrackId,
  showRoi,
  setShowRoi,
  isCalibrating,
  setIsCalibrating,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1e293b] pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <LayerCheckboxes
          showBbox={showBbox}
          setShowBbox={setShowBbox}
          showTrackId={showTrackId}
          setShowTrackId={setShowTrackId}
          showRoi={showRoi}
          setShowRoi={setShowRoi}
        />
        <button
          type="button"
          onClick={() => setIsCalibrating((v) => !v)}
          className={`flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-xs transition ${
            isCalibrating
              ? "border-purple-500 bg-purple-950/60 text-purple-200 shadow-sm shadow-purple-500/20"
              : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isCalibrating ? "bg-purple-400 animate-pulse" : "bg-slate-600"
            }`}
          />
          <span>Hiệu chuẩn 4 điểm neo</span>
        </button>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>CAM-CTU-01 · Hiệu chuẩn phối cảnh cố định</span>
      </div>
    </div>
  );
}

function CalibrationBar({ calibPoints, onReset, onApply }) {
  const isComplete = calibPoints.length === 4;
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-500/40 bg-purple-950/40 px-3 py-2 text-xs">
      <div className="flex flex-col gap-1 font-mono">
        <div className="flex items-center gap-2 text-purple-200">
          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          <span>
            {`Đã chấm ${calibPoints.length}/4 điểm (P1: Trên-Trái → P2: Trên-Phải → P3: Dưới-Phải → P4: Dưới-Trái)`}
          </span>
        </div>
        {isComplete && (
          <div className="text-[11px] text-amber-300">
            {`P1: [${calibPoints[0]}], P2: [${calibPoints[1]}], P3: [${calibPoints[2]}], P4: [${calibPoints[3]}]`}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 font-mono">
        {isComplete && (
          <button
            type="button"
            onClick={onApply}
            className="rounded bg-amber-500 px-2.5 py-1 text-xs font-semibold text-slate-950 transition hover:bg-amber-400"
          >
            Áp dụng thử
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded border border-purple-700 bg-purple-900/40 px-2.5 py-1 text-xs font-medium text-purple-200 transition hover:bg-purple-800/50"
        >
          Xóa chấm lại
        </button>
      </div>
    </div>
  );
}

function StreamHeader({ canvasDims, fps }) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
        <Video size={14} className="text-emerald-400" />
        Luồng camera phối cảnh
      </span>
      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">
        CAM-CTU-01
      </span>
      <span className="font-mono text-[10px] tabular-nums text-slate-500">
        {canvasDims.width}×{canvasDims.height} · {fps || 30} FPS
      </span>
    </div>
  );
}

function ViewportVideo({
  videoRef,
  videoSrc,
  setIsPlaying,
  setCurrentTime,
  isScrubbing,
  setCanvasDims,
  setDuration,
  onTogglePlay,
}) {
  const handleLoadedMeta = (e) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) {
      setCanvasDims({ width: v.videoWidth, height: v.videoHeight });
    }
    if (v.duration && Number.isFinite(v.duration)) setDuration(v.duration);
    if (v.currentTime === 0) {
      v.currentTime = 0.001;
    }
  };

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      muted
      preload="auto"
      playsInline
      onPlay={() => setIsPlaying(true)}
      onPause={() => {
        setIsPlaying(false);
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
      }}
      onEnded={() => {
        setIsPlaying(false);
        if (videoRef.current) setCurrentTime(videoRef.current.duration || 0);
      }}
      onTimeUpdate={() => {
        if (!isScrubbing && videoRef.current) setCurrentTime(videoRef.current.currentTime);
      }}
      onLoadedMetadata={handleLoadedMeta}
      onLoadedData={handleLoadedMeta}
      onClick={onTogglePlay}
      className="h-full w-full cursor-pointer object-contain"
    />
  );
}

function VideoViewport({
  videoProps,
  overlayProps,
  isCalibrating,
  calibPoints,
  setCalibPoints,
}) {
  const handleCalibClick = (e) => {
    if (calibPoints.length >= 4) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(886, Math.round(((e.clientX - rect.left) / rect.width) * 886)));
    const y = Math.max(0, Math.min(490, Math.round(((e.clientY - rect.top) / rect.height) * 490)));
    setCalibPoints((prev) => (prev.length < 4 ? [...prev, [x, y]] : prev));
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-[#1e293b] bg-slate-950">
      <ViewportVideo {...videoProps} />
      <OverlayCanvas
        {...overlayProps}
        isCalibrating={isCalibrating}
        calibPoints={calibPoints}
      />
      {isCalibrating && (
        <div
          onClick={handleCalibClick}
          className="absolute inset-0 z-10 cursor-crosshair"
          title="Nhấp chuột để chọn điểm neo P1 -> P4"
        />
      )}
    </div>
  );
}

function CameraStreamControls({ player, meta, layers, isCalibrating, setIsCalibrating }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      <TransportControls
        isPlaying={player.isPlaying}
        onTogglePlay={player.onTogglePlay}
        currentTime={player.currentTime}
        duration={meta.duration}
        onSeek={player.onSeek}
        setIsScrubbing={player.setIsScrubbing}
        playbackRate={player.playbackRate}
        onRateChange={player.onRateChange}
      />
      <LayerToggles
        {...layers}
        isCalibrating={isCalibrating}
        setIsCalibrating={setIsCalibrating}
      />
    </div>
  );
}

function CameraStreamZone({
  player,
  layers,
  meta,
  isCalibrating,
  setIsCalibrating,
  calibPoints,
  setCalibPoints,
  onApplyCalib,
}) {
  const overlayProps = {
    activeFrame: player.activeFrame,
    anchors: meta.metadata?.anchors,
    showRoi: layers.showRoi,
    showBbox: layers.showBbox,
    showTrackId: layers.showTrackId,
    canvasDims: meta.canvasDims,
    videoDims: meta.metadata?.video,
  };

  const videoProps = {
    videoRef: player.videoRef,
    videoSrc: player.videoSrc,
    setIsPlaying: player.setIsPlaying,
    setCurrentTime: player.setCurrentTime,
    isScrubbing: player.isScrubbing,
    setCanvasDims: meta.setCanvasDims,
    setDuration: meta.setDuration,
    onTogglePlay: player.onTogglePlay,
  };

  return (
    <section className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 lg:col-span-7">
      <StreamHeader canvasDims={meta.canvasDims} fps={meta.metadata?.video?.fps} />
      {isCalibrating && (
        <CalibrationBar
          calibPoints={calibPoints}
          onReset={() => setCalibPoints([])}
          onApply={onApplyCalib}
        />
      )}
      <VideoViewport
        videoProps={videoProps}
        overlayProps={overlayProps}
        isCalibrating={isCalibrating}
        calibPoints={calibPoints}
        setCalibPoints={setCalibPoints}
      />
      <CameraStreamControls
        player={player}
        meta={meta}
        layers={layers}
        isCalibrating={isCalibrating}
        setIsCalibrating={setIsCalibrating}
      />
    </section>
  );
}

function useCameraData() {
  const [metadata, setMetadata] = useState(FALLBACK_META);
  const [duration, setDuration] = useState(193.3);
  const [canvasDims, setCanvasDimsState] = useState({ width: 886, height: 490 });
  const hasNativeDimsRef = useRef(false);

  const setCanvasDims = useCallback((dims) => {
    hasNativeDimsRef.current = true;
    setCanvasDimsState(dims);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/data/camera_roi_meta.json")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!mounted || !data) return;
        setMetadata(data);
        if (data.video?.duration) setDuration(data.video.duration);
        if (!hasNativeDimsRef.current && data.video?.width && data.video?.height) {
          setCanvasDimsState({ width: data.video.width, height: data.video.height });
        }
      })
      .catch(() => {
        if (mounted) setMetadata(FALLBACK_META);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { metadata, setMetadata, duration, setDuration, canvasDims, setCanvasDims };
}

function useCameraPlayer(metadata) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const videoRef = useRef(null);
  const videoSrc = "/videos/intersection_1_roi.mp4";

  useVideoSync(videoRef, isPlaying, isScrubbing, setCurrentTime);

  const activeFrame = useMemo(
    () => findClosestFrame(metadata.frames, currentTime),
    [metadata.frames, currentTime]
  );

  const onTogglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => setIsPlaying(false));
    else v.pause();
  }, [setIsPlaying]);

  const onSeek = useCallback((t) => {
    setCurrentTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, []);

  const onRateChange = useCallback((r) => {
    setPlaybackRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  }, []);

  return {
    currentTime, setCurrentTime, isPlaying, setIsPlaying,
    playbackRate, videoSrc, isScrubbing, setIsScrubbing,
    videoRef, activeFrame, onTogglePlay, onSeek, onRateChange,
  };
}

function useLayerToggles() {
  const [showBbox, setShowBbox] = useState(true);
  const [showTrackId, setShowTrackId] = useState(true);
  const [showRoi, setShowRoi] = useState(true);
  return { showBbox, setShowBbox, showTrackId, setShowTrackId, showRoi, setShowRoi };
}

export default function CameraView() {
  const meta = useCameraData();
  const player = useCameraPlayer(meta.metadata);
  const layers = useLayerToggles();
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibPoints, setCalibPoints] = useState([]);

  const handleApplyCalib = useCallback(() => {
    if (calibPoints.length !== 4) return;
    meta.setMetadata((prev) => ({
      ...prev,
      anchors: {
        p1: calibPoints[0],
        p2: calibPoints[1],
        p3: calibPoints[2],
        p4: calibPoints[3],
      },
    }));
    layers.setShowRoi(true);
  }, [calibPoints, meta, layers]);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
      <CameraStreamZone
        player={player}
        layers={layers}
        meta={meta}
        isCalibrating={isCalibrating}
        setIsCalibrating={setIsCalibrating}
        calibPoints={calibPoints}
        setCalibPoints={setCalibPoints}
        onApplyCalib={handleApplyCalib}
      />
      <IpmZone activeFrame={player.activeFrame} metadata={meta.metadata} currentTime={player.currentTime} />
      <PipelineStrip isPlaying={player.isPlaying} />
    </div>
  );
}
