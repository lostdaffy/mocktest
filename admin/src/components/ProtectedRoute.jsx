import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}
