import React, { useState, useMemo, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell
} from 'recharts';
import { Study } from '../types';

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


const DRUG_COLORS = ['#14B8A6', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#EF4444', '#6366F1', '#10B981'];

const getDrugColorMap = (studies: Study[]): Map<string, string> => {
    const drugNames = [...new Set(studies.map(s => s.drugName))].sort();
    const map = new Map<string, string>();
    drugNames.forEach((name, index) => {
        map.set(name, DRUG_COLORS[index % DRUG_COLORS.length]);
    });
    return map;
};

const getSafetyData = (studies: Study[], drugColorMap: Map<string, string>) => {
  return studies.flatMap(study => 
    study.doses
      .filter(dose => dose.weightLossPercent > 0)
      .map(dose => ({
        name: study.drugName,
        dose: dose.dose,
        trial: study.trialName,
        weightLoss: dose.weightLossPercent,
        nausea: dose.nauseaPercent,
        vomiting: dose.vomitingPercent,
        diarrhea: dose.diarrheaPercent,
        constipation: dose.constipationPercent,
        sae: dose.saePercent,
        hasT2D: study.hasT2D,
        fill: drugColorMap.get(study.drugName) || '#CCCCCC'
      }))
  );
};


const getDurationEfficacyData = (studies: Study[], drugColorMap: Map<string, string>) => {
  return studies.flatMap(study => 
    study.doses
      .filter(dose => dose.weightLossPercent > 0)
      .map(dose => ({
        name: study.drugName,
        dose: dose.dose,
        trial: study.trialName,
        x: study.durationWeeks,
        y: dose.weightLossPercent,
        hasT2D: study.hasT2D,
        fill: drugColorMap.get(study.drugName) || '#CCCCCC'
      }))
  );
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
    
    // Determine which chart we're on by checking available keys in the data object
    const isDurationChart = data.x !== undefined && data.y !== undefined;
    const isSafetyChart = data.weightLoss !== undefined;
    
    let xAxisLabel = '';
    let xAxisValue = '';
    let yAxisLabel = '';
    let yAxisValue = '';
    
    if (isDurationChart) {
        xAxisLabel = '周期';
        xAxisValue = `${data.x}周`;
        yAxisLabel = '减重';
        yAxisValue = `${data.y}%`;
    } else if (isSafetyChart) {
        xAxisLabel = '减重';
        xAxisValue = `${data.weightLoss}%`;
        
        // For scatter charts, payload[1] often contains y-axis info.
        // We use its dataKey to identify the adverse event type.
        if (payload[1] && payload[1].dataKey) {
            const yKey = payload[1].dataKey as AdverseEventType;
            if (ADVERSE_EVENT_CONFIG[yKey] && data[yKey] !== undefined) {
              yAxisLabel = ADVERSE_EVENT_CONFIG[yKey].name.replace('率', '');
              yAxisValue = `${data[yKey]}%`;
            }
        }
    }

    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
          <p className="font-bold text-slate-800" style={{ color: data.fill }}>{data.name} ({data.dose})</p>
          <p className="text-slate-600">试验: {data.trial}</p>
          <div className="mt-2 space-y-1">
            {xAxisLabel && (
              <p style={{ color: data.fill }}>
                {xAxisLabel}: {xAxisValue}
              </p>
            )}
            {yAxisLabel && (
              <p style={{ color: data.fill }}>
                {yAxisLabel}: {yAxisValue}
              </p>
            )}
          </div>
      </div>
    );
  }
  return null;
};

export const SafetyAnalysisChart: React.FC<Props> = ({ studies }) => {
  const [activeTab, setActiveTab] = useState<AdverseEventType>('nausea');
  const drugColorMap = useMemo(() => getDrugColorMap(studies), [studies]);
  const isMobile = useIsMobile();

  const data = useMemo(() => {
    const allData = getSafetyData(studies, drugColorMap);
    return allData.filter(item => item[activeTab] > 0);
  }, [studies, activeTab, drugColorMap]);
  
  const t2dData = data.filter(d => d.hasT2D);
  const nonT2dData = data.filter(d => !d.hasT2D);

  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">疗效与安全性分析</h3>
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-center">
            {Object.keys(ADVERSE_EVENT_CONFIG).map((key) => (
              <button 
                key={key}
                onClick={() => setActiveTab(key as AdverseEventType)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === key ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
              >
                {ADVERSE_EVENT_CONFIG[key as AdverseEventType].name.replace('率','')}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="85%">
          <ScatterChart margin={{ top: 10, right: 20, left: 15, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="weightLoss" 
              name="减重幅度" 
              unit="%" 
              domain={[0, 32]}
              label={{ value: '减重 (%)', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }} 
              tick={{ fontSize: 10 }} 
            />
            <YAxis 
              type="number" 
              dataKey={activeTab} 
              name={ADVERSE_EVENT_CONFIG[activeTab].name}
              unit="%" 
              domain={[0, 100]}
              label={{ value: `${ADVERSE_EVENT_CONFIG[activeTab].name.replace('率', '')} (%)`, angle: -90, position: 'insideLeft', style: { fontSize: 12, textAnchor: 'middle' }, offset: 0 }}
              tick={{ fontSize: 10 }} 
            />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Scatter name="非糖尿病人群" data={nonT2dData} shape="circle" fillOpacity={0.7} isAnimationActive={!isMobile}>
              {nonT2dData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Scatter>
            <Scatter name="T2D 人群" data={t2dData} shape="cross" fillOpacity={0.7} isAnimationActive={!isMobile}>
              {t2dData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


export const DurationEfficacyScatterChart: React.FC<Props> = ({ studies }) => {
  const drugColorMap = useMemo(() => getDrugColorMap(studies), [studies]);
  const data = useMemo(() => getDurationEfficacyData(studies, drugColorMap), [studies, drugColorMap]);
  const isMobile = useIsMobile();
  
  const t2dData = data.filter(d => d.hasT2D);
  const nonT2dData = data.filter(d => !d.hasT2D);
  
  return (
    <div className="h-full w-full flex flex-col">
      <div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">周期与减重幅度分析</h3>
        <p className="text-xs text-slate-500 mb-4">X轴: 周期 (周) | Y轴: 减重 (%)</p>
      </div>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="80%">
          <ScatterChart margin={{ top: 10, right: 20, left: 15, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="研究周期" unit="周" domain={[0, 108]} ticks={[0, 30, 60, 90, 108]} label={{ value: '周期 (周)', position: 'insideBottom', offset: -10, style: { fontSize: 12 } }} tick={{ fontSize: 10 }} />
            <YAxis type="number" dataKey="y" name="减重幅度" unit="%" domain={[0, 32]} label={{ value: '减重 (%)', angle: -90, position: 'insideLeft', style: { fontSize: 12, textAnchor: 'middle' }, offset: 0 }} tick={{ fontSize: 10 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
            <Scatter name="非糖尿病人群" data={nonT2dData} shape="circle" fillOpacity={0.7} isAnimationActive={!isMobile}>
              {nonT2dData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Scatter>
            <Scatter name="T2D 人群" data={t2dData} shape="cross" fillOpacity={0.7} isAnimationActive={!isMobile}>
              {t2dData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 flex flex-wrap gap-3 justify-center">
          {Array.from(drugColorMap.entries()).map(([drugName, color]) => (
            <div key={drugName} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-xs text-slate-600 font-medium">{drugName}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};