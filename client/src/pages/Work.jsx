import './Work.css';
import krogerLogo from '../assets/krogerLogo.png';
import siemensLogo from '../assets/siemensLogo.png';
import cincinnatiLogo from '../assets/cincinnatiLogo.png';

function Work() {
  return (
    <div className="work-page">
      <h1>Work Experience</h1>
      <div className="timeline">

        {/* Kroger – earliest */}
        <div className="timeline-entry">
          <img src={krogerLogo} alt="Kroger Logo" className="glow-logo" />
          <div className="timeline-text">
            <h2>Kroger</h2>
            <p>Software Development Intern</p>
            <p className="timeline-date">Summer 2022</p>
          </div>
        </div>

        {/* Siemens – next */}
        <div className="timeline-entry">
          <img src={siemensLogo} alt="Siemens Logo" className="glow-logo" />
          <div className="timeline-text">
            <h2>Siemens</h2>
            <p>Cloud Engineering Intern</p>
            <p className="timeline-date">Summer 2023</p>
          </div>
        </div>

        {/* Cincinnati Insurance – most recent */}
        <div className="timeline-entry">
          <img src={cincinnatiLogo} alt="Cincinnati Insurance Logo" className="glow-logo" />
          <div className="timeline-text">
            <h2>Cincinnati Insurance</h2>
            <p>Full-Stack Developer Intern</p>
            <p className="timeline-date">Spring 2024</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Work;
