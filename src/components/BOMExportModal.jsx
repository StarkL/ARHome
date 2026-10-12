import React from 'react';
import { X, FileSpreadsheet, Download, Copy, Check, DollarSign, Box } from 'lucide-react';

export function BOMExportModal({ isOpen, onClose, placedItems, roomConfig, onExportJson }) {
  if (!isOpen) return null;

  const [copied, setCopied] = React.useState(false);

  const roomArea = (roomConfig.width * roomConfig.depth).toFixed(2);
  let totalFurnitureArea = 0;
  let totalPrice = 0;

  const tableData = placedItems.map(item => {
    const { name, dimensionsMm, color, priceEstimate, category } = item.userData;
    const area = (dimensionsMm.width * dimensionsMm.length) / 1000000;
    totalFurnitureArea += area;
    totalPrice += priceEstimate || 0;

    return {
      name,
      category,
      color,
      dims: `${dimensionsMm.width} × ${dimensionsMm.length} × ${dimensionsMm.height} mm`,
      area: area.toFixed(2),
      price: priceEstimate || 0
    };
  });

  const occupancyRate = ((totalFurnitureArea / roomArea) * 100).toFixed(1);

  const handleCopyText = () => {
    let text = `【ARHome 1:1 毛坯房软装选配物料清单】\n`;
    text += `房间尺寸: ${roomConfig.width}m × ${roomConfig.depth}m (套内净面积: ${roomArea} ㎡)\n`;
    text += `家具总件数: ${tableData.length} 件 | 占地面积: ${totalFurnitureArea.toFixed(2)} ㎡ | 空间占地率: ${occupancyRate}%\n`;
    text += `预估采购预算合计: ¥${totalPrice.toLocaleString()}\n\n`;
    text += `序号 | 家具名称 | 1:1真实物理尺寸 (W×L×H) | 占地面积 | 预估单价\n`;
    tableData.forEach((row, i) => {
      text += `${i + 1} | ${row.name} | ${row.dims} | ${row.area} ㎡ | ¥${row.price}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl glass-panel rounded-2xl p-6 border border-slate-700 shadow-2xl max-h-[85vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base text-white">1:1 实景软装选配物料清单 (BOM)</h3>
              <p className="text-xs text-slate-400">真实已知尺寸核算与空间占地容积率评估</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 关键统计摘要 */}
        <div className="grid grid-cols-4 gap-2 my-4 text-center font-mono text-xs">
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">房间套内面积</div>
            <div className="text-cyan-400 font-bold text-sm mt-0.5">{roomArea} ㎡</div>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">家具总占地</div>
            <div className="text-emerald-400 font-bold text-sm mt-0.5">{totalFurnitureArea.toFixed(2)} ㎡</div>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">空间占地率</div>
            <div className="text-amber-400 font-bold text-sm mt-0.5">{occupancyRate}%</div>
          </div>
          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-400">软装预估总价</div>
            <div className="text-rose-400 font-bold text-sm mt-0.5">¥{totalPrice.toLocaleString()}</div>
          </div>
        </div>

        {/* 清单表格 */}
        <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-300 font-semibold sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2.5 pl-3">家具名称</th>
                <th className="p-2.5 font-mono">1:1真实物理尺寸 (W×L×H)</th>
                <th className="p-2.5 font-mono">占地</th>
                <th className="p-2.5 font-mono">预估单价</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
              {tableData.map((row, i) => (
                <tr key={i} className="hover:bg-slate-800/40">
                  <td className="p-2.5 pl-3 font-sans font-medium text-white flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/40"
                      style={{ backgroundColor: row.color }}
                    />
                    <span>{row.name}</span>
                  </td>
                  <td className="p-2.5 text-cyan-300">{row.dims}</td>
                  <td className="p-2.5 text-slate-300">{row.area} ㎡</td>
                  <td className="p-2.5 text-amber-300">¥{row.price}</td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-500 font-sans">
                    场景内暂未摆放任何家具，请先在左侧家居库中添加
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 底部操作栏 */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            * 尺寸严格按出厂标准毫米标定，价格为市场参考指导价
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制表格' : '复制物料清单'}</span>
            </button>

            <button
              onClick={onExportJson}
              className="px-3 py-1.5 rounded-lg text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出方案 JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
