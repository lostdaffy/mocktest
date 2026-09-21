import { Link } from "react-router-dom";

export const meta = {
  title: "Page not found – Rankveer",
  description: "The page you were looking for doesn't exist.",
  noindex: true,
};

export default function NotFound() {
  return (
    <section className="pb-[120px] pt-24 text-center">
      <div className="wrap">
        <p className="text-gradient font-display text-[clamp(72px,14vw,132px)] font-extrabold leading-none tracking-[-0.05em]">404</p>
        <h1 className="mt-2 text-[clamp(24px,3.4vw,34px)] font-bold">This page doesn't exist</h1>
        <p className="mx-auto mt-3 max-w-[460px] text-slate">The link may be broken, or the page may have moved. Let's get you back on track.</p>
        <Link to="/" className="btn btn-primary btn-lg mt-7">
          Go to homepage
        </Link>
      </div>
    </section>
  );
}
