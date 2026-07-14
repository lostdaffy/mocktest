import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ExamPatterns from "./pages/ExamPatterns";
import LiveExams from "./pages/LiveExams";
import Users from "./pages/Users";
import Subjects from "./pages/Subjects";
import ManageQuestions from "./pages/ManageQuestions";
import Reports from "./pages/Reports";
import ExamSeries from "./pages/ExamSeries";
import ExamMocks from "./pages/ExamMocks";
import PracticeSeries from "./pages/PracticeSeries";
import PyqBank from "./pages/PyqBank";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-patterns"
            element={
              <ProtectedRoute>
                <ExamPatterns />
              </ProtectedRoute>
            }
          />
          <Route
            path="/live-exams"
            element={
              <ProtectedRoute>
                <LiveExams />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subjects"
            element={
              <ProtectedRoute>
                <Subjects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <ManageQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-series"
            element={
              <ProtectedRoute>
                <ExamSeries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-series/:examStage"
            element={
              <ProtectedRoute>
                <ExamMocks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice-series"
            element={
              <ProtectedRoute>
                <PracticeSeries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pyq-bank"
            element={
              <ProtectedRoute>
                <PyqBank />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}