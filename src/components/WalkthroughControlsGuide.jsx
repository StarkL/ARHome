import React, { useState, useEffect } from 'react';
import { Footprints, MousePointerClick, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export function WalkthroughControlsGuide({ isLocked, onLockRequest, eyeHeight, onDirectionChange }) {
  const [activeKeys, setActiveKeys] = useState({ forward: false, backward: false, left: false, right: false });

  // 监听全局按键以高亮屏幕虚拟十字键
  useEffect(() => {
    const handleDown = (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') setActiveKeys(p => ({ ...p, forward: true }));
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') setActiveKeys(p => ({ ...p, backward: true }));
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') setActiveKeys(p => ({ ...p, left: true }));
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') setActiveKeys(p => ({ ...p, right: true }));
    };
    const handleUp = (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') setActiveKeys(p => ({ ...p, forward: false }));
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') setActiveKeys(p => ({ ...p, backward: false }));
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') setActiveKeys(p => ({ ...p, left: false }));
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') setActiveKeys(p => ({ ...p, right: false }));
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, []);

  const triggerDir = (dir, active) => {
    setActiveKeys(p => ({ ...p, [dir]: active }));
    if (onDirectionChange) onDirectionChange(dir, active);
  };

  return (
    <>
      {/* 顶部漫游提示条 */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="glass-panel rounded-xl px-4 py-2.5 flex items-center gap-4 text-xs shadow-xl border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400">
            <Footprints className="w-4 h-4 animate-bounce" />
            <span className="font-semibold">真人走动漫游模式</span>
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <div className="flex items-center gap-3 text-slate-300">
            <span className="font-mono text-cyan-400">视角高度: {(eyeHeight * 100).toFixed(0)}cm</span>
            <span>键盘 <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-white border border-slate-700">W A S D</span> 行走</span>
            <span className="text-slate-400">|</span>
            {isLocked ? (
              <span className="text-emerald-400 font-medium">已锁定鼠标，按 <span className="font-mono bg-slate-800 px-1 rounded">Esc</span> 退出</span>
            ) : (
              <button
                onClick={onLockRequest}
                className="pointer-events-auto px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-medium flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <MousePointerClick className="w-3 h-3" />
                <span>点击锁定转头视角</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 左下方屏幕虚拟导航方向键 (可鼠标长按行走 / 手机触控行走 / 显示当前按键状态) */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto flex flex-col items-center gap-1.5 bg-slate-950/85 p-3 rounded-2xl border border-slate-700/80 backdrop-blur-md shadow-2xl">
        <div className="text-[10px] text-slate-400 font-mono mb-0.5">漫游走动控制</div>
        
        {/* W (前进) */}
        <button
          onMouseDown={() => triggerDir('forward', true)}
          onMouseUp={() => triggerDir('forward', false)}
          onMouseLeave={() => triggerDir('forward', false)}
          onTouchStart={(e) => { e.preventDefault(); triggerDir('forward', true); }}
          onTouchEnd={() => triggerDir('forward', false)}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-mono text-xs transition-all shadow-md ${
            activeKeys.forward
              ? 'bg-emerald-600 text-white border-emerald-400 scale-95 shadow-emerald-500/50'
              : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
          }`}
          title="前进 (W / ↑)"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-[9px] -mt-1 font-bold">W</span>
        </button>

        {/* A S D (左 / 后 / 右) */}
        <div className="flex items-center gap-1.5">
          <button
            onMouseDown={() => triggerDir('left', true)}
            onMouseUp={() => triggerDir('left', false)}
            onMouseLeave={() => triggerDir('left', false)}
            onTouchStart={(e) => { e.preventDefault(); triggerDir('left', true); }}
            onTouchEnd={() => triggerDir('left', false)}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-mono text-xs transition-all shadow-md ${
              activeKeys.left
                ? 'bg-emerald-600 text-white border-emerald-400 scale-95 shadow-emerald-500/50'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="左移 (A / ←)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-[9px] -mt-1 font-bold">A</span>
          </button>

          <button
            onMouseDown={() => triggerDir('backward', true)}
            onMouseUp={() => triggerDir('backward', false)}
            onMouseLeave={() => triggerDir('backward', false)}
            onTouchStart={(e) => { e.preventDefault(); triggerDir('backward', true); }}
            onTouchEnd={() => triggerDir('backward', false)}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-mono text-xs transition-all shadow-md ${
              activeKeys.backward
                ? 'bg-emerald-600 text-white border-emerald-400 scale-95 shadow-emerald-500/50'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="后退 (S / ↓)"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="text-[9px] -mt-1 font-bold">S</span>
          </button>

          <button
            onMouseDown={() => triggerDir('right', true)}
            onMouseUp={() => triggerDir('right', false)}
            onMouseLeave={() => triggerDir('right', false)}
            onTouchStart={(e) => { e.preventDefault(); triggerDir('right', true); }}
            onTouchEnd={() => triggerDir('right', false)}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border font-mono text-xs transition-all shadow-md ${
              activeKeys.right
                ? 'bg-emerald-600 text-white border-emerald-400 scale-95 shadow-emerald-500/50'
                : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
            title="右移 (D / →)"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="text-[9px] -mt-1 font-bold">D</span>
          </button>
        </div>
      </div>
    </>
  );
}
