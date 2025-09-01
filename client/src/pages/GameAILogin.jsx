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
    localStorage.setItem('resumeUrl', '/GameGeniusAI');
    window.location.href = `${API}/auth/steam`;
  };

  const handleDemoMode = (e) => {
    e.preventDefault();
    // mark demo mode in localStorage so other pages can check it
    localStorage.setItem('authMode', 'demo');
    localStorage.setItem('resumeUrl', '/GameGeniusAI');
    // optional: store a preset list of demo games
    localStorage.setItem('demoGames', JSON.stringify([
      { appid: 1245620, name: 'ELDEN RING', playtime_forever: 5400, tags: ['Soulslike','RPG','Open World'] },
      { appid: 271590, name: 'Grand Theft Auto V', playtime_forever: 8200, tags: ['Action','Open World'] },
      { appid: 570, name: 'Dota 2', playtime_forever: 16000, tags: ['MOBA','Multiplayer'] },
      { appid: 413150, name: 'Stardew Valley', playtime_forever: 2500, tags: ['Indie','Farming Sim'] },
      { appid: 620, name: 'Portal 2', playtime_forever: 1100, tags: ['Puzzle','Co-op'] }
    ]));
    // redirect them straight into the app
    window.location.href = '/GameGeniusAI';
  };

  return (
    <div className="login-fullscreen">
      <div className="login-card">
        <h1>GameGeniusAI</h1>
        <p>Recommends you video games!</p>

        <button className="steam-login-btn" onClick={handleSteamLogin}>
          Log in with Steam
        </button>

        <div className="or-divider">
          <span>or</span>
        </div>

        <button className="demo-login-btn" onClick={handleDemoMode}>
          I don’t have Steam — try demo mode
        </button>
      </div>
    </div>
  );
}

export default GameAILogin;
