import { Study } from "./types";

export const MOCK_STUDIES: Study[] = [
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
    summary: "在肥胖或超重且无糖尿病的成人中，Tirzepatide 显著降低了体重。",
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
    summary: "Semaglutide 2.4mg 在超重或肥胖成人中表现出显著的减重效果。",
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
  {
    id: "mock-3",
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
    summary: "Mazdutide 在中国超重或肥胖成人中显著降低体重，且安全性良好。",
    createdAt: Date.now() - 3000000,
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
  }
];
