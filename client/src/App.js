import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import ThreeBackground from './ThreeBackground';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PLAYER_ICONS = {
  Dilip: '🦁',
  Sankit: '🐺',
  Prajwol: '🦅',
  Anish: '🐉',
};

const PLAYERS = ['Dilip', 'Sankit', 'Prajwol', 'Anish'];

function PasswordModal({ title, onConfirm, onCancel }) {
  const [pwd, setPwd] = useState('');
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <input
          autoFocus
          type="password"
          className="password-input"
          placeholder="Enter password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onConfirm(pwd)}
        />
        <div className="modal-actions">
          <button className="confirm-yes" onClick={() => onConfirm(pwd)}>Confirm</button>
          <button className="confirm-no"  onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRows() {
  return [...Array(4)].map((_, i) => (
    <tr key={i} className="skeleton-row">
      <td><span className="skeleton-cell small" /></td>
      <td className="player-col"><span className="skeleton-cell wide" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
      <td><span className="skeleton-cell small" /></td>
    </tr>
  ));
}

function getResultBadge(match) {
  if (match.homeGoals > match.awayGoals) return { label: 'W', cls: 'win',  side: match.homePlayer };
  if (match.homeGoals < match.awayGoals) return { label: 'W', cls: 'win',  side: match.awayPlayer };
  return { label: 'D', cls: 'draw', side: null };
}

function App() {
  const [standings, setStandings]           = useState([]);
  const [matches,   setMatches]             = useState([]);
  const [loading,   setLoading]             = useState(true);
  const [homePlayer, setHomePlayer]         = useState('');
  const [awayPlayer, setAwayPlayer]         = useState('');
  const [homeGoals,  setHomeGoals]          = useState('');
  const [awayGoals,  setAwayGoals]          = useState('');
  const [password,   setPassword]           = useState('');
  const [message,    setMessage]            = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [modal, setModal]                   = useState(null); // { title, onConfirm }

  const fetchData = useCallback(async () => {
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`${API}/standings`),
        fetch(`${API}/matches`),
      ]);
      setStandings(await sRes.json());
      setMatches(await mRes.json());
    } catch {
      setMessage({ text: 'Failed to load data. Is the server running?', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!homePlayer || !awayPlayer) { showMsg('Please select both players', 'error'); return; }
    if (homePlayer === awayPlayer)  { showMsg('Players must be different!', 'error'); return; }
    if (homeGoals === '' || awayGoals === '') { showMsg('Please enter goals for both players', 'error'); return; }
    if (!password) { showMsg('Please enter the password', 'error'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homePlayer, awayPlayer, homeGoals: +homeGoals, awayGoals: +awayGoals, password }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg(`⚽ ${homePlayer} ${homeGoals} – ${awayGoals} ${awayPlayer} recorded!`);
        setHomePlayer(''); setAwayPlayer(''); setHomeGoals(''); setAwayGoals(''); setPassword('');
        fetchData();
      } else {
        showMsg(data.error, 'error');
      }
    } catch {
      showMsg('Failed to submit result', 'error');
    }
    setIsSubmitting(false);
  };

  const handleUndo = (matchId) => {
    setModal({
      title: '🔐 Password to undo match',
      onConfirm: async (pwd) => {
        setModal(null);
        try {
          const res = await fetch(`${API}/matches/${matchId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
          });
          if (res.ok) { showMsg('Match removed!'); fetchData(); }
          else { const d = await res.json(); showMsg(d.error, 'error'); }
        } catch { showMsg('Failed to undo match', 'error'); }
      },
    });
  };

  const handleReset = () => {
    setModal({
      title: '🔐 Password to reset league',
      onConfirm: async (pwd) => {
        setModal(null);
        try {
          const res = await fetch(`${API}/reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
          });
          if (res.ok) { showMsg('League has been reset!'); setShowConfirmReset(false); fetchData(); }
          else { const d = await res.json(); showMsg(d.error, 'error'); }
        } catch { showMsg('Failed to reset league', 'error'); }
      },
    });
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getRankBadge = (idx) => ['🥇','🥈','🥉'][idx] ?? `#${idx + 1}`;

  return (
    <div className="app">
      <ThreeBackground />

      {modal && (
        <PasswordModal
          title={modal.title}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      <header className="header">
        <div className="header-content">
          <div className="logo">⚽</div>
          <h1>E-Football League</h1>
          <p className="subtitle">The Ultimate Showdown</p>
        </div>
      </header>

      {message.text && (
        <div className={`toast ${message.type}`}>{message.text}</div>
      )}

      <main className="main">

        {/* ── Standings ── */}
        <section className="card standings-card" style={{ animationDelay: '0.05s' }}>
          <div className="card-header"><h2>🏆 League Standings</h2></div>
          <div className="table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th className="rank-col">#</th>
                  <th className="player-col">Player</th>
                  <th>P</th><th>W</th><th>D</th><th>L</th>
                  <th>GF</th><th>GA</th><th>GD</th>
                  <th className="pts-col">PTS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <SkeletonRows /> : standings.map((player, idx) => (
                  <tr key={player.name} className={`standing-row rank-${idx + 1}`}>
                    <td className="rank-col"><span className="rank-badge">{getRankBadge(idx)}</span></td>
                    <td className="player-col">
                      <span className="player-icon">{PLAYER_ICONS[player.name]}</span>
                      <span className="player-name">{player.name}</span>
                    </td>
                    <td>{player.played}</td>
                    <td className="win-col">{player.won}</td>
                    <td>{player.drawn}</td>
                    <td className="loss-col">{player.lost}</td>
                    <td>{player.gf}</td>
                    <td>{player.ga}</td>
                    <td className={`gd-col ${player.gd > 0 ? 'positive' : player.gd < 0 ? 'negative' : ''}`}>
                      {player.gd > 0 ? `+${player.gd}` : player.gd}
                    </td>
                    <td className="pts-col"><span className="points-badge">{player.points}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Submit Result ── */}
        <section className="card form-card" style={{ animationDelay: '0.12s' }}>
          <div className="card-header"><h2>📝 Submit Result</h2></div>
          <form onSubmit={handleSubmit} className="result-form">
            <div className="match-input">
              <div className="player-side home-side">
                <label>Home Player</label>
                <div className="player-select-grid">
                  {PLAYERS.map((p) => (
                    <button type="button" key={p}
                      className={`player-btn ${homePlayer === p ? 'selected' : ''} ${awayPlayer === p ? 'disabled' : ''}`}
                      onClick={() => awayPlayer !== p && setHomePlayer(p)} disabled={awayPlayer === p}>
                      <span className="btn-icon">{PLAYER_ICONS[p]}</span><span>{p}</span>
                    </button>
                  ))}
                </div>
                <div className="goal-input">
                  <button type="button" className="goal-btn" onClick={() => setHomeGoals(Math.max(0, (+homeGoals || 0) - 1))}>−</button>
                  <input type="number" min="0" max="99" value={homeGoals} onChange={(e) => setHomeGoals(e.target.value)} placeholder="0" className="goal-field" />
                  <button type="button" className="goal-btn" onClick={() => setHomeGoals((+homeGoals || 0) + 1)}>+</button>
                </div>
              </div>

              <div className="vs-divider"><span>VS</span></div>

              <div className="player-side away-side">
                <label>Away Player</label>
                <div className="player-select-grid">
                  {PLAYERS.map((p) => (
                    <button type="button" key={p}
                      className={`player-btn ${awayPlayer === p ? 'selected' : ''} ${homePlayer === p ? 'disabled' : ''}`}
                      onClick={() => homePlayer !== p && setAwayPlayer(p)} disabled={homePlayer === p}>
                      <span className="btn-icon">{PLAYER_ICONS[p]}</span><span>{p}</span>
                    </button>
                  ))}
                </div>
                <div className="goal-input">
                  <button type="button" className="goal-btn" onClick={() => setAwayGoals(Math.max(0, (+awayGoals || 0) - 1))}>−</button>
                  <input type="number" min="0" max="99" value={awayGoals} onChange={(e) => setAwayGoals(e.target.value)} placeholder="0" className="goal-field" />
                  <button type="button" className="goal-btn" onClick={() => setAwayGoals((+awayGoals || 0) + 1)}>+</button>
                </div>
              </div>
            </div>
            <div className="password-field">
              <label>🔒 Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to submit"
                className="password-input"
              />
            </div>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Submitting…' : '🏁 Submit Result'}
            </button>
          </form>
        </section>

        {/* ── Match History ── */}
        <section className="card history-card" style={{ animationDelay: '0.19s' }}>
          <div className="card-header">
            <h2>📜 Match History</h2>
            {matches.length > 0 && (
              <span className="match-count">{matches.length} match{matches.length !== 1 ? 'es' : ''}</span>
            )}
          </div>
          {loading || matches.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">{loading ? '⏳' : '🏟️'}</span>
              <p>{loading ? 'Loading matches…' : 'No matches played yet. Submit your first result!'}</p>
            </div>
          ) : (
            <div className="matches-list">
              {matches.map((match) => {
                const badge = getResultBadge(match);
                return (
                  <div key={match.id} className="match-item">
                    <div className="match-players">
                      <span className="match-player home">{PLAYER_ICONS[match.homePlayer]} {match.homePlayer}</span>
                      <span className="match-score">
                        <span className={match.homeGoals > match.awayGoals ? 'winner' : match.homeGoals < match.awayGoals ? 'loser' : ''}>{match.homeGoals}</span>
                        <span className="score-sep">:</span>
                        <span className={match.awayGoals > match.homeGoals ? 'winner' : match.awayGoals < match.homeGoals ? 'loser' : ''}>{match.awayGoals}</span>
                      </span>
                      <span className="match-player away">{match.awayPlayer} {PLAYER_ICONS[match.awayPlayer]}</span>
                    </div>
                    <div className="match-meta">
                      <span className={`result-badge ${badge.cls}`}>{badge.label}</span>
                      <span className="match-date">{formatDate(match.date)}</span>
                      <button className="undo-btn" onClick={() => handleUndo(match.id)} title="Remove this match">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Reset ── */}
        <div className="reset-section">
          {!showConfirmReset ? (
            <button className="reset-btn" onClick={() => setShowConfirmReset(true)}>🔄 Reset League</button>
          ) : (
            <div className="reset-confirm">
              <p>Are you sure? This will erase all data!</p>
              <button className="confirm-yes" onClick={handleReset}>Yes, Reset</button>
              <button className="confirm-no"  onClick={() => setShowConfirmReset(false)}>Cancel</button>
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>E-Football League &copy; 2026 — Built for the squad 🎮</p>
      </footer>
    </div>
  );
}

export default App;
