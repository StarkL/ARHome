import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';

export function ClearanceWarningBanner({ warnings = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (warnings.length === 0) {
    return (
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 text-xs shadow-lg backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>通行动线符合标准：所有通道净宽 ≥ 600mm</span>
        </div>
      </div>
    );
  }

  const dangerCount = warnings.filter(w => w.severity === 'danger').length;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-lg w-[90%]">
      <div className="bg-slate-950/95 border border-rose-500/60 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* 顶部简报条 */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2.5 px-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-rose-950 flex items-center justify-center text-rose-400 border border-rose-800">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-300">
                检测到 {warnings.length} 处空间动线拥挤预警
                {dangerCount > 0 && <span className="text-rose-400 font-mono ml-1.5">({dangerCount} 处受阻)</span>}
              </div>
              <p className="text-[10px] text-slate-400">
                人体通行建议预留净宽 ≥ 600mm (主干道 ≥ 800mm)
              </p>
            </div>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* 展开的警告详情列表 */}
        {isExpanded && (
          <div className="max-h-48 overflow-y-auto px-4 pb-3 pt-1 border-t border-slate-800/80 space-y-1.5">
            {warnings.map((w, idx) => (
              <div 
                key={idx}
                className="text-[11px] p-2 rounded bg-slate-900/80 border border-slate-800 flex items-start gap-2"
              >
                <AlertCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${w.severity === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
                <span className="text-slate-200">{w.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
