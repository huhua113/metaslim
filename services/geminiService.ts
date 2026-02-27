import { GoogleGenAI, Type } from "@google/genai";
import { Study } from "../types";

// Schemas and prompt text now live on the frontend.
const singleStudySchema = {
    type: Type.OBJECT,
    properties: {
      drugName: { type: Type.STRING, description: "药物通用名称" },
      drugClass: { type: Type.STRING, description: "药物种类 (例如: GLP-1 RA, GIP/GLP-1)" },
      company: { type: Type.STRING, description: "研发药企" },
      trialName: { type: Type.STRING, description: "临床试验名称 (例如: SURMOUNT-1)" },
      phase: { type: Type.STRING, description: "试验分期 (例如: Phase 3)。必须返回 'Phase 1', 'Phase 2', 'Phase 3' 中的一个。如果文献中没有明确提及是这三期中的任何一期，则返回空字符串 ''。" },
      hasT2D: { type: Type.BOOLEAN, description: "该特定人群队列是否为2型糖尿病患者" },
      isChineseCohort: { type: Type.BOOLEAN, description: "该特定人群队列是否主要为中国人群 (e.g., STEP-China)" },
      durationWeeks: { type: Type.INTEGER, description: "试验持续周数" },
      formulation: { type: Type.STRING, description: "药物剂型。必须返回 '皮下注射', '口服', 或 '其他' 中的一个。" },
      frequency: { type: Type.STRING, description: "给药频率 (例如: '每周一次', '每日一次')" },
      summary: { type: Type.STRING, description: "一句话总结该队列的关键发现" },
      doses: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            dose: { type: Type.STRING, description: "剂量, e.g., '5mg'" },
            weightLossPercent: { type: Type.NUMBER, description: "体重下降百分比" },
            nauseaPercent: { type: Type.NUMBER, description: "恶心发生率百分比" },
            vomitingPercent: { type: Type.NUMBER, description: "呕吐发生率百分比" },
            diarrheaPercent: { type: Type.NUMBER, description: "腹泻发生率百分比" },
            constipationPercent: { type: Type.NUMBER, description: "便秘发生率百分比" },
            saePercent: { type: Type.NUMBER, description: "严重不良反应 (SAE) 发生率百分比" },
          },
          required: ["dose", "weightLossPercent", "nauseaPercent", "vomitingPercent", "diarrheaPercent", "constipationPercent", "saePercent"],
        },
      },
    },
    required: ["drugName", "drugClass", "company", "trialName", "phase", "hasT2D", "isChineseCohort", "durationWeeks", "formulation", "frequency", "doses"],
};
  
const studySchema = {
    type: Type.OBJECT,
    properties: {
      studies: {
        type: Type.ARRAY,
        description: "从文献中提取的所有研究队列列表。一份文献可能包含多个独立分析的队列。",
        items: singleStudySchema,
      },
    },
    required: ['studies'],
};
  
const extractionPromptText = `你是一位专业的医学文献分析助手。
你的任务是从提供的临床试验文本、截图或图片中，提取关于减重药物的关键信息。
请根据提供的JSON schema进行分析并返回结果。

**重要规则**:
- **分析策略**: 如果文献中提到了多种分析策略（例如 '意向性治疗分析/Intention-To-Treat/ITT' 或 'Treatment Policy Strategy' vs. '符合方案分析/Per-Protocol'），你必须优先提取 **'意向性治疗分析 (Intention-To-Treat)'** 的结果，因为它更能反映真实世界的治疗效果。
- **表格数据提取**: 文献中的表格是提取精确数据的关键来源，尤其是对于不良事件（恶心、呕吐、腹泻、便秘、SAE）的发生率。
  - **请仔细扫描所有表格。** 将每一行（通常代表一个剂量组）与相应的列（代表不同的数据点，如“恶心 N(%)”）进行精确匹配。
  - **注意数据格式**: 表格中的数据可能表示为 "N (%)" 或仅为百分比。请始终提取百分比数值。例如，对于 "45 (22.5%)"，你应该提取 22.5。
  - **忽略安慰剂列/行**: 在表格中，明确识别并 **完全忽略** 任何标记为 "Placebo" 或 "安慰剂" 的行或列。
- **排除安慰剂**: **绝对不要提取安慰剂 (placebo) 组的数据。** 这条规则适用于全文，尤其是在表格中。只关注包含实际药物的治疗组 (treatment arms)。
- **分层分析**: 一份文献可能会对不同的人群进行分层分析 (stratified analysis)。例如，一篇关于中国人群的研究，可能同时包含了针对“2型糖尿病(T2D)患者”和“非糖尿病患者”的独立数据。在这种情况下，你必须将每一个独立分析的人群队列 (cohort) 作为一个单独的 "study" 对象进行提取。最终返回一个包含所有独立研究队列的数组。

关键提取点（针对每一个独立队列）:
1. **药物信息**: 通用名称、种类 (例如 GLP-1 RA, GIP/GLP-1)、研发公司。
2. **试验设计**: 试验名称/编号 (例如 SURMOUNT-1)、分期、该队列是否为2型糖尿病患者 (hasT2D)、该队列是否主要为中国人群 (isChineseCohort)、试验持续周数、药物剂型 (必须是 '口服' 或 '皮下注射' 或 '其他' 之一)、给药频率 (例如 '每周一次', '每日一次')。
3. **疗效数据**: 每个剂量组的体重下降百分比。
4. **安全性数据**: 每个剂量组的恶心、呕吐、腹泻、便秘和严重不良反应 (SAE) 发生率百分比。

如果某个数值未在文献中报告，请将数值设为 0，字符串设为空字符串 ""。确保所有数字字段都是数字类型，而不是字符串。`;


// Helper to get API Key
const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || "";
};

let aiClient: GoogleGenAI | null = null;
const getAiClient = () => {
  if (!aiClient) {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.warn("Gemini API Key is missing. AI features will not work.");
      aiClient = new GoogleGenAI({ apiKey: "missing_key" });
    } else {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
};

// Helper to convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
};

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
  let fullText = "";

  const maxPages = Math.min(pdf.numPages, 15);

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }

  return fullText;
};

const callGeminiApi = async (contents: any): Promise<any> => {
    const config = {
        responseMimeType: "application/json",
        responseSchema: studySchema,
        temperature: 0.1,
    };
    
    const client = getAiClient();
    const response = await client.models.generateContent({ 
        model: "gemini-2.5-flash",
        contents, 
        config 
    });
    
    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("API 返回了空响应。该文件可能不包含可分析的数据。");
    }

    return JSON.parse(jsonText);
}

const processApiResponse = (data: any): (Omit<Study, 'id' | 'createdAt'>)[] => {
    if (!data.studies || !Array.isArray(data.studies)) {
        throw new Error("API 响应格式不正确 (缺少 'studies' 数组)。");
    }
    
    return data.studies.map((study: any) => {
        if (study.drugName && typeof study.drugName === 'string') {
            study.drugName = study.drugName.charAt(0).toUpperCase() + study.drugName.slice(1).toLowerCase();
        }
        return study;
    });
}

export const analyzeMedicalText = async (text: string): Promise<(Omit<Study, 'id' | 'createdAt'>)[]> => {
  try {
    const userPrompt = `${extractionPromptText}\n\n文献内容:\n${text.substring(0, 30000)}`;
    const data = await callGeminiApi(userPrompt);
    return processApiResponse(data);
  } catch (error) {
    console.error("Gemini Text Extraction Error:", error);
    if (error instanceof Error) {
        throw new Error(`文献分析失败: ${error.message}`);
    }
    throw new Error("无法从文献中提取有效信息，请检查文件内容或联系管理员。");
  }
};

export const analyzeMedicalImage = async (file: File): Promise<(Omit<Study, 'id' | 'createdAt'>)[]> => {
  try {
    const base64Data = await fileToBase64(file);
    const imagePart = { inlineData: { mimeType: file.type, data: base64Data } };
    const contents = { parts: [imagePart, { text: extractionPromptText }] };
    const data = await callGeminiApi(contents);
    return processApiResponse(data);
  } catch (error) {
    console.error("Gemini Image Extraction Error:", error);
    if (error instanceof Error) {
        throw new Error(`图片分析失败: ${error.message}`);
    }
    throw new Error("无法从图片中提取有效信息，请检查图片内容或联系管理员。");
  }
};