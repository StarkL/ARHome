import React from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Magnet, 
  X, 
  Ruler, 
  Square, 
  Palette, 
  ShieldAlert,
  ArrowRightLeft
} from 'lucide-react';
import { FURNITURE_ITEMS } from '../data/furnitureCatalogData';

export function InspectorPanel({ 
  selectedItem, 
  onRotate, 
  onSnapToWall, 
  onDuplicate, 
  onDelete, 
  onClose,
  onChangeColor 
}) {
  if (!selectedItem) return null;

  const { name, dimensionsMm, clearanceRequirementMm, priceEstimate, color, catalogId } = selectedItem.userData;
  const catalogDef = FURNITURE_ITEMS.find(i => i.id === catalogId);
  const colorVariants = catalogDef?.colorVariants || [];

  const areaSqM = ((dimensionsMm.width * dimensionsMm.length) / 1000000).toFixed(2);

  return (
    <div className="absolute right-3 top-20 w-80 glass-panel rounded-xl z-20 p-4 shadow-2xl animate-in fade-in slide-in-from-right duration-200">
      {/* 头部标题与关闭 */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-700/60">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
            已选中实体
          </span>
          <h3 className="text-sm font-bold text-white mt-1">{name}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="取消选中"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1:1 物理尺度核心参数卡片 */}
      <div className="my-3 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Ruler className="w-3.5 h-3.5" />
            <span>1:1 毫米级尺寸标定</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400">
            占地 {areaSqM} ㎡
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400">宽度 (W)</div>
            <div className="text-xs font-bold text-cyan-300 mt-0.5">{dimensionsMm.width} mm</div>
          </div>
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400">长度 (L)</div>
            <div className="text-xs font-bold text-emerald-300 mt-0.5">{dimensionsMm.length} mm</div>
          </div>
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[10px] text-slate-400">高度 (H)</div>
            <div className="text-xs font-bold text-amber-300 mt-0.5">{dimensionsMm.height} mm</div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <span>通行动线标准:</span>
          <span className="text-amber-400 font-semibold">≥ {clearanceRequirementMm} mm</span>
        </div>
      </div>

      {/* 材质配色选择器 */}
      {colorVariants.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 mb-2 font-medium">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span>可选材质风格</span>
          </div>
          <div className="flex items-center gap-2">
            {colorVariants.map((c, i) => (
              <button
                key={i}
                onClick={() => onChangeColor(c.color)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border transition-all ${
                  color === c.color
                    ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200 shadow-sm'
                    : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border border-black/40"
                  style={{ backgroundColor: c.color }}
                />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 空间姿态微调操作栏 */}
      <div className="space-y-2">
        <div className="text-xs text-slate-400 font-medium">空间摆放操作</div>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onRotate(-Math.PI / 4)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            title="逆时针旋转 45 度"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>左旋 45°</span>
          </button>

          <button
            onClick={() => onRotate(Math.PI / 4)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            title="顺时针旋转 45 度"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>右旋 45°</span>
          </button>
        </div>

        {/* 贴墙吸附与复制 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSnapToWall}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 border border-slate-700 transition-colors"
            title="自动吸附对齐到最近的物理墙壁"
          >
            <Magnet className="w-3.5 h-3.5 text-cyan-400" />
            <span>一键贴墙</span>
          </button>

          <button
            onClick={onDuplicate}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            title="复制一份此家具"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            <span>复制</span>
          </button>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-xs text-rose-300 border border-rose-800/80 transition-colors mt-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>移出房间</span>
        </button>
      </div>

      {/* 底部坐标微调提示 */}
      <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span>3D 场景中可直接拖动红色/蓝色坐标轴移动</span>
      </div>
    </div>
  );
}
