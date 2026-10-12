import React from 'react';
import { 
  Eye, 
  Camera, 
  Compass, 
  Wifi, 
  Battery, 
  Crosshair, 
  Maximize, 
  Sliders,
  ShieldCheck
} from 'lucide-react';

export function ARGlassesHUD({
  eyeHeight,
  setEyeHeight,
  isWebcamActive,
  onToggleWebcam,
  isLocked
}) {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 pt-20">
      {/* 模拟 AR 眼镜光波导 / 透镜 FOV 视场角边界线框 */}
      <div className="ar-hud-overlay rounded-3xl" />
      <div className="ar-scanline" />

      {/* 四个角的工程准心标记 */}
      <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-cyan-400" />
      <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-cyan-400" />
      <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-cyan-400" />
      <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-cyan-400" />

      {/* 中心十字瞄准线 (模拟眼动追踪与空间注视点) */}
      <div className="ar-crosshair flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 radar-pulse" />
        <div className="absolute w-8 h-8 rounded-full border border-cyan-500/40" />
      </div>

      {/* 顶部 AR 空间感知状态条 */}
      <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-cyan-900/60 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SLAM 6DoF: LOCKED</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>1:1 物理尺度标定</span>
          </div>
          <span className="text-slate-600">|</span>
          <span>SPATIAL MESH: ON</span>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-cyan-900/60 backdrop-blur-md">
          <span className="text-slate-300">FOV: 52° OST</span>
          <Wifi className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center gap-1 text-emerald-400">
            <Battery className="w-3.5 h-3.5" />
            <span>92%</span>
          </div>
        </div>
      </div>

      {/* 底部 AR 眼镜控制坞 (Pointer-events 开启) */}
      <div className="flex items-center justify-between text-xs font-mono">
        {/* 左下：真人视线高度滑块 */}
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-950/85 px-3 py-2 rounded-lg border border-cyan-900/60 backdrop-blur-md text-slate-200">
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px]">人眼高度:</span>
          <input
            type="range"
            min="1.50"
            max="1.90"
            step="0.02"
            value={eyeHeight}
            onChange={(e) => setEyeHeight(parseFloat(e.target.value))}
            className="w-24 accent-cyan-400 cursor-pointer"
          />
          <span className="text-cyan-400 font-bold">{(eyeHeight * 100).toFixed(0)} cm</span>
        </div>

        {/* 鼠标锁定漫游提示 */}
        <div className="text-center text-[11px] text-slate-300 bg-slate-950/85 px-4 py-2 rounded-lg border border-cyan-900/60 backdrop-blur-md">
          {isLocked ? (
            <span className="text-emerald-400">🟢 鼠标已锁定视角 | WASD 在毛坯房中真实走动 | 按 Esc 释放</span>
          ) : (
            <span className="text-cyan-300">💡 点击画面任意位置进入第一人称视角漫游</span>
          )}
        </div>

        {/* 右下：真实摄像头透视开关 (Webcam Passthrough) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleWebcam}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-sans transition-all border ${
              isWebcamActive
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isWebcamActive ? '实景透视已开启' : '开启摄像头穿透'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
