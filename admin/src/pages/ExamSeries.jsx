import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { PageHeader } from "../components/ui";

export default function ExamSeries() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/exam-series/exams");
        setExams(res.data.exams);
      } catch (err) {
        setError("Couldn't load exams. Is the backend running? Have exam patterns been seeded?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Exam Mock Series"
        subtitle="Build a mock test series for each exam. Generate → Review → Publish. Only published mocks are visible to students."
      />

      {error && (
        <div className="mb-6 bg-warn-light border border-warn-border text-warn text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-soft">Loading...</p>
      ) : exams.length === 0 ? (
        <div className="bg-surface border border-border-soft rounded-lg p-8 text-center text-slate">
          No exam patterns found. Add an exam from the "Exam Patterns" page first, or run <code>npm run seed:patterns</code>.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <Link
              key={exam.examType}
              to={`/exam-series/${exam.examType}`}
              className="rv-card p-6 hover:border-brand hover:shadow-card transition-all group"
            >
              <p className="font-display text-lg font-bold text-ink group-hover:text-brand transition-colors mb-1">
                {exam.displayName}
              </p>
              <p className="text-xs text-slate-soft mb-4">{exam.examType}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold text-success">{exam.publishedMocks}</p>
                  <p className="text-xs text-slate">Published</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-warn">{exam.draftMocks}</p>
                  <p className="text-xs text-slate">Draft</p>
                </div>
              </div>
              <p className="text-sm text-brand mt-4 font-medium">Manage series →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}