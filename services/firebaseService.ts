import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  getDocs,
  writeBatch,
  updateDoc,
  Firestore
} from "firebase/firestore";
import { Study } from "../types";
import { firebaseConfig } from "../appCredentials"; // <-- 从新的配置文件导入
import { MOCK_STUDIES } from "../mockData";

let db: Firestore | null = null;

// 本地存储键名
const LOCAL_STORAGE_KEY = "metaslim_local_studies";

// 获取本地存储的数据
const getLocalStudies = (): Study[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse local studies:", e);
    }
  }
  return MOCK_STUDIES;
};

// 保存到本地存储
const saveLocalStudies = (studies: Study[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(studies));
};

// 检查是否所有必需的配置值都已设置
if (firebaseConfig.apiKey && firebaseConfig.projectId && !firebaseConfig.apiKey.includes("VITE_")) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

const COLLECTION_NAME = "weight_loss_studies";

// 写入操作的辅助函数
const isFirebaseEnabled = () => !!db;

export const addStudy = async (studyData: Omit<Study, 'id' | 'createdAt'>) => {
  if (isFirebaseEnabled()) {
    try {
      await addDoc(collection(db!, COLLECTION_NAME), {
        ...studyData,
        createdAt: Date.now()
      });
      return;
    } catch (e) {
      console.error("Error adding to Firebase: ", e);
    }
  }
  
  // 本地回退
  const studies = getLocalStudies();
  const newStudy: Study = {
    ...studyData,
    id: `local-${Date.now()}`,
    createdAt: Date.now()
  };
  saveLocalStudies([newStudy, ...studies]);
  window.dispatchEvent(new Event('local-studies-changed'));
};

export const updateStudy = async (id: string, studyData: Partial<Omit<Study, 'id'>>) => {
  if (isFirebaseEnabled()) {
    try {
      const studyRef = doc(db!, COLLECTION_NAME, id);
      await updateDoc(studyRef, studyData);
      return;
    } catch (e) {
      console.error("Error updating Firebase: ", e);
    }
  }

  // 本地回退
  const studies = getLocalStudies();
  const index = studies.findIndex(s => s.id === id);
  if (index !== -1) {
    studies[index] = { ...studies[index], ...studyData };
    saveLocalStudies(studies);
    window.dispatchEvent(new Event('local-studies-changed'));
  }
};

export const deleteStudy = async (id: string) => {
  if (isFirebaseEnabled()) {
    try {
      await deleteDoc(doc(db!, COLLECTION_NAME, id));
      return;
    } catch (e) {
      console.error("Error deleting from Firebase: ", e);
    }
  }

  // 本地回退
  const studies = getLocalStudies();
  const filtered = studies.filter(s => s.id !== id);
  saveLocalStudies(filtered);
  window.dispatchEvent(new Event('local-studies-changed'));
};

export const deleteSelectedStudies = async (ids: string[]) => {
  if (isFirebaseEnabled()) {
    try {
      const batch = writeBatch(db!);
      ids.forEach((id) => {
        const docRef = doc(db!, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
      return;
    } catch (e) {
      console.error("Error deleting selected from Firebase: ", e);
    }
  }

  // 本地回退
  const studies = getLocalStudies();
  const filtered = studies.filter(s => !ids.includes(s.id));
  saveLocalStudies(filtered);
  window.dispatchEvent(new Event('local-studies-changed'));
};

export const deleteAllStudies = async () => {
  if (isFirebaseEnabled()) {
    try {
      const q = query(collection(db!, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db!);
      querySnapshot.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      return;
    } catch (e) {
      console.error("Error deleting all from Firebase: ", e);
    }
  }

  // 本地回退
  saveLocalStudies([]);
  window.dispatchEvent(new Event('local-studies-changed'));
};

const normalizeCompany = (company: string): string => {
  if (!company) return "";
  const c = company.trim().toUpperCase();
  if (c.includes('LILLY') || c.includes('礼来')) return 'Eli Lilly';
  if (c.includes('NOVO') || c.includes('诺和诺德')) return 'Novo Nordisk';
  if (c.includes('INNOVENT') || c.includes('信达')) return 'Innovent';
  if (c.includes('AMGEN') || c.includes('安进')) return 'Amgen';
  if (c.includes('BOEHRINGER') || c.includes('BI') || c.includes('勃林格')) return 'Boehringer Ingelheim';
  if (c.includes('ASTRAZENECA') || c.includes('AZ') || c.includes('阿斯利康')) return 'AstraZeneca';
  if (c.includes('HENGRUI') || c.includes('恒瑞')) return 'Hengrui';
  if (c.includes('PFIZER') || c.includes('辉瑞')) return 'Pfizer';
  if (c.includes('ROCHE') || c.includes('罗氏')) return 'Roche';
  if (c.includes('SANOFI') || c.includes('赛诺菲')) return 'Sanofi';
  return company.trim();
};

export const subscribeToStudies = (callback: (studies: Study[]) => void) => {
  if (!isFirebaseEnabled()) {
    // 提供初始数据并监听本地变更
    const update = () => {
      const studies = getLocalStudies().map(s => {
        const drugName = s.drugName ? (s.drugName.charAt(0).toUpperCase() + s.drugName.slice(1).toLowerCase()) : s.drugName;
        let company = s.company;
        if (drugName && drugName.toLowerCase().includes('ecnoglutide')) {
          company = 'Pfizer';
        } else {
          company = normalizeCompany(company);
        }
        return { ...s, drugName, company };
      });
      callback(studies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
    };
    update();
    window.addEventListener('local-studies-changed', update);
    return () => window.removeEventListener('local-studies-changed', update);
  }

  const q = query(collection(db!, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const studies: Study[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      let drugName = data.drugName;
      if (drugName && typeof drugName === 'string') {
          drugName = drugName.charAt(0).toUpperCase() + drugName.slice(1).toLowerCase();
      }
      
      let company = data.company;
      // 特殊规则：Ecnoglutide 属于辉瑞 (Pfizer)
      if (drugName && drugName.toLowerCase().includes('ecnoglutide')) {
          company = 'Pfizer';
      } else if (company && typeof company === 'string') {
          company = normalizeCompany(company);
      }
      
      studies.push({ id: doc.id, ...data, drugName, company } as Study);
    });

    // 如果 Firebase 中没有数据，则显示模拟数据，方便预览和编辑
    if (studies.length === 0) {
      callback(MOCK_STUDIES.map(s => {
        const drugName = s.drugName ? (s.drugName.charAt(0).toUpperCase() + s.drugName.slice(1).toLowerCase()) : s.drugName;
        let company = s.company;
        if (drugName && drugName.toLowerCase().includes('ecnoglutide')) {
          company = 'Pfizer';
        } else {
          company = normalizeCompany(company);
        }
        return { ...s, drugName, company };
      }));
    } else {
      studies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(studies);
    }
  }, (error) => {
      console.error("Firebase subscription error: ", error);
      // 发生错误时尝试回退到本地数据
      const studies = getLocalStudies().map(s => {
        const drugName = s.drugName ? (s.drugName.charAt(0).toUpperCase() + s.drugName.slice(1).toLowerCase()) : s.drugName;
        let company = s.company;
        if (drugName && drugName.toLowerCase().includes('ecnoglutide')) {
          company = 'Pfizer';
        } else {
          company = normalizeCompany(company);
        }
        return { ...s, drugName, company };
      });
      callback(studies);
  });
};
