import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Landing } from "./pages/Landing";
import { About } from "./pages/About";
import { Docs } from "./pages/Docs";
import { Faq } from "./pages/Faq";
import { Console } from "./pages/Console";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/console" element={<Console />} />
        <Route element={<Shell />}>
          <Route index element={<Landing />} />
          <Route path="about" element={<About />} />
          <Route path="docs" element={<Docs />} />
          <Route path="faq" element={<Faq />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
