# MetaSlim AI - AI-Powered Weight-Loss Drug Literature Analysis Platform

**English** | [简体中文](./README.md)

**MetaSlim AI** is a proof-of-concept project built on Google Gemini AI, designed to rapidly and intelligently extract key data from clinical trial literature on weight-loss drugs (in PDF or image format) and to perform visual analysis and comparison through interactive charts.

## ✨ Core Features

- **🤖 AI-Powered Data Extraction**: Leverages Gemini's multimodal capabilities to automatically identify and extract drug names, trial names, efficacy data (e.g., weight loss percentage), and safety data (e.g., nausea, vomiting incidence) from PDF files or images.
- **⚡️ Real-time Data Sync**: Integrates with Google Firebase Firestore, ensuring all extracted data is synced to the cloud database in real-time for consistency across team members or multiple devices.
- **📊 Interactive Visualizations**: Uses Recharts to generate various data charts, such as:
    - **Efficacy vs. Safety**: Intuitively compare the balance between weight loss effects and major side effects of different drugs.
    - **Duration vs. Efficacy**: Analyze the relationship between treatment duration and weight loss outcomes.
- **📋 Comprehensive Data Management**:
    - Supports **manual entry** and **editing** of data to supplement AI extraction.
    - Provides a **list view** for data with support for searching, sorting, and filtering.
    - Features a **comparison view** to juxtapose key parameters of multiple studies side-by-side.
- **📱 Mobile-First Design**: The interface is fully responsive, offering a seamless experience on both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI Model**: Google Gemini
- **Database**: Google Firebase (Firestore)
- **PDF Parsing**: PDF.js (Mozilla)
- **Charting Library**: Recharts

---

## 🚀 Local Deployment Guide

Follow these steps to run the project in your own environment.

### 1. Prerequisites

- **Node.js**: Version 18 or higher.
- **Firebase Project**:
    - You need a Firebase project to use the Firestore database. If you don't have one, you can create one for free in the [Firebase Console](https://console.firebase.google.com/).
    - In your project, create a **Web App** and obtain its configuration information.
    - Set up a Firestore database and ensure your [security rules](https://firebase.google.com/docs/firestore/security/get-started) allow read and write operations (for development, you can use test mode).
- **Google Gemini API Key**:
    - Create your API key in [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Project Configuration

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/metaslim-ai.git
    cd metaslim-ai
    ```

2.  **Create Credentials File**:
    In the project root, create a new file named `appCredentials.ts`. This file will **not** be committed to Git.

3.  **Configure Firebase**:
    Paste the Firebase Web App configuration you obtained in Step 1 into the `appCredentials.ts` file, like this:

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

    > ⚠️ **Important**: `appCredentials.ts` has been added to `.gitignore` to prevent you from accidentally committing sensitive credentials to the code repository.

4.  **Configure Gemini API Key**:
    This application is designed to read the Gemini API key directly from environment variables. On a deployment platform (like Netlify or Vercel), you will need to set an environment variable named `API_KEY`.

    For local development, Google AI Studio handles this process automatically, so no extra configuration is needed.

### 3. Installation and Running

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the Development Server**:
    ```bash
    npm run dev
    ```

    The application will run at `http://localhost:5173` (or another available port).

### 4. Deployment

You can deploy this project to any static site hosting platform that supports Node.js, such as [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/).

During deployment, be sure to add an environment variable named `API_KEY` in the platform's settings and set its value to your Gemini API key.

## 📁 Project Structure

```
/
├── components/         # React components
├── services/           # External services (Firebase, Gemini)
├── types.ts            # Global TypeScript type definitions
├── App.tsx             # Main application component
├── index.tsx           # Application entry point
├── appCredentials.ts   # Firebase config (untracked by Git)
└── ...
```

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## ⚠️ Disclaimer

This is a project for technical demonstration and learning purposes. Data extracted by the AI may contain inaccuracies. All information should be verified with the original literature before use.
