import React, { useState } from 'react';
import { X, Check, Ruler, Maximize2, Layers } from 'lucide-react';

export function RoomSettingsModal({ isOpen, onClose, currentConfig, onSaveConfig }) {
  if (!isOpen) return null;

  const [width, setWidth] = useState(currentConfig.width || 5.0);
  const [depth, setDepth] = useState(currentConfig.depth || 4.2);
  const [height, setHeight] = useState(currentConfig.height || 2.8);
  const [wallFinish, setWallFinish] = useState(currentConfig.wallFinish || 'concrete');

  const area = (width * depth).toFixed(2);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveConfig({
      width: parseFloat(width),
      depth: parseFloat(depth),
      height: parseFloat(height),
      wallFinish
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md glass-panel rounded-2xl p-6 border border-slate-700 shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">毛坯房空间尺寸配置</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 面积指示牌 */}
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">核算室内净套内面积:</span>
            <span className="font-mono text-cyan-400 text-sm font-bold">{area} ㎡</span>
          </div>

          {/* 开间宽度 (X 轴) */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>房间开间宽度 (宽):</span>
              <span className="font-mono text-cyan-400 font-bold">{width} 米</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="10.0"
              step="0.1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>3.0m</span>
              <span>6.5m</span>
              <span>10.0m</span>
            </div>
          </div>

          {/* 进深长度 (Z 轴) */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>房间进深跨度 (长):</span>
              <span className="font-mono text-cyan-400 font-bold">{depth} 米</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="10.0"
              step="0.1"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>3.0m</span>
              <span>6.5m</span>
              <span>10.0m</span>
            </div>
          </div>

          {/* 层高净高 (Y 轴) */}
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>房间净层高:</span>
              <span className="font-mono text-cyan-400 font-bold">{height} 米</span>
            </div>
            <input
              type="range"
              min="2.5"
              max="4.0"
              step="0.05"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full accent-cyan-400"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2.5m (标准)</span>
              <span>3.2m</span>
              <span>4.0m (挑高)</span>
            </div>
          </div>

          {/* 墙面材质风格 */}
          <div>
            <label className="text-xs text-slate-300 block mb-2">毛坯房现场墙面状态:</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setWallFinish('concrete')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  wallFinish === 'concrete'
                    ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="w-4 h-4 rounded bg-[#777777] shrink-0 border border-slate-600" />
                <div>
                  <div className="font-semibold text-slate-200">裸水泥毛坯</div>
                  <div className="text-[10px] text-slate-400">真实混凝土施工原貌</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setWallFinish('skimcoat')}
                className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all ${
                  wallFinish === 'skimcoat'
                    ? 'border-cyan-500 bg-cyan-950/60 text-cyan-200'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="w-4 h-4 rounded bg-[#f1f5f9] shrink-0 border border-slate-600" />
                <div>
                  <div className="font-semibold text-slate-200">已批刮白腻子</div>
                  <div className="text-[10px] text-slate-400">基础找平阶段浅白墙</div>
                </div>
              </button>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
            >
              <Check className="w-4 h-4" />
              <span>应用房型并重建空间</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
