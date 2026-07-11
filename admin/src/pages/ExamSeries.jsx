import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

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
        setError("Exams load nahi hue. Backend chal raha hai? Exam patterns seed kiye?");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Exam Mock Series</h1>
      <p className="text-slate-500 mb-8">
        Har exam ke liye mock test series banao. Generate → Review → Publish. Sirf published mocks students ko dikhte hain.
      </p>

      {error && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : exams.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500">
          Koi exam pattern nahi mila. Pehle "Exam Patterns" page se exam add karo, ya <code>npm run seed:patterns</code> chalao.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((exam) => (
            <Link
              key={exam.examType}
              to={`/exam-series/${exam.examType}`}
              className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 hover:border-brand hover:shadow-md transition-all group"
            >
              <p className="font-display text-lg font-bold text-ink group-hover:text-brand transition-colors mb-1">
                {exam.displayName}
              </p>
              <p className="text-xs text-slate-400 mb-4">{exam.examType}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{exam.publishedMocks}</p>
                  <p className="text-xs text-slate-500">Published</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">{exam.draftMocks}</p>
                  <p className="text-xs text-slate-500">Draft</p>
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