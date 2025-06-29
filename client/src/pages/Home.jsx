import { Link } from 'react-router-dom';
import './Home.css';
import kyleImg from '../assets/kyle.jpeg';

function Home() {
  return (
    <div className="home-wrapper">
      <header className="top-nav">
        <nav className="nav-links">
          <Link to="/personal" className="nav-link">Personal</Link>
          <Link to="/education" className="nav-link">Education</Link>
          <Link to="/work" className="nav-link">Work</Link>
          <Link to="/GameAILogin" className="nav-link">GameBuddyAI</Link>
        </nav>
      </header>

      <div className="home-content">
        <img src={kyleImg} alt="Kyle White" className="avatar" />
        <h1 className="name">Kyle White</h1>
        <p className="tagline">Welcome to my website!</p>
      </div>
    </div>
  );
}

export default Home;
