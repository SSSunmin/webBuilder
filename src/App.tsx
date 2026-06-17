import { Navigate, Route, Routes } from "react-router-dom";
import { Editor } from "./routes/Editor";
import { Home } from "./routes/Home";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/editor/:projectId" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
