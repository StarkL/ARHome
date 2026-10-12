import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Ruler, 
  BedDouble, 
  Bed, 
  Layers, 
  Archive, 
  Sparkles, 
  Armchair, 
  Square, 
  Tv, 
  Utensils, 
  Laptop, 
  Compass, 
  BookOpen, 
  Sun, 
  Flower2,
  Box,
  Upload
} from 'lucide-react';
import { FURNITURE_CATEGORIES, FURNITURE_ITEMS } from '../data/furnitureCatalogData';

const ICON_MAP = {
  BedDouble,
  Bed,
  Layers,
  Archive,
  Sparkles,
  Armchair,
  Square,
  Tv,
  Utensils,
  Laptop,
  Compass,
  BookOpen,
  Sun,
  Flower2
};

export function FurnitureCatalog({ onAddItem, isOpen, setIsOpen }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = FURNITURE_ITEMS.filter(item => {
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <aside 
      className={`absolute left-3 top-20 bottom-3 w-80 glass-panel rounded-xl z-20 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+16px)]'
      }`}
    >
      {/* 展开/收起浮动按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-9 top-6 w-9 h-10 bg-slate-900 border border-l-0 border-slate-700 rounded-r-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 shadow-md"
        title={isOpen ? '收起家居库' : '展开已知尺寸家居库'}
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* 头部标题与统计 */}
      <div className="p-3.5 border-b border-slate-700/60">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Box className="w-4 h-4 text-cyan-400" />
            <h2 className="font-semibold text-sm text-white">标准尺寸家居库</h2>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
            {filteredItems.length} 款现货
          </span>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="搜索床、沙发、餐桌、衣柜..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 分类切换横向滚动 */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-800/80 overflow-x-auto text-[11px] no-scrollbar">
        {FURNITURE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded-md font-medium transition-colors ${
              selectedCategory === cat.id
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 家具卡片滚动列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredItems.map(item => {
          const IconComp = ICON_MAP[item.icon] || Box;
          const { width, length, height } = item.dimensionsMm;

          return (
            <div
              key={item.id}
              className="group p-3 rounded-lg bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-600/50 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-cyan-400 border border-slate-700 group-hover:border-cyan-500 transition-colors">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* 添加放置按钮 */}
                <button
                  onClick={() => onAddItem(item)}
                  className="px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-medium flex items-center gap-1 shadow-sm shrink-0"
                  title="放置到房间"
                >
                  <Plus className="w-3 h-3" />
                  <span>试摆</span>
                </button>
              </div>

              {/* 关键物理尺寸信息卡 (1:1 毫米单位) */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-1 text-cyan-400">
                  <Ruler className="w-3 h-3" />
                  <span>{width} × {length} × {height} mm</span>
                </div>
                <span className="text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/50">
                  动线≥{item.clearanceRequirementMm}mm
                </span>
              </div>

              {/* 颜色/材质微缩预览 */}
              {item.colorVariants && item.colorVariants.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">材质色系:</span>
                  <div className="flex items-center gap-1">
                    {item.colorVariants.map((c, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-slate-600 shadow-sm"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            暂无匹配的家具，请尝试其他关键词
          </div>
        )}
      </div>

      {/* 底部自定义导入提示 */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-900/40 rounded-b-xl flex items-center justify-between">
        <span>支持根据 CAD 真实尺寸参数扩展</span>
        <span className="text-cyan-400 font-mono">1:1 Metric</span>
      </div>
    </aside>
  );
}
