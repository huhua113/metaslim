// --- 应用凭证配置文件 ---
//
// ⚠️ **安全警告:** 此文件包含敏感信息。
// **绝对不要** 将此文件提交到版本控制系统 (例如 GitHub)。
// 如果您使用 Git，请确保已将 "appCredentials.ts" 添加到您的 .gitignore 文件中。
//
// --- 操作指南 ---
// 1. 访问您的 Firebase 项目设置。
// 2. 在“常规”选项卡下，找到“您的应用”部分。
// 3. 复制 Web 应用的 firebaseConfig 对象，并将其粘贴到下面的 firebaseConfig 常量中。
// 4. Gemini API 密钥将通过环境变量 (process.env.API_KEY) 提供，无需在此处配置。

// 1. 粘贴您的 Firebase 项目配置
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// FIX: Removed hardcoded GEMINI_API_KEY. As per guidelines, the API key must be accessed via process.env.API_KEY.
