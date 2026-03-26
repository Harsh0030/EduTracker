import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/test-db", async (req, res) => {
    try {
      const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || "(default)");
      const snapshot = await db.collection("users").limit(1).get();
      res.json({ 
        status: "ok", 
        count: snapshot.size,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
      });
    } catch (error: any) {
      console.error("Test DB Error:", error);
      res.status(500).json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
