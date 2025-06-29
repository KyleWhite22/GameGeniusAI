import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Personal from './pages/Personal';
import Education from './pages/Education';
import Work from './pages/Work';
import GameAILogin from './pages/GameAILogin';
import GameAI from './pages/GameAI';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/personal" element={<Personal />} />
        <Route path="/education" element={<Education />} />
        <Route path="/work" element={<Work />} />
        <Route path="/gameAILogin" element={<GameAILogin />} />
        <Route path="/gameAI" element={<GameAI />} />
      </Routes>
    </Router>
  );
}

export default App;