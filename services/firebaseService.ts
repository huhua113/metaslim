import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocs,
  writeBatch,
  updateDoc,
  Firestore
} from "firebase/firestore";
import { Study } from "../types";
import { firebaseConfig } from "../appCredentials"; // <-- 从新的配置文件导入

let db: Firestore | null = null;

// 检查是否所有必需的配置值都已设置
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    const errorMsg = "Firebase 初始化失败。请检查您的 `appCredentials.ts` 文件中的配置是否正确。";
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `<div style="padding: 2rem; text-align: center; background-color: #FFFBEB; border: 1px solid #FEE2B3; border-radius: 0.5rem; margin: 2rem; color: #92400E;">
        <h2 style="font-size: 1.25rem; font-weight: bold;">配置错误</h2>
        <p style="margin-top: 0.5rem;">${errorMsg}</p>
        <p style="margin-top: 1rem; font-size: 0.875rem; color: #B45309;">具体错误信息请查看浏览器控制台。</p>
      </div>`;
    }
    throw new Error(errorMsg);
  }
} else {
    const errorMsg = "Firebase 配置缺失。请在 `appCredentials.ts` 文件中填写您的 Firebase 项目信息以启用数据库功能。";
    console.warn(errorMsg);
    // 在 UI 中显示一个非阻塞的警告
    setTimeout(() => {
        const warningEl = document.createElement('div');
        warningEl.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background-color:#FFFBEB;color:#92400E;padding:12px 20px;border-radius:8px;border:1px solid #FEE2B3;font-size:14px;z-index:1000;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
        warningEl.textContent = errorMsg;
        document.body.appendChild(warningEl);
        setTimeout(() => warningEl.remove(), 8000);
    }, 1000);
}


const COLLECTION_NAME = "weight_loss_studies";

// 写入操作的辅助函数，确保数据库已连接。
const ensureDbConnected = () => {
    if (!db) {
        const message = "数据库未连接。请检查 `appCredentials.ts` 中的配置并刷新页面。";
        alert(message);
        throw new Error(message);
    }
    return db;
}

export const addStudy = async (studyData: Omit<Study, 'id' | 'createdAt'>) => {
  const dbInstance = ensureDbConnected();
  try {
    await addDoc(collection(dbInstance, COLLECTION_NAME), {
      ...studyData,
      createdAt: Date.now()
    });
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const updateStudy = async (id: string, studyData: Partial<Omit<Study, 'id'>>) => {
  const dbInstance = ensureDbConnected();
  try {
    const studyRef = doc(dbInstance, COLLECTION_NAME, id);
    await updateDoc(studyRef, studyData);
  } catch (e) {
    console.error("Error updating document: ", e);
    throw e;
  }
};

export const deleteStudy = async (id: string) => {
  const dbInstance = ensureDbConnected();
  try {
    await deleteDoc(doc(dbInstance, COLLECTION_NAME, id));
  } catch (e) {
    console.error("Error deleting document: ", e);
    throw e;
  }
};

export const deleteSelectedStudies = async (ids: string[]) => {
  if (ids.length === 0) return;
  const dbInstance = ensureDbConnected();
  try {
    const batch = writeBatch(dbInstance);
    ids.forEach((id) => {
      const docRef = doc(dbInstance, COLLECTION_NAME, id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (e) {
    console.error("Error deleting selected documents: ", e);
    throw e;
  }
};

export const deleteAllStudies = async () => {
  const dbInstance = ensureDbConnected();
  try {
    const q = query(collection(dbInstance, COLLECTION_NAME));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return;
    }

    const batch = writeBatch(dbInstance);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

  } catch (e) {
    console.error("Error deleting all documents: ", e);
    throw e;
  }
};

export const subscribeToStudies = (callback: (studies: Study[]) => void) => {
  if (!db) {
      console.warn("Firebase not configured. Returning empty data for subscription.");
      callback([]);
      return () => {}; // 返回一个无操作的取消订阅函数
  }
  // 暂时移除 orderBy("createdAt", "desc") 以避免因缺少索引导致的数据无法加载问题
  const q = query(collection(db, COLLECTION_NAME));
  return onSnapshot(q, (snapshot) => {
    const studies: Study[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.drugName && typeof data.drugName === 'string') {
          data.drugName = data.drugName.charAt(0).toUpperCase() + data.drugName.slice(1).toLowerCase();
      }
      studies.push({ id: doc.id, ...data } as Study);
    });
    // 在客户端进行排序
    studies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(studies);
  },
  (error) => {
      console.error("Firebase subscription error: ", error);
      alert("无法从数据库获取实时数据。部分功能可能无法使用。");
      callback([]); // 错误时重置为空
  });
};
