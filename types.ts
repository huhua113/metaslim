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