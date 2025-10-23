import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './GameAI.css';

const API = import.meta.env.VITE_API_URL;

/* ----------------------------- Mode & Storage ----------------------------- */
function isDemoMode() {
    return localStorage.getItem('authMode') === 'demo';
}
function modeScope(user) {
    // Stable buckets: 'demo' OR 'steam:<steamId>' (unknown until we know the user)
    return isDemoMode() ? 'demo' : (user?.id ? `steam:${user.id}` : 'steam:unknown');
}
function lsKey(base, scope) {
    return `${base}:${scope}`;
}
function getScopedItem(base, scope, fallback = null) {
    try {
        const raw = localStorage.getItem(lsKey(base, scope));
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}
function setScopedItem(base, scope, value) {
    localStorage.setItem(lsKey(base, scope), JSON.stringify(value));
}

/* --------------------------------- Helpers -------------------------------- */
async function getTagsForApp(appid) {
    const res = await fetch(`${API}/api/tags/${appid}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch tags for app ${appid}`);
    const data = await res.json();
    return Array.isArray(data.tags) ? data.tags : [];
}

async function enrichWithTags(games) {
    // In demo, never call the API; just keep whatever tags exist (or empty arrays)
    if (isDemoMode()) {
        return games.map((g) => ({ ...g, tags: Array.isArray(g.tags) ? g.tags : [] }));
    }
    const enriched = await Promise.all(
        games.map(async (g) => {
            if (Array.isArray(g.tags) && g.tags.length) return g;
            const tags = await getTagsForApp(g.appid);
            return { ...g, tags };
        })
    );
    return enriched;
}

function readDemoGames() {
    try {
        const raw = localStorage.getItem('demoGames');
        const arr = raw ? JSON.parse(raw) : [];
        // Ensure every demo game has tags (so we don’t call /api/tags)
        return Array.isArray(arr) ? arr.map((g) => ({ ...g, tags: g.tags || [] })) : [];
    } catch {
        return [];
    }
}

const DEMO_USER = { id: 'DEMO_USER', displayName: '', photos: [] };

/* -------------------------------- Component -------------------------------- */
function GameAI() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rotation, setRotation] = useState(0);
    const [topGames, setTopGames] = useState([]);
    const [recommendations, setRecommendations] = useState('');
    const [showGamePicker, setShowGamePicker] = useState(false);
    const [customSelection, setCustomSelection] = useState([]);
    const [paused, setPaused] = useState(false);
    const [ratingModal, setRatingModal] = useState({ open: false, game: null, temp: 0 });

    // Scoped storage control
    const scopeRef = useRef('');            // current scope used to guard async writes
    const [scope, setScope] = useState(''); // string like 'demo' or 'steam:<id>'

    // Ratings are also scoped
    const [ratings, setRatings] = useState({});

    // Avatar (for Steam users only)
    const rawAvatar =
        user?.photos?.[2]?.value ??
        user?.photos?.[0]?.value ??
        user?._json?.avatarfull ??
        user?.avatarfull ??
        '';
    const avatar = rawAvatar ? rawAvatar.replace(/^http:\/\//, 'https://') : '';

    /* ------------------------------ UI Handlers ------------------------------ */
    function openRatingModal(game) {
        setPaused(true);
        setRatingModal({ open: true, game, temp: ratings[game.appid] || 0 });
        document.body.classList.add('no-scroll');
    }
    function closeRatingModal() {
        setPaused(false);
        setRatingModal({ open: false, game: null, temp: 0 });
        document.body.classList.remove('no-scroll');
    }

    function exitDemoOrSignOut(navigateTo = 'https://game.kyle-white.com') {
        localStorage.removeItem('authMode');
        // demo-only data can remain; namespacing prevents bleed, but we can reset memory state:
        setTopGames([]);
        setGames([]);
        setRecommendations('');
        window.location.href = navigateTo;
    }

    function SteamPrivacyInstructions() {
        return (
            <div className="steam-privacy-instructions">
                <h2>Make Sure Your Steam Game Details Are Public</h2>
                <ol>
                    <li>Open <strong>Steam</strong> and log in.</li>
                    <li>Click your name in the top-right → <strong>View my profile</strong>.</li>
                    <li>On your profile page, click <strong>Edit Profile</strong> → <strong>Privacy Settings</strong>.</li>
                    <li>Under <strong>Game details</strong>, set it to <strong>Public</strong>.</li>
                    <li>Uncheck <strong>“Always keep my total playtime private”</strong>.</li>
                    <li>Refresh this page and your games should appear!</li>
                </ol>
            </div>
        );
    }

    const setRating = (appid, value) => {
        setRatings((prev) => ({ ...prev, [appid]: value }));
    };

    // Clear old recommendations when selection changes
    useEffect(() => {
        setRecommendations('');
    }, [topGames]);

    /* --------------------------- Scope & Scoped Loads -------------------------- */

    // Keep scope in sync with current mode/user
    useEffect(() => {
        const s = modeScope(user);
        scopeRef.current = s;
        setScope(s);
    }, [user]);

    // Load ratings whenever scope changes
    useEffect(() => {
        if (!scope) return;
        setRatings(getScopedItem('gameRatings', scope, {}));
    }, [scope]);

    // Persist ratings whenever they change
    useEffect(() => {
        if (!scope) return;
        setScopedItem('gameRatings', scope, ratings);
    }, [scope, ratings]);

    // Load topThree whenever scope changes
    useEffect(() => {
        if (!scope) return;
        const saved = getScopedItem('topThree', scope, null);
        if (saved && saved !== 'undefined') {
            const parsed = Array.isArray(saved) ? saved : [];
            setTopGames(parsed);
            setCustomSelection(parsed);
        } else {
            setTopGames([]);
            setCustomSelection([]);
        }
    }, [scope]);

    /* -------------------------- Demo / Steam boot flow ------------------------- */

    useEffect(() => {
        const safeNavigateResume = () => {
            const resumeUrl = localStorage.getItem('resumeUrl');
            if (resumeUrl) {
                localStorage.removeItem('resumeUrl');
                if (window.location.pathname !== resumeUrl) {
                    navigate(resumeUrl);
                }
            }
        };

        const load = async () => {
            // DEMO MODE BOOT (no auth calls)
            if (isDemoMode()) {
                const demoGames = readDemoGames();
                scopeRef.current = 'demo';
                setScope('demo');
                setUser(DEMO_USER);
                setGames(demoGames);

                // Seed topThree for demo if none yet in this scope
                const savedTop = getScopedItem('topThree', 'demo', null);
                const initialTop = Array.isArray(savedTop) ? savedTop : demoGames.slice(0, 3);
                setTopGames(initialTop);
                setCustomSelection(initialTop);
                setScopedItem('topThree', 'demo', initialTop);

                safeNavigateResume();
                setLoading(false);
                return;
            }

            // STEAM FLOW
            if (!API) {
                console.error('VITE_API_URL is not defined at build time.');
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API}/auth/user`, { credentials: 'include' });
                if (!res.ok) throw new Error(`GET /auth/user -> ${res.status}`);
                const data = await res.json();

                if (data.user) {
                    setUser(data.user);
                    // set scope immediately so guards don't cancel the fetch    
                    const newScope = `steam:${data.user.id}`;
                    scopeRef.current = newScope;
                    setScope(newScope);
                    await fetchGames(data.user.id, newScope);
                    safeNavigateResume();
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
                setLoading(false);
            }
        };

        load();
        // we intentionally only depend on navigate; scope is handled elsewhere
    }, [navigate]);

    async function fetchGames(steamId, expectedScope) {
        const myScope = expectedScope ?? scopeRef.current;
        try {
            const res = await fetch(`${API}/api/games/user/${steamId}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`GET /api/games/user/${steamId} -> ${res.status}`);
            const data = await res.json();

            if (scopeRef.current !== myScope) return; // bail if mode/user changed mid-flight
            setGames(data.allGames || []);

            if (Array.isArray(data.topThree) && data.topThree.length) {
                const needsTags = data.topThree.some((g) => !Array.isArray(g.tags) || g.tags.length === 0);
                const finalTop = needsTags ? await enrichWithTags(data.topThree) : data.topThree;

                if (scopeRef.current !== myScope) return;
                setTopGames(finalTop);
                setCustomSelection(finalTop);
                setScopedItem('topThree', myScope, finalTop);
            } else {
                if (scopeRef.current !== myScope) return;
                setTopGames([]);
                setCustomSelection([]);
                setScopedItem('topThree', myScope, []);
            }
            setLoading(false);
        } catch (err) {
            if (scopeRef.current !== myScope) return;
            console.error('Failed to fetch games:', err);
            setLoading(false);
        }
    }

    const fetchRecommendations = async () => {
        if (!topGames.length) {
            setRecommendations('Pick at least 1 game to get recommendations.');
            return;
        }
        const myScope = scopeRef.current;
        setLoading(true);
        try {
            // ensure tags; in demo these are already present / enriched locally
            const ensured = await enrichWithTags(topGames);

            if (scopeRef.current !== myScope) return;

            if (ensured !== topGames) {
                setTopGames(ensured);
                setScopedItem('topThree', myScope, ensured);
            }

            const demo = isDemoMode();
            const res = await fetch(`${API}/api/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: demo ? 'omit' : 'include', // demo has no session cookie
                body: JSON.stringify({
                    gamesWithTags: ensured,
                    mode: demo ? 'demo' : 'steam',
                    userId: demo ? 'DEMO_USER' : undefined,
                }),
            });
            if (!res.ok) throw new Error(`POST /api/recommend -> ${res.status}`);
            const data = await res.json();

            if (scopeRef.current !== myScope) return;

            setRecommendations(data.recommendations);
        } catch (err) {
            if (scopeRef.current !== myScope) return;
            setRecommendations('Failed to fetch recommendations.');
            console.error('❌ Error fetching recommendations:', err);
        }
        if (scopeRef.current === myScope) setLoading(false);
    };

    /* ------------------------------- Animation ------------------------------- */
    const requestRef = useRef();
    useEffect(() => {
        const animate = () => {
            if (!paused) setRotation((prev) => prev + 0.05);
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [paused]);

    /* ----------------------------- Early Exits UI ---------------------------- */
    if (!API && !isDemoMode()) {
        return <p>Configuration error: API URL missing.</p>;
    }

    if (!user) {
        return isDemoMode() ? <p>Loading demo…</p> : <p>You are not logged in with Steam.</p>;
    }

    /* --------------------------------- Render -------------------------------- */
    return (
        <div className="gameai-wrapper">
            <div className="profile-container">
                <div className="gameai-content">

                    {/* Fixed HUD header */}
                    <div className="profile-header">
                        {/* Only show avatar/username in Steam mode */}
                        {!isDemoMode() && avatar && (
                            <img
                                className="avatar"
                                src={avatar}
                                alt={`${user.displayName} avatar`}
                                onError={(e) => { e.currentTarget.src = '/fallback-avatar.png'; }}
                            />
                        )}
                        {!isDemoMode() && user?.displayName && (
                            <h1 className="username">{user.displayName}</h1>
                        )}

                        {/* Exit demo (left-aligned with no phantom gap) */}
                        {isDemoMode() && (
                            <button className="customize-button exit-demo-btn" onClick={() => exitDemoOrSignOut()}>
                                Exit Demo
                            </button>
                        )}
                    </div>

                    {/* Title */}
                    <p className="steam-games-title">Games You've Played:</p>

                    {games.length === 0 ? (
                        // Only show Steam privacy hint when not in demo
                        isDemoMode() ? null : <SteamPrivacyInstructions />
                    ) : (
                        <div className={`carousel-container ${paused ? 'is-paused' : ''}`}>
                            {paused && <div className="pause-overlay"></div>}
                            <div className="carousel-wrapper">
                                <div className="carousel-inner">
                                    {games.map((game, index) => {
                                        const angle = (360 / games.length) * index;
                                        const angleWithRotation = angle + rotation;
                                        const rad = (angleWithRotation * Math.PI) / 180;
                                        const isVisible = Math.cos(rad) > 0.5;
                                        const dipAmount = -60;
                                        const yOffset = -Math.cos(rad) * dipAmount + dipAmount;

                                        return (
                                            <div
                                                key={game.appid}
                                                className={`game-card ${isVisible ? 'visible' : ''}`}
                                                style={{
                                                    transform: `
                            rotateY(${angleWithRotation}deg)
                            translateZ(500px)
                            translateY(${yOffset}px)
                          `,
                                                }}
                                                onClick={() => openRatingModal(game)}
                                            >
                                                <img
                                                    className="game-image"
                                                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                                    alt={game.name}
                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                />
                                                <div className="game-info">
                                                    <p>{game.name}</p>
                                                    <div className="rated-stars-badge" aria-label={`Rated ${ratings[game.appid] ?? 0} out of 5`}>
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <span key={s} className={`star ${(ratings[game.appid] ?? 0) >= s ? 'filled' : ''}`}>
                                                                ★
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <p>{Math.round(game.playtime_forever / 60)} hrs</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recommender */}
                    <div className="chatbot-container">
                        <h1>GameGeniusAI Recommender</h1>

                        <p className="chatbot-subtext">Chosen Games ({topGames.length}/3)</p>
                        <div className="top-games inside">
                            {topGames.map((game) => (
                                <div className="top-game-large" key={game.appid}>
                                    <img
                                        className="top-game-image"
                                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                        alt={game.name}
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <div className="top-game-info">
                                        <p>{game.name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            className="customize-button"
                            onClick={() => {
                                setCustomSelection([]);
                                setShowGamePicker(true);
                            }}
                        >
                            Customize Games
                        </button>

                        <div className="cube-button-container" onClick={fetchRecommendations}>
                            <div className="cube-label">{loading ? 'Thinking...' : 'Get Recommendations'}</div>
                            <div className={`globe-container ${loading ? 'loading' : ''}`}>
                                <div className="globe">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={`lat-${i}`} className="latitude" style={{ transform: `rotateX(${i * 30}deg)` }} />
                                    ))}
                                    {[...Array(6)].map((_, i) => (
                                        <div key={`lon-${i}`} className="longitude" style={{ transform: `rotateY(${i * 30}deg)` }} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {recommendations && (
                            <div className="recommendation-output">
                                <p className="recommendation-header">
                                    Based on your selected games, GameGeniusAI recommends:
                                </p>
                                <pre className="recommendation-text">
                                    {recommendations.split('\n').map((line, i) => {
                                        const [title, desc] = line.split('—');
                                        return (
                                            <div key={i} style={{ marginBottom: '0.8rem' }}>
                                                {title && <span className="game-title">{title.trim()} — </span>}
                                                {desc && <span className="game-desc">{desc.trim()}</span>}
                                            </div>
                                        );
                                    })}
                                </pre>
                            </div>
                        )}

                    </div>

                    {/* Game Picker Modal */}
                    {showGamePicker && (
                        <div className="game-picker-modal">
                            <h2>Select up to 3 Games ({customSelection.length}/3)</h2>
                            <div className="game-picker-list">
                                {games.map((game) => (
                                    <div
                                        key={game.appid}
                                        className={`game-picker-item ${customSelection.find((g) => g.appid === game.appid) ? 'selected' : ''
                                            }`}
                                        onClick={() => {
                                            setCustomSelection((prev) => {
                                                if (prev.some((g) => g.appid === game.appid)) {
                                                    return prev.filter((g) => g.appid !== game.appid);
                                                }
                                                if (prev.length < 3) return [...prev, game];
                                                return [...prev.slice(1), game];
                                            });
                                        }}
                                    >
                                        <img
                                            src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                            alt={game.name}
                                        />
                                        <p>{game.name}</p>
                                    </div>
                                ))}
                            </div>
                            <button
                                className="save-button"
                                disabled={customSelection.length === 0 || customSelection.length > 3}
                                onClick={async () => {
                                    try {
                                        let enriched;
                                        if (isDemoMode()) {
                                            // demo: don’t hit the network; ensure tags exist
                                            enriched = customSelection.map((g) => ({
                                                ...g,
                                                tags: Array.isArray(g.tags) ? g.tags : [],
                                            }));
                                        } else {
                                            // normal steam flow: fetch tags if needed
                                            enriched = await Promise.all(
                                                customSelection.map(async (game) => {
                                                    if (Array.isArray(game.tags) && game.tags.length) return game;
                                                    const res = await fetch(`${API}/api/tags/${game.appid}`, { credentials: 'include' });
                                                    if (!res.ok) throw new Error(`Failed to fetch tags for ${game.name}`);
                                                    const data = await res.json();
                                                    return { ...game, tags: data.tags || [] };
                                                })
                                            );
                                        }

                                        setTopGames(enriched);
                                        setScopedItem('topThree', scopeRef.current, enriched);
                                        setShowGamePicker(false);
                                    } catch (err) {
                                        console.error('❌ Failed to fetch tags or save selection:', err);
                                        alert('Failed to save selection. Check console for errors.');
                                    }
                                }}
                            >
                                Save Selection
                            </button>
                        </div>
                    )}

                    {/* Rating Modal */}
                    {ratingModal.open && ratingModal.game && (
                        <div className="rating-modal-backdrop" onClick={closeRatingModal} role="dialog" aria-modal="true">
                            <div className="rating-modal" onClick={(e) => e.stopPropagation()}>
                                <button className="modal-close" aria-label="Close" onClick={closeRatingModal}>
                                    ×
                                </button>

                                <div className="rating-modal-header">
                                    <img
                                        src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${ratingModal.game.appid}/header.jpg`}
                                        alt={ratingModal.game.name}
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <h3>{ratingModal.game.name}</h3>
                                </div>

                                <div className="rating-modal-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span
                                            key={star}
                                            className={`star ${ratingModal.temp >= star ? 'filled' : ''} clickable`}
                                            onClick={() => setRatingModal((m) => ({ ...m, temp: star }))}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>

                                <div className="rating-modal-actions">
                                    <button
                                        className="submit-rating-btn"
                                        onClick={() => {
                                            setRating(ratingModal.game.appid, ratingModal.temp);
                                            closeRatingModal();
                                        }}
                                        disabled={ratingModal.temp === 0}
                                    >
                                        Submit
                                    </button>
                                    <button className="cancel-rating-btn" onClick={closeRatingModal}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <footer className="footer">
                        <div>Created by <strong>Kyle White</strong> 2025</div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default GameAI;
