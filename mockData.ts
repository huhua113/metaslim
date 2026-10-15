import { Study } from "./types";

export const MOCK_STUDIES: Study[] = [
  // 1. GLP-1 + GIP 双受体激动剂 - 礼来 替尔泊肽 (红色系)
  {
    id: "mock-1",
    drugName: "Tirzepatide",
    drugClass: "GIP/GLP-1 RA",
    company: "Eli Lilly",
    trialName: "SURMOUNT-1",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 72,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "在肥胖或超重且无糖尿病成人中，Tirzepatide 展现出突破性最高达 20.9% 的平均减重效果。",
    createdAt: Date.now() - 1000000,
    doses: [
      {
        dose: "5mg",
        weightLossPercent: 15.0,
        nauseaPercent: 24.6,
        vomitingPercent: 8.3,
        diarrheaPercent: 18.7,
        constipationPercent: 16.8,
        saePercent: 2.6
      },
      {
        dose: "10mg",
        weightLossPercent: 19.5,
        nauseaPercent: 33.3,
        vomitingPercent: 10.7,
        diarrheaPercent: 21.2,
        constipationPercent: 17.1,
        saePercent: 2.6
      },
      {
        dose: "15mg",
        weightLossPercent: 20.9,
        nauseaPercent: 31.0,
        vomitingPercent: 12.2,
        diarrheaPercent: 23.0,
        constipationPercent: 11.7,
        saePercent: 2.6
      }
    ]
  },

  // 2. GLP-1 注射剂 - 诺和诺德 司美格鲁肽 (蓝色系)
  {
    id: "mock-2",
    drugName: "Semaglutide",
    drugClass: "GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "STEP 1",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 68,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "Semaglutide 2.4mg 在超重或肥胖成人中表现出确切且显著的长期减重疗效。",
    createdAt: Date.now() - 2000000,
    doses: [
      {
        dose: "2.4mg",
        weightLossPercent: 14.9,
        nauseaPercent: 44.2,
        vomitingPercent: 24.8,
        diarrheaPercent: 31.5,
        constipationPercent: 23.4,
        saePercent: 9.8
      }
    ]
  },

  // 3. GLP-1 注射剂 - 辉瑞 依诺格鲁肽 Ecnoglutide (绿色系)
  {
    id: "mock-3",
    drugName: "Ecnoglutide",
    drugClass: "GLP-1 RA",
    company: "Pfizer",
    trialName: "Phase 2 (Lancet D&E)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 26,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "Ecnoglutide (先为达/辉瑞) 偏向型 GLP-1 激动剂在超重中国受试者中展现出优异耐受性与快速降重。",
    createdAt: Date.now() - 2500000,
    doses: [
      {
        dose: "1.2mg",
        weightLossPercent: 11.5,
        nauseaPercent: 22.0,
        vomitingPercent: 7.0,
        diarrheaPercent: 15.0,
        constipationPercent: 11.0,
        saePercent: 1.5
      },
      {
        dose: "1.8mg",
        weightLossPercent: 13.2,
        nauseaPercent: 25.0,
        vomitingPercent: 9.0,
        diarrheaPercent: 17.0,
        constipationPercent: 12.0,
        saePercent: 1.8
      },
      {
        dose: "2.4mg",
        weightLossPercent: 14.7,
        nauseaPercent: 28.0,
        vomitingPercent: 11.0,
        diarrheaPercent: 19.0,
        constipationPercent: 13.0,
        saePercent: 2.0
      }
    ]
  },

  // 4. GLP-1 口服小分子 - 礼来 奥福格列酮 Orforglipron (红色系)
  {
    id: "mock-4",
    drugName: "Orforglipron",
    drugClass: "GLP-1 RA",
    company: "Eli Lilly",
    trialName: "Phase 2 (NEJM)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 36,
    formulation: "口服",
    frequency: "每日一次",
    summary: "每日口服一次非肽类小分子 GLP-1 受体激动剂，摆脱给药与进食限制，减重效果显著。",
    createdAt: Date.now() - 3000000,
    doses: [
      {
        dose: "12mg",
        weightLossPercent: 9.4,
        nauseaPercent: 37.0,
        vomitingPercent: 10.0,
        diarrheaPercent: 22.0,
        constipationPercent: 16.0,
        saePercent: 2.0
      },
      {
        dose: "24mg",
        weightLossPercent: 12.5,
        nauseaPercent: 42.0,
        vomitingPercent: 11.0,
        diarrheaPercent: 24.0,
        constipationPercent: 17.0,
        saePercent: 2.2
      },
      {
        dose: "36mg",
        weightLossPercent: 13.5,
        nauseaPercent: 44.0,
        vomitingPercent: 13.0,
        diarrheaPercent: 26.0,
        constipationPercent: 19.0,
        saePercent: 2.5
      },
      {
        dose: "45mg",
        weightLossPercent: 14.7,
        nauseaPercent: 46.0,
        vomitingPercent: 14.0,
        diarrheaPercent: 27.0,
        constipationPercent: 20.0,
        saePercent: 2.8
      }
    ]
  },

  // 5. GLP-1 口服多肽 - 诺和诺德 口服司美格鲁肽 (蓝色系)
  {
    id: "mock-5",
    drugName: "Oral Semaglutide",
    drugClass: "GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "OASIS 1",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 68,
    formulation: "口服",
    frequency: "每日一次",
    summary: "每日口服 50mg 司美格鲁肽在 68 周达到与皮下注射相当的 15.1% 平均体重降幅。",
    createdAt: Date.now() - 3500000,
    doses: [
      {
        dose: "50mg",
        weightLossPercent: 15.1,
        nauseaPercent: 45.0,
        vomitingPercent: 19.0,
        diarrheaPercent: 31.0,
        constipationPercent: 20.0,
        saePercent: 7.0
      }
    ]
  },

  // 6. GLP-1 口服小分子 - 辉瑞 Danuglipron (绿色系)
  {
    id: "mock-6",
    drugName: "Danuglipron",
    drugClass: "GLP-1 RA",
    company: "Pfizer",
    trialName: "Phase 2 (JAMA Netw)",
    phase: "Phase 2",
    hasT2D: true,
    isChineseCohort: false,
    durationWeeks: 16,
    formulation: "口服",
    frequency: "每日两次",
    summary: "辉瑞口服小分子 GLP-1 激动剂在 16 周达成 5.4% 降重及良好血糖控制。",
    createdAt: Date.now() - 3800000,
    doses: [
      {
        dose: "120mg bid",
        weightLossPercent: 5.4,
        nauseaPercent: 35.0,
        vomitingPercent: 14.0,
        diarrheaPercent: 22.0,
        constipationPercent: 12.0,
        saePercent: 1.8
      }
    ]
  },

  // 7. GLP-1 + GIP 双受体激动剂 - 罗氏 CT-388 (黄色系)
  {
    id: "mock-7",
    drugName: "CT-388",
    drugClass: "GIP/GLP-1 RA",
    company: "Roche",
    trialName: "Phase 1b (Carmot)",
    phase: "Phase 1",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 24,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "罗氏旗下新一代 GLP-1/GIP 双激动剂，24 周展现高达 18.8% 的强劲降重效果。",
    createdAt: Date.now() - 4000000,
    doses: [
      {
        dose: "递增剂量组",
        weightLossPercent: 18.8,
        nauseaPercent: 32.0,
        vomitingPercent: 11.0,
        diarrheaPercent: 17.0,
        constipationPercent: 10.0,
        saePercent: 1.0
      }
    ]
  },

  // 8. GLP-1 口服小分子 - 罗氏 CT-996 (黄色系)
  {
    id: "mock-8",
    drugName: "CT-996",
    drugClass: "GLP-1 RA",
    company: "Roche",
    trialName: "Phase 1 (Carmot)",
    phase: "Phase 1",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 4,
    formulation: "口服",
    frequency: "每日一次",
    summary: "罗氏小分子口服 GLP-1 激动剂，早期仅用 4 周即实现 6.1% 的体重大幅下降。",
    createdAt: Date.now() - 4200000,
    doses: [
      {
        dose: "口服每日一次",
        weightLossPercent: 6.1,
        nauseaPercent: 25.0,
        vomitingPercent: 8.0,
        diarrheaPercent: 14.0,
        constipationPercent: 8.0,
        saePercent: 0.0
      }
    ]
  },

  // 9. GLP-1 + GIP 双受体激动剂 - 恒瑞医药 HRS9531 (咖色系)
  {
    id: "mock-9",
    drugName: "HRS9531",
    drugClass: "GIP/GLP-1 RA",
    company: "Hengrui",
    trialName: "Phase 2 (ADA 2024)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 24,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "恒瑞医药自主研发 GIP/GLP-1 双受体激动剂，在中国超重肥胖人群 24 周最高剂量降重达 16.8%。",
    createdAt: Date.now() - 4500000,
    doses: [
      {
        dose: "3.6mg",
        weightLossPercent: 14.2,
        nauseaPercent: 26.0,
        vomitingPercent: 9.0,
        diarrheaPercent: 18.0,
        constipationPercent: 14.0,
        saePercent: 1.2
      },
      {
        dose: "5.4mg",
        weightLossPercent: 16.8,
        nauseaPercent: 30.0,
        vomitingPercent: 10.0,
        diarrheaPercent: 20.0,
        constipationPercent: 15.0,
        saePercent: 1.5
      }
    ]
  },

  // 10. GLP-1 口服小分子 - 恒瑞医药 HRS-7535 (咖色系)
  {
    id: "mock-10",
    drugName: "HRS-7535",
    drugClass: "GLP-1 RA",
    company: "Hengrui",
    trialName: "Phase 2 (Lancet D&E)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 12,
    formulation: "口服",
    frequency: "每日一次",
    summary: "恒瑞口服小分子非肽类 GLP-1 受体激动剂，12 周平均体重降幅达 8.5%，耐受性佳。",
    createdAt: Date.now() - 4800000,
    doses: [
      {
        dose: "120mg",
        weightLossPercent: 8.5,
        nauseaPercent: 24.0,
        vomitingPercent: 6.0,
        diarrheaPercent: 16.0,
        constipationPercent: 10.0,
        saePercent: 0.8
      }
    ]
  },

  // 11. GLP-1 + GCG 双受体激动剂 - 信达生物 玛仕度肽 Mazdutide (紫色系)
  {
    id: "mock-11",
    drugName: "Mazdutide",
    drugClass: "GLP-1/GCGR",
    company: "Innovent",
    trialName: "GLORY-1",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 48,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "Mazdutide 双重激活 GLP-1 和胰高血糖素受体，在中国人群中兼具深度减重与肝脂肪消除。",
    createdAt: Date.now() - 5000000,
    doses: [
      {
        dose: "4mg",
        weightLossPercent: 12.1,
        nauseaPercent: 15.0,
        vomitingPercent: 5.0,
        diarrheaPercent: 10.0,
        constipationPercent: 8.0,
        saePercent: 1.0
      },
      {
        dose: "6mg",
        weightLossPercent: 14.5,
        nauseaPercent: 18.0,
        vomitingPercent: 7.0,
        diarrheaPercent: 12.0,
        constipationPercent: 10.0,
        saePercent: 1.2
      }
    ]
  },

  // 12. GLP-1 + GCG 双受体激动剂 - 勃林格殷格翰 索沃杜肽 Survodutide (橙色系)
  {
    id: "mock-12",
    drugName: "Survodutide",
    drugClass: "GLP-1/GCGR",
    company: "Boehringer Ingelheim",
    trialName: "Phase 2 (NEJM 2024)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 46,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "Survodutide (BI 456906) 46 周减重幅度高达 18.7%，并对 MASH 伴纤维化患者带来显著改善。",
    createdAt: Date.now() - 5500000,
    doses: [
      {
        dose: "2.4mg",
        weightLossPercent: 13.0,
        nauseaPercent: 38.0,
        vomitingPercent: 18.0,
        diarrheaPercent: 24.0,
        constipationPercent: 16.0,
        saePercent: 3.2
      },
      {
        dose: "4.8mg",
        weightLossPercent: 18.7,
        nauseaPercent: 44.0,
        vomitingPercent: 22.0,
        diarrheaPercent: 29.0,
        constipationPercent: 19.0,
        saePercent: 4.2
      }
    ]
  },

  // 13. 三靶点受体激动剂 - 礼来 瑞他鲁肽 Retatrutide (红色系)
  {
    id: "mock-13",
    drugName: "Retatrutide",
    drugClass: "Triple Agonist (GIP/GLP-1/GCG)",
    company: "Eli Lilly",
    trialName: "Phase 2 (NEJM 2023)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 48,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "三靶点激动剂 Retatrutide 在 48 周最高剂量下达成前所未有的 24.2% 平均降重，重塑药物减重上限。",
    createdAt: Date.now() - 6000000,
    doses: [
      {
        dose: "4mg",
        weightLossPercent: 16.3,
        nauseaPercent: 22.0,
        vomitingPercent: 6.0,
        diarrheaPercent: 15.0,
        constipationPercent: 12.0,
        saePercent: 2.0
      },
      {
        dose: "8mg",
        weightLossPercent: 22.8,
        nauseaPercent: 35.0,
        vomitingPercent: 12.0,
        diarrheaPercent: 20.0,
        constipationPercent: 15.0,
        saePercent: 3.0
      },
      {
        dose: "12mg",
        weightLossPercent: 24.2,
        nauseaPercent: 45.0,
        vomitingPercent: 15.0,
        diarrheaPercent: 22.0,
        constipationPercent: 18.0,
        saePercent: 3.5
      }
    ]
  },

  // 14. 胰淀素+ 复方激动剂 - 诺和诺德 卡格列肽+司美格鲁肽 CagriSema (蓝色系)
  // 14-a. REDEFINE 1 关键 III 期（非糖尿病肥胖，68周）
  {
    id: "mock-14-redefine-1",
    drugName: "CagriSema",
    drugClass: "Amylin/GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "REDEFINE 1 (Phase 3)",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 68,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "诺和诺德全球关键III期REDEFINE 1研究（N=3417，基线体重106.9kg，非糖尿病超重/肥胖）：评估每周一次CagriSema (2.4mg/2.4mg)。68周试验依从人群平均减重达 22.7%（意向性分析 20.4%），40.4%受试者减重≥25%，60%减重≥20%，23%减重≥30%。",
    createdAt: Date.now() - 6100000,
    doses: [
      {
        dose: "2.4mg/2.4mg",
        weightLossPercent: 22.7,
        nauseaPercent: 55.0,
        vomitingPercent: 26.1,
        diarrheaPercent: 24.0,
        constipationPercent: 30.7,
        saePercent: 4.0
      }
    ]
  },

  // 14-b. REDEFINE 2 关键 III 期（伴2型糖尿病超重/肥胖，68周）
  {
    id: "mock-14-redefine-2",
    drugName: "CagriSema",
    drugClass: "Amylin/GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "REDEFINE 2 (Phase 3)",
    phase: "Phase 3",
    hasT2D: true,
    isChineseCohort: false,
    durationWeeks: 68,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "诺和诺德关键III期REDEFINE 2研究（N=1206，2型糖尿病伴超重/肥胖）：评估每周一次CagriSema在T2D人群中的疗效。68周试验依从人群平均减重达 15.7%（意向性分析 13.7%），89.7%患者减重≥5%，74%患者HbA1c降至≤6.5%。",
    createdAt: Date.now() - 6200000,
    doses: [
      {
        dose: "2.4mg/2.4mg",
        weightLossPercent: 15.7,
        nauseaPercent: 35.0,
        vomitingPercent: 13.0,
        diarrheaPercent: 20.0,
        constipationPercent: 16.0,
        saePercent: 4.5
      }
    ]
  },

  // 14-c. REDEFINE 4 关键 III 期头对头试验（vs 替尔泊肽 15mg，84周）
  {
    id: "mock-14-redefine-4",
    drugName: "CagriSema",
    drugClass: "Amylin/GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "REDEFINE 4 (头对头 vs 替尔泊肽)",
    phase: "Phase 3",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 84,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "为期84周的开放标签III期头对头优效性研究（N=809，肥胖合并合并症）：直接对标礼来替尔泊肽15mg。CagriSema达成 23.0% 减重（意向性分析 20.2%），替尔泊肽达成 25.5%，展现长达84周的持久强劲减重效果与耐受性。",
    createdAt: Date.now() - 6300000,
    doses: [
      {
        dose: "2.4mg/2.4mg",
        weightLossPercent: 23.0,
        nauseaPercent: 48.0,
        vomitingPercent: 22.0,
        diarrheaPercent: 23.0,
        constipationPercent: 25.0,
        saePercent: 4.8
      }
    ]
  },

  // 14-d. Phase 2 早期二期临床研究（Lancet）
  {
    id: "mock-14",
    drugName: "CagriSema",
    drugClass: "Amylin/GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "Phase 2 (Lancet)",
    phase: "Phase 2",
    hasT2D: true,
    isChineseCohort: false,
    durationWeeks: 32,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "胰淀素类似物 Cagrilintide 协同 GLP-1 司美格鲁肽，在 T2D 患者中 32 周减重达 15.6%。",
    createdAt: Date.now() - 6500000,
    doses: [
      {
        dose: "2.4mg/2.4mg",
        weightLossPercent: 15.6,
        nauseaPercent: 32.0,
        vomitingPercent: 11.0,
        diarrheaPercent: 21.0,
        constipationPercent: 15.0,
        saePercent: 3.5
      }
    ]
  },

  // 15. 胰淀素+ 口服双激动剂 - 诺和诺德 艾米克雷汀 Amycretin (蓝色系)
  {
    id: "mock-15",
    drugName: "Amycretin",
    drugClass: "Amylin/GLP-1 RA",
    company: "Novo Nordisk",
    trialName: "Phase 1 (EASD)",
    phase: "Phase 1",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 12,
    formulation: "口服",
    frequency: "每日一次",
    summary: "单分子口服 GLP-1 与胰淀素双重激动剂，在 12 周早期临床中即达成 13.1% 的显著降重。",
    createdAt: Date.now() - 7000000,
    doses: [
      {
        dose: "50mg",
        weightLossPercent: 13.1,
        nauseaPercent: 28.0,
        vomitingPercent: 8.0,
        diarrheaPercent: 14.0,
        constipationPercent: 10.0,
        saePercent: 1.0
      }
    ]
  },

  // 16. 其他机制 (GIPR拮抗/GLP-1激动) - 安进 MariTide / AMG 133 (青色系)
  {
    id: "mock-16",
    drugName: "MariTide (AMG 133)",
    drugClass: "GIPR Antagonist / GLP-1 RA",
    company: "Amgen",
    trialName: "Phase 2 (Nat Med 2024)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: false,
    durationWeeks: 52,
    formulation: "皮下注射",
    frequency: "每月一次",
    summary: "安进抗体融合创新双机制，每月注射一次，52 周体重下降达 20.0%。",
    createdAt: Date.now() - 7500000,
    doses: [
      {
        dose: "420mg Q4W",
        weightLossPercent: 20.0,
        nauseaPercent: 39.0,
        vomitingPercent: 18.0,
        diarrheaPercent: 19.0,
        constipationPercent: 11.0,
        saePercent: 3.0
      }
    ]
  },

  // 17. 三靶点受体激动剂 - 联邦制药 / 诺和诺德 UBT251 / UTB251 (GLP-1/GIP/GCG，靛蓝系)
  // 17-a. 中国超重/肥胖 Phase 2 关键临床研究（24周）
  {
    id: "mock-17-ubt251-phase2-obesity",
    drugName: "UBT251 (UTB251)",
    drugClass: "GLP-1/GIP/GCG",
    company: "United Laboratories",
    trialName: "Phase 2 (中国肥胖/超重)",
    phase: "Phase 2",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 24,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "联邦制药研发、诺和诺德全球合作的长效三靶点激动剂。中国205例超重/肥胖II期临床（基线BMI 33.1），24周6mg组减重高达 19.7%（-17.5kg，安慰剂-2.0%），对标瑞他鲁肽；腰围、血压、血脂全面改善，无任何因不良反应导致的退出。",
    createdAt: Date.now() - 5800000,
    doses: [
      {
        dose: "6mg",
        weightLossPercent: 19.7,
        nauseaPercent: 32.0,
        vomitingPercent: 9.5,
        diarrheaPercent: 18.0,
        constipationPercent: 14.0,
        saePercent: 0.0
      },
      {
        dose: "4mg",
        weightLossPercent: 15.8,
        nauseaPercent: 25.0,
        vomitingPercent: 7.0,
        diarrheaPercent: 15.0,
        constipationPercent: 12.0,
        saePercent: 0.0
      },
      {
        dose: "2mg",
        weightLossPercent: 11.5,
        nauseaPercent: 18.0,
        vomitingPercent: 4.0,
        diarrheaPercent: 12.0,
        constipationPercent: 10.0,
        saePercent: 0.0
      }
    ]
  },

  // 17-b. 中国2型糖尿病 Phase 2 临床研究（24周）
  {
    id: "mock-17-ubt251-phase2-t2d",
    drugName: "UBT251 (UTB251)",
    drugClass: "GLP-1/GIP/GCG",
    company: "United Laboratories",
    trialName: "Phase 2 (中国T2D)",
    phase: "Phase 2",
    hasT2D: true,
    isChineseCohort: true,
    durationWeeks: 24,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "中国2型糖尿病II期研究：24周6mg组实现 HbA1c 显著降低达 2.16%，减重达 9.8%，疗效显著击败司美格鲁肽1mg阳性对照组（HbA1c降1.77%，减重4.8%）及安慰剂组。",
    createdAt: Date.now() - 5900000,
    doses: [
      {
        dose: "6mg",
        weightLossPercent: 9.8,
        nauseaPercent: 28.0,
        vomitingPercent: 8.0,
        diarrheaPercent: 16.0,
        constipationPercent: 12.0,
        saePercent: 1.0
      },
      {
        dose: "4mg",
        weightLossPercent: 7.5,
        nauseaPercent: 20.0,
        vomitingPercent: 5.0,
        diarrheaPercent: 13.0,
        constipationPercent: 10.0,
        saePercent: 0.5
      },
      {
        dose: "2mg",
        weightLossPercent: 5.2,
        nauseaPercent: 14.0,
        vomitingPercent: 3.0,
        diarrheaPercent: 10.0,
        constipationPercent: 8.0,
        saePercent: 0.0
      }
    ]
  },

  // 17-c. Phase 1b 多次递增剂量试验（MAD，12周）
  {
    id: "mock-17-ubt251-phase1b-mad",
    drugName: "UBT251 (UTB251)",
    drugClass: "GLP-1/GIP/GCG",
    company: "United Laboratories",
    trialName: "Phase 1b (MAD)",
    phase: "Phase 1",
    hasT2D: false,
    isChineseCohort: true,
    durationWeeks: 12,
    formulation: "皮下注射",
    frequency: "每周一次",
    summary: "中国首个进入临床的三靶点GLP-1/GIP/GCG激动剂多次剂量递增（MAD）早期研究，超重或肥胖受试者在仅12周内减重达 8.96kg ~ 13.48kg（-13.5%），展现出强劲的早期快速起效特征。",
    createdAt: Date.now() - 6000000,
    doses: [
      {
        dose: "6mg",
        weightLossPercent: 13.5,
        nauseaPercent: 30.0,
        vomitingPercent: 8.0,
        diarrheaPercent: 15.0,
        constipationPercent: 10.0,
        saePercent: 0.0
      },
      {
        dose: "3mg",
        weightLossPercent: 9.8,
        nauseaPercent: 20.0,
        vomitingPercent: 5.0,
        diarrheaPercent: 12.0,
        constipationPercent: 8.0,
        saePercent: 0.0
      },
      {
        dose: "1mg",
        weightLossPercent: 6.2,
        nauseaPercent: 12.0,
        vomitingPercent: 2.0,
        diarrheaPercent: 8.0,
        constipationPercent: 6.0,
        saePercent: 0.0
      }
    ]
  }
];
