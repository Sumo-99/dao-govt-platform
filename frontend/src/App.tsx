import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { Citizens } from "./pages/Citizens";
import { Officials } from "./pages/Officials";
import { Admin } from "./pages/Admin";
import { Airdropper } from "./pages/Airdropper";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/citizens" element={<Citizens />} />
          <Route path="/officials" element={<Officials />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/airdropper" element={<Airdropper />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
