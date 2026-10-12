import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

// The exams a student can choose, from the server (GET /api/exams/catalog),
// so an exam the admin adds - UPTET, Super TET - shows up at sign-up and in
// Profile without an app update. The last list is kept on the phone, and a
// built-in list stands in on a first launch with no network.

const CACHE_KEY = "examCatalog";

export const FALLBACK_EXAMS = [
  { code: "SSC_CGL", label: "SSC", group: "SSC" },
  { code: "UP_POLICE", label: "UP Police", group: "UP Police" },
  { code: "RAILWAY", label: "Railway", group: "Railway" },
  { code: "BANKING", label: "Banking", group: "Banking" },
  { code: "CTET", label: "CTET", group: "CTET" },
];

// An icon by exam family, so a new post of a known family looks right.
export function examIcon(code = "") {
  const c = String(code).toUpperCase();
  if (c.startsWith("SSC")) return "school-outline";
  if (c.includes("POLICE") || c.startsWith("UPP")) return "shield-checkmark-outline";
  if (c.startsWith("RRB") || c.startsWith("RAILWAY")) return "train-outline";
  if (c.includes("BANK") || c.startsWith("IBPS") || c.startsWith("SBI")) return "card-outline";
  if (c.includes("TET") || c.includes("TEACH")) return "person-outline";
  if (c.startsWith("AGNIVEER") || c.includes("ARMY")) return "flag-outline";
  if (c.startsWith("UPSSSC")) return "document-text-outline";
  return "ribbon-outline";
}

const shape = (e) => ({ code: e.examType, label: e.name, group: e.group || e.name, post: e.post || null, icon: examIcon(e.examType) });

export function useExamCatalog() {
  const [exams, setExams] = useState(FALLBACK_EXAMS.map((e) => ({ ...e, icon: examIcon(e.code) })));

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(CACHE_KEY)
      .then((raw) => {
        const cached = raw ? JSON.parse(raw) : null;
        if (alive && Array.isArray(cached) && cached.length) setExams(cached.map(shape));
      })
      .catch(() => {});
    api
      .get("/exams/catalog", { timeout: 10000 })
      .then((res) => {
        const list = res.data?.exams || [];
        if (!alive || !list.length) return;
        setExams(list.map(shape));
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list)).catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return exams;
}
