import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell
} from 'recharts';
import { Study, getStudyDrugCategory, DrugCategory, DRUG_CATEGORIES } from '../types';

interface Props {
  studies: Study[];
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

const CustomTooltip = ({ active, payload }: any) => {
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

    return (
      <div className="bg-white/95 backdrop-blur-md p-3.5 border border-slate-200/90 shadow-2xl rounded-2xl text-xs max-w-xs animate-scale-in">
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

export const SafetyAnalysisChart: React.FC<Props> = ({ studies }) => {
  const [activeTab, setActiveTab] = useState<AdverseEventType>('nausea');
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

  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">疗效与安全性分析</h3>
            <p className="text-xs text-slate-500 mt-0.5">X轴: 体重下降 (%) | Y轴: {ADVERSE_EVENT_CONFIG[activeTab].name} (%) | 标点颜色按药企色系统一</p>
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
        <div className="flex-grow pb-5">
          <ResponsiveContainer width="100%" height="82%">
            <ScatterChart margin={{ top: 15, right: 25, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                type="number" 
                dataKey="weightLoss" 
                name="减重幅度" 
                unit="%" 
                domain={[0, maxX]}
                label={{ value: '减重幅度 (%)', position: 'insideBottom', offset: -12, style: { fontSize: 12, fill: '#64748b' } }} 
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
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="非糖尿病人群" data={nonT2dData} shape="circle" fillOpacity={0.8} isAnimationActive={!isMobile}>
                {nonT2dData.map((entry, index) => <Cell key={`cell-non-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={1.5} />)}
              </Scatter>
              <Scatter name="T2D 人群" data={t2dData} shape="cross" fillOpacity={0.88} isAnimationActive={!isMobile}>
                {t2dData.map((entry, index) => <Cell key={`cell-t2d-${index}`} fill={entry.fill} strokeWidth={2} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export const DurationEfficacyScatterChart: React.FC<Props> = ({ studies }) => {
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
  
  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">周期与减重幅度分析</h3>
        <p className="text-xs text-slate-500 mb-3">X轴: 试验周期 (周) | Y轴: 体重下降幅度 (%) | ○ 圆点: 非糖尿病 | ✕ 叉形: T2D | 色系统一: 同一药企采用相同色系</p>
      </div>

      {data.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
          <p className="text-sm font-semibold text-slate-700">当前分类下暂无已收录的研究数据</p>
          <p className="text-xs text-slate-400 mt-1">切换上方“药物大类选项卡”或点击“全部”查看所有药物</p>
        </div>
      ) : (
        <div className="flex-grow pb-5 flex flex-col">
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
                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                <Scatter name="非糖尿病人群" data={nonT2dData} shape="circle" fillOpacity={0.8} isAnimationActive={!isMobile}>
                  {nonT2dData.map((entry, index) => <Cell key={`cell-non-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={1.5} />)}
                </Scatter>
                <Scatter name="T2D 人群" data={t2dData} shape="cross" fillOpacity={0.88} isAnimationActive={!isMobile}>
                  {t2dData.map((entry, index) => <Cell key={`cell-t2d-${index}`} fill={entry.fill} strokeWidth={2} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* 按药企色系统一排布的图例区域 */}
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-2.5 overflow-y-auto max-h-[140px] pr-1">
            {Object.values(groupedLegend).map(group => (
              <div key={group.company} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 p-1.5 rounded-xl bg-slate-50/60 border border-slate-100/80">
                <div className="flex items-center gap-2 min-w-[150px] flex-shrink-0">
                  <span className="w-3 h-3 rounded-full shadow-xs flex-shrink-0" style={{ backgroundColor: group.companyHex }}></span>
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{group.company}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white text-slate-600 border border-slate-200/80 shadow-2xs">
                    {group.colorFamilyName}
                  </span>
                  <div className="h-px flex-grow bg-slate-200/60 sm:hidden"></div>
                </div>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1.5 items-center">
                  {group.drugs.map(drug => (
                    <div key={drug.name} className="flex items-center gap-1.5 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 transition-colors shadow-2xs">
                      <div className="w-2.5 h-2.5 rounded-full shadow-xs flex-shrink-0" style={{ backgroundColor: drug.color }}></div>
                      <span className="text-[11px] text-slate-900 font-bold">{drug.name}</span>
                      <span className="text-[9px] text-slate-500 font-medium">({drug.formulation || '注射'})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};