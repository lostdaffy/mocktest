import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RiSearchLine, RiFileList3Line, RiCheckboxCircleLine, RiDraftLine, RiArrowRightSLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";

// Every exam's mock series in one list: how big its paper is, how many mocks
// students can take, how many are still drafts.
export default function ExamSeries() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .get("/exam-series/exams")
      .then((res) => setExams(res.data.exams))
      .catch(() => setError("Couldn't load exams. The server may be waking up — reload in a few seconds."))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return exams.filter((e) => !t || e.displayName.toLowerCase().includes(t) || e.examType.toLowerCase().includes(t));
  }, [exams, q]);

  const published = exams.reduce((n, e) => n + e.publishedMocks, 0);
  const drafts = exams.reduce((n, e) => n + e.draftMocks, 0);
  const withNone = exams.filter((e) => !e.publishedMocks).length;

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Exam Mock Series"
        subtitle="One mock series per exam. Build a mock, review it, publish it. Only published mocks are visible to students."
      />

      {error && <div className="mb-6 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Tile icon={RiFileList3Line} tone="bg-brand/10 text-brand" label="Exams" value={loading ? null : exams.length} />
        <Tile icon={RiCheckboxCircleLine} tone="bg-success-light text-success" label="Published mocks" value={loading ? null : published} />
        <Tile icon={RiDraftLine} tone="bg-warn-light text-warn" label="Drafts" value={loading ? null : drafts} />
        <Tile
          icon={RiFileList3Line}
          tone={withNone ? "bg-danger-light text-danger" : "bg-slate-light text-slate"}
          label="Exams with no live mock"
          value={loading ? null : withNone}
        />
      </div>

      <div className="relative max-w-sm mb-4">
        <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exams..." className="rv-input !pl-10" />
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-soft text-center py-10">
            {exams.length ? "No exam matches." : 'No exam patterns yet. Add an exam on the "Exam Patterns" page first.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Sections</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Paper</th>
                  <th className="px-4 py-3 text-right">Published</th>
                  <th className="px-4 py-3 text-right">Drafts</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {rows.map((e) => {
                  const size = (e.sections || []).reduce((n, s) => n + (s.questionCount || 0), 0);
                  return (
                    <tr key={e.examType} className="hover:bg-slate-light/40 transition-colors">
                      <td className="px-4 py-3 min-w-[190px]">
                        <Link to={`/exam-series/${e.examType}`} className="font-semibold text-ink hover:text-brand">
                          {e.displayName}
                        </Link>
                        <p className="text-[11px] text-slate-soft font-mono">{e.examType}</p>
                      </td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <div className="flex flex-wrap gap-1">
                          {(e.sections || []).map((s) => (
                            <span key={s.subject} className="text-[11px] bg-slate-light text-ink-soft px-2 py-0.5 rounded-full whitespace-nowrap">
                              {s.subject} {s.questionCount}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums text-slate">
                        {size} Q · {e.durationMinutes} min
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block min-w-[2rem] text-center text-[12px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            e.publishedMocks ? "bg-success-light text-success" : "bg-danger-light text-danger"
                          }`}
                        >
                          {e.publishedMocks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-block min-w-[2rem] text-center text-[12px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            e.draftMocks ? "bg-warn-light text-warn" : "bg-slate-light text-slate-soft"
                          }`}
                        >
                          {e.draftMocks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/exam-series/${e.examType}`}
                          className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-md bg-brand/5 hover:bg-brand/10 text-brand text-xs font-semibold whitespace-nowrap"
                        >
                          Manage <RiArrowRightSLine size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Tile({ icon: Icon, tone, label, value }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <span className={`w-10 h-10 rounded-sm grid place-items-center shrink-0 ${tone}`}>
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        {value == null ? (
          <div className="h-6 w-10 rounded bg-slate-light animate-pulse" />
        ) : (
          <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value}</p>
        )}
        <p className="text-xs text-slate truncate">{label}</p>
      </div>
    </Card>
  );
}
