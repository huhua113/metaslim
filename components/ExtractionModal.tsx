import React, { useState, useRef, useEffect } from 'react';
import { extractTextFromPDF, analyzeMedicalText, analyzeMedicalImage } from '../services/geminiService';
import { addStudy, updateStudy } from '../services/firebaseService';
import { Study } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studies: Study[];
}

interface UploadProgress {
  fileName: string;
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
}

const ProgressIcon: React.FC<{ status: UploadProgress['status'] }> = ({ status }) => {
  switch (status) {
    case 'processing':
      return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>;
    case 'success':
      return <div className="h-5 w-5 text-green-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg></div>;
    case 'error':
      return <div className="h-5 w-5 text-red-500"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
    default:
      return <div className="h-5 w-5 text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
  }
};


const ExtractionModal: React.FC<Props> = ({ isOpen, onClose, studies }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState('');

  useEffect(() => {
    // Detect mobile device on component mount
    const checkIsMobile = () => /Mobi|Android/i.test(navigator.userAgent);
    setIsMobile(checkIsMobile());

    // Reset state on modal close
    if (!isOpen) {
      setTimeout(() => {
        setUploadProgress([]);
        setIsBatchProcessing(false);
        setPastedText('');
        setInputMode('file');
      }, 300); // allow for closing animation
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processExtractedData = async (
    studiesData: (Omit<Study, 'id' | 'createdAt'>)[],
    updateStatus: (status: UploadProgress['status'], message: string) => void
  ) => {
    if (!studiesData || studiesData.length === 0) {
      throw new Error("AI 未能从内容中提取任何有效队列。");
    }

    updateStatus('processing', `发现 ${studiesData.length} 个队列，正在筛选并保存...`);
    let studiesAddedCount = 0;
    let studiesUpdatedCount = 0;
    let studiesFilteredOutCount = 0;

    for (const studyData of studiesData) {
      const isValid = studyData && studyData.drugName && studyData.trialName && Array.isArray(studyData.doses) && studyData.doses.length > 0;
      if (!isValid) continue;

      const phaseStr = studyData.phase || '';
      if (!phaseStr.includes('1') && !phaseStr.includes('2') && !phaseStr.includes('3')) {
        studiesFilteredOutCount++;
        continue;
      }

      const existingStudy = studies.find(existing =>
        existing.drugName.trim().toLowerCase() === studyData.drugName.trim().toLowerCase() &&
        existing.trialName.trim().toLowerCase() === studyData.trialName.trim().toLowerCase() &&
        existing.hasT2D === studyData.hasT2D &&
        existing.isChineseCohort === studyData.isChineseCohort
      );

      if (existingStudy) {
        await updateStudy(existingStudy.id, studyData);
        studiesUpdatedCount++;
      } else {
        await addStudy(studyData);
        studiesAddedCount++;
      }
    }

    let successMessageParts = [];
    if (studiesAddedCount > 0) successMessageParts.push(`成功新增 ${studiesAddedCount} 个队列`);
    if (studiesUpdatedCount > 0) successMessageParts.push(`成功更新 ${studiesUpdatedCount} 个队列`);
    if (studiesFilteredOutCount > 0) successMessageParts.push(`${studiesFilteredOutCount} 个非1-3期研究已忽略`);

    const successMessage = successMessageParts.join('，') + '。';

    if (studiesAddedCount === 0 && studiesUpdatedCount === 0) {
      if (studiesData.length > 0) {
        throw new Error("所有提取的队列均为非1-3期研究。");
      } else {
        throw new Error("未发现任何有效的新研究队列。");
      }
    }
    updateStatus('success', successMessage.trim());
  };

  const handleError = (error: unknown, updateStatus: (status: UploadProgress['status'], message: string) => void) => {
    console.error("Processing Error:", error);
    let msg = '发生未知错误';
    if (error instanceof Error) {
        msg = error.message;
    } else if (typeof error === 'object' && error && 'message' in error && typeof (error as {message: unknown}).message === 'string') {
        msg = (error as {message: string}).message;
    } else if (error) {
        msg = String(error);
    }
    
    const errorString = String(error).toLowerCase();

    if (errorString.includes('quota') || errorString.includes('429')) {
        msg = 'API 请求已超出配额限制。请稍等片刻后重试，或检查您的 Google AI Studio 账户用量。';
    } else if (msg.includes('api key not valid') || msg.includes('api_key_invalid') || errorString.includes('400')) {
        msg = 'Gemini API 密钥无效或项目未配置。请检查密钥。';
    } else if (msg.includes('permission-denied') || msg.includes('insufficient permissions') || errorString.includes('403')) {
        msg = '数据库权限不足。请检查 Firestore 安全规则。';
    } else if (!msg.startsWith('AI 未能') && !msg.startsWith('所有提取的')) {
        msg = `处理失败: ${msg}`;
    }
    
    updateStatus('error', msg);
  };

  const processFiles = async (files: File[]) => {
    setIsBatchProcessing(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const updateStatus = (status: UploadProgress['status'], message: string) => {
        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[i] = { ...newProgress[i], status, message };
          return newProgress;
        });
      };

      try {
        let studiesData: (Omit<Study, 'id' | 'createdAt'>)[];
        if (file.type === 'application/pdf') {
          updateStatus('processing', '正在解析 PDF...');
          const text = await extractTextFromPDF(file);
          updateStatus('processing', 'AI 正在提取数据...');
          studiesData = await analyzeMedicalText(text);
        } else if (file.type.startsWith('image/')) {
          updateStatus('processing', 'AI 正在分析图片...');
          studiesData = await analyzeMedicalImage(file);
        } else {
          throw new Error("不支持的文件格式");
        }
        await processExtractedData(studiesData, updateStatus);
      } catch (error: unknown) {
        handleError(error, updateStatus);
      }
    }
    setIsBatchProcessing(false);
  };
  
  const handleTextAnalysis = async () => {
      if (!pastedText.trim() || isBatchProcessing) return;
      setIsBatchProcessing(true);
      const newProgress = [{
          fileName: "粘贴的文本",
          status: 'idle' as 'idle',
          message: '待处理'
      }];
      setUploadProgress(newProgress);

      const updateStatus = (status: UploadProgress['status'], message: string) => {
        setUploadProgress(prev => {
          const newProgress = [...prev];
          newProgress[0] = { ...newProgress[0], status, message };
          return newProgress;
        });
      };

      try {
          updateStatus('processing', 'AI 正在提取数据...');
          const studiesData = await analyzeMedicalText(pastedText);
          await processExtractedData(studiesData, updateStatus);
      } catch (error) {
          handleError(error, updateStatus);
      }
      setIsBatchProcessing(false);
  };

  const handleFilesSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    const newProgress = files.map(file => ({
      fileName: file.name,
      status: 'idle' as 'idle',
      message: '待处理'
    }));
    setUploadProgress(newProgress);
    processFiles(files);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // FIX: Use spread syntax to convert FileList to File[] for better type safety.
      handleFilesSelected([...e.target.files]);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // FIX: Use spread syntax to convert FileList to File[].
      // This resolves a TypeScript error where the result of filter was being inferred as unknown[].
      const acceptedFiles = [...files].filter((f: File) => 
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      if (acceptedFiles.length > 0) {
          handleFilesSelected(acceptedFiles);
      } else {
        alert("请拖拽 PDF 或图片文件。");
      }
    }
  };

  const allDone = uploadProgress.length > 0 && !isBatchProcessing;

  const renderFileInput = () => (
    <div 
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging && !isMobile ? 'border-primary bg-primary/10' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-primary mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      {isMobile ? (
         <div>
            <span className="text-primary font-medium">点击选择文件</span>
            <p className="text-xs text-slate-500 mt-2 px-4">
                提示：请先将微信等应用中的文件保存到手机，再从这里选择。
            </p>
        </div>
      ) : (
        <span className="text-primary font-medium">点击或拖拽多个 PDF 或图片文件</span>
      )}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" multiple />
    </div>
  );

  const renderTextInput = () => (
      <div>
        <textarea
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="在此处粘贴文献文本..."
          className="w-full h-48 p-3 text-sm border-2 border-slate-300 rounded-xl focus:ring-primary focus:border-primary transition-colors resize-none"
          disabled={isBatchProcessing}
        />
        <button
          onClick={handleTextAnalysis}
          disabled={isBatchProcessing || !pastedText.trim()}
          className="mt-3 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-md shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isBatchProcessing ? '分析中...' : '开始分析'}
        </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">AI 提取数据</h2>
          <p className="text-slate-500 text-sm mb-4">
            支持批量上传 PDF/图片，或直接粘贴文本进行分析。
          </p>
          
          <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
              <button onClick={() => setInputMode('file')} className={`flex-1 text-center text-sm font-medium py-1.5 rounded-md transition-colors ${inputMode === 'file' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>上传文件</button>
              <button onClick={() => setInputMode('text')} className={`flex-1 text-center text-sm font-medium py-1.5 rounded-md transition-colors ${inputMode === 'text' ? 'bg-white text-primary shadow-sm' : 'text-slate-600'}`}>粘贴文本</button>
          </div>

          {uploadProgress.length === 0 ? (
            inputMode === 'file' ? renderFileInput() : renderTextInput()
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {uploadProgress.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ProgressIcon status={item.status} />
                    <div className="flex flex-col overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.fileName}</p>
                      <p className={`text-xs ${item.status === 'error' ? 'text-red-500' : 'text-slate-500'}`}>{item.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
          <button onClick={onClose} disabled={isBatchProcessing} className="px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 font-medium rounded-lg hover:bg-slate-200 transition-colors">
            {allDone ? '完成' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExtractionModal;
