# MetaSlim AI - 减重药物文献分析平台

[English](./README.en.md) | **简体中文**

**MetaSlim AI** 是一个基于 Google Gemini AI 的概念验证项目，旨在快速、智能地从减重药物的临床试验文献（PDF 或图片格式）中提取关键数据，并通过交互式图表进行可视化分析和对比。

## ✨ 核心功能

- **🤖 AI 驱动的数据提取**: 利用 Gemini 的多模态能力，从 PDF 文件或图片中自动识别并提取药物名称、试验名称、疗效数据（如体重下降百分比）和安全性数据（如恶心、呕吐发生率）等。
- **⚡️ 实时数据同步**: 集成 Google Firebase Firestore，所有提取的数据实时同步到云端数据库，确保团队成员或多设备间数据的一致性。
- **📊 交互式可视化**: 使用 Recharts 生成多种数据图表，例如：
    - **疗效 vs 安全性**: 直观对比不同药物在减重效果和主要副作用之间的平衡。
    - **周期 vs 疗效**: 分析治疗周期与减重效果之间的关系。
- **📋 全面的数据管理**:
    - 支持**手动录入**和**编辑**数据，弥补 AI 提取的不足。
    - 提供数据**列表视图**，支持搜索、排序和筛选。
    - **对比视图**，可并排比较多达数个研究的关键参数。
- **📱 移动端优先**: 界面设计完全响应式，在桌面和移动设备上均有良好体验。

## 🛠️ 技术栈

- **前端**: React, TypeScript, Tailwind CSS
- **AI 模型**: Google Gemini
- **数据库**: Google Firebase (Firestore)
- **PDF 解析**: PDF.js (Mozilla)
- **图表库**: Recharts

---

## 🚀 本地部署指南

按照以下步骤在您自己的环境中运行此项目。

### 1. 先决条件

- **Node.js**: 版本 18 或更高。
- **Firebase 项目**:
    - 您需要一个 Firebase 项目来使用 Firestore 数据库。如果您没有，可以在 [Firebase 控制台](https://console.firebase.google.com/) 免费创建一个。
    - 在您的项目中，创建一个 **Web 应用** 并获取其配置信息。
    - 设置 Firestore 数据库，并确保您的[安全规则](https://firebase.google.com/docs/firestore/security/get-started)允许读写操作（对于开发，可以使用测试模式）。
- **Google Gemini API 密钥**:
    - 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 创建您的 API 密钥。

### 2. 项目配置

1.  **克隆仓库**:
    ```bash
    git clone https://github.com/your-username/metaslim-ai.git
    cd metaslim-ai
    ```

2.  **创建凭证文件**:
    在项目的根目录下，创建一个名为 `appCredentials.ts` 的新文件。这个文件**不会**被提交到 Git。

3.  **配置 Firebase**:
    将您在步骤 1 中获取的 Firebase Web 应用配置粘贴到 `appCredentials.ts` 文件中，如下所示：

    ```typescript
    // file: appCredentials.ts

    export const firebaseConfig = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_PROJECT_ID.appspot.com",
      messagingSenderId: "YOUR_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
    ```

    > ⚠️ **重要**: `appCredentials.ts` 已被添加到 `.gitignore` 中，以防止您将敏感凭证意外提交到代码仓库。

4.  **配置 Gemini API 密钥**:
    此应用被设计为直接从环境变量中读取 Gemini API 密钥。在部署平台（如 Netlify, Vercel）上，您需要设置一个名为 `API_KEY` 的环境变量。

    对于本地开发，Google AI Studio 会自动处理此过程，您无需额外配置。

### 3. 安装与运行

1.  **安装依赖**:
    ```bash
    npm install
    ```

2.  **启动开发服务器**:
    ```bash
    npm run dev
    ```

    应用将在 `http://localhost:5173` (或另一个可用端口) 上运行。

### 4. 部署

您可以将此项目部署到任何支持 Node.js 的静态网站托管平台，例如 [Netlify](https://www.netlify.com/) 或 [Vercel](https://vercel.com/)。

在部署时，请务必在平台的设置中添加名为 `API_KEY` 的环境变量，并将其值设置为您的 Gemini API 密钥。

## 📁 项目结构

```
/
├── components/         # React 组件
├── services/           # 外部服务 (Firebase, Gemini)
├── types.ts            # 全局 TypeScript 类型定义
├── App.tsx             # 主应用组件
├── index.tsx           # 应用入口
├── appCredentials.ts   # Firebase 配置 (不在 Git 中)
└── ...
```

## 📄 开源许可

本项目采用 [MIT License](./LICENSE)。

## ⚠️ 免责声明

这是一个用于技术演示和学习目的的项目。AI 提取的数据可能存在不准确之处，所有信息在使用前应通过原始文献进行核实。
