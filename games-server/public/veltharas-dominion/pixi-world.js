/*
 * pixi-world.js — WebGL world renderer for Velthara's Dominion.
 *
 * Incremental migration off Canvas2D. The Pixi canvas sits UNDER the existing
 * game canvas; the game canvas is cleared to transparent each frame so Pixi
 * shows through. Layers migrate one at a time in draw order (background →
 * enemies → player → projectiles → effects); whatever still draws on the
 * Canvas2D layer naturally composites ON TOP of the Pixi layer, preserving
 * the original z-order.
 *
 * Camera parity: the Canvas2D camera was
 *     translate(cx+shakeX, cy+shakeY); scale(s,s); translate(-cx,-cy)
 * which is reproduced on the Pixi `world` container via position/scale/pivot.
 * Entities are placed at the SAME screen coords the game already computes
 * (sx = player.x + (wx - worldX)), so no coordinate math changes.
 */
class PixiWorld {
    constructor(hostCanvas) {
        this.ok = false;
        if (typeof PIXI === 'undefined') {
            console.warn('[PixiWorld] PIXI not loaded — staying on Canvas2D.');
            return;
        }
        this.hostCanvas = hostCanvas;

        // WebGL app. Transparent so the Canvas2D layer above shows through.
        this.app = new PIXI.Application({
            width: hostCanvas.width || window.innerWidth,
            height: hostCanvas.height || window.innerHeight,
            backgroundAlpha: 0,
            antialias: false,
            powerPreference: 'high-performance',
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
        });
        this.view = this.app.view;
        this.app.ticker.stop();  // we drive rendering from the game loop

        // Position the Pixi canvas exactly over the host, one z-layer below it.
        const hostStyle = window.getComputedStyle(hostCanvas);
        this.view.style.position = hostStyle.position === 'static' ? 'absolute' : hostStyle.position;
        this.view.style.left = '0';
        this.view.style.top = '0';
        this.view.style.width = '100%';
        this.view.style.height = '100%';
        this.view.style.pointerEvents = 'none';
        const hostZ = parseInt(hostStyle.zIndex, 10);
        this.view.style.zIndex = String(Number.isFinite(hostZ) ? hostZ - 1 : 0);
        hostCanvas.parentNode.insertBefore(this.view, hostCanvas);

        // World container carries the camera transform. Background is its own
        // child so it tiles independently of entity layers.
        this.world = new PIXI.Container();
        this.app.stage.addChild(this.world);

        // Ordered layer containers (lower = drawn first = behind).
        this.layers = {};
        for (const name of ['background', 'enemies', 'player', 'projectiles', 'effects']) {
            const c = new PIXI.Container();
            c.sortableChildren = false;
            this.world.addChild(c);
            this.layers[name] = c;
        }

        this._textures = new Map();   // url -> PIXI.Texture
        this._pools = {};             // layerName -> { sprites: [], used: int }
        this._bgTile = null;          // TilingSprite for the hell floor
        this.ok = true;
        console.log('[PixiWorld] initialized (Pixi v' + PIXI.VERSION + ')');
    }

    resize(w, h) {
        if (!this.ok) return;
        this.app.renderer.resize(w, h);
    }

    // Cached texture from a URL (or an already-loaded HTMLImageElement).
    // Failures are cached as null so a bad source can't re-throw every frame.
    texture(src) {
        if (!src) return null;
        const key = (typeof src === 'string') ? src : (src.src || src._pixiKey);
        if (this._textures.has(key)) return this._textures.get(key);
        let tex = null;
        try {
            tex = PIXI.Texture.from(src);
            // Pixi v7 enum is SCALE_MODES (plural). Guard so a missing/renamed
            // constant never throws — crisp pixels are a nicety, not critical.
            const NEAREST = (PIXI.SCALE_MODES && PIXI.SCALE_MODES.NEAREST);
            if (NEAREST != null && tex && tex.baseTexture) {
                tex.baseTexture.scaleMode = NEAREST;
            }
        } catch (e) {
            console.warn('[PixiWorld] texture load failed (cached as null):', key, e);
            this._textures.set(key, null);   // don't retry every frame
            return null;
        }
        this._textures.set(key, tex);
        return tex;
    }

    // Mirror of the Canvas2D camera transform.
    setCamera(centerX, centerY, scale, shakeX, shakeY) {
        if (!this.ok) return;
        this.world.position.set(centerX + (shakeX || 0), centerY + (shakeY || 0));
        this.world.scale.set(scale, scale);
        this.world.pivot.set(centerX, centerY);
    }

    // ── Background hell-floor: a TilingSprite covering the viewport. The tile
    //    offset scrolls with the camera so it reads as an infinite floor. ──
    // Returns true if the background is rendering via Pixi; false means the
    // caller should draw its Canvas2D floor fallback this frame (texture not
    // ready / failed), so the floor is never missing.
    setBackground(img, worldX, worldY, tile, darken) {
        if (!this.ok || !img) return false;
        if (!this._bgTile) {
            const tex = this.texture(img);
            // Texture must exist AND have real dimensions (a not-yet-loaded or
            // CORS-tainted image yields a 0-size/invalid base texture).
            if (!tex || !tex.baseTexture || !tex.baseTexture.valid || tex.width < 1) return false;
            this._bgTile = new PIXI.TilingSprite(tex, this.app.renderer.width, this.app.renderer.height);
            // Background must NOT take the camera zoom (the Canvas2D version
            // drew it in screen space before the camera transform), so it
            // lives directly on the stage, under the world container.
            this.app.stage.addChildAt(this._bgTile, 0);
            this._bgDarken = new PIXI.Graphics();
            this.app.stage.addChildAt(this._bgDarken, 1);
        }
        this._bgTile.width = this.app.renderer.width;
        this._bgTile.height = this.app.renderer.height;
        this._bgTile.tileScale.set(tile / this._bgTile.texture.width);
        let ox = (-worldX) % tile; if (ox > 0) ox -= tile;
        let oy = (-worldY) % tile; if (oy > 0) oy -= tile;
        this._bgTile.tilePosition.set(ox, oy);
        if (darken > 0) {
            this._bgDarken.clear();
            this._bgDarken.beginFill(0x0a0508, darken);
            this._bgDarken.drawRect(0, 0, this.app.renderer.width, this.app.renderer.height);
            this._bgDarken.endFill();
        }
        return true;
    }

    // ── Per-frame sprite sync for an entity layer. `items` is an array of
    //    plain descriptors; we reuse pooled sprites so no per-frame allocation.
    //    descriptor: { tex, x, y, rotation?, scaleX?, scaleY?, tint?, alpha?,
    //                  anchorX?, anchorY? }
    syncLayer(layerName, items) {
        if (!this.ok) return;
        const layer = this.layers[layerName];
        if (!layer) return;
        let pool = this._pools[layerName];
        if (!pool) { pool = this._pools[layerName] = { sprites: [] }; }
        let i = 0;
        for (; i < items.length; i++) {
            const it = items[i];
            const tex = (typeof it.tex === 'string' || it.tex instanceof HTMLImageElement)
                ? this.texture(it.tex) : it.tex;
            if (!tex) continue;
            let spr = pool.sprites[i];
            if (!spr) {
                spr = new PIXI.Sprite(tex);
                layer.addChild(spr);
                pool.sprites[i] = spr;
            } else {
                spr.visible = true;
                if (spr.texture !== tex) spr.texture = tex;
            }
            spr.anchor.set(it.anchorX != null ? it.anchorX : 0.5,
                           it.anchorY != null ? it.anchorY : 0.5);
            spr.position.set(it.x, it.y);
            spr.rotation = it.rotation || 0;
            spr.scale.set(it.scaleX != null ? it.scaleX : 1,
                          it.scaleY != null ? it.scaleY : (it.scaleX != null ? it.scaleX : 1));
            spr.tint = (it.tint != null) ? it.tint : 0xffffff;
            spr.alpha = (it.alpha != null) ? it.alpha : 1;
        }
        // Hide leftover pooled sprites from a previous, larger frame.
        for (; i < pool.sprites.length; i++) {
            if (pool.sprites[i]) pool.sprites[i].visible = false;
        }
    }

    // Render one frame (called from the game loop after state is synced).
    render() {
        if (!this.ok) return;
        this.app.renderer.render(this.app.stage);
    }
}

window.PixiWorld = PixiWorld;
