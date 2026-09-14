import type { AjapaQuestion } from "@/lib/ajapa/types";

const DB_NAME = "paramanand_ajapa_v1";
const STORE = "questions";
const META = "meta";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("seeker_phone", "seeker_phone", { unique: false });
        os.createIndex("status", "status", { unique: false });
        os.createIndex("updated_at", "updated_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(META)) {
        db.createObjectStore(META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function upsertQuestions(questions: AjapaQuestion[]): Promise<void> {
  if (!questions.length) return;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const os = tx.objectStore(STORE);
  for (const q of questions) os.put(q);
  await txDone(tx);
  db.close();
}

export async function getAllQuestions(): Promise<AjapaQuestion[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const rows = await new Promise<AjapaQuestion[]>((resolve, reject) => {
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []) as AjapaQuestion[]);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await openDb();
  const tx = db.transaction(META, "readonly");
  const value = await new Promise<string | null>((resolve, reject) => {
    const req = tx.objectStore(META).get(key);
    req.onsuccess = () => {
      const row = req.result as { key: string; value: string } | undefined;
      resolve(row?.value ?? null);
    };
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(META, "readwrite");
  tx.objectStore(META).put({ key, value });
  await txDone(tx);
  db.close();
}

export function searchLocal(questions: AjapaQuestion[], query: string): AjapaQuestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return questions;
  return questions.filter((item) => {
    const hay = [
      item.question,
      item.ai_answer || "",
      item.guru_answer_text || "",
      item.seeker_name || "",
      item.seeker_phone,
    ]
      .join("\n")
      .toLowerCase();
    return hay.includes(q);
  });
}
