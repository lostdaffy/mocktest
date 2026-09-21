// Shared top section for every page except Home.
export default function PageHero({ kicker, title, lead, note }) {
  return (
    <section className="page-hero">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="wrap relative">
        <p className="kicker">{kicker}</p>
        <h1 className="page-title">{title}</h1>
        {lead && <p className="mx-auto mt-3.5 max-w-[620px] text-[17px] text-slate">{lead}</p>}
        {note && <p className="mt-3 text-[14.5px] text-slate">{note}</p>}
      </div>
    </section>
  );
}
