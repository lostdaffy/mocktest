import { useEffect } from "react";

// Keeps the browser tab title and description in step with the page while
// navigating inside the app. (The first page load already has the right tags
// baked in by prerender.js - this only matters for in-app navigation and
// for `npm run dev`, which has no prerendered head.)
export default function Page({ meta, children }) {
  useEffect(() => {
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  }, [meta]);

  return children;
}
