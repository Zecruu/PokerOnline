/* ============================================================
   Critter Colony — UI System
   ============================================================ */

class UI {
    static init(game) {
        this.game = game;
        this.activeTab = 'buildings';
        this.notifications = [];

        // Tab buttons
        document.getElementById('tabBuildings').onclick = () => this.switchTab('buildings');
        document.getElementById('tabCritters').onclick = () => this.switchTab('critters');
    }

    static switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
        document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
        this.updatePanel();
    }

    static update() {
        const g = this.game;

        // Resource bar
        document.getElementById('resWood').textContent = Math.floor(g.resources.wood);
        document.getElementById('resStone').textContent = Math.floor(g.resources.stone);
        document.getElementById('resFood').textContent = Math.floor(g.resources.food);
        document.getElementById('trapCount').textContent = g.inventory.traps;
        document.getElementById('critterCount').textContent = `${g.critters.length}/${Buildings.getMaxCritters(g.buildings)}`;

        this.updatePanel();
    }

    static updatePanel() {
        const g = this.game;
        const body = document.getElementById('panelBody');
        if (!body) return;

        if (this.activeTab === 'buildings') {
            let html = '<div class="panel-section-label">Build</div>';
            for (const [type, def] of Object.entries(BUILDING_DEFS)) {
                const canAfford = Buildings.canAfford(type, g.resources);
                const costStr = Object.entries(def.cost).filter(([,v]) => v > 0).map(([k,v]) => `${v} ${k}`).join(', ');
                html += `<div class="build-item ${canAfford ? '' : 'disabled'}" onclick="game.startPlacement('${type}')">`;
                html += `<span class="build-name">${def.name}</span>`;
                html += `<span class="build-cost">${costStr || 'Free'}</span>`;
                if (def.produces) html += `<span class="build-desc">Produces ${def.produces}</span>`;
                else if (def.capacity) html += `<span class="build-desc">+${def.capacity} critter capacity</span>`;
                html += `</div>`;
            }

            // Placed buildings
            if (g.buildings.length > 0) {
                html += '<div class="panel-section-label" style="margin-top:12px">Your Buildings</div>';
                for (const b of g.buildings) {
                    const def = BUILDING_DEFS[b.type];
                    const rate = Buildings.getProductionRate(b, g.critters);
                    html += `<div class="placed-building">`;
                    html += `<span class="pb-name">${def.name}</span>`;
                    html += `<span class="pb-workers">${b.workers.length} workers</span>`;
                    if (def.produces) html += `<span class="pb-rate">+${rate.toFixed(2)}/s ${def.produces}</span>`;
                    html += `</div>`;
                }
            }
            body.innerHTML = html;

        } else if (this.activeTab === 'critters') {
            let html = '';
            if (g.critters.length === 0) {
                html = '<div class="panel-empty">No critters captured yet.<br>Explore and click wild critters to capture!</div>';
            } else {
                for (const c of g.critters) {
                    const sp = SPECIES[c.species];
                    const assignedBuilding = c.assignment ? g.buildings.find(b => b.id === c.assignment) : null;
                    const assignedName = assignedBuilding ? BUILDING_DEFS[assignedBuilding.type].name : 'Idle';

                    html += `<div class="critter-card">`;
                    html += `<div class="cc-header">`;
                    html += `<span class="cc-dot" style="background:${sp.color}"></span>`;
                    html += `<span class="cc-name">${c.nickname}</span>`;
                    html += `<span class="cc-level">Lv.${c.level}</span>`;
                    html += `</div>`;
                    html += `<div class="cc-rarity" style="color:${RARITY_COLORS[sp.rarity]}">${sp.rarity}</div>`;
                    html += `<div class="cc-stats">`;
                    for (const [key, val] of Object.entries(c.stats)) {
                        html += `<span class="cc-stat">${key}:${val}</span>`;
                    }
                    html += `</div>`;

                    // Assignment dropdown
                    html += `<div class="cc-assign">`;
                    html += `<select onchange="game.assignCritter(${c.id}, this.value)">`;
                    html += `<option value="">Idle</option>`;
                    for (const b of g.buildings) {
                        const def = BUILDING_DEFS[b.type];
                        if (!def.produces) continue; // skip nests
                        const selected = c.assignment === b.id ? 'selected' : '';
                        html += `<option value="${b.id}" ${selected}>${def.name} (${b.workers.length})</option>`;
                    }
                    html += `</select>`;
                    html += `</div>`;
                    html += `</div>`;
                }
            }
            body.innerHTML = html;
        }
    }

    static notify(text, duration = 3000) {
        const n = { text, timer: duration / 1000, opacity: 1 };
        this.notifications.push(n);
    }

    static updateNotifications(dt) {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const n = this.notifications[i];
            n.timer -= dt;
            if (n.timer < 0.5) n.opacity = Math.max(0, n.timer / 0.5);
            if (n.timer <= 0) this.notifications.splice(i, 1);
        }
    }

    static renderNotifications(ctx, canvasW) {
        ctx.textAlign = 'center';
        for (let i = 0; i < this.notifications.length; i++) {
            const n = this.notifications[i];
            const y = 80 + i * 30;
            ctx.globalAlpha = n.opacity;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            const tw = ctx.measureText(n.text).width;
            ctx.fillRect(canvasW / 2 - tw / 2 - 12, y - 12, tw + 24, 24);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(n.text, canvasW / 2, y + 4);
        }
        ctx.globalAlpha = 1;
    }
}
