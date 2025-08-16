import './GameAILogin.css';

const API = import.meta.env.VITE_API_URL;

function GameAILogin() {
  const handleSteamLogin = (e) => {
    e.preventDefault();
    if (!API) {
      console.error('VITE_API_URL is not defined at build time.');
      alert('Config error: API URL missing.');
      return;
    }
    localStorage.setItem('resumeUrl', '/gameAI');
    window.location.href = `${API}/auth/steam`;
  };

  return (
    <div className="home-container">
      <h1>GameGeniusAI</h1>
      <p>Recommends you video games!</p>

      <button className="steam-login-btn" onClick={handleSteamLogin}>
        Log in with Steam
      </button>
    </div>
  );
}

export default GameAILogin;