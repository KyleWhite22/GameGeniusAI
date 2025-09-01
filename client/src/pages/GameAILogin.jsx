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
  { appid: 1245620, name: 'ELDEN RING', playtime_forever: 100, tags: ['Soulslike','RPG','Open World'] },
  { appid: 271590, name: 'Grand Theft Auto V', playtime_forever: 150, tags: ['Action','Open World'] },
  { appid: 413150, name: 'Stardew Valley', playtime_forever: 200, tags: ['Indie','Farming Sim'] },
  { appid: 620, name: 'Portal 2', playtime_forever: 80, tags: ['Puzzle','Co-op'] },
  { appid: 1174180, name: 'Red Dead Redemption 2', playtime_forever: 90, tags: ['Western','Story Rich','Open World'] },
  { appid: 359550, name: 'Tom Clancy’s Rainbow Six Siege', playtime_forever: 80, tags: ['Shooter','Tactical','Multiplayer'] },
  { appid: 105600, name: 'Terraria', playtime_forever: 80, tags: ['Sandbox','Survival','Indie'] },
  { appid: 292040, name: 'Hollow Knight', playtime_forever: 40, tags: ['Metroidvania','Indie','Action'] },
  { appid: 72850, name: 'The Elder Scrolls V: Skyrim', playtime_forever: 230, tags: ['RPG','Open World','Fantasy'] },
    { appid: 440, name: 'Team Fortress 2', playtime_forever: 50, tags: ['Shooter','Class-Based','Multiplayer'] },


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
