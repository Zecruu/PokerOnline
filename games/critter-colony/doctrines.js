/* ============================================================
   Critter Colony — Colony Doctrine System
   ============================================================
   Colony-wide strategic identity. Player picks ONE doctrine after
   building their first Research Lab. Each doctrine reshapes:
     - economy (production, costs, pollution)
     - threat (horde rate, instability, enemy scaling)
     - critter behavior (morale, HP, passive strength)
     - map planning (building risk, biome interaction)

   Data in data/doctrines.json. Modifiers queried via
   Doctrines.getMod(key) — a single shared bag that all systems
   (buildings, combat, threat, assignments) consult without
   knowing what a doctrine "is".

   Save state: { active, unlocked[], pendingSelection } on game.doctrine.
   ============================================================ */

class Doctrines {
    static init(game) {
        this.game = game;
        this._modCache = null;
        // Ensure save state exists
        if (!game.doctrine) {
            game.doctrine = {
                active: null,       // doctrine id, null until chosen
                unlocked: [],       // array of node ids in the CURRENT active doctrine
                pendingSelection: false, // true if prompt is pending
                spentTotal: 0,      // lifetime SP spent on any doctrine (persists across respec)
            };
        }
        // Backfill for older saves that don't have spentTotal
        if (game.doctrine.spentTotal === undefined) {
            game.doctrine.spentTotal = Doctrines.spentInDoctrine();
        }
    }

    // ── DATA ACCESS ─────────────────────────────────────────
    static getAll() {
        return (typeof DOCTRINE_DEFS !== 'undefined') ? DOCTRINE_DEFS : {};
    }
    static getActive() {
        const g = this.game;
        if (!g || !g.doctrine || !g.doctrine.active) return null;
        return this.getAll()[g.doctrine.active] || null;
    }
    static isNodeUnlocked(nodeId) {
        const g = this.game;
        return !!(g && g.doctrine && g.doctrine.unlocked.includes(nodeId));
    }
    static getNode(nodeId) {
        const d = this.getActive();
        if (!d || !d.nodes) return null;
        return d.nodes[nodeId] || null;
    }

    // ── MODIFIER API ────────────────────────────────────────
    // Centralized bag. Any system can ask "what's my X multiplier?"
    // without knowing which doctrine is active.
    // getMod('productionMul') → e.g. 0.25 (+25%); default 0.
    // getFlag('overdriveUnlocked') → bool.
    static getMod(key) {
        const mods = this._getAllMods();
        return mods[key] || 0;
    }

    static getFlag(key) {
        const mods = this._getAllMods();
        return !!mods[key];
    }

    static _getAllMods() {
        if (this._modCache) return this._modCache;
        const out = {};
        const d = this.getActive();
        if (!d) { this._modCache = out; return out; }

        // Merge core
        if (d.core && d.core.mods) Object.entries(d.core.mods).forEach(([k,v]) => out[k] = (out[k]||0) + v);
        // Merge risk
        if (d.risk && d.risk.mods) Object.entries(d.risk.mods).forEach(([k,v]) => out[k] = (out[k]||0) + v);
        // Merge unlocked nodes
        for (const nid of (this.game.doctrine.unlocked || [])) {
            const node = (d.nodes && d.nodes[nid]) || null;
            if (node && node.mods) Object.entries(node.mods).forEach(([k,v]) => out[k] = (out[k]||0) + v);
        }
        this._modCache = out;
        return out;
    }

    static _invalidateCache() {
        this._modCache = null;
        // Cascade to subsystems that key off modifier values
        if (typeof PollutionSystem !== 'undefined' && PollutionSystem.invalidate) {
            PollutionSystem.invalidate();
        }
    }

    // ── SELECTION ───────────────────────────────────────────
    static pick(doctrineId) {
        const d = this.getAll()[doctrineId];
        if (!d) { console.warn('[Doctrines] Unknown doctrine:', doctrineId); return false; }
        this.game.doctrine.active = doctrineId;
        this.game.doctrine.pendingSelection = false;
        this._invalidateCache();
        // Apply one-shot effects (e.g. building HP recalc)
        this._applyOneShotEffects();
        if (typeof UI !== 'undefined') UI.notify && UI.notify(`${d.icon} ${d.name} adopted!`, 4000);
        if (typeof UI !== 'undefined') UI.update && UI.update();
        return true;
    }

    // Trigger the selection modal. Called from game.js when player builds first Research Lab.
    static triggerSelection() {
        if (this.game.doctrine.active) return; // already picked
        this.game.doctrine.pendingSelection = true;
        if (typeof UI !== 'undefined') UI.showDoctrineSelection && UI.showDoctrineSelection();
    }

    // ── NODE UNLOCK ─────────────────────────────────────────
    static canUnlock(nodeId) {
        const d = this.getActive();
        if (!d || !d.nodes) return { ok: false, reason: 'No doctrine active' };
        const node = d.nodes[nodeId];
        if (!node) return { ok: false, reason: 'Unknown node' };
        if (this.isNodeUnlocked(nodeId)) return { ok: false, reason: 'Already unlocked' };
        if ((this.game.skillPoints || 0) < node.cost) return { ok: false, reason: `Need ${node.cost} SP` };
        // Prereqs within this doctrine
        for (const req of (node.requires || [])) {
            if (!this.isNodeUnlocked(req)) return { ok: false, reason: `Requires ${d.nodes[req]?.name || req}` };
        }
        // Hybrid cross-branch gate: player must be committed to this doctrine first.
        // Uses spentInDoctrine (not spentTotal) so switching/respec doesn't unlock hybrids for free.
        if (node.tier === 'hybrid' && node.crossBranch) {
            const inDoctrine = this.spentInDoctrine();
            if (inDoctrine < 4) return { ok: false, reason: `Need 4 SP invested in this doctrine first (${inDoctrine}/4)` };
        }
        return { ok: true };
    }

    static unlock(nodeId) {
        const chk = this.canUnlock(nodeId);
        if (!chk.ok) {
            if (typeof UI !== 'undefined') UI.notify && UI.notify(chk.reason, 3000);
            return false;
        }
        const node = this.getNode(nodeId);
        this.game.skillPoints -= node.cost;
        this.game.doctrine.unlocked.push(nodeId);
        this.game.doctrine.spentTotal = (this.game.doctrine.spentTotal || 0) + node.cost;
        this._invalidateCache();
        this._applyOneShotEffects();
        if (typeof UI !== 'undefined') UI.notify && UI.notify(`⭐ Unlocked: ${node.name}`, 3500);
        if (typeof UI !== 'undefined') UI.update && UI.update();
        return true;
    }

    // SP spent on nodes in the CURRENT active doctrine only.
    // Used for hybrid gating — player must commit to a path before branching.
    static spentInDoctrine() {
        const d = this.getActive();
        if (!d || !d.nodes) return 0;
        return (this.game.doctrine.unlocked || []).reduce((sum, nid) => sum + (d.nodes[nid]?.cost || 0), 0);
    }

    // Lifetime SP invested in any doctrine (includes points refunded via respec).
    // Persists across respec so we can reward "dedicated doctrine players" later
    // with cosmetic titles, extra starting perks, cross-doctrine passives, etc.
    static spentTotal() {
        return (this.game && this.game.doctrine && this.game.doctrine.spentTotal) || 0;
    }

    // One-shot effects that need explicit recalculation (building HP bonuses, etc.)
    static _applyOneShotEffects() {
        const game = this.game;
        if (!game) return;
        // Recalculate building HP with new multipliers
        const hpMul = 1 + this.getMod('buildingHpMul');
        for (const b of game.buildings || []) {
            const def = BUILDING_DEFS[b.type];
            if (!def || !def.hp) continue;
            const researchHp = (game.techUnlocks?.baseHp || 0) * 50;
            const newMaxHp = Math.max(1, Math.floor((def.hp + researchHp) * hpMul));
            // Preserve damage ratio
            const ratio = b.hp && b.maxHp ? (b.hp / b.maxHp) : 1;
            b.maxHp = newMaxHp;
            b.hp = Math.max(1, Math.floor(newMaxHp * ratio));
        }
    }

    // ── RISK SYSTEM HOOKS ───────────────────────────────────
    // Systems call these instead of each reimplementing risk logic.

    // Called every frame by game.update. Drives pollution, instability, threat.
    static tick(dt) {
        const d = this.getActive();
        if (!d || !d.risk) return;
        const mechanic = d.risk.mechanic;
        if (mechanic === 'pollution') this._tickPollution(dt);
        else if (mechanic === 'instability') this._tickInstability(dt);
        else if (mechanic === 'building_fragility') this._tickFragility(dt);
        else if (mechanic === 'threat_multiplier') this._tickThreat(dt);
    }

    // Industrial: delegated to PollutionSystem (see pollution.js).
    static _tickPollution(dt) {
        if (typeof PollutionSystem !== 'undefined' && PollutionSystem.tick) {
            PollutionSystem.tick(dt);
        }
    }

    // Arcane: periodically fire a weird event near a random building.
    static _tickInstability(dt) {
        const game = this.game;
        if (!game._instabilityTimer) game._instabilityTimer = 45 + Math.random() * 30;
        game._instabilityTimer -= dt;
        if (game._instabilityTimer > 0) return;
        const freqMul = 1 - (this.getMod('instabilityFrequencyMul') * 0.3); // extra nodes reduce gap
        game._instabilityTimer = Math.max(15, (45 + Math.random() * 30) * (1 - Math.min(0.5, this.getMod('instabilityFrequencyMul') * 0.5)));
        this._fireInstabilityEvent();
    }

    static _fireInstabilityEvent() {
        const game = this.game;
        if (!game.buildings || game.buildings.length === 0) return;
        const benefRate = this.getMod('instabilityBeneficialRate') || 0.40; // 40% default
        const healInstead = this.getFlag('anomalyHealInstead');
        const roll = Math.random();
        const beneficial = roll < benefRate || healInstead;
        const target = game.buildings[Math.floor(Math.random() * game.buildings.length)];
        const def = BUILDING_DEFS[target.type];
        if (!def) return;
        const bx = (target.gridX + (def.size||1)/2) * TILE_SIZE;
        const by = (target.gridY + (def.size||1)/2) * TILE_SIZE;

        if (beneficial) {
            // Good event: resource dupe, XP burst, or healing
            const effects = [
                () => { game.resources.wood = Math.min((game.resources.wood||0) + 25, 9999); game._spawnDmgNum && game._spawnDmgNum(bx, by, '+25 wood', 0x4ade80); },
                () => { game.resources.stone = Math.min((game.resources.stone||0) + 25, 9999); game._spawnDmgNum && game._spawnDmgNum(bx, by, '+25 stone', 0x90a4ae); },
                () => { if (game.player) { game.player.hp = game.player.maxHp; game._spawnDmgNum && game._spawnDmgNum(game.player.x, game.player.y, 'RESTORED', 0x4ade80); } },
                () => { game.grantPlayerXp && game.grantPlayerXp(50); },
                () => { if (target.hp !== undefined) { target.hp = Math.min(target.maxHp, target.hp + target.maxHp * 0.5); game._spawnDmgNum && game._spawnDmgNum(bx, by, 'REPAIRED', 0x4fc3f7); } },
            ];
            effects[Math.floor(Math.random() * effects.length)]();
            if (UI) UI.notify && UI.notify('✨ Arcane surge: fortune!', 3000);
        } else {
            // Bad: damage building, stun nearby critters, drop resources
            if (target.hp !== undefined) {
                target.hp = Math.max(0, target.hp - target.maxHp * 0.15);
                game._spawnDmgNum && game._spawnDmgNum(bx, by, 'UNSTABLE', 0xe040fb);
            }
            if (UI) UI.notify && UI.notify('⚠ Arcane instability!', 3000);
        }
        // Fairy spawn chance from Fey Pact hybrid
        if (this.getFlag('anomalyFairyChance') && Math.random() < 0.10) {
            // TODO: spawn a wild fairy critter near target; left as stub
        }
    }

    // Nature: no active tick needed — building_fragility is handled via buildingHpMul mod
    // in _applyOneShotEffects. This is a no-op tick.
    static _tickFragility(dt) { /* passive — mod applied via _applyOneShotEffects */ }

    // Warlord: threat pressure accumulates over time and shortens horde timer.
    static _tickThreat(dt) {
        const game = this.game;
        const mul = this.getMod('threatGenerationMul');
        if (!mul || !game.hordeTimer) return;
        // Extra bleed beyond normal countdown
        game.hordeTimer -= dt * mul;
    }

    // ── SAVE/LOAD ───────────────────────────────────────────
    static save() {
        const g = this.game;
        return g && g.doctrine ? {
            active: g.doctrine.active,
            unlocked: Array.from(g.doctrine.unlocked || []),
            pendingSelection: !!g.doctrine.pendingSelection,
            spentTotal: g.doctrine.spentTotal || 0,
        } : null;
    }

    static load(saved) {
        if (!this.game) return;
        if (saved && typeof saved === 'object') {
            this.game.doctrine = {
                active: saved.active || null,
                unlocked: Array.isArray(saved.unlocked) ? saved.unlocked : [],
                pendingSelection: !!saved.pendingSelection,
                spentTotal: saved.spentTotal || 0,
            };
        } else {
            this.game.doctrine = { active: null, unlocked: [], pendingSelection: false, spentTotal: 0 };
        }
        // Backfill: if spentTotal missing from old save, reconstruct from current unlocks
        if (!this.game.doctrine.spentTotal) {
            this.game.doctrine.spentTotal = Doctrines.spentInDoctrine();
        }
        this._invalidateCache();
        this._applyOneShotEffects();
    }

    // Respec: refund current doctrine's SP, clear active doctrine, but keep spentTotal.
    // spentTotal is LIFETIME and never resets — used for future "dedicated player" perks.
    static respec() {
        if (!this.game || !this.game.doctrine) return;
        const refund = this.spentInDoctrine();
        this.game.skillPoints = (this.game.skillPoints || 0) + refund;
        this.game.doctrine.unlocked = [];
        this.game.doctrine.active = null;
        // spentTotal preserved — reflects commitment history, not current investment
        this._invalidateCache();
        this._applyOneShotEffects();
        if (typeof UI !== 'undefined') UI.notify && UI.notify(`Respec! Refunded ${refund} SP (lifetime: ${this.spentTotal()})`, 3500);
        if (typeof UI !== 'undefined') UI.update && UI.update();
    }
}

// Instability visual placeholder — populated each tick by _fireInstabilityEvent when rendering is added
Doctrines._instabilityFx = [];
