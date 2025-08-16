import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './GameAI.css';

const API = import.meta.env.VITE_API_URL;
async function getTagsForApp(appid) {
    const res = await fetch(`${API}/api/tags/${appid}`);
    if (!res.ok) throw new Error(`Failed to fetch tags for app ${appid}`);
    const data = await res.json();
    return Array.isArray(data.tags) ? data.tags : [];
}

async function enrichWithTags(games) {
    const enriched = await Promise.all(
        games.map(async (g) => {
            // keep existing tags if present and non-empty
            if (Array.isArray(g.tags) && g.tags.length) return g;
            const tags = await getTagsForApp(g.appid);
            return { ...g, tags };
        })
    );
    return enriched;
}
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
    const requestRef = useRef();
    const [ratings, setRatings] = useState(() => {
        const stored = localStorage.getItem('gameRatings');
        return stored ? JSON.parse(stored) : {};
    });
    const [paused, setPaused] = useState(false);
    const [pendingRatingAppId, setPendingRatingAppId] = useState(null);
    const rawAvatar =
        user?.photos?.[2]?.value ??
        user?.photos?.[0]?.value ??
        user?._json?.avatarfull ??
        user?.avatarfull ??
        '';
    const [ratingModal, setRatingModal] = useState({ open: false, game: null, temp: 0 });
    const dragRef = useRef({
        dragging: false,
        lastX: 0,
        velocity: 0,
        inertiaId: 0,
    });
    const containerRef = useRef(null);

    const drag = useRef({
        dragging: false,
        lastX: 0,
        lastT: 0,
        velocity: 0,
        rafId: 0,
        pendingDx: 0,
    });

    const SENS = 0.25;   // rotation per pixel
    const FRICTION = 0.95;
    const STOP_V = 0.04;

    function applyDelta() {
        const d = drag.current.pendingDx;
        drag.current.pendingDx = 0;
        if (d !== 0) setRotation(r => r + d * SENS);
        drag.current.rafId = 0;
    }

    function queueDelta(dx) {
        drag.current.pendingDx += dx;
        if (!drag.current.rafId) {
            drag.current.rafId = requestAnimationFrame(applyDelta);
        }
    }

    function stopInertia() {
        if (drag.current.rafId) {
            cancelAnimationFrame(drag.current.rafId);
            drag.current.rafId = 0;
        }
    }

    function startInertia() {
        stopInertia();
        const step = () => {
            drag.current.velocity *= FRICTION;
            if (Math.abs(drag.current.velocity) < STOP_V) {
                drag.current.velocity = 0;
                return;
            }
            queueDelta(drag.current.velocity);
            drag.current.rafId = requestAnimationFrame(step);
        };
        drag.current.rafId = requestAnimationFrame(step);
    }

    function handleDown(x) {
        drag.current.dragging = true;
        drag.current.lastX = x;
        drag.current.lastT = performance.now();
        drag.current.velocity = 0;
        stopInertia();
        setPaused(true);
    }

    function handleMove(x, e) {
        if (!drag.current.dragging) return;
        const now = performance.now();
        const dx = x - drag.current.lastX;
        const dt = Math.max(1, now - drag.current.lastT);

        const instantV = (dx / dt) * 16; // px per ~frame
        drag.current.velocity = drag.current.velocity * 0.8 + instantV * 0.2;

        drag.current.lastX = x;
        drag.current.lastT = now;

        queueDelta(dx);
        if (e && e.cancelable) e.preventDefault();
    }

    function handleUp() {
        if (!drag.current.dragging) return;
        drag.current.dragging = false;
        startInertia();
        setPaused(false);
    }

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Pointer Events
        const onPointerDown = (e) => {
            el.setPointerCapture?.(e.pointerId);
            handleDown(e.clientX);
        };
        const onPointerMove = (e) => handleMove(e.clientX, e);
        const onPointerUp = () => handleUp();

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointercancel', onPointerUp);

        // iOS: explicit touch listeners with passive:false
        const onTouchStart = (e) => handleDown(e.touches[0].clientX);
        const onTouchMove = (e) => handleMove(e.touches[0].clientX, e);
        const onTouchEnd = () => handleUp();

        el.addEventListener('touchstart', onTouchStart, { passive: false });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onTouchEnd, { passive: false });
        el.addEventListener('touchcancel', onTouchEnd, { passive: false });

        // Mouse fallback
        const onMouseDown = (e) => handleDown(e.clientX);
        const onMouseMove = (e) => handleMove(e.clientX, e);
        const onMouseUp = () => handleUp();

        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointercancel', onPointerUp);

            el.removeEventListener('touchstart', onTouchStart);
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            el.removeEventListener('touchcancel', onTouchEnd);

            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);
    // 1) Load cached topThree on mount (and enrich with tags if missing)
    useEffect(() => {
        (async () => {
            try {
                const stored = localStorage.getItem('topThree');
                if (stored && stored !== 'undefined') {
                    const parsed = JSON.parse(stored) || [];
                    const needsTags = parsed.some(g => !Array.isArray(g.tags) || g.tags.length === 0);
                    const finalTop = needsTags ? await enrichWithTags(parsed) : parsed;

                    setTopGames(finalTop);
                    setCustomSelection(finalTop);
                    if (needsTags) localStorage.setItem('topThree', JSON.stringify(finalTop));
                } else {
                    setTopGames([]);
                }
            } catch (err) {
                console.error('❌ Failed to parse/enrich topThree:', err);
                setTopGames([]);
            }
        })();
    }, []);

    // 2) Load user → games → resume
    useEffect(() => {
        const load = async () => {
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
                    await fetchGames(data.user.id);
                    const resumeUrl = localStorage.getItem('resumeUrl');
                    if (resumeUrl) {
                        localStorage.removeItem('resumeUrl');
                        navigate(resumeUrl);
                    }
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch user:', err);
                setLoading(false);
            }
        };
        load();
    }, [navigate]);

    async function fetchGames(steamId) {
        try {
            const res = await fetch(`${API}/api/games/user/${steamId}`, { credentials: 'include' });
            if (!res.ok) throw new Error(`GET /api/games/user/${steamId} -> ${res.status}`);
            const data = await res.json();

            setGames(data.allGames || []);

            if (Array.isArray(data.topThree) && data.topThree.length) {
                const needsTags = data.topThree.some(g => !Array.isArray(g.tags) || g.tags.length === 0);
                const finalTop = needsTags ? await enrichWithTags(data.topThree) : data.topThree;

                setTopGames(finalTop);
                setCustomSelection(finalTop);
                localStorage.setItem('topThree', JSON.stringify(finalTop));
            } else {
                localStorage.removeItem('topThree');
                setTopGames([]);
                setCustomSelection([]);
            }
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch games:', err);
            setLoading(false);
        }
    }

    const fetchRecommendations = async () => {
        if (!topGames.length) {
            setRecommendations('Pick at least 1 game to get recommendations.');
            return;
        }
        setLoading(true);
        try {
            const ensured = await enrichWithTags(topGames);
            if (ensured !== topGames) {
                setTopGames(ensured);
                localStorage.setItem('topThree', JSON.stringify(ensured));
            }
            const res = await fetch(`${API}/api/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ gamesWithTags: ensured }),
            });
            if (!res.ok) throw new Error(`POST /api/recommend -> ${res.status}`);
            const data = await res.json();
            setRecommendations(data.recommendations);
        } catch (err) {
            setRecommendations('Failed to fetch recommendations.');
            console.error('❌ Error fetching recommendations:', err);
        }
        setLoading(false);
    };

    // Animation loop (pause-aware)
    useEffect(() => {
        const animate = () => {
            if (!paused) setRotation((prev) => prev + 0.05);
            requestRef.current = requestAnimationFrame(animate);
        };
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [paused]);

    if (!API) return <p>Configuration error: API URL missing.</p>;
    if (!user) return <p>You are not logged in with Steam.</p>;


    return (
        <div className="gameai-wrapper">
            <div className="profile-container">
                <div className="gameai-content">
                    {/* Top-left profile */}
                    <div className="profile-header">
                        {avatar ? (
                            <img
                                className="avatar"
                                src={avatar}
                                alt={`${user.displayName} avatar`}
                                onError={(e) => { e.currentTarget.src = '/fallback-avatar.png'; }}
                            />
                        ) : (
                            <div className="avatar" style={{ background: '#033', display: 'inline-block' }} />
                        )}
                        <h1 className="username">{user.displayName}</h1>
                    </div>

                    {/* Title */}
                    <p className="steam-games-title">Games You've Played:</p>

                    {/* Carousel */}
                    <div ref={containerRef}
                        className={`carousel-container ${paused ? 'is-paused' : ''}`}
                    >
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
                                                {(
                                                    <div className="rated-stars-badge" aria-label={`Rated ${ratings[game.appid]} out of 5`}>
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <span key={s} className={`star ${ratings[game.appid] >= s ? 'filled' : ''}`}>★</span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p>{Math.round(game.playtime_forever / 60)} hrs</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

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
                                <pre className="recommendation-text">{recommendations}</pre>
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
                                        const enriched = await Promise.all(
                                            customSelection.map(async (game) => {
                                                const res = await fetch(`${API}/api/tags/${game.appid}`);
                                                if (!res.ok) throw new Error(`Failed to fetch tags for ${game.name}`);
                                                const data = await res.json();
                                                return { ...game, tags: data.tags || [] };
                                            })
                                        );
                                        setTopGames(enriched);
                                        localStorage.setItem('topThree', JSON.stringify(enriched));
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
                </div>
            </div>
        </div>
    );
}

export default GameAI;