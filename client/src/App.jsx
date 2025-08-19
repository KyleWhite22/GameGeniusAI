import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GameAILogin from './pages/GameAILogin';
import GameAI from './pages/GameAI';



function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GameAILogin />} />
        <Route path="/GameGeniusAI" element={<GameAI />} />
      </Routes>
    </Router>
  );
}

export default App;