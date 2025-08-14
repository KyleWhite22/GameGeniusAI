import './GameAILogin.css';

function GameAILogin() {
    return (
        <div className="home-container">
                <h1>GameTracker AI</h1>
            <p>Your personal video game journal and AI assistant.</p>
          <a
  href="#"
  onClick={() => {
    // Save the current path (or something like "/gameAI") to resume after login
    localStorage.setItem('resumeUrl', '/gameAI');
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/steam`;
  }}
>
  <button className="steam-login-btn">Log in with Steam</button>
</a>
        </div>
    );
        
}

export default GameAILogin;