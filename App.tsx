import React, { useState, useEffect, useMemo } from 'react';
import { Study, DoseData, DrugCategory, DRUG_CATEGORIES, getStudyDrugCategory, normalizeDrugName, isSameDrug } from './types';
import { 
  subscribeToStudies, 
  deleteStudy, 
  deleteAllStudies, 
  deleteSelectedStudies,
} from './services/firebaseService';
import ExtractionModal from './components/ExtractionModal';
import EditStudyModal from './components/EditStudyModal';
import ManualAddModal from './components/ManualAddModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import { SafetyAnalysisChart, DurationEfficacyScatterChart } from './components/Visualizations';
import ComparisonView from './components/ComparisonView';
import { exportStudiesToExcel, downloadExcelTemplate } from './services/excelService';

const statCardStyles = [
  { bg: 'bg-orange/20', text: 'text-orange' },
  { bg: 'bg-accent/80', text: 'text-primary' },
  { bg: 'bg-yellow-100', text: 'text-yellow-500' },
];

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode; styleIndex: number; }> = ({ title, value, icon, styleIndex }) => {
  const style = statCardStyles[styleIndex % statCardStyles.length];
  return (
    <div className="bg-white p-4 rounded-2xl shadow-lg flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} ${style.text}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-500 mt-1">{title}</p>
      </div>
    </div>
  );
};


const StudyCard: React.FC<{ 
  study: Study, 
  isSelected: boolean, 
  onSelect: (id: string) => void, 
  onEdit: (study: Study) => void,
  onDelete: (study: Study) => void,
  isAdmin: boolean,
}> = ({ study, isSelected, onSelect, onEdit, onDelete, isAdmin }) => {
  const cat = getStudyDrugCategory(study);
  const catInfo = DRUG_CATEGORIES.find(c => c.key === cat);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 animate-fade-in-up">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-900">{study.drugName}</h3>
            {catInfo && (
              <span 
                className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xs" 
                style={{ backgroundColor: catInfo.color }}
              >
                {catInfo.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{study.company}</p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 rounded-md border-gray-300 text-primary focus:ring-primary mt-1 flex-shrink-0"
          checked={isSelected}
          onChange={() => onSelect(study.id)}
        />
      </div>
    <div className="mt-3 text-xs space-y-1.5 text-slate-600 border-t border-slate-100 pt-3">
      <p><span className="font-semibold text-primary">{study.trialName}</span> | {study.phase} | {study.durationWeeks} 周</p>
      <div className="flex gap-2 items-center flex-wrap">
        {study.formulation && <p className="font-medium w-fit px-2 py-0.5 rounded-full text-gray-700 bg-gray-100">{study.formulation}</p>}
        {study.frequency && <p className="font-medium w-fit px-2 py-0.5 rounded-full text-gray-700 bg-gray-100">{study.frequency}</p>}
      </div>
      <div className="flex gap-2 pt-1 flex-wrap">
        <p className={`font-medium w-fit px-2 py-0.5 rounded-full ${study.hasT2D ? 'text-orange bg-orange/20' : 'text-primary bg-primary/10'}`}>
          {study.hasT2D ? '包含 T2D' : '不含 T2D'}
        </p>
         {study.isChineseCohort && (
          <p className="font-medium w-fit px-2 py-0.5 rounded-full text-red-600 bg-red-100">
            中国人
          </p>
        )}
      </div>
    </div>
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
      <h4 className="text-xs font-semibold text-slate-400">剂量详情</h4>
      {study.doses.map((dose: DoseData, idx: number) => (
        <div key={idx} className="flex items-center justify-between text-xs">
          <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{dose.dose}</span>
          <div className="flex items-center gap-3">
            <span className="text-emerald-600 font-bold" title="减重">↓ {dose.weightLossPercent}%</span>
            <span className="text-amber-600" title="恶心">🤢 {dose.nauseaPercent}%</span>
            <span className="text-red-600" title="呕吐">🤮 {dose.vomitingPercent}%</span>
          </div>
        </div>
      ))}
    </div>
    {isAdmin && (
      <div className="mt-3 border-t border-slate-100 pt-2 flex justify-end items-center gap-4">
        <button onClick={() => onEdit(study)} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">编辑</button>
        <button onClick={() => onDelete(study)} className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">删除</button>
      </div>
    )}
  </div>
  );
};

type DashboardFilter = 'all' | 'nonT2D' | 't2d' | 'chinese';
const dashboardFilters: { key: DashboardFilter; label: string }[] = [
  { key: 'all', label: '全部人群' },
  { key: 'nonT2D', label: '非糖尿病' },
  { key: 't2d', label: 'T2D' },
  { key: 'chinese', label: '中国人群' },
];

type SortKey = 'createdAt' | 'drugName';

const SortIcon: React.FC<{ direction: 'asc' | 'desc' }> = ({ direction }) => (
    <svg className="w-4 h-4 ml-1.5 inline-block" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
      {direction === 'asc' ? 
        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /> :
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      }
    </svg>
);

// 药物大类选择选项卡组件 (GLP-1注射、GLP-1口服、GLP-1+GIP、GLP-1+GCG、三靶点、胰淀素+、其他)
const DrugCategoryTabBar: React.FC<{
  activeCategory: DrugCategory;
  onSelect: (cat: DrugCategory) => void;
  hoveredCategory?: DrugCategory | null;
  onHoverCategory?: (cat: DrugCategory | null) => void;
  studies: Study[];
}> = ({ activeCategory, onSelect, hoveredCategory, onHoverCategory, studies }) => {
  const counts = useMemo(() => {
    const map: Record<DrugCategory, number> = {
      all: studies.length,
      glp1_inject: 0,
      glp1_oral: 0,
      glp1_gip: 0,
      glp1_gcg: 0,
      triple: 0,
      amylin: 0,
      other: 0,
    };
    studies.forEach(s => {
      const cat = getStudyDrugCategory(s);
      map[cat] = (map[cat] || 0) + 1;
    });
    return map;
  }, [studies]);

  return (
    <div 
      className="bg-white p-3 rounded-2xl shadow-lg border border-slate-100"
      onMouseLeave={() => onHoverCategory?.(null)}
    >
      <div className="flex items-center justify-between mb-2.5 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
          <span className="text-xs font-bold text-slate-900">药物类型选项卡</span>
          <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">按靶点机制筛选</span>
          <span className="text-[10px] text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">
            💡 悬停即可临时在图表中高亮预览
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          {hoveredCategory && hoveredCategory !== 'all' ? (
            <span className="text-primary font-bold">
              正在预览: {DRUG_CATEGORIES.find(c => c.key === hoveredCategory)?.label} ({counts[hoveredCategory] || 0} 项队列)
            </span>
          ) : (
            `已匹配 ${counts[activeCategory] || 0} 项队列`
          )}
        </span>
      </div>
      <div 
        className="flex overflow-x-auto no-scrollbar gap-2 pb-1 pt-0.5"
        onMouseLeave={() => onHoverCategory?.(null)}
      >
        {DRUG_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key;
          const isHovered = hoveredCategory === cat.key && !isActive;
          const count = counts[cat.key] || 0;
          return (
            <button
              key={cat.key}
              onClick={() => {
                onSelect(cat.key);
                onHoverCategory?.(null);
              }}
              onMouseEnter={() => onHoverCategory?.(cat.key)}
              onMouseLeave={() => onHoverCategory?.(null)}
              title={`${cat.description} (鼠标悬停在图表中临时高亮)`}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isActive 
                  ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]' 
                  : isHovered
                    ? 'bg-primary/10 text-primary border-primary ring-2 ring-primary/30 scale-[1.02] shadow-xs'
                    : 'bg-slate-50/90 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              {cat.key !== 'all' && (
                <span 
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs ${isHovered ? 'animate-pulse' : ''}`} 
                  style={{ backgroundColor: isActive ? '#ffffff' : cat.color }}
                />
              )}
              <span>{cat.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                isActive 
                  ? 'bg-white/20 text-white' 
                  : isHovered 
                    ? 'bg-primary text-white' 
                    : 'bg-slate-200/80 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FilterBar: React.FC<{
  activeFilters: DashboardFilter[];
  onClick: (filter: DashboardFilter) => void;
}> = ({ activeFilters, onClick }) => (
  <div className="bg-white p-2.5 rounded-2xl shadow-lg border border-slate-100">
    <div className="flex flex-wrap justify-start items-center gap-1.5">
      <span className="text-xs font-bold text-slate-500 px-2">细分人群:</span>
      {dashboardFilters.map(filter => (
        <button 
          key={filter.key} 
          onClick={() => onClick(filter.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeFilters.includes(filter.key) ? 'bg-slate-800 text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  </div>
);


const App: React.FC = () => {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'data' | 'comparison'>('dashboard');
  const [selectedStudyIds, setSelectedStudyIds] = useState<string[]>([]);
  const [activeDrugCategory, setActiveDrugCategory] = useState<DrugCategory>('all');
  const [hoveredDrugCategory, setHoveredDrugCategory] = useState<DrugCategory | null>(null);
  const [activeDashboardFilters, setActiveDashboardFilters] = useState<DashboardFilter[]>(['all']);
  
  const [studyToEdit, setStudyToEdit] = useState<Study | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [studyToDelete, setStudyToDelete] = useState<Study | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [dashboardSubTab, setDashboardSubTab] = useState<'efficacy' | 'safety'>('efficacy');

  useEffect(() => {
    const unsubscribe = subscribeToStudies((data) => {
      setStudies(data);
      // 如果数据中包含 mock ID，或者 Firebase 未配置，则认为是演示模式
      if (data.some(s => s.id.startsWith('mock-') || s.id.startsWith('local-'))) {
        setIsDemoMode(true);
      } else {
        setIsDemoMode(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAdminClick = () => {
    if (!isAdmin) {
      setIsPasswordModalOpen(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '951120') {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      window.history.pushState({}, '', url);
      setIsAdmin(true);
      sessionStorage.setItem('metaslim_admin_auth', 'true');
      setIsPasswordModalOpen(false);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'createdAt' ? 'desc' : 'asc' };
    });
  };

  const handleDashboardFilterClick = (filterKey: DashboardFilter) => {
    setActiveDashboardFilters(currentFilters => {
        if (filterKey === 'all') {
            return ['all'];
        }

        const otherFilters = currentFilters.filter(f => f !== 'all');
        const isFilterActive = otherFilters.includes(filterKey);
        let newFilters;

        if (isFilterActive) {
            newFilters = otherFilters.filter(f => f !== filterKey);
        } else {
            newFilters = [...otherFilters, filterKey];
        }

        if (newFilters.length === 0) {
            return ['all'];
        }

        return newFilters;
    });
  };

  const filteredStudies = useMemo(() => {
    let studiesToFilter = studies;

    // 1. 药物大类选项卡筛选 (GLP-1注射、GLP-1口服、GLP-1+GIP、GLP-1+GCG、三靶点、胰淀素+、其他)
    if (activeDrugCategory !== 'all') {
      studiesToFilter = studiesToFilter.filter(study => getStudyDrugCategory(study) === activeDrugCategory);
    }

    // 2. 细分人群过滤 (非糖尿病、T2D、中国人群)
    if (!activeDashboardFilters.includes('all') && activeDashboardFilters.length > 0) {
        studiesToFilter = studiesToFilter.filter(study => {
            return activeDashboardFilters.every(filter => {
                switch (filter) {
                    case 't2d': return study.hasT2D;
                    case 'nonT2D': return !study.hasT2D;
                    case 'chinese': return study.isChineseCohort;
                    default: return true;
                }
            });
        });
    }
    
    // 3. 关键词检索过滤
    if (activeTab === 'data' && searchTerm.trim()) {
        const lowercasedTerm = searchTerm.toLowerCase();
        studiesToFilter = studiesToFilter.filter(study => 
            (study.drugName || '').toLowerCase().includes(lowercasedTerm) ||
            isSameDrug(study.drugName, searchTerm) ||
            (study.company || '').toLowerCase().includes(lowercasedTerm) ||
            (study.trialName || '').toLowerCase().includes(lowercasedTerm) ||
            (study.drugClass || '').toLowerCase().includes(lowercasedTerm) ||
            (study.summary || '').toLowerCase().includes(lowercasedTerm)
        );
    }

    return studiesToFilter;
  }, [studies, activeDrugCategory, activeDashboardFilters, searchTerm, activeTab]);

  const sortedAndFilteredStudies = useMemo(() => {
    const getPhaseNumber = (phase: string): number => {
      if (!phase) return 4; // Place studies without a phase last
      const match = phase.match(/\d+/);
      return match ? parseInt(match[0], 10) : 4;
    };

    return [...filteredStudies].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (sortConfig.key === 'drugName') {
        const nameA = normalizeDrugName(a.drugName);
        const nameB = normalizeDrugName(b.drugName);
        const drugNameComparison = nameA.localeCompare(nameB, 'zh-Hans-CN');
        if (drugNameComparison !== 0) return drugNameComparison * direction;
        const phaseComparison = getPhaseNumber(a.phase) - getPhaseNumber(b.phase);
        if (phaseComparison !== 0) return phaseComparison * direction;
        return a.trialName.localeCompare(b.trialName, 'zh-Hans-CN') * direction;
      }
      
      if (sortConfig.key === 'createdAt') {
        if (a.createdAt > b.createdAt) return 1 * direction;
        if (a.createdAt < b.createdAt) return -1 * direction;
      }

      return 0;
    });
  }, [filteredStudies, sortConfig]);

  // --- Edit Logic ---
  const handleOpenEditModal = (study: Study) => {
    setStudyToEdit(study);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setStudyToEdit(null);
  };

  // --- Delete Logic ---
  const handleInitiateDelete = (study: Study) => {
    setStudyToDelete(study);
    setIsDeleteConfirmOpen(true);
  };
  const handleConfirmDelete = async () => {
    if (!studyToDelete) return;
    try {
      await deleteStudy(studyToDelete.id);
    } catch (error: any) {
      console.error("Deletion failed:", error);
      alert(`删除失败: ${error.message || '请检查数据库权限或查看控制台日志。'}`);
    } finally {
      setIsDeleteConfirmOpen(false);
      setStudyToDelete(null);
    }
  };
  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setStudyToDelete(null);
  };

  const handleClearAll = async () => {
    if (window.confirm(`确定要清空所有 ${studies.length} 条文献记录吗？此操作无法撤销。`)) {
      try {
        await deleteAllStudies();
      } catch (error) {
        console.error("Failed to clear all studies:", error);
        alert("清除失败，请检查控制台日志。");
      }
    }
  };
  
  const handleSelectStudy = (id: string) => setSelectedStudyIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleClearComparison = () => { setSelectedStudyIds([]); setActiveTab('data'); };
  const handleClearSelection = () => setSelectedStudyIds([]);
  
  const handleDeleteSelected = async () => {
    if (window.confirm(`确定要删除选中的 ${selectedStudyIds.length} 条记录吗？此操作无法撤销。`)) {
        try {
            await deleteSelectedStudies(selectedStudyIds);
            setSelectedStudyIds([]); // Clear selection after successful deletion
        } catch (error) {
            console.error("Failed to delete selected studies:", error);
            alert("批量删除失败，请检查控制台日志。");
        }
    }
  };

  const selectedStudies = studies.filter(s => selectedStudyIds.includes(s.id));

  return (
    <div className="min-h-screen pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
                <span className="font-bold text-xl tracking-tight text-slate-900">MetaSlim AI</span>
                {isDemoMode && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                    演示模式
                  </span>
                )}
                <div className="flex items-center bg-slate-100 rounded-lg p-1 ml-2">
                  <button 
                    onClick={handleAdminClick}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${isAdmin ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    管理员
                  </button>
                  <button 
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('mode', 'guest');
                      window.history.pushState({}, '', url);
                      setIsAdmin(false);
                    }}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${!isAdmin ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    访客
                  </button>
                </div>
              </div>
              <div className="hidden sm:ml-8 sm:flex sm:space-x-1">
                {['dashboard', 'data'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`capitalize transition-colors duration-200 relative text-sm font-medium h-full px-4 flex items-center ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-900'}`}>
                    {tab === 'dashboard' ? '可视分析' : `文献列表 (${studies.length})`}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
               {isAdmin && studies.length > 0 && (
                <button 
                  onClick={handleClearAll} 
                  className="hidden sm:inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  清空所有数据
                </button>
              )}
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setIsManualAddModalOpen(true)}
                    className="hidden sm:inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    手动录入
                  </button>
                  <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-md shadow-primary/30">
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    上传文献 / Excel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:hidden mb-6 bg-white p-1 rounded-xl shadow-md flex">
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-slate-600'}`}>可视分析</button>
          <button onClick={() => setActiveTab('data')} className={`flex-1 py-2 text-sm font-medium rounded-lg ${activeTab === 'data' ? 'bg-primary text-white' : 'text-slate-600'}`}>文献列表</button>
        </div>

        {activeTab === 'comparison' ? (
          <ComparisonView studies={selectedStudies} onClear={handleClearComparison} />
        ) : studies.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-slate-200/50">
            <div className="mx-auto h-24 w-24 text-slate-300"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
            <h3 className="mt-2 text-lg font-medium text-slate-900">暂无数据</h3>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin ? '点击右上角“上传文献”或“手动录入”开始使用。' : '当前为访客模式，数据由管理员上传。'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 gap-4 md:gap-6">
                  <StatCard title="收录研究总数" value={studies.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} styleIndex={0} />
                  <StatCard title="涉及药物种类" value={new Set(studies.map(s => s.drugClass)).size} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v4.517a1 1 0 01-1.447.894L10 8v4.517A1 1 0 018.553 13.41l-1-1V4z" /></svg>} styleIndex={1} />
                </div>
                
                <DrugCategoryTabBar 
                  activeCategory={activeDrugCategory} 
                  onSelect={setActiveDrugCategory} 
                  hoveredCategory={hoveredDrugCategory}
                  onHoverCategory={setHoveredDrugCategory}
                  studies={studies} 
                />
                <FilterBar activeFilters={activeDashboardFilters} onClick={handleDashboardFilterClick} />

                <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                  <button 
                    onClick={() => setDashboardSubTab('efficacy')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dashboardSubTab === 'efficacy' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    周期与减重
                  </button>
                  <button 
                    onClick={() => setDashboardSubTab('safety')}
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dashboardSubTab === 'safety' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    疗效与安全性
                  </button>
                </div>

                {dashboardSubTab === 'efficacy' ? (
                  <div className="bg-white rounded-3xl shadow-xl p-6 pb-5 sm:p-8 sm:pb-6 animate-fade-in mb-10">
                    <div className="h-[520px] sm:h-[600px] md:h-[650px]">
                      <DurationEfficacyScatterChart 
                        studies={filteredStudies} 
                        hoveredCategory={hoveredDrugCategory} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-xl p-6 pb-5 sm:p-8 sm:pb-6 animate-fade-in mb-10">
                    <div className="h-[520px] sm:h-[600px] md:h-[650px]">
                      <SafetyAnalysisChart 
                        studies={filteredStudies} 
                        hoveredCategory={hoveredDrugCategory} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'data' && (
              <div className="animate-fade-in space-y-4">
                <DrugCategoryTabBar 
                  activeCategory={activeDrugCategory} 
                  onSelect={setActiveDrugCategory} 
                  hoveredCategory={hoveredDrugCategory}
                  onHoverCategory={setHoveredDrugCategory}
                  studies={studies} 
                />
                <FilterBar activeFilters={activeDashboardFilters} onClick={handleDashboardFilterClick} />
                <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                        <div className="relative flex-1 sm:max-w-xs">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </span>
                            <input
                                type="text"
                                placeholder="搜索药物、公司或试验..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-primary focus:border-primary transition"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">排序:</span>
                            <button
                              onClick={() => handleSort('createdAt')}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${sortConfig.key === 'createdAt' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                              上传时间
                              {sortConfig.key === 'createdAt' && <SortIcon direction={sortConfig.direction} />}
                            </button>
                            <button
                              onClick={() => handleSort('drugName')}
                              className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${sortConfig.key === 'drugName' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                              药物名称
                              {sortConfig.key === 'drugName' && <SortIcon direction={sortConfig.direction} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <button
                          onClick={() => exportStudiesToExcel(sortedAndFilteredStudies)}
                          title="导出当前筛选的研究列表为 Excel 文件 (.xlsx)"
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>导出 Excel ({sortedAndFilteredStudies.length})</span>
                        </button>
                        <button
                          onClick={downloadExcelTemplate}
                          title="下载标准录入模板，可直接在 Excel 中填写并上传更新"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          <span>下载模板</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setIsModalOpen(true)}
                            title="上传 Excel 或文献文件"
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-all shadow-xs cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>导入 Excel</span>
                          </button>
                        )}
                    </div>
                </div>
                 <div className="md:hidden space-y-4">{sortedAndFilteredStudies.map((study) => <StudyCard key={study.id} study={study} isSelected={selectedStudyIds.includes(study.id)} onSelect={handleSelectStudy} onEdit={handleOpenEditModal} onDelete={handleInitiateDelete} isAdmin={isAdmin} />)}</div>
                  <div className="hidden md:block bg-white shadow-lg rounded-2xl overflow-hidden"><table className="min-w-full divide-y divide-slate-100"><thead className="bg-slate-50"><tr><th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">选择</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">药物信息</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">试验设计</th><th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">剂量 / 效果 / 安全性</th>{isAdmin && <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">操作</th>}</tr></thead><tbody className="bg-white divide-y divide-slate-100">{sortedAndFilteredStudies.map((study)=>{
                    const cat = getStudyDrugCategory(study);
                    const catInfo = DRUG_CATEGORIES.find(c => c.key === cat);
                    return (
                      <tr key={study.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={selectedStudyIds.includes(study.id)} onChange={()=>handleSelectStudy(study.id)}/></td><td className="px-6 py-4"><div className="flex flex-col"><div className="flex items-center gap-1.5"><span className="text-sm font-bold text-slate-900">{study.drugName}</span>{catInfo && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs" style={{ backgroundColor: catInfo.color }}>{catInfo.label}</span>}</div><span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">{study.drugClass}</span><span className="text-xs text-slate-400 mt-0.5">{study.company}</span></div></td><td className="px-6 py-4"><div className="flex flex-col text-sm text-slate-600"><span className="font-medium text-primary">{study.trialName}</span><span className="mt-1">{study.phase} | {study.durationWeeks} 周</span><div className="flex gap-2 mt-1"><span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-700 bg-gray-100">{study.formulation}</span><span className="text-xs font-medium px-2 py-0.5 rounded-full text-gray-700 bg-gray-100">{study.frequency}</span></div><div className="flex gap-2 mt-1"><span className={`text-xs font-medium ${study.hasT2D ? 'text-orange' : 'text-primary'}`}>{study.hasT2D ?'T2D 患者':'非糖尿病'}</span>{study.isChineseCohort && <span className="text-xs font-medium text-red-600">中国人</span>}</div></div></td><td className="px-6 py-4"><div className="space-y-2">{study.doses.map((dose,idx)=><div key={idx} className="flex items-center text-xs space-x-3"><span className="w-12 font-medium text-slate-700 bg-slate-100 px-1 rounded">{dose.dose}</span><div className="flex items-center space-x-1 w-20"><span className="text-emerald-600 font-bold">↓ {dose.weightLossPercent}%</span></div><div className="flex items-center space-x-2 text-slate-400"><span title="恶心">🤢 {dose.nauseaPercent}%</span><span title="呕吐">🤮 {dose.vomitingPercent}%</span></div></div>)}</div></td>{isAdmin && <td className="px-6 py-4 text-right text-sm font-medium"><div className="flex justify-end items-center gap-4"><button onClick={() => handleOpenEditModal(study)} className="font-medium text-primary hover:text-primary/80 transition-colors">编辑</button><button onClick={() => handleInitiateDelete(study)} className="font-medium text-red-500 hover:text-red-700 transition-colors">删除</button></div></td>}</tr>
                    );
                  })}</tbody></table></div>
              </div>
            )}
          </>
        )}
      </main>

      {isAdmin && <ExtractionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} studies={studies} />}
      {isAdmin && <ManualAddModal isOpen={isManualAddModalOpen} onClose={() => setIsManualAddModalOpen(false)} />}
      {isAdmin && <EditStudyModal isOpen={isEditModalOpen} onClose={handleCloseEditModal} study={studyToEdit} />}
      {isAdmin && <ConfirmDeleteModal isOpen={isDeleteConfirmOpen} onClose={handleCancelDelete} onConfirm={handleConfirmDelete} studyName={studyToDelete?.trialName} />}
      
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900 mb-4">管理员身份验证</h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">请输入密码</label>
                  <input 
                    type="password" 
                    autoFocus
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError(false);
                    }}
                    className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all ${passwordError ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                    placeholder="••••••"
                  />
                  {passwordError && <p className="mt-1 text-xs text-red-500 font-medium">密码错误，请重试</p>}
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                  >
                    确认
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'data' && selectedStudyIds.length >= 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] z-30 animate-fade-in-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-800">已选择 {selectedStudyIds.length} 项</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 text-slate-700 bg-slate-200/80 text-sm font-bold rounded-lg hover:bg-slate-300/80 transition-colors"
                >
                  清空选择
                </button>
                {isAdmin && (
                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 text-red-600 bg-red-50 text-sm font-bold rounded-lg hover:bg-red-100 transition-colors"
                  >
                    删除选中
                  </button>
                )}
                {selectedStudyIds.length >= 2 && (
                  <button onClick={() => setActiveTab('comparison')} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition-colors shadow-md shadow-primary/30">
                    对比分析
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;