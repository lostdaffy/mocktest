import { useEffect, useRef, useState } from "react";

// Fades content up as it scrolls into view.
//
// The server-rendered HTML - and React's first render in the browser - are
// always fully visible. Content is only hidden once this effect has actually
// run, so a slow or failed script can never leave a blank page, and the
// prerendered HTML matches the first client render exactly (no hydration
// mismatch).
//
// Anything already on screen when the page mounts is left alone: hiding it
// just to fade it straight back in would only look like a flicker.
export default function Reveal({ as: Tag = "div", className = "", delay = 0, style, children, ...rest }) {
  const ref = useRef(null);
  const [state, setState] = useState("static"); // "static" | "hidden" | "visible"

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setState("visible");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stateClass = state === "hidden" ? "opacity-0" : state === "visible" ? "animate-reveal-up" : "";
  const mergedStyle = state === "visible" && delay ? { ...style, animationDelay: `${delay}ms` } : style;

  return (
    <Tag ref={ref} className={`${className} ${stateClass}`.trim()} style={mergedStyle} {...rest}>
      {children}
    </Tag>
  );
}
