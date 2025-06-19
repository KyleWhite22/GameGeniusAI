import './Home.css';
import kyleImg from '../assets/kyle.jpeg';

function Home() {
  return (
    <div className="home-wrapper">
      <div className="home-content">
        <img src={kyleImg} alt="Kyle White" className="avatar" />
        <h1 className="name">Kyle White</h1>
        <p className="tagline">Ohio State Computer Science Student & Developer</p>
        <div className="home-buttons">
          <a href="/projects" className="btn">Projects</a>
          <a href="/about" className="btn secondary">About Me</a>
        </div>
      </div>
    </div>
  );
}
export default Home;