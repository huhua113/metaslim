import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter
} from 'recharts';
import { Study, getStudyDrugCategory, DrugCategory, DRUG_CATEGORIES } from '../types';

interface Props {
  studies: Study[];
  hoveredCategory?: DrugCategory | null;
}

const useIsMobile = (breakpoint = 640) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
};

// 安全解析并清洗数值 (支持带 %、~、负号、逗号的各种格式)
export const cleanNumber = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.abs(val);
  const str = String(val).replace(/[%~<>\s]/g, '').replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.abs(parsed);
};

// 安全获取研究周期 (周数)
const getStudyDuration = (study: any): number => {
  const explicit = cleanNumber(study.durationWeeks ?? study.duration ?? study.weeks);
  if (explicit > 0) return explicit;
  // 从试验名称或摘要中智能提取周期数字 (如 "GLORY-1 48周" 或 "STEP 1 68w")
  const text = `${study.trialName || ''} ${study.summary || ''}`;
  const match = text.match(/(\d+)\s*(周|weeks|w)/i);
  if (match) return parseInt(match[1], 10);
  return 24; // 默认常规临床周期
};

const stringToHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

/**
 * 药企色系配置接口
 * 满足要求：同一个公司的标点使用同一种色系
 * 礼来红色、诺和蓝色、辉瑞绿色、罗氏黄色、恒瑞咖色等
 */
export interface CompanyTheme {
  name: string;
  colorFamilyName: string; // 红色系, 蓝色系, 绿色系, 黄色系, 咖色系, 紫色系, 橙色系, 青色系
  primaryHex: string;
  baseHue: number;
}

export const getCompanyTheme = (companyStr: string): CompanyTheme => {
  const c = (companyStr || '').toUpperCase().trim();
  // 1. 礼来 - 红色系
  if (c.includes('LILLY') || c.includes('礼来')) {
    return { name: 'Eli Lilly', colorFamilyName: '红色系', baseHue: 352, primaryHex: '#dc2626' };
  }
  // 2. 诺和诺德 - 蓝色系
  if (c.includes('NOVO') || c.includes('诺和诺德') || c.includes('诺和')) {
    return { name: 'Novo Nordisk', colorFamilyName: '蓝色系', baseHue: 220, primaryHex: '#2563eb' };
  }
  // 3. 辉瑞 - 绿色系 (包括 Ecnoglutide 依诺格鲁肽)
  if (c.includes('PFIZER') || c.includes('辉瑞')) {
    return { name: 'Pfizer', colorFamilyName: '绿色系', baseHue: 158, primaryHex: '#059669' };
  }
  // 4. 罗氏 - 黄色系 (CT-388, CT-996)
  if (c.includes('ROCHE') || c.includes('罗氏') || c.includes('CARMOT')) {
    return { name: 'Roche', colorFamilyName: '黄色系', baseHue: 44, primaryHex: '#d97706' };
  }
  // 5. 恒瑞 - 咖色系 (HRS9531, HRS-7535)
  if (c.includes('HENGRUI') || c.includes('恒瑞')) {
    return { name: 'Hengrui', colorFamilyName: '咖色系', baseHue: 28, primaryHex: '#78350f' };
  }
  // 6. 信达生物 - 紫色系 (Mazdutide)
  if (c.includes('INNOVENT') || c.includes('信达')) {
    return { name: 'Innovent', colorFamilyName: '紫色系', baseHue: 270, primaryHex: '#7c3aed' };
  }
  // 7. 勃林格殷格翰 - 橙色系 (Survodutide)
  if (c.includes('BOEHRINGER') || c.includes('BI') || c.includes('勃林格')) {
    return { name: 'Boehringer Ingelheim', colorFamilyName: '橙色系', baseHue: 18, primaryHex: '#ea580c' };
  }
  // 8. 安进 - 青色系 (MariTide / AMG 133)
  if (c.includes('AMGEN') || c.includes('安进')) {
    return { name: 'Amgen', colorFamilyName: '青色系', baseHue: 190, primaryHex: '#0891b2' };
  }
  // 9. 阿斯利康 - 洋红系
  if (c.includes('ASTRAZENECA') || c.includes('AZ') || c.includes('阿斯利康')) {
    return { name: 'AstraZeneca', colorFamilyName: '洋红系', baseHue: 300, primaryHex: '#c026d3' };
  }
  // 10. 赛诺菲 - 湖蓝系
  if (c.includes('SANOFI') || c.includes('赛诺菲')) {
    return { name: 'Sanofi', colorFamilyName: '湖蓝系', baseHue: 202, primaryHex: '#0284c7' };
  }

  // 默认其他未知公司：由名称哈希计算稳定基色
  const hash = Math.abs(stringToHash(companyStr || 'other'));
  const fallbackHue = (hash * 137.5) % 360;
  return { 
    name: companyStr || '其他药企', 
    colorFamilyName: '专属色系', 
    baseHue: fallbackHue, 
    primaryHex: `hsl(${fallbackHue}, 70%, 45%)` 
  };
};

/**
 * 稳健的点颜色生成器：
 * 同一药企的数据标点，绝对统一在该药企专属色系家族中！
 * 同一药企内部不同药物或剂量通过饱和度和明度的微调保证层次清晰。
 */
export const generatePointColor = (study: Study, doseStr: string = '') => {
  const drugName = (study.drugName || '').toLowerCase();
  // 特殊规则：Ecnoglutide 属于辉瑞 Pfizer (绿色系)
  const company = drugName.includes('ecnoglutide') ? 'Pfizer' : (study.company || '');
  const theme = getCompanyTheme(company);
  
  const drugHash = Math.abs(stringToHash(study.drugName || ''));
  const doseHash = Math.abs(stringToHash(doseStr || ''));
  
  let hue = theme.baseHue;
  let saturation = 80;
  let lightness = 46;

  if (theme.colorFamilyName === '红色系') {
    // 礼来：红色系 (346 ~ 358)
    hue = (348 + (drugHash % 12)) % 360;
    saturation = 78 + (doseHash % 16);
    lightness = 42 + ((drugHash + doseHash) % 10);
  } else if (theme.colorFamilyName === '蓝色系') {
    // 诺和诺德：蓝色系 (214 ~ 226)
    hue = 214 + (drugHash % 12);
    saturation = 80 + (doseHash % 15);
    lightness = 44 + ((drugHash + doseHash) % 12);
  } else if (theme.colorFamilyName === '绿色系') {
    // 辉瑞：绿色系 (152 ~ 166)
    hue = 152 + (drugHash % 14);
    saturation = 78 + (doseHash % 16);
    lightness = 38 + ((drugHash + doseHash) % 10);
  } else if (theme.colorFamilyName === '黄色系') {
    // 罗氏：黄色/金黄琥珀色系 (40 ~ 48)，控制亮度在 40%-45% 确保在白色背景上对比强烈、清晰醒目
    hue = 40 + (drugHash % 8);
    saturation = 94;
    lightness = 40 + ((drugHash + doseHash) % 6);
  } else if (theme.colorFamilyName === '咖色系') {
    // 恒瑞：纯正咖啡/暖棕色系 (24 ~ 30)，控制适度饱和与深沉明度，呈现高品质咖色
    hue = 24 + (drugHash % 6);
    saturation = 75 + (doseHash % 12);
    lightness = 30 + ((drugHash + doseHash) % 8);
  } else if (theme.colorFamilyName === '紫色系') {
    // 信达：紫色系 (265 ~ 275)
    hue = 265 + (drugHash % 10);
    saturation = 78 + (doseHash % 14);
    lightness = 48 + ((drugHash + doseHash) % 8);
  } else if (theme.colorFamilyName === '橙色系') {
    // 勃林格殷格翰：橙色系 (16 ~ 24)
    hue = 16 + (drugHash % 8);
    saturation = 90;
    lightness = 46 + ((drugHash + doseHash) % 8);
  } else {
    hue = (theme.baseHue + (drugHash % 12) - 6 + 360) % 360;
    saturation = 75 + (doseHash % 15);
    lightness = 45 + ((drugHash + doseHash) % 10);
  }

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// 转换安全性散点图数据 (容错各种输入格式与剂量空缺)
const getSafetyData = (studies: Study[]) => {
  return studies.flatMap(study => {
    const category = getStudyDrugCategory(study);
    const drugName = (study.drugName || '').toLowerCase();
    const company = drugName.includes('ecnoglutide') ? 'Pfizer' : (study.company || '未知药企');
    const theme = getCompanyTheme(company);

    const doses = (study.doses && study.doses.length > 0)
      ? study.doses
      : [{
          dose: '推荐剂量',
          weightLossPercent: cleanNumber((study as any).weightLossPercent ?? (study as any).weightLoss ?? 10),
          nauseaPercent: 0,
          vomitingPercent: 0,
          diarrheaPercent: 0,
          constipationPercent: 0,
          saePercent: 0
        }];

    return doses
      .map(dose => {
        const weightLoss = cleanNumber(dose.weightLossPercent ?? (study as any).weightLossPercent ?? (study as any).weightLoss);
        return {
          name: study.drugName || '未命名药物',
          drugClass: study.drugClass || 'GLP-1',
          category,
          company: theme.name,
          colorFamilyName: theme.colorFamilyName,
          companyHex: theme.primaryHex,
          dose: dose.dose || '标准剂量',
          trial: study.trialName || '临床试验',
          formulation: study.formulation || '皮下注射',
          weightLoss,
          nausea: cleanNumber(dose.nauseaPercent),
          vomiting: cleanNumber(dose.vomitingPercent),
          diarrhea: cleanNumber(dose.diarrheaPercent),
          constipation: cleanNumber(dose.constipationPercent),
          sae: cleanNumber(dose.saePercent),
          hasT2D: Boolean(study.hasT2D),
          fill: generatePointColor(study, dose.dose)
        };
      })
      .filter(item => item.weightLoss > 0);
  });
};

// 转换周期与减重散点图数据 (保证所有研究队列均能正确解析并绘制)
const getDurationEfficacyData = (studies: Study[]) => {
  return studies.flatMap(study => {
    const duration = getStudyDuration(study);
    const category = getStudyDrugCategory(study);
    const drugName = (study.drugName || '').toLowerCase();
    const company = drugName.includes('ecnoglutide') ? 'Pfizer' : (study.company || '未知药企');
    const theme = getCompanyTheme(company);

    const doses = (study.doses && study.doses.length > 0)
      ? study.doses
      : [{
          dose: '推荐剂量',
          weightLossPercent: cleanNumber((study as any).weightLossPercent ?? (study as any).weightLoss ?? 10),
          nauseaPercent: 0,
          vomitingPercent: 0,
          diarrheaPercent: 0,
          constipationPercent: 0,
          saePercent: 0
        }];

    return doses
      .map(dose => {
        const weightLoss = cleanNumber(
          dose.weightLossPercent ?? 
          (dose as any).weightLoss ?? 
          (study as any).weightLossPercent ?? 
          (study as any).weightLoss
        );
        return {
          name: study.drugName || '未命名药物',
          drugClass: study.drugClass || 'GLP-1',
          category,
          company: theme.name,
          colorFamilyName: theme.colorFamilyName,
          companyHex: theme.primaryHex,
          dose: dose.dose || '标准剂量',
          trial: study.trialName || '临床试验',
          formulation: study.formulation || '皮下注射',
          x: duration,
          y: weightLoss,
          hasT2D: Boolean(study.hasT2D),
          fill: generatePointColor(study, dose.dose)
        };
      })
      .filter(item => item.y > 0 && item.x > 0);
  });
};

type AdverseEventType = 'nausea' | 'vomiting' | 'diarrhea' | 'constipation' | 'sae';

const ADVERSE_EVENT_CONFIG: Record<AdverseEventType, { name: string; unit: string; }> = {
  nausea: { name: '恶心率', unit: '%' },
  vomiting: { name: '呕吐率', unit: '%' },
  diarrhea: { name: '腹泻率', unit: '%' },
  constipation: { name: '便秘率', unit: '%' },
  sae: { name: 'SAE率', unit: '%' },
};

const CustomTooltip = ({ active, payload, selectedDrug, selectedCompany, hoveredCategory }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (!data) return null;
    
    const isDurationChart = data.x !== undefined && data.y !== undefined;
    const isSafetyChart = data.weightLoss !== undefined;
    
    let xAxisLabel = '';
    let xAxisValue = '';
    let yAxisLabel = '';
    let yAxisValue = '';
    
    if (isDurationChart) {
      xAxisLabel = '试验周期';
      xAxisValue = `${data.x} 周`;
      yAxisLabel = '减重幅度';
      yAxisValue = `${data.y}%`;
    } else if (isSafetyChart) {
      xAxisLabel = '减重幅度';
      xAxisValue = `${data.weightLoss}%`;
      
      if (payload[1] && payload[1].dataKey) {
        const yKey = payload[1].dataKey as AdverseEventType;
        if (ADVERSE_EVENT_CONFIG[yKey] && data[yKey] !== undefined) {
          yAxisLabel = ADVERSE_EVENT_CONFIG[yKey].name.replace('率', '');
          yAxisValue = `${data[yKey]}%`;
        }
      }
    }

    const catInfo = DRUG_CATEGORIES.find(c => c.key === data.category);
    const isCategoryHover = hoveredCategory && hoveredCategory !== 'all' && data.category === hoveredCategory;
    const isDrugOrCompanySelected = (selectedDrug && data.name === selectedDrug) || (selectedCompany && data.company === selectedCompany);

    return (
      <div className={`bg-white/95 backdrop-blur-md p-3.5 border shadow-2xl rounded-2xl text-xs max-w-xs animate-scale-in ${
        isCategoryHover 
          ? 'border-primary ring-2 ring-primary/30' 
          : isDrugOrCompanySelected 
            ? 'border-primary ring-2 ring-primary/20' 
            : 'border-slate-200/90'
      }`}>
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
          <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shadow-xs" style={{ backgroundColor: data.fill }}></span>
            {data.name}
          </p>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
            {data.dose}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {catInfo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs" style={{ backgroundColor: catInfo.color }}>
              {catInfo.label}
            </span>
          )}
          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
            {data.formulation || '注射'}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/80 bg-slate-50 text-slate-800">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.companyHex }}></span>
            {data.company} ({data.colorFamilyName})
          </span>
          {isCategoryHover && (
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
              🔍 类别预览中
            </span>
          )}
          {!isCategoryHover && isDrugOrCompanySelected && (
            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
              ⭐ 正在突出显示
            </span>
          )}
        </div>

        <p className="text-slate-600 text-[11px] mb-2">试验: <span className="font-medium text-slate-800">{data.trial}</span></p>

        <div className="bg-slate-50 p-2 rounded-lg space-y-1 border border-slate-100">
          {xAxisLabel && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">{xAxisLabel}:</span>
              <span className="font-bold text-slate-800">{xAxisValue}</span>
            </div>
          )}
          {yAxisLabel && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">{yAxisLabel}:</span>
              <span className="font-bold" style={{ color: data.fill }}>{yAxisValue}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

/**
 * 交互式图例组件：
 * 支持按药企排列、点击药物标签/药企时突出显示对应数据点，并与选项卡 hover 预览同步高亮
 */
interface InteractiveLegendProps {
  groupedLegend: Record<string, {
    company: string;
    companyHex: string;
    colorFamilyName: string;
    drugs: Array<{ name: string; color: string; class: string; category: DrugCategory; formulation: string }>;
  }>;
  selectedDrug: string | null;
  selectedCompany: string | null;
  hoveredCategory?: DrugCategory | null;
  highlightedCount: number;
  onToggleDrug: (drugName: string) => void;
  onToggleCompany: (companyName: string) => void;
  onClearHighlight: () => void;
}

const InteractiveLegend: React.FC<InteractiveLegendProps> = ({
  groupedLegend,
  selectedDrug,
  selectedCompany,
  hoveredCategory,
  highlightedCount,
  onToggleDrug,
  onToggleCompany,
  onClearHighlight
}) => {
  const isCategoryHoverActive = Boolean(hoveredCategory && hoveredCategory !== 'all');
  const activeHoverCatInfo = useMemo(() => {
    return DRUG_CATEGORIES.find(c => c.key === hoveredCategory);
  }, [hoveredCategory]);

  return (
    <div className="mt-3 border-t border-slate-100 pt-2.5">
      {/* 交互状态提示条 */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-primary inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            交互提示:
          </span>
          <span className="text-[11px]">鼠标悬停上方选项卡可临时高亮类别，点击下方标签可持久锁定标点</span>
        </div>

        {/* 类别预览激活状态 */}
        {isCategoryHoverActive && activeHoverCatInfo && (
          <div 
            className="flex items-center gap-2 px-2.5 py-0.5 rounded-xl text-white text-xs font-bold shadow-xs animate-fade-in"
            style={{ backgroundColor: activeHoverCatInfo.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
            <span>正在临时预览分类: {activeHoverCatInfo.label}</span>
          </div>
        )}

        {/* 标签锁定突出显示状态 */}
        {!isCategoryHoverActive && (selectedDrug || selectedCompany) && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-xl animate-fade-in shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">
              已突出显示: <span className="text-primary font-black">{selectedDrug || selectedCompany}</span>
              <span className="text-slate-500 font-normal ml-1">({highlightedCount} 个数据点)</span>
            </span>
            <button
              type="button"
              onClick={onClearHighlight}
              className="ml-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
            >
              ✕ 取消高亮
            </button>
          </div>
        )}
      </div>

      {/* 按药企分类的药物标签区 */}
      <div className="space-y-2.5 overflow-y-auto max-h-[145px] pr-1">
        {Object.values(groupedLegend).map(group => {
          const isGroupSelected = selectedCompany === group.company;
          return (
            <div 
              key={group.company} 
              className={`flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-1.5 rounded-xl border transition-all ${
                isGroupSelected 
                  ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/30 shadow-xs' 
                  : 'bg-slate-50/60 border-slate-100/80 hover:bg-slate-50'
              }`}
            >
              {/* 药企标题 (支持点击全选该药企标点) */}
              <button
                type="button"
                onClick={() => onToggleCompany(group.company)}
                className="flex items-center gap-2 min-w-[150px] flex-shrink-0 text-left cursor-pointer group/comp hover:opacity-85 transition-opacity"
                title={`点击在图表中突出显示 ${group.company} 的全部数据点`}
              >
                <span className="w-3 h-3 rounded-full shadow-xs flex-shrink-0" style={{ backgroundColor: group.companyHex }}></span>
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider group-hover/comp:text-primary transition-colors">
                  {group.company}
                </h4>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white text-slate-600 border border-slate-200/80 shadow-2xs">
                  {group.colorFamilyName}
                </span>
                {isGroupSelected && (
                  <span className="text-[9px] font-bold text-primary bg-white px-1.5 py-0.5 rounded-full shadow-2xs border border-primary/20">
                    全系高亮
                  </span>
                )}
                <div className="h-px flex-grow bg-slate-200/60 sm:hidden"></div>
              </button>

              {/* 药物标签按钮列表 */}
              <div className="flex flex-wrap gap-x-2 gap-y-1.5 items-center">
                {group.drugs.map(drug => {
                  const isDrugSelected = selectedDrug === drug.name;
                  const isCategoryMatch = isCategoryHoverActive && drug.category === hoveredCategory;
                  const isCategoryMismatch = isCategoryHoverActive && drug.category !== hoveredCategory;
                  const isDimmed = !isCategoryHoverActive && ((selectedDrug && !isDrugSelected) || (selectedCompany && selectedCompany !== group.company));

                  return (
                    <button
                      type="button"
                      key={drug.name}
                      onClick={() => onToggleDrug(drug.name)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all shadow-2xs cursor-pointer select-none ${
                        isCategoryMatch
                          ? 'bg-primary/10 text-primary border-primary ring-2 ring-primary/40 font-bold scale-[1.03] shadow-xs z-10'
                          : isDrugSelected
                            ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-primary ring-offset-1 scale-[1.04] shadow-md z-10'
                            : isCategoryMismatch || isDimmed
                              ? 'bg-white/60 text-slate-400 border-slate-200/50 opacity-40 hover:opacity-100 hover:bg-white hover:text-slate-800'
                              : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 hover:border-slate-300 active:scale-95'
                      }`}
                      title={`点击在图表中突出显示 ${drug.name}`}
                    >
                      <div 
                        className={`w-2.5 h-2.5 rounded-full shadow-xs flex-shrink-0 ${isDrugSelected ? 'ring-2 ring-white' : ''}`} 
                        style={{ backgroundColor: drug.color }}
                      ></div>
                      <span className={`text-[11px] font-bold ${isDrugSelected ? 'text-white' : isCategoryMatch ? 'text-primary' : 'text-slate-900'}`}>
                        {drug.name}
                      </span>
                      <span className={`text-[9px] font-medium ${isDrugSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        ({drug.formulation || '注射'})
                      </span>
                      {isCategoryMatch && (
                        <span className="text-[9px] bg-primary text-white font-bold px-1.5 py-0.5 rounded ml-0.5 animate-pulse">
                          预览
                        </span>
                      )}
                      {!isCategoryMatch && isDrugSelected && (
                        <span className="text-[9px] bg-primary text-white font-bold px-1.5 py-0.5 rounded ml-0.5 animate-pulse">
                          已突出
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const SafetyAnalysisChart: React.FC<Props> = ({ studies, hoveredCategory }) => {
  const [activeTab, setActiveTab] = useState<AdverseEventType>('nausea');
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // 获取所有安全性数据，不遗漏任何有效减重队列
  const data = useMemo(() => {
    const allData = getSafetyData(studies);
    return allData.filter(item => typeof item[activeTab] === 'number');
  }, [studies, activeTab]);
  
  const t2dData = data.filter(d => d.hasT2D);
  const nonT2dData = data.filter(d => !d.hasT2D);

  // 动态自适应坐标轴区间
  const maxX = useMemo(() => {
    if (!data.length) return 30;
    const maxVal = Math.max(...data.map(d => d.weightLoss));
    return Math.max(25, Math.ceil((maxVal + 4) / 5) * 5);
  }, [data]);

  const maxY = useMemo(() => {
    if (!data.length) return 60;
    const maxVal = Math.max(...data.map(d => d[activeTab]));
    return Math.min(100, Math.max(40, Math.ceil((maxVal + 10) / 10) * 10));
  }, [data, activeTab]);

  // 选项卡 hover 状态
  const isCategoryHoverActive = Boolean(hoveredCategory && hoveredCategory !== 'all');
  const activeHoverCatInfo = useMemo(() => {
    return DRUG_CATEGORIES.find(c => c.key === hoveredCategory);
  }, [hoveredCategory]);

  const categoryHoverCount = useMemo(() => {
    if (!isCategoryHoverActive) return 0;
    return data.filter(d => d.category === hoveredCategory).length;
  }, [data, isCategoryHoverActive, hoveredCategory]);

  // 高亮数据点计数
  const highlightedCount = useMemo(() => {
    if (isCategoryHoverActive) return categoryHoverCount;
    if (selectedDrug) return data.filter(d => d.name === selectedDrug).length;
    if (selectedCompany) return data.filter(d => d.company === selectedCompany).length;
    return 0;
  }, [data, isCategoryHoverActive, categoryHoverCount, selectedDrug, selectedCompany]);

  // 为图例准备按药企分组的药物数据
  const groupedLegend = useMemo(() => {
    const items = new Map<string, { 
      color: string; 
      class: string; 
      company: string; 
      companyHex: string;
      colorFamilyName: string;
      category: DrugCategory; 
      formulation: string 
    }>();

    data.forEach(item => {
      if (!items.has(item.name)) {
        items.set(item.name, { 
          color: item.fill, 
          class: item.drugClass, 
          company: item.company,
          companyHex: item.companyHex,
          colorFamilyName: item.colorFamilyName,
          category: item.category,
          formulation: item.formulation
        });
      }
    });
    
    const grouped: Record<string, {
      company: string;
      companyHex: string;
      colorFamilyName: string;
      drugs: Array<{ name: string; color: string; class: string; category: DrugCategory; formulation: string }>;
    }> = {};

    items.forEach((info, drugName) => {
      if (!grouped[info.company]) {
        grouped[info.company] = {
          company: info.company,
          companyHex: info.companyHex,
          colorFamilyName: info.colorFamilyName,
          drugs: []
        };
      }
      grouped[info.company].drugs.push({ name: drugName, ...info });
    });
    
    return grouped;
  }, [data]);

  const handleToggleDrug = (drugName: string) => {
    if (selectedDrug === drugName) {
      setSelectedDrug(null);
    } else {
      setSelectedDrug(drugName);
      setSelectedCompany(null);
    }
  };

  const handleToggleCompany = (companyName: string) => {
    if (selectedCompany === companyName) {
      setSelectedCompany(null);
    } else {
      setSelectedCompany(companyName);
      setSelectedDrug(null);
    }
  };

  const handleClearHighlight = () => {
    setSelectedDrug(null);
    setSelectedCompany(null);
  };

  // 渲染高亮或普通标点
  const renderCirclePoint = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isCategoryMatch = isCategoryHoverActive ? payload.category === hoveredCategory : false;
    const isDrugMatch = selectedDrug ? payload.name === selectedDrug : false;
    const isCompanyMatch = selectedCompany ? payload.company === selectedCompany : false;

    // 当有选项卡 hover 时，优先高亮该类别；否则根据所选药物/公司高亮
    const isHighlighted = isCategoryHoverActive 
      ? isCategoryMatch 
      : (isDrugMatch || isCompanyMatch);

    const hasFilter = isCategoryHoverActive || Boolean(selectedDrug || selectedCompany);
    const isDimmed = hasFilter && !isHighlighted;
    const fill = payload.fill || '#2563eb';

    if (isHighlighted) {
      return (
        <g 
          className="cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          {/* 呼吸外晕与发光 */}
          <circle cx={cx} cy={cy} r={16} fill={fill} fillOpacity={0.25} className="animate-pulse" />
          <circle 
            cx={cx} 
            cy={cy} 
            r={9} 
            fill={fill} 
            stroke="#ffffff" 
            strokeWidth={3} 
            style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.4))' }} 
          />
          <circle cx={cx} cy={cy} r={3.5} fill="#ffffff" />
          {/* 浮动标签 */}
          <g transform={`translate(${cx + 12}, ${cy - 12})`}>
            <rect 
              x={0} 
              y={0} 
              width={Math.max(68, (payload.name?.length || 0) * 7 + (payload.dose?.length || 0) * 5 + 32)} 
              height={22} 
              rx={6} 
              fill="rgba(15, 23, 42, 0.92)" 
              stroke="#ffffff" 
              strokeWidth={1} 
            />
            <text x={8} y={15} fill="#ffffff" fontSize={10} fontWeight="bold">
              {payload.name} {payload.dose} ({payload.weightLoss}%)
            </text>
          </g>
        </g>
      );
    }

    if (isDimmed) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={3.5} 
          fill={fill} 
          fillOpacity={0.12} 
          stroke="#94a3b8" 
          strokeWidth={0.5} 
          strokeOpacity={0.2} 
          className="cursor-pointer transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        />
      );
    }

    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5.5} 
        fill={fill} 
        fillOpacity={0.88} 
        stroke="#ffffff" 
        strokeWidth={1.5} 
        className="cursor-pointer hover:r-[8px] transition-all"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleDrug(payload.name);
        }}
      />
    );
  };

  const renderCrossPoint = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isCategoryMatch = isCategoryHoverActive ? payload.category === hoveredCategory : false;
    const isDrugMatch = selectedDrug ? payload.name === selectedDrug : false;
    const isCompanyMatch = selectedCompany ? payload.company === selectedCompany : false;

    const isHighlighted = isCategoryHoverActive 
      ? isCategoryMatch 
      : (isDrugMatch || isCompanyMatch);

    const hasFilter = isCategoryHoverActive || Boolean(selectedDrug || selectedCompany);
    const isDimmed = hasFilter && !isHighlighted;
    const fill = payload.fill || '#2563eb';

    if (isHighlighted) {
      return (
        <g 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          <circle cx={cx} cy={cy} r={16} fill={fill} fillOpacity={0.25} className="animate-pulse" />
          <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke={fill} strokeWidth={4.5} strokeLinecap="round" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} />
          <line x1={cx - 8} y1={cy + 8} x2={cx + 8} y2={cy - 8} stroke={fill} strokeWidth={4.5} strokeLinecap="round" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} />
          <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
          <g transform={`translate(${cx + 12}, ${cy - 12})`}>
            <rect 
              x={0} 
              y={0} 
              width={Math.max(68, (payload.name?.length || 0) * 7 + (payload.dose?.length || 0) * 5 + 32)} 
              height={22} 
              rx={6} 
              fill="rgba(15, 23, 42, 0.92)" 
              stroke="#ffffff" 
              strokeWidth={1} 
            />
            <text x={8} y={15} fill="#ffffff" fontSize={10} fontWeight="bold">
              {payload.name} {payload.dose} ({payload.weightLoss}%)
            </text>
          </g>
        </g>
      );
    }

    if (isDimmed) {
      return (
        <g 
          opacity={0.12} 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={cx - 3.5} y1={cy + 3.5} x2={cx + 3.5} y2={cy - 3.5} stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
        </g>
      );
    }

    return (
      <g 
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleDrug(payload.name);
        }}
      >
        <line x1={cx - 5.5} y1={cy - 5.5} x2={cx + 5.5} y2={cy + 5.5} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={cx - 5.5} y1={cy + 5.5} x2={cx + 5.5} y2={cy - 5.5} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      </g>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">疗效与安全性分析</h3>
              {isCategoryHoverActive && activeHoverCatInfo && (
                <span 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs animate-fade-in"
                  style={{ backgroundColor: activeHoverCatInfo.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  正在预览分类: {activeHoverCatInfo.label} ({categoryHoverCount} 个数据点) · 移开鼠标恢复全部
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">X轴: 体重下降 (%) | Y轴: {ADVERSE_EVENT_CONFIG[activeTab].name} (%) | 悬停选项卡预览类别，点击下方标签锁定标点</p>
          </div>
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            {Object.keys(ADVERSE_EVENT_CONFIG).map((key) => (
              <button 
                key={key}
                onClick={() => setActiveTab(key as AdverseEventType)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === key ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {ADVERSE_EVENT_CONFIG[key as AdverseEventType].name.replace('率','')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700">当前分类下暂无已收录的减重与不良反应数据</p>
          <p className="text-xs text-slate-400 mt-1">切换上方“药物大类选项卡”或点击“全部”以查看更多数据点</p>
        </div>
      ) : (
        <div className="flex-grow pb-2 flex flex-col">
          <div className="flex-grow min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="weightLoss" 
                  name="减重幅度" 
                  unit="%" 
                  domain={[0, maxX]}
                  label={{ value: '减重幅度 (%)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: '#64748b' } }} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey={activeTab} 
                  name={ADVERSE_EVENT_CONFIG[activeTab].name}
                  unit="%" 
                  domain={[0, maxY]}
                  label={{ value: `${ADVERSE_EVENT_CONFIG[activeTab].name} (%)`, angle: -90, position: 'insideLeft', style: { fontSize: 12, textAnchor: 'middle', fill: '#64748b' }, offset: 2 }}
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={
                    <CustomTooltip 
                      selectedDrug={selectedDrug} 
                      selectedCompany={selectedCompany} 
                      hoveredCategory={hoveredCategory} 
                    />
                  } 
                />
                <Scatter 
                  name="非糖尿病人群" 
                  data={nonT2dData} 
                  shape={renderCirclePoint}
                  isAnimationActive={!isMobile}
                  onClick={(node: any) => {
                    if (node?.payload?.name) handleToggleDrug(node.payload.name);
                  }}
                />
                <Scatter 
                  name="T2D 人群" 
                  data={t2dData} 
                  shape={renderCrossPoint}
                  isAnimationActive={!isMobile}
                  onClick={(node: any) => {
                    if (node?.payload?.name) handleToggleDrug(node.payload.name);
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* 交互式药企分组图例 */}
          <InteractiveLegend
            groupedLegend={groupedLegend}
            selectedDrug={selectedDrug}
            selectedCompany={selectedCompany}
            hoveredCategory={hoveredCategory}
            highlightedCount={highlightedCount}
            onToggleDrug={handleToggleDrug}
            onToggleCompany={handleToggleCompany}
            onClearHighlight={handleClearHighlight}
          />
        </div>
      )}
    </div>
  );
};

export const DurationEfficacyScatterChart: React.FC<Props> = ({ studies, hoveredCategory }) => {
  const [selectedDrug, setSelectedDrug] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const data = useMemo(() => getDurationEfficacyData(studies), [studies]);
  const isMobile = useIsMobile();
  
  const t2dData = data.filter(d => d.hasT2D);
  const nonT2dData = data.filter(d => !d.hasT2D);

  // 动态自适应 X 轴周期和 Y 轴减重上限
  const maxX = useMemo(() => {
    if (!data.length) return 80;
    const maxVal = Math.max(...data.map(d => d.x));
    return Math.max(60, Math.ceil((maxVal + 8) / 10) * 10);
  }, [data]);

  const maxY = useMemo(() => {
    if (!data.length) return 30;
    const maxVal = Math.max(...data.map(d => d.y));
    return Math.max(25, Math.ceil((maxVal + 4) / 5) * 5);
  }, [data]);

  // 选项卡 hover 状态
  const isCategoryHoverActive = Boolean(hoveredCategory && hoveredCategory !== 'all');
  const activeHoverCatInfo = useMemo(() => {
    return DRUG_CATEGORIES.find(c => c.key === hoveredCategory);
  }, [hoveredCategory]);

  const categoryHoverCount = useMemo(() => {
    if (!isCategoryHoverActive) return 0;
    return data.filter(d => d.category === hoveredCategory).length;
  }, [data, isCategoryHoverActive, hoveredCategory]);

  // 高亮数据点计数
  const highlightedCount = useMemo(() => {
    if (isCategoryHoverActive) return categoryHoverCount;
    if (selectedDrug) return data.filter(d => d.name === selectedDrug).length;
    if (selectedCompany) return data.filter(d => d.company === selectedCompany).length;
    return 0;
  }, [data, isCategoryHoverActive, categoryHoverCount, selectedDrug, selectedCompany]);

  // 为图例准备按药企分组的药物数据，呈现统一药企色系
  const groupedLegend = useMemo(() => {
    const items = new Map<string, { 
      color: string; 
      class: string; 
      company: string; 
      companyHex: string;
      colorFamilyName: string;
      category: DrugCategory; 
      formulation: string 
    }>();

    data.forEach(item => {
      if (!items.has(item.name)) {
        items.set(item.name, { 
          color: item.fill, 
          class: item.drugClass, 
          company: item.company,
          companyHex: item.companyHex,
          colorFamilyName: item.colorFamilyName,
          category: item.category,
          formulation: item.formulation
        });
      }
    });
    
    const grouped: Record<string, {
      company: string;
      companyHex: string;
      colorFamilyName: string;
      drugs: Array<{ name: string; color: string; class: string; category: DrugCategory; formulation: string }>;
    }> = {};

    items.forEach((info, drugName) => {
      if (!grouped[info.company]) {
        grouped[info.company] = {
          company: info.company,
          companyHex: info.companyHex,
          colorFamilyName: info.colorFamilyName,
          drugs: []
        };
      }
      grouped[info.company].drugs.push({ name: drugName, ...info });
    });
    
    return grouped;
  }, [data]);

  const handleToggleDrug = (drugName: string) => {
    if (selectedDrug === drugName) {
      setSelectedDrug(null);
    } else {
      setSelectedDrug(drugName);
      setSelectedCompany(null);
    }
  };

  const handleToggleCompany = (companyName: string) => {
    if (selectedCompany === companyName) {
      setSelectedCompany(null);
    } else {
      setSelectedCompany(companyName);
      setSelectedDrug(null);
    }
  };

  const handleClearHighlight = () => {
    setSelectedDrug(null);
    setSelectedCompany(null);
  };

  // 渲染高亮或普通标点
  const renderCirclePoint = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isCategoryMatch = isCategoryHoverActive ? payload.category === hoveredCategory : false;
    const isDrugMatch = selectedDrug ? payload.name === selectedDrug : false;
    const isCompanyMatch = selectedCompany ? payload.company === selectedCompany : false;

    // 当有选项卡 hover 时，优先高亮该类别；否则根据所选药物/公司高亮
    const isHighlighted = isCategoryHoverActive 
      ? isCategoryMatch 
      : (isDrugMatch || isCompanyMatch);

    const hasFilter = isCategoryHoverActive || Boolean(selectedDrug || selectedCompany);
    const isDimmed = hasFilter && !isHighlighted;
    const fill = payload.fill || '#2563eb';

    if (isHighlighted) {
      return (
        <g 
          className="cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          {/* 呼吸外晕与发光效果 */}
          <circle cx={cx} cy={cy} r={16} fill={fill} fillOpacity={0.25} className="animate-pulse" />
          <circle 
            cx={cx} 
            cy={cy} 
            r={9} 
            fill={fill} 
            stroke="#ffffff" 
            strokeWidth={3} 
            style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.4))' }} 
          />
          <circle cx={cx} cy={cy} r={3.5} fill="#ffffff" />
          {/* 悬浮剂量与减重幅度标签 */}
          <g transform={`translate(${cx + 12}, ${cy - 12})`}>
            <rect 
              x={0} 
              y={0} 
              width={Math.max(68, (payload.name?.length || 0) * 7 + (payload.dose?.length || 0) * 5 + 32)} 
              height={22} 
              rx={6} 
              fill="rgba(15, 23, 42, 0.92)" 
              stroke="#ffffff" 
              strokeWidth={1} 
            />
            <text x={8} y={15} fill="#ffffff" fontSize={10} fontWeight="bold">
              {payload.name} {payload.dose} ({payload.y}%)
            </text>
          </g>
        </g>
      );
    }

    if (isDimmed) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={3.5} 
          fill={fill} 
          fillOpacity={0.12} 
          stroke="#94a3b8" 
          strokeWidth={0.5} 
          strokeOpacity={0.2} 
          className="cursor-pointer transition-opacity duration-200"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        />
      );
    }

    return (
      <circle 
        cx={cx} 
        cy={cy} 
        r={5.5} 
        fill={fill} 
        fillOpacity={0.88} 
        stroke="#ffffff" 
        strokeWidth={1.5} 
        className="cursor-pointer hover:r-[8px] transition-all"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleDrug(payload.name);
        }}
      />
    );
  };

  const renderCrossPoint = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined || !payload) return null;

    const isCategoryMatch = isCategoryHoverActive ? payload.category === hoveredCategory : false;
    const isDrugMatch = selectedDrug ? payload.name === selectedDrug : false;
    const isCompanyMatch = selectedCompany ? payload.company === selectedCompany : false;

    const isHighlighted = isCategoryHoverActive 
      ? isCategoryMatch 
      : (isDrugMatch || isCompanyMatch);

    const hasFilter = isCategoryHoverActive || Boolean(selectedDrug || selectedCompany);
    const isDimmed = hasFilter && !isHighlighted;
    const fill = payload.fill || '#2563eb';

    if (isHighlighted) {
      return (
        <g 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          <circle cx={cx} cy={cy} r={16} fill={fill} fillOpacity={0.25} className="animate-pulse" />
          <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke={fill} strokeWidth={4.5} strokeLinecap="round" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} />
          <line x1={cx - 8} y1={cy + 8} x2={cx + 8} y2={cy - 8} stroke={fill} strokeWidth={4.5} strokeLinecap="round" style={{ filter: 'drop-shadow(0px 3px 5px rgba(0,0,0,0.35))' }} />
          <circle cx={cx} cy={cy} r={2.5} fill="#ffffff" />
          <g transform={`translate(${cx + 12}, ${cy - 12})`}>
            <rect 
              x={0} 
              y={0} 
              width={Math.max(68, (payload.name?.length || 0) * 7 + (payload.dose?.length || 0) * 5 + 32)} 
              height={22} 
              rx={6} 
              fill="rgba(15, 23, 42, 0.92)" 
              stroke="#ffffff" 
              strokeWidth={1} 
            />
            <text x={8} y={15} fill="#ffffff" fontSize={10} fontWeight="bold">
              {payload.name} {payload.dose} ({payload.y}%)
            </text>
          </g>
        </g>
      );
    }

    if (isDimmed) {
      return (
        <g 
          opacity={0.12} 
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleDrug(payload.name);
          }}
        >
          <line x1={cx - 3.5} y1={cy - 3.5} x2={cx + 3.5} y2={cy + 3.5} stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
          <line x1={cx - 3.5} y1={cy + 3.5} x2={cx + 3.5} y2={cy - 3.5} stroke={fill} strokeWidth={1.5} strokeLinecap="round" />
        </g>
      );
    }

    return (
      <g 
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleDrug(payload.name);
        }}
      >
        <line x1={cx - 5.5} y1={cy - 5.5} x2={cx + 5.5} y2={cy + 5.5} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={cx - 5.5} y1={cy + 5.5} x2={cx + 5.5} y2={cy - 5.5} stroke={fill} strokeWidth={2.5} strokeLinecap="round" />
      </g>
    );
  };
  
  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="text-lg font-bold text-slate-900">周期与减重幅度分析</h3>
          {isCategoryHoverActive && activeHoverCatInfo && (
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-xs animate-fade-in"
              style={{ backgroundColor: activeHoverCatInfo.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              正在预览分类: {activeHoverCatInfo.label} ({categoryHoverCount} 个数据点) · 移开鼠标恢复全部
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-2">X轴: 试验周期 (周) | Y轴: 体重下降幅度 (%) | ○ 圆点: 非糖尿病 | ✕ 叉形: T2D | 悬停选项卡预览类别，点击下方标签锁定标点</p>
      </div>

      {data.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700">当前分类下暂无已收录的研究数据</p>
          <p className="text-xs text-slate-400 mt-1">切换上方“药物大类选项卡”或点击“全部”查看所有药物</p>
        </div>
      ) : (
        <div className="flex-grow pb-2 flex flex-col">
          <div className="flex-grow min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 25, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="研究周期" 
                  unit="周" 
                  domain={[0, maxX]} 
                  label={{ value: '试验周期 (周)', position: 'insideBottom', offset: -10, style: { fontSize: 12, fill: '#64748b' } }} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="减重幅度" 
                  unit="%" 
                  domain={[0, maxY]} 
                  label={{ value: '减重幅度 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, textAnchor: 'middle', fill: '#64748b' }, offset: 2 }} 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }} 
                  content={
                    <CustomTooltip 
                      selectedDrug={selectedDrug} 
                      selectedCompany={selectedCompany} 
                      hoveredCategory={hoveredCategory} 
                    />
                  } 
                />
                <Scatter 
                  name="非糖尿病人群" 
                  data={nonT2dData} 
                  shape={renderCirclePoint}
                  isAnimationActive={!isMobile}
                  onClick={(node: any) => {
                    if (node?.payload?.name) handleToggleDrug(node.payload.name);
                  }}
                />
                <Scatter 
                  name="T2D 人群" 
                  data={t2dData} 
                  shape={renderCrossPoint}
                  isAnimationActive={!isMobile}
                  onClick={(node: any) => {
                    if (node?.payload?.name) handleToggleDrug(node.payload.name);
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* 按药企色系统一排布的交互式图例区域 */}
          <InteractiveLegend
            groupedLegend={groupedLegend}
            selectedDrug={selectedDrug}
            selectedCompany={selectedCompany}
            hoveredCategory={hoveredCategory}
            highlightedCount={highlightedCount}
            onToggleDrug={handleToggleDrug}
            onToggleCompany={handleToggleCompany}
            onClearHighlight={handleClearHighlight}
          />
        </div>
      )}
    </div>
  );
};