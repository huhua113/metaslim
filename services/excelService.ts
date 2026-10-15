import * as XLSX from 'xlsx';
import { Study, DoseData } from '../types';

/**
 * 临床研究 Excel 导入导出与解析服务
 * 为完全不懂编程的人提供清晰易懂的中文注释与字段转换
 */

// 辅助函数：清洗并转换为浮点数百分比 (例如 "15.5%" 或 -15.5 或 15.5 -> 15.5)
const parsePercent = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') {
    // 如果是负数（如体重变化 -15.5%），在减重有效率中统一取正值 15.5
    return Math.abs(val);
  }
  const str = String(val).replace(/[%％]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
};

// 辅助函数：清洗周期周数 (例如 "52周" 或 "52" -> 52)
const parseWeeks = (val: any): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return Math.max(0, Math.round(val));
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

// 辅助函数：清洗布尔值 (例如 "是" / "否", "Yes" / "No", "1" / "0")
const parseBoolean = (val: any): boolean => {
  if (val === undefined || val === null || val === '') return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === 1;
  const str = String(val).trim().toLowerCase();
  return (
    str === '是' ||
    str === 'yes' ||
    str === 'true' ||
    str === '1' ||
    str === 'y' ||
    str === 't2d' ||
    str === '中国人群' ||
    str === '伴糖尿病'
  );
};

// 辅助函数：清洗剂型 ('皮下注射' | '口服' | '其他')
const parseFormulation = (val: any): '皮下注射' | '口服' | '其他' => {
  const str = String(val || '').trim();
  if (str.includes('口服')) return '口服';
  if (str.includes('皮下') || str.includes('注射') || str.includes('针剂')) return '皮下注射';
  return '其他';
};

// 列名别名归一化查找表 (支持中文和英文各种常见表头叫法)
const normalizeKey = (rawKey: string): string => {
  const key = rawKey.trim().toLowerCase().replace(/[\s_\-()（）%％]/g, '');
  
  if (['药物名称', '药物', '通用名', '药品名称', '药品', 'drugname', 'drug', 'name'].includes(key)) return 'drugName';
  if (['研发企业', '企业', '公司', '药企', '研发机构', '机构', '赞助商', 'company', 'sponsor', 'manufacturer'].includes(key)) return 'company';
  if (['靶点机制', '药物类别', '靶点', '作用机制', '机制', '分类', '类别', 'drugclass', 'class', 'mechanism'].includes(key)) return 'drugClass';
  if (['临床试验名称', '试验名称', '研究名称', '试验', '研究', 'trialname', 'trial', 'study', 'studyname'].includes(key)) return 'trialName';
  if (['临床阶段', '试验阶段', '分期', '试验分期', '阶段', '期别', 'phase', 'stage'].includes(key)) return 'phase';
  if (['是否伴糖尿病', '伴t2d', '伴发t2d', '糖尿病', '糖尿病人群', 't2d', 'hast2d', 'diabetes'].includes(key)) return 'hasT2D';
  if (['是否中国人群', '中国人群', '中国队列', '中国亚组', '中国', 'ischinesecohort', 'chinese', 'chinacohort'].includes(key)) return 'isChineseCohort';
  if (['治疗周期', '治疗周期周', '治疗周期周数', '周期周', '周期周数', '试验周期', '周期', '周数', 'durationweeks', 'duration', 'weeks'].includes(key)) return 'durationWeeks';
  if (['给药途径', '剂型', '给药方式', '途径', 'formulation', 'route'].includes(key)) return 'formulation';
  if (['给药频次', '频次', '使用频率', '频率', 'frequency'].includes(key)) return 'frequency';
  if (['剂量', '组别', '试验剂量', '剂量组', 'dose', 'dosage'].includes(key)) return 'dose';
  if (['减重百分比', '减重比例', '减重率', '体重降幅', '减重降幅', '平均减重率', 'weightlosspercent', 'weightloss', 'weightlossrate'].includes(key)) return 'weightLossPercent';
  if (['恶心发生率', '恶心率', '恶心比例', '恶心', 'nauseapercent', 'nausea'].includes(key)) return 'nauseaPercent';
  if (['呕吐发生率', '呕吐率', '呕吐比例', '呕吐', 'vomitingpercent', 'vomiting'].includes(key)) return 'vomitingPercent';
  if (['腹泻发生率', '腹泻率', '腹泻比例', '腹泻', 'diarrheapercent', 'diarrhea'].includes(key)) return 'diarrheaPercent';
  if (['便秘发生率', '便秘率', '便秘比例', '便秘', 'constipationpercent', 'constipation'].includes(key)) return 'constipationPercent';
  if (['sae发生率', '严重不良反应发生率', '严重不良事件发生率', '严重不良反应', '严重不良事件', 'sae', 'saepercent'].includes(key)) return 'saePercent';
  if (['研究总结', '总结', '备注', '摘要', '文献概要', 'summary', 'notes', 'comment'].includes(key)) return 'summary';

  return rawKey;
};

/**
 * 解析用户上传的 Excel 文件 (.xlsx, .xls, .csv)
 * 返回符合应用规范的 Study 队列数据列表
 */
export const parseExcelFile = async (file: File): Promise<Omit<Study, 'id' | 'createdAt'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('Excel 文件中没有找到任何工作表 (Sheet)。');
        }

        // 优先选择名为“临床研究”、“数据”或第一个工作表
        let targetSheetName = workbook.SheetNames[0];
        const preferredSheets = ['临床研究', '临床数据', 'Studies', 'Data', 'Sheet1'];
        for (const name of preferredSheets) {
          if (workbook.SheetNames.includes(name)) {
            targetSheetName = name;
            break;
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];
        // 将工作表转为原始对象数组，表头作为键
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          throw new Error('Excel 表格中没有检测到有效数据行。请检查第一行是否为列标题。');
        }

        // 1. 标准化每行的字段名称
        const standardizedRows: Record<string, any>[] = rawRows.map(row => {
          const newRow: Record<string, any> = {};
          Object.keys(row).forEach(rawKey => {
            const normKey = normalizeKey(rawKey);
            newRow[normKey] = row[rawKey];
          });
          return newRow;
        });

        // 2. 聚合并构建研究队列：
        // 临床试验表格经常是一行一个剂量组（例如同一 SURMOUNT-1 试验有 5mg、10mg、15mg 三行）
        // 我们根据 [药物名称 + 试验名称 + 糖尿病人群 + 中国人群 + 治疗周期] 进行智能合并分组
        const studyGroupMap = new Map<string, {
          studyMeta: {
            drugName: string;
            company: string;
            drugClass: string;
            trialName: string;
            phase: string;
            hasT2D: boolean;
            isChineseCohort: boolean;
            durationWeeks: number;
            formulation: '皮下注射' | '口服' | '其他';
            frequency: string;
            summary: string;
          };
          doses: DoseData[];
        }>();

        for (const row of standardizedRows) {
          const rawDrug = String(row.drugName || '').trim();
          const rawTrial = String(row.trialName || '').trim();

          // 药物名称和试验名称为必填项
          if (!rawDrug || !rawTrial) {
            continue;
          }

          // 标准化药物名（首字母大写）
          const drugName = rawDrug.charAt(0).toUpperCase() + rawDrug.slice(1);
          const trialName = rawTrial;
          const company = String(row.company || '').trim() || '其他药企';
          const drugClass = String(row.drugClass || '').trim() || 'GLP-1 RA';
          const phase = String(row.phase || '').trim() || 'Phase 3';
          const hasT2D = parseBoolean(row.hasT2D);
          const isChineseCohort = parseBoolean(row.isChineseCohort);
          const durationWeeks = parseWeeks(row.durationWeeks) || 52;
          const formulation = parseFormulation(row.formulation);
          const frequency = String(row.frequency || '').trim() || (formulation === '口服' ? '每日一次' : '每周一次');
          const summary = String(row.summary || '').trim();

          // 剂量数据解析
          const doseStr = String(row.dose || '').trim() || '默认剂量';
          const weightLoss = parsePercent(row.weightLossPercent);
          const nausea = parsePercent(row.nauseaPercent);
          const vomiting = parsePercent(row.vomitingPercent);
          const diarrhea = parsePercent(row.diarrheaPercent);
          const constipation = parsePercent(row.constipationPercent);
          const sae = parsePercent(row.saePercent);

          const doseItem: DoseData = {
            dose: doseStr,
            weightLossPercent: weightLoss,
            nauseaPercent: nausea,
            vomitingPercent: vomiting,
            diarrheaPercent: diarrhea,
            constipationPercent: constipation,
            saePercent: sae,
          };

          // 组合唯一分组键
          const groupKey = `${drugName.toLowerCase()}___${trialName.toLowerCase()}___${hasT2D}___${isChineseCohort}___${durationWeeks}`;

          if (studyGroupMap.has(groupKey)) {
            const existingGroup = studyGroupMap.get(groupKey)!;
            // 避免完全相同的剂量组被重复添加
            const doseExists = existingGroup.doses.some(d => d.dose.toLowerCase() === doseItem.dose.toLowerCase());
            if (!doseExists) {
              existingGroup.doses.push(doseItem);
            } else {
              // 如果已存在相同剂量组，更新其减重与不良反应数值
              const idx = existingGroup.doses.findIndex(d => d.dose.toLowerCase() === doseItem.dose.toLowerCase());
              existingGroup.doses[idx] = doseItem;
            }
            if (summary && !existingGroup.studyMeta.summary) {
              existingGroup.studyMeta.summary = summary;
            }
          } else {
            studyGroupMap.set(groupKey, {
              studyMeta: {
                drugName,
                company,
                drugClass,
                trialName,
                phase,
                hasT2D,
                isChineseCohort,
                durationWeeks,
                formulation,
                frequency,
                summary,
              },
              doses: [doseItem],
            });
          }
        }

        // 3. 组装成 Study 队列列表
        const result: Omit<Study, 'id' | 'createdAt'>[] = [];
        for (const group of studyGroupMap.values()) {
          // 对剂量组按减重幅度排序，最高减重排在后面或保持合理顺序
          group.doses.sort((a, b) => a.weightLossPercent - b.weightLossPercent);

          result.push({
            ...group.studyMeta,
            doses: group.doses,
          });
        }

        if (result.length === 0) {
          throw new Error('未能在 Excel 中提取出有效研究。请确保表格包含“药物名称”和“试验名称”列。');
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('读取 Excel 文件失败，文件可能已损坏或被其他软件占用。'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * 导出当前数据库中的所有研究为 Excel 文件 (.xlsx)
 * 供用户备份、批量编辑后重新上传更新
 */
export const exportStudiesToExcel = (studies: Study[]) => {
  // 展开为扁平的行格式（每个研究的每个剂量组一行，便于在 Excel 中清晰阅读和编辑）
  const rows: Record<string, any>[] = [];

  studies.forEach(study => {
    if (!study.doses || study.doses.length === 0) {
      rows.push({
        '药物名称': study.drugName,
        '研发企业': study.company,
        '靶点机制': study.drugClass,
        '临床试验名称': study.trialName,
        '临床阶段': study.phase,
        '是否伴糖尿病': study.hasT2D ? '是' : '否',
        '是否中国人群': study.isChineseCohort ? '是' : '否',
        '治疗周期(周)': study.durationWeeks,
        '给药途径': study.formulation,
        '给药频次': study.frequency,
        '剂量': '标准剂量',
        '减重百分比(%)': 0,
        '恶心发生率(%)': 0,
        '呕吐发生率(%)': 0,
        '腹泻发生率(%)': 0,
        '便秘发生率(%)': 0,
        'SAE发生率(%)': 0,
        '研究总结': study.summary || '',
      });
    } else {
      study.doses.forEach(dose => {
        rows.push({
          '药物名称': study.drugName,
          '研发企业': study.company,
          '靶点机制': study.drugClass,
          '临床试验名称': study.trialName,
          '临床阶段': study.phase,
          '是否伴糖尿病': study.hasT2D ? '是' : '否',
          '是否中国人群': study.isChineseCohort ? '是' : '否',
          '治疗周期(周)': study.durationWeeks,
          '给药途径': study.formulation,
          '给药频次': study.frequency,
          '剂量': dose.dose,
          '减重百分比(%)': dose.weightLossPercent,
          '恶心发生率(%)': dose.nauseaPercent,
          '呕吐发生率(%)': dose.vomitingPercent,
          '腹泻发生率(%)': dose.diarrheaPercent,
          '便秘发生率(%)': dose.constipationPercent,
          'SAE发生率(%)': dose.saePercent,
          '研究总结': study.summary || '',
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 设置列宽以便在 Excel 中美观展示
  worksheet['!cols'] = [
    { wch: 14 }, // 药物名称
    { wch: 12 }, // 研发企业
    { wch: 16 }, // 靶点机制
    { wch: 22 }, // 临床试验名称
    { wch: 12 }, // 临床阶段
    { wch: 14 }, // 是否伴糖尿病
    { wch: 14 }, // 是否中国人群
    { wch: 14 }, // 治疗周期(周)
    { wch: 12 }, // 给药途径
    { wch: 12 }, // 给药频次
    { wch: 12 }, // 剂量
    { wch: 16 }, // 减重百分比(%)
    { wch: 14 }, // 恶心发生率(%)
    { wch: 14 }, // 呕吐发生率(%)
    { wch: 14 }, // 腹泻发生率(%)
    { wch: 14 }, // 便秘发生率(%)
    { wch: 14 }, // SAE发生率(%)
    { wch: 35 }, // 研究总结
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '临床研究数据');

  // 生成并下载
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `MetaSlim_减重药物临床研究数据_${dateStr}.xlsx`);
};

/**
 * 下载标准 Excel 模板文件 (.xlsx)
 * 包含字段说明和示例研究数据
 */
export const downloadExcelTemplate = () => {
  // 1. 示例数据行
  const sampleRows = [
    {
      '药物名称': 'Tirzepatide',
      '研发企业': '礼来',
      '靶点机制': 'GIP/GLP-1',
      '临床试验名称': 'SURMOUNT-1',
      '临床阶段': 'Phase 3',
      '是否伴糖尿病': '否',
      '是否中国人群': '否',
      '治疗周期(周)': 72,
      '给药途径': '皮下注射',
      '给药频次': '每周一次',
      '剂量': '5mg',
      '减重百分比(%)': 15.0,
      '恶心发生率(%)': 24.6,
      '呕吐发生率(%)': 8.3,
      '腹泻发生率(%)': 18.7,
      '便秘发生率(%)': 16.8,
      'SAE发生率(%)': 6.0,
      '研究总结': 'SURMOUNT-1研究：替尔泊肽治疗非糖尿病肥胖患者，高剂量减重效果显著',
    },
    {
      '药物名称': 'Tirzepatide',
      '研发企业': '礼来',
      '靶点机制': 'GIP/GLP-1',
      '临床试验名称': 'SURMOUNT-1',
      '临床阶段': 'Phase 3',
      '是否伴糖尿病': '否',
      '是否中国人群': '否',
      '治疗周期(周)': 72,
      '给药途径': '皮下注射',
      '给药频次': '每周一次',
      '剂量': '15mg',
      '减重百分比(%)': 20.9,
      '恶心发生率(%)': 31.0,
      '呕吐发生率(%)': 12.2,
      '腹泻发生率(%)': 23.0,
      '便秘发生率(%)': 11.7,
      'SAE发生率(%)': 6.7,
      '研究总结': 'SURMOUNT-1研究：替尔泊肽治疗非糖尿病肥胖患者，高剂量减重效果显著',
    },
    {
      '药物名称': 'Semaglutide',
      '研发企业': '诺和诺德',
      '靶点机制': 'GLP-1 RA',
      '临床试验名称': 'STEP 1',
      '临床阶段': 'Phase 3',
      '是否伴糖尿病': '否',
      '是否中国人群': '否',
      '治疗周期(周)': 68,
      '给药途径': '皮下注射',
      '给药频次': '每周一次',
      '剂量': '2.4mg',
      '减重百分比(%)': 14.9,
      '恶心发生率(%)': 44.2,
      '呕吐发生率(%)': 24.8,
      '腹泻发生率(%)': 31.5,
      '便秘发生率(%)': 23.4,
      'SAE发生率(%)': 9.8,
      '研究总结': 'STEP 1研究：司美格鲁肽2.4mg皮下注射，减重效果显著确切',
    },
    {
      '药物名称': 'Ecnoglutide',
      '研发企业': '辉瑞',
      '靶点机制': 'GLP-1 RA',
      '临床试验名称': 'Phase 2 (中国肥胖)',
      '临床阶段': 'Phase 2',
      '是否伴糖尿病': '否',
      '是否中国人群': '是',
      '治疗周期(周)': 24,
      '给药途径': '皮下注射',
      '给药频次': '每周一次',
      '剂量': '2.4mg',
      '减重百分比(%)': 14.7,
      '恶心发生率(%)': 32.5,
      '呕吐发生率(%)': 12.0,
      '腹泻发生率(%)': 25.0,
      '便秘发生率(%)': 15.0,
      'SAE发生率(%)': 3.5,
      '研究总结': '依诺格鲁肽中国2期减重研究，24周减重14.7%',
    },
  ];

  // 2. 字段详细说明 Sheet
  const instructionRows = [
    { '字段名': '药物名称 (必填)', '说明': '药物通用名，例如 Semaglutide、Tirzepatide、Ecnoglutide 等' },
    { '字段名': '研发企业 (必填)', '说明': '如 礼来、诺和诺德、辉瑞、罗氏、恒瑞医药、信达生物 等' },
    { '字段名': '靶点机制', '说明': '如 GLP-1 RA、GIP/GLP-1、GLP-1/GCGR、GIP/GLP-1/GCG、Amylin 等' },
    { '字段名': '临床试验名称 (必填)', '说明': '临床试验全称或代号，如 STEP 1、SURMOUNT-1 等' },
    { '字段名': '临床阶段', '说明': '如 Phase 1、Phase 2、Phase 3' },
    { '字段名': '是否伴糖尿病', '说明': '填“是”或“否”（有2型糖尿病填“是”，无糖尿病肥胖填“否”）' },
    { '字段名': '是否中国人群', '说明': '填“是”或“否”（试验是否为中国人群队列）' },
    { '字段名': '治疗周期(周)', '说明': '纯数字周数，如 24、48、52、68、72' },
    { '字段名': '给药途径', '说明': '填“皮下注射”或“口服”' },
    { '字段名': '给药频次', '说明': '如“每周一次”、“每日一次”' },
    { '字段名': '剂量', '说明': '该组别的具体剂量，如 2.4mg、15mg 等。同一试验可有多行不同剂量，系统会自动合并为一个研究' },
    { '字段名': '减重百分比(%)', '说明': '平均体重下降百分比（直接填数字即可，如 15.5 或 20.9）' },
    { '字段名': '恶心/呕吐/腹泻/便秘(%)', '说明': '各消化道不良反应发生率百分比（填数字，如 25.4）' },
    { '字段名': 'SAE发生率(%)', '说明': '严重不良事件 (SAE) 发生率（填数字，如 5.2）' },
    { '字段名': '研究总结', '说明': '临床试验总结概述说明' },
  ];

  const workbook = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.json_to_sheet(sampleRows);
  dataSheet['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 12 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, dataSheet, '临床研究数据');

  const instructionSheet = XLSX.utils.json_to_sheet(instructionRows);
  instructionSheet['!cols'] = [{ wch: 24 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, '填表说明');

  XLSX.writeFile(workbook, 'MetaSlim_减重药物临床研究数据导入模板.xlsx');
};
