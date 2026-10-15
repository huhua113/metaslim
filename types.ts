export interface DoseData {
  dose: string;
  weightLossPercent: number; // e.g., 15.5 for 15.5%
  nauseaPercent: number;     // e.g., 20 for 20%
  vomitingPercent: number;   // e.g., 5 for 5%
  diarrheaPercent: number;   // e.g., 10 for 10%
  constipationPercent: number; // e.g., 8 for 8%
  saePercent: number; // 严重不良反应 (SAE) 发生率
}

export interface Study {
  id: string;
  drugName: string;
  drugClass: string; // e.g., GLP-1 RA, GIP/GLP-1
  company: string;
  trialName: string;
  phase: string;
  hasT2D: boolean;
  isChineseCohort: boolean; // e.g. STEP-China
  durationWeeks: number;
  formulation: '皮下注射' | '口服' | '其他' | ''; // Drug formulation
  frequency: string; // e.g., '每周一次', '每日一次'
  doses: DoseData[];
  createdAt: number; // Timestamp
  summary?: string;
}

// 药物大类分类 (用于可视化与筛选选项卡)
export type DrugCategory = 
  | 'all' 
  | 'glp1_inject' 
  | 'glp1_oral' 
  | 'glp1_gip' 
  | 'glp1_gcg' 
  | 'triple' 
  | 'amylin' 
  | 'other';

export interface DrugCategoryInfo {
  key: DrugCategory;
  label: string;
  badge: string;
  color: string;
  description: string;
}

export const DRUG_CATEGORIES: DrugCategoryInfo[] = [
  { key: 'all', label: '全部', badge: '全部', color: '#6366f1', description: '所有已收录的减重药物研究队列' },
  { key: 'glp1_inject', label: 'GLP-1注射', badge: 'GLP-1皮下', color: '#0d9488', description: '单靶点GLP-1受体激动剂(皮下注射，如司美格鲁肽、利拉鲁肽、依诺格鲁肽)' },
  { key: 'glp1_oral', label: 'GLP-1口服', badge: '口服GLP-1', color: '#0284c7', description: '口服单靶点GLP-1激动剂(如口服司美格鲁肽、奥福格列酮Orforglipron)' },
  { key: 'glp1_gip', label: 'GLP-1+GIP', badge: '双靶点GIP', color: '#d97706', description: 'GIP/GLP-1双重受体激动剂(如替尔泊肽Tirzepatide)' },
  { key: 'glp1_gcg', label: 'GLP-1+GCG', badge: '双靶点GCG', color: '#7c3aed', description: 'GLP-1/GCGR双受体激动剂(如玛仕度肽Mazdutide、索沃杜肽Survodutide)' },
  { key: 'triple', label: '三靶点', badge: '三激动剂', color: '#e11d48', description: 'GIP/GLP-1/GCG三重受体激动剂(如瑞他鲁肽Retatrutide)' },
  { key: 'amylin', label: '胰淀素+', badge: '胰淀素+', color: '#db2777', description: '胰淀素类似物及复方/双激动剂(如CagriSema、艾米克雷汀Amycretin)' },
  { key: 'other', label: '其他', badge: '其他机制', color: '#64748b', description: '其他靶点及创新机制在研减重药物' },
];

/**
 * 根据药物名称、分类和剂型自动识别所属类别
 */
export const getStudyDrugCategory = (study: {
  drugName?: string;
  drugClass?: string;
  formulation?: string;
}): DrugCategory => {
  const name = (study.drugName || '').trim().toLowerCase();
  const dClass = (study.drugClass || '').trim().toUpperCase();
  const form = (study.formulation || '').trim().toLowerCase();

  // 1. 胰淀素+ (Amylin, CagriSema, Cagrilintide, Amycretin, Pramlintide, 胰淀素)
  if (
    dClass.includes('AMYLIN') || 
    dClass.includes('胰淀素') || 
    dClass.includes('CAGRI') ||
    name.includes('cagri') || 
    name.includes('amycretin') || 
    name.includes('pramlintide') ||
    name.includes('petrelintide') ||
    name.includes('胰淀素')
  ) {
    return 'amylin';
  }

  // 2. 三靶点 (Triple Agonist, GIP/GLP-1/GCG, Retatrutide, 瑞他鲁肽, LY3437943, UBT251, UTB251)
  if (
    dClass.includes('TRIPLE') ||
    dClass.includes('三靶点') ||
    (dClass.includes('GIP') && dClass.includes('GLP') && (dClass.includes('GCG') || dClass.includes('GLUCAGON'))) ||
    name.includes('retatrutide') ||
    name.includes('瑞他') ||
    name.includes('ly3437943') ||
    name.includes('ubt251') ||
    name.includes('utb251') ||
    name.includes('ubt') ||
    name.includes('utb')
  ) {
    return 'triple';
  }

  // 3. GLP-1+GCG / GLP-1/GCGR (Mazdutide, Survodutide, Pemvidutide, Efinopegdutide, BI 456906)
  if (
    (dClass.includes('GLP') && (dClass.includes('GCG') || dClass.includes('GLUCAGON'))) ||
    dClass.includes('GLP-1/GCGR') ||
    dClass.includes('GLP-1+GCG') ||
    dClass.includes('GCGR/GLP-1') ||
    dClass.includes('GLP-1/GCG') ||
    name.includes('mazdutide') ||
    name.includes('玛仕度肽') ||
    name.includes('survodutide') ||
    name.includes('pemvidutide') ||
    name.includes('efinopegdutide') ||
    name.includes('bi 456906') ||
    name.includes('ibi362')
  ) {
    return 'glp1_gcg';
  }

  // 4. GLP-1+GIP / GIP/GLP-1 (Tirzepatide, CT-388, HRS9531)
  if (
    (dClass.includes('GIP') && dClass.includes('GLP')) ||
    dClass.includes('GIP/GLP-1') ||
    dClass.includes('GLP-1/GIP') ||
    name.includes('tirzepatide') ||
    name.includes('替尔泊肽') ||
    name.includes('mounjaro') ||
    name.includes('zepbound') ||
    name.includes('ct-388') ||
    name.includes('hrs9531')
  ) {
    return 'glp1_gip';
  }

  // 5. 检查是否为口服型 GLP-1 (Orforglipron, Oral Semaglutide, Danuglipron, CT-996, HRS-7535)
  const isOral = 
    form.includes('口服') || 
    form.includes('oral') ||
    name.includes('oral') ||
    name.includes('口服') ||
    name.includes('orforglipron') ||
    name.includes('danuglipron') ||
    name.includes('ct-996') ||
    name.includes('hrs-7535') ||
    name.includes('rybelsus');

  const isGlp1 = 
    dClass.includes('GLP-1') || 
    dClass.includes('GLP1') ||
    name.includes('glutide') ||
    name.includes('glipron') ||
    name.includes('semaglutide') ||
    name.includes('liraglutide') ||
    name.includes('ecnoglutide') ||
    name.includes('beinaglutide') ||
    name.includes('dulaglutide') ||
    name.includes('danuglipron') ||
    name.includes('exenatide') ||
    name.includes('ct-996') ||
    name.includes('hrs-7535');

  if (isGlp1 && isOral) {
    return 'glp1_oral';
  }

  // 6. GLP-1注射
  if (isGlp1) {
    return 'glp1_inject';
  }

  // 7. 其他创新靶点/机制
  return 'other';
};

/**
 * 标准化药物名称，确保同一种药物的不同拼写、简称与复方表述自动统一归一
 * 规则要求：cagrisema、cagri+sema、cagrilintide+semaglutide、卡格列肽+司美格鲁肽 等均算做同一种药物 -> 统一归一化为 "CagriSema"
 */
export const normalizeDrugName = (rawName: string = ''): string => {
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase().replace(/[\s_\-–—]/g, '');

  // 1. 卡格列肽 + 司美格鲁肽 (CagriSema) 的各种变体统一处理为 CagriSema
  if (
    lower.includes('cagrisema') ||
    lower.includes('cagri+sema') ||
    lower.includes('cagri/sema') ||
    (lower.includes('cagri') && lower.includes('sema')) ||
    (lower.includes('cagrilintide') && lower.includes('semaglutide')) ||
    (lower.includes('卡格') && lower.includes('司美')) ||
    lower.includes('卡格司美')
  ) {
    return 'CagriSema';
  }

  // 2. 联邦制药/诺和诺德 UBT251 / UTB251 三靶点激动剂互通归一
  if (
    lower === 'ubt251' ||
    lower === 'utb251' ||
    lower.includes('ubt251') ||
    lower.includes('utb251') ||
    lower.includes('联邦三靶点')
  ) {
    return 'UBT251 (UTB251)';
  }

  // 3. 其他知名药物标准英文名/首字母大写转换
  if (lower === 'semaglutide' || lower === '司美格鲁肽') return 'Semaglutide';
  if (lower === 'tirzepatide' || lower === '替尔泊肽') return 'Tirzepatide';
  if (lower === 'retatrutide' || lower === '瑞他鲁肽') return 'Retatrutide';
  if (lower === 'ecnoglutide' || lower === '依诺格鲁肽') return 'Ecnoglutide';
  if (lower === 'mazdutide' || lower === '玛仕度肽') return 'Mazdutide';
  if (lower === 'survodutide' || lower === '索沃杜肽') return 'Survodutide';
  if (lower === 'orforglipron' || lower === '奥福格列酮') return 'Orforglipron';
  if (lower === 'danuglipron' || lower === '达格列朋') return 'Danuglipron';
  if (lower === 'amycretin' || lower === '艾米克雷汀') return 'Amycretin';

  // 默认保持首字母大写
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * 判断两个药物名称是否指向同一种药物
 * 无论传入 cagrisema 还是 cagri+sema，或 ubt251 还是 utb251 均返回 true
 */
export const isSameDrug = (nameA: string = '', nameB: string = ''): boolean => {
  if (!nameA || !nameB) return false;
  const normA = normalizeDrugName(nameA);
  const normB = normalizeDrugName(nameB);
  if (normA && normB && normA.toLowerCase() === normB.toLowerCase()) {
    return true;
  }
  // 兜底：忽略所有符号与空格对比
  const cleanA = (nameA || '').toLowerCase().replace(/[\s_\-–—+()\/]/g, '');
  const cleanB = (nameB || '').toLowerCase().replace(/[\s_\-–—+()\/]/g, '');
  if (cleanA === cleanB) return true;

  if (
    (cleanA.includes('ubt251') || cleanA.includes('utb251')) &&
    (cleanB.includes('ubt251') || cleanB.includes('utb251'))
  ) {
    return true;
  }

  return false;
};

export interface ExtractionStatus {
  isExtracting: boolean;
  step: 'idle' | 'reading_pdf' | 'analyzing_ai' | 'saving' | 'complete' | 'error';
  message: string;
}

// Global definition for PDF.js loaded via CDN
declare global {
  interface Window {
    pdfjsLib: any;
  }
}