import React from 'react';
import { 
  Glasses, 
  Orbit, 
  Footprints, 
  Sun, 
  Maximize2, 
  Settings2, 
  Scan, 
  FileDown, 
  Camera, 
  FolderOpen,
  HelpCircle,
  FileText
} from 'lucide-react';
import { SAMPLE_PRESETS } from '../data/samplePresets';

export function Header({
  viewMode,
  setViewMode,
  sunlightTime,
  setSunlightTime,
  isLidarScanActive,
  setIsLidarScanActive,
  onOpenRoomSettings,
  onOpenFloorPlanModal,
  onOpenBOM,
  onLoadPreset,
  onTakeScreenshot,
  onExportJson,
  onImportJson
}) {
  return (
    <header className="absolute top-3 left-3 right-3 h-14 z-30 flex items-center justify-between px-4 glass-panel rounded-xl">
      {/* 品牌与标题 */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Glasses className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-wide text-white">ARHome</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              1:1 空间实测
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            毛坯房 AR 家居试摆与真实空间漫游仿真系统
          </p>
        </div>
      </div>

      {/* 核心视角切换胶囊 */}
      <div className="flex items-center bg-slate-900/90 p-1 rounded-lg border border-slate-700/60 shadow-inner">
        <button
          onClick={() => setViewMode('orbit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            viewMode === 'orbit'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="俯视全局自由设计与拖拽视角"
        >
          <Orbit className="w-3.5 h-3.5" />
          <span>设计视角</span>
        </button>

        <button
          onClick={() => setViewMode('walk')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            viewMode === 'walk'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="真人 1.68m 视线高度自由走动漫游 (WASD移动)"
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>真人走动</span>
        </button>

        <button
          onClick={() => setViewMode('ar_pov')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            viewMode === 'ar_pov'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="模拟佩戴 AR 眼镜看到的 1:1 第一人称实景"
        >
          <Glasses className="w-3.5 h-3.5" />
          <span>AR 眼镜 POV</span>
        </button>
      </div>

      {/* 快捷操作工具栏 */}
      <div className="flex items-center gap-2">
        {/* 预设户型选择 */}
        <div className="relative group hidden md:block">
          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200">
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>样板布局</span>
          </button>
          <div className="absolute right-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 hidden group-hover:block z-50">
            <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold">快速载入 1:1 方案</div>
            {SAMPLE_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => onLoadPreset(p)}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs text-slate-200 hover:bg-cyan-950 hover:text-cyan-300 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* 导入户型图纸自动解析 */}
        <button
          onClick={onOpenFloorPlanModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 transition-colors shadow-sm"
          title="导入 2D 户型图纸或草图，自动解析并生成 1:1 三维房间场景"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline font-medium">导入图纸</span>
        </button>

        {/* 毛坯房参数设置 */}
        <button
          onClick={onOpenRoomSettings}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200"
          title="调整毛坯房长宽高尺寸与墙面水泥/腻子材质"
        >
          <Settings2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">房型参数</span>
        </button>

        {/* LiDAR 扫描脉冲 */}
        <button
          onClick={() => setIsLidarScanActive(!isLidarScanActive)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
            isLidarScanActive 
              ? 'bg-cyan-950 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/50' 
              : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="模拟雷达空间网格扫描"
        >
          <Scan className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">LiDAR 扫房</span>
        </button>

        {/* 自然采光时间 */}
        <select
          value={sunlightTime}
          onChange={(e) => setSunlightTime(e.target.value)}
          className="bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          title="模拟南窗日光采光角度与阴影"
        >
          <option value="morning">🌅 晨光朝阳</option>
          <option value="noon">☀️ 正午阳光</option>
          <option value="sunset">🌇 傍晚落日</option>
          <option value="night">🌙 夜晚灯光</option>
        </select>

        {/* 采购清单 (BOM) */}
        <button
          onClick={onOpenBOM}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300"
          title="查看真实尺寸物料清单与预算"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">采购清单</span>
        </button>

        {/* 截屏 */}
        <button
          onClick={onTakeScreenshot}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300"
          title="截取高清效果图"
        >
          <Camera className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
