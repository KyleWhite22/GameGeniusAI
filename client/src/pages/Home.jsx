import { Link } from 'react-router-dom';
import './Home.css';
import kyleImg from '../assets/kyleBW.JPG';
import kyleLogo from '../assets/kyleLogo.png';
import cincyBW from '../assets/cincinnatiImageBW.JPG';

function Home() {
  return (
    <div className="home-wrapper">
      <header className="top-nav">
        <div className="nav-left">
          <img src={kyleLogo} alt="Kyle Logo" className="nav-logo" />
        </div>
        <nav className="nav-links">
          <Link to="/personal" className="nav-link">Personal</Link>
          <Link to="/education" className="nav-link">Education</Link>
          <Link to="/work" className="nav-link">Work</Link>
          <Link to="/GameAILogin" className="nav-link">GameGeniusAI</Link>
        </nav>
      </header>

      {/* Full-bleed hero */}
      <section className="home-hero">
        {/* Left background pane (half screen, faded) */}
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${cincyBW})` }}
          aria-hidden="true"
        >
          <span className="hero-bg-fade" />
        </div>

        {/* Foreground content spanning the hero */}
        <div className="hero-content">
          <div className="hero-media">
            <img src={kyleImg} alt="Kyle White" className="homeAvatar-img" />
          </div>

          <div className="hero-text">
            <h1 className="name">Kyle White</h1>
            <p className="tagline">Full-stack developer crafting clean, performant web experiences.</p>

            <div className="hero-actions">
              <Link to="/work" className="btn primary">View Work</Link>
              <Link to="/personal" className="btn ghost">About Me</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;