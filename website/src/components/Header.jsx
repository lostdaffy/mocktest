import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { site } from "./SiteInfo";

// Section links point at the homepage (/#features). They're plain <a> tags,
// not router <Link>s: on the homepage the browser scrolls natively, and from
// any other page it loads the prerendered homepage and jumps to the section.
const SECTION_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#live-exams", label: "Live exams" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  const location = useLocation();

  // Close the mobile menu whenever the page or section changes.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tailwind's `lg` breakpoint is where the menu turns into a normal row -
  // don't leave it stuck "open" if the window is resized past that.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => e.matches && setOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => {
      if (!navRef.current?.contains(e.target) && !toggleRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <>
      <a href="#main" className="absolute -top-24 left-3 z-[100] rounded-xs bg-ink px-4 py-2.5 font-semibold text-white focus:top-3">
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-50 border-b bg-bg/85 backdrop-blur-lg backdrop-saturate-150 transition-[border-color,box-shadow] duration-200 ${
          scrolled ? "border-line shadow-[0_6px_24px_-16px_rgb(16_25_54/0.2)]" : "border-transparent"
        }`}
      >
        <div className="wrap flex h-[72px] items-center justify-between gap-5">
          <Link to="/" className="flex-none" aria-label={`${site.brandName} home`}>
            <img src="/images/logo.png" alt={site.brandName} width="166" height="44" className="h-9 w-auto sm:h-10" />
          </Link>

          <nav
            id="site-nav"
            ref={navRef}
            aria-label="Main"
            className={`absolute inset-x-0 top-[72px] flex-col gap-0.5 border-b border-line bg-surface px-4 pb-4 pt-2.5 shadow-[0_18px_30px_-20px_rgb(16_25_54/0.35)] lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
              open ? "flex" : "hidden"
            }`}
          >
            {SECTION_LINKS.map(({ href, label }) => (
              <a key={href} href={href} className="nav-link" onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
            <Link to="/contact/" className="nav-link">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <a href="/#download" className="btn btn-primary btn-sm max-[400px]:hidden">
              Get the app
            </a>

            <button
              ref={toggleRef}
              type="button"
              aria-controls="site-nav"
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
              className="group inline-flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-sm border border-line bg-surface lg:hidden"
            >
              <span className="block h-0.5 w-[18px] rounded-full bg-ink transition duration-200 group-aria-expanded:translate-y-1.5 group-aria-expanded:rotate-45" />
              <span className="block h-0.5 w-[18px] rounded-full bg-ink transition duration-200 group-aria-expanded:opacity-0" />
              <span className="block h-0.5 w-[18px] rounded-full bg-ink transition duration-200 group-aria-expanded:-translate-y-1.5 group-aria-expanded:-rotate-45" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
