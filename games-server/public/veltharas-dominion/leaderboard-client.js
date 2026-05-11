// Leaderboard + Daily Challenge client.
//   - Wires the Daily Challenge & Leaderboard menu buttons
//   - Persists the player name in localStorage
//   - Fetches today's challenge + leaderboard
//   - Applies daily modifier flags to the running game
//   - Submits scores on game over
//
// Designed to be additive: it doesn't touch internal game state directly.
// Instead it sets `window.veltharaDaily` flags which the game JS can read
// (or not — if the game ignores them, daily mode just acts as "labelled
// vanilla run" with leaderboard submission, which is still useful).

(function () {
  const NAME_KEY = "velthara.playerName";
  const API_BASE = "/api/leaderboard";
  const GAME = "velthara";

  // ── Player name (one-shot prompt) ────────────────────────────
  function getPlayerName() {
    try { return localStorage.getItem(NAME_KEY) || null; } catch (_) { return null; }
  }
  function setPlayerName(name) {
    try { localStorage.setItem(NAME_KEY, name); } catch (_) {}
  }
  function refreshNameDisplays() {
    const name = getPlayerName();
    const el = document.getElementById("daily-name-display");
    if (el) el.textContent = name || "—";
  }
  function promptForName() {
    return new Promise((resolve) => {
      const overlay = document.getElementById("name-prompt-menu");
      const input = document.getElementById("player-name-input");
      const err = document.getElementById("name-prompt-error");
      const save = document.getElementById("name-prompt-save");
      const cancel = document.getElementById("name-prompt-cancel");
      input.value = getPlayerName() || "";
      err.textContent = "";
      overlay.classList.remove("hidden");
      input.focus();
      const cleanup = () => {
        overlay.classList.add("hidden");
        save.onclick = null;
        cancel.onclick = null;
        input.onkeydown = null;
      };
      const trySave = () => {
        const val = (input.value || "").trim().replace(/[^\w\-\. ]/g, "").slice(0, 24);
        if (val.length < 2) { err.textContent = "Name needs 2-24 letters/numbers/dashes."; return; }
        setPlayerName(val);
        refreshNameDisplays();
        cleanup();
        resolve(val);
      };
      save.onclick = trySave;
      cancel.onclick = () => { cleanup(); resolve(null); };
      input.onkeydown = (e) => { if (e.key === "Enter") trySave(); };
    });
  }

  // ── API ──────────────────────────────────────────────────────
  async function fetchToday() {
    try {
      const res = await fetch(`${API_BASE}/daily/today`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }
  async function fetchDailyLeaderboard(dateStr) {
    try {
      const url = `${API_BASE}/daily${dateStr ? `?date=${encodeURIComponent(dateStr)}` : ""}&game=${GAME}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }
  async function fetchAllTime() {
    try {
      const res = await fetch(`${API_BASE}/all-time?game=${GAME}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (_) { return null; }
  }
  async function submitScore(payload) {
    try {
      const res = await fetch(`${API_BASE}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[leaderboard] submit rejected:", data.error || res.status);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("[leaderboard] submit failed:", err);
      return false;
    }
  }

  // ── Daily challenge state ────────────────────────────────────
  // Goal-based: today's challenge is 3 goals to chase during normal runs.
  // Completion is tracked client-side in localStorage (per dailyKey, per
  // player). The server evaluates submitted runs and reports goalsCompleted
  // in the response — we treat that as the source of truth and merge into
  // local cache.
  window.veltharaDaily = {
    active: false,
    challenge: null, // { dailyKey, goals, seed }
    runStartTime: 0,
  };
  const DAILY_PROGRESS_KEY_PREFIX = "velthara.dailyProgress.";

  function getDailyProgress(dailyKey) {
    try {
      const raw = localStorage.getItem(DAILY_PROGRESS_KEY_PREFIX + dailyKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) { return new Set(); }
  }
  function setDailyProgress(dailyKey, completedSet) {
    try {
      localStorage.setItem(DAILY_PROGRESS_KEY_PREFIX + dailyKey, JSON.stringify([...completedSet]));
    } catch (_) {}
  }
  function evalGoalsLocally(goals, runStats) {
    return goals.filter((g) => (runStats[g.stat] || 0) >= g.gte).map((g) => g.id);
  }

  function startDailyRun() {
    const ch = window.veltharaDaily.challenge;
    if (!ch) return;
    window.veltharaDaily.active = true;
    window.veltharaDaily.runStartTime = Date.now();
    // Hide overlay + try to start the game by clicking the existing start button.
    document.getElementById("daily-menu").classList.add("hidden");
    // If the game exposes a public start function, prefer that. Otherwise we
    // synthesize a click on #start-btn so the existing flow runs.
    if (typeof window.startDailyChallenge === "function") {
      window.startDailyChallenge(ch);
    } else {
      document.getElementById("start-btn")?.click();
    }
  }

  // ── Public hook the game calls when a run ends ───────────────
  // Game code should call this on game-over with the run summary. ANY run
  // (daily or not) is checked against today's goals — there's no "daily mode"
  // to opt into, every run counts toward the daily goals.
  window.submitVeltharaRun = async function ({ character, wave, kills, level }) {
    const playerName = getPlayerName();
    const runDuration = Math.floor(((Date.now() - (window.veltharaDaily.runStartTime || Date.now())) / 1000));
    const baseBody = {
      game: GAME,
      playerName: playerName || "anon",
      character: String(character || "unknown"),
      wave: Math.floor(wave || 0),
      kills: Math.floor(kills || 0),
      level: Math.floor(level || 0),
      runDuration,
    };

    // Always evaluate against today's goals locally so the player sees
    // immediate feedback even if the server is offline.
    const ch = window.veltharaDaily.challenge;
    if (ch && ch.goals) {
      const completedNow = evalGoalsLocally(ch.goals, baseBody);
      if (completedNow.length > 0) {
        const existing = getDailyProgress(ch.dailyKey);
        const newlyCompleted = completedNow.filter((id) => !existing.has(id));
        completedNow.forEach((id) => existing.add(id));
        setDailyProgress(ch.dailyKey, existing);
        if (newlyCompleted.length > 0 && typeof window.showToast === "function") {
          newlyCompleted.forEach((id) => {
            const g = ch.goals.find((x) => x.id === id);
            if (g) window.showToast(`✓ Daily Challenge: ${g.name}`);
          });
        }
      }
    }

    if (!playerName) return; // no name → skip server submit (still counts locally)
    await submitScore({ ...baseBody, mode: "allTime" });
    await submitScore({ ...baseBody, mode: "daily" });
    window.veltharaDaily.active = false;
  };

  // ── Rendering ────────────────────────────────────────────────
  function renderLeaderboardRows(entries, isDaily) {
    if (!entries || entries.length === 0) {
      return `<div class="lb-empty" style="color:#888;text-align:center;padding:1.5rem;">No entries yet — be first.</div>`;
    }
    const rows = entries.map((e, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const charBadge = isDaily ? "" : `<span style="color:#888;font-size:0.8em;margin-left:6px;">[${e.character || ""}]</span>`;
      return `<div class="lb-row" style="display:grid;grid-template-columns:34px 1fr auto auto auto;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="color:#fbbf24;font-weight:900;">${medal}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(e.playerName)}${charBadge}</span>
        <span style="color:#fbbf24;font-weight:900;">W ${e.wave}</span>
        <span style="color:#aaa;">${e.kills} k</span>
        <span style="color:#aaa;">L ${e.level}</span>
      </div>`;
    });
    return rows.join("");
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }

  async function refreshDailyMenu() {
    const ch = await fetchToday();
    const goalsBox = document.getElementById("daily-modifier"); // reuse the existing card slot
    if (!ch) {
      goalsBox.innerHTML = `<div style="color:#888;">Server offline. Try again later.</div>`;
      document.getElementById("daily-leaderboard-mini").innerHTML = "<div class='lb-empty' style='color:#888;'>Offline.</div>";
      return;
    }
    window.veltharaDaily.challenge = ch;
    document.getElementById("daily-date").textContent = `Resets midnight UTC · ${ch.dailyKey}`;

    const completed = getDailyProgress(ch.dailyKey);
    goalsBox.innerHTML = ch.goals.map((g) => {
      const done = completed.has(g.id);
      const tick = done ? '<span style="color:#22c55e;">✓</span>' : '<span style="color:#888;">☐</span>';
      const titleStyle = done ? "color:#86efac;text-decoration:line-through;" : "color:#fbbf24;";
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:1.4rem;line-height:1;">${tick}</div>
        <div style="flex:1;">
          <div style="${titleStyle}font-weight:900;font-size:1rem;">${escapeHtml(g.name)}</div>
          <div style="color:#d8c8a8;font-size:0.85rem;margin-top:2px;">${escapeHtml(g.description)}</div>
        </div>
      </div>`;
    }).join("");
    const allDone = ch.goals.every((g) => completed.has(g.id));
    if (allDone) {
      goalsBox.innerHTML += `<div style="margin-top:12px;padding:8px;border-radius:6px;background:rgba(34,197,94,0.15);color:#86efac;text-align:center;font-weight:900;">🏆 All daily goals complete!</div>`;
    }

    const board = await fetchDailyLeaderboard(ch.dailyKey);
    document.getElementById("daily-leaderboard-mini").innerHTML =
      renderLeaderboardRows(board && board.entries ? board.entries.slice(0, 8) : [], true);
    refreshNameDisplays();
  }

  async function refreshLeaderboardMenu(category) {
    const target = document.getElementById("leaderboard-content");
    target.innerHTML = `<div class='lb-loading'>Loading...</div>`;
    if (category === "daily") {
      const ch = await fetchToday();
      const board = ch ? await fetchDailyLeaderboard(ch.dailyKey) : null;
      const header = ch ? `<div style="margin-bottom:10px;color:#fbbf24;font-weight:700;">${ch.modifier.name} — ${ch.dailyKey}</div>` : "";
      target.innerHTML = header + renderLeaderboardRows(board && board.entries ? board.entries : [], true);
    } else {
      const board = await fetchAllTime();
      target.innerHTML = renderLeaderboardRows(board && board.entries ? board.entries : [], false);
    }
  }

  // ── Wiring ───────────────────────────────────────────────────
  function wire() {
    document.getElementById("daily-challenge-btn")?.addEventListener("click", async () => {
      let name = getPlayerName();
      if (!name) {
        name = await promptForName();
        if (!name) return;
      }
      document.getElementById("start-menu")?.classList.add("hidden");
      document.getElementById("daily-menu").classList.remove("hidden");
      refreshDailyMenu();
    });

    document.getElementById("daily-back-btn")?.addEventListener("click", () => {
      document.getElementById("daily-menu").classList.add("hidden");
      document.getElementById("start-menu")?.classList.remove("hidden");
    });

    document.getElementById("daily-start-btn")?.addEventListener("click", startDailyRun);

    document.getElementById("daily-name-change")?.addEventListener("click", async (e) => {
      e.preventDefault();
      await promptForName();
      refreshDailyMenu();
    });

    document.getElementById("leaderboard-btn")?.addEventListener("click", () => {
      document.getElementById("start-menu")?.classList.add("hidden");
      document.getElementById("leaderboard-menu").classList.remove("hidden");
      refreshLeaderboardMenu("daily");
    });

    document.getElementById("lb-back-btn")?.addEventListener("click", () => {
      document.getElementById("leaderboard-menu").classList.add("hidden");
      document.getElementById("start-menu")?.classList.remove("hidden");
    });

    document.querySelectorAll("#leaderboard-tabs .lb-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#leaderboard-tabs .lb-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        refreshLeaderboardMenu(tab.dataset.category);
      });
    });

    refreshNameDisplays();
    // Pre-load today's challenge so goal evaluation works even if the player
    // never opens the daily modal before their first run.
    fetchToday().then((ch) => { if (ch) window.veltharaDaily.challenge = ch; });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
