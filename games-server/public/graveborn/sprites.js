/**
 * Procedural sprite sheets — baked once onto offscreen canvases.
 * 32×32 frames, 4-walk cycle. Cheap to blit, no image downloads.
 */
(function (root) {
  const SIZE = 32;

  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function sheet(drawFrame) {
    const c = canvas(SIZE * 4, SIZE);
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(i * SIZE, 0);
      drawFrame(ctx, i);
      ctx.restore();
    }
    return c;
  }

  function pixel(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function necroFrame(ctx, i) {
    const bob = i === 1 || i === 3 ? 1 : 0;
    const swing = i % 2 === 0 ? 0 : 1;
    // cloak
    pixel(ctx, 10, 10 + bob, 12, 16, "#2a1840");
    pixel(ctx, 9, 14 + bob, 14, 12, "#1a0f28");
    // hood
    pixel(ctx, 11, 6 + bob, 10, 8, "#3d2458");
    pixel(ctx, 13, 8 + bob, 6, 5, "#c8b8a0");
    pixel(ctx, 14, 9 + bob, 2, 2, "#1a1020");
    pixel(ctx, 17, 9 + bob, 2, 2, "#1a1020");
    // staff
    pixel(ctx, 22 + swing, 4 + bob, 2, 22, "#6b5344");
    pixel(ctx, 21 + swing, 3 + bob, 4, 4, "#7d3cff");
    pixel(ctx, 22 + swing, 4 + bob, 2, 2, "#d4b8ff");
    // feet
    pixel(ctx, 11, 26 + bob, 4, 3, "#3a2a20");
    pixel(ctx, 17, 26 + (1 - bob), 4, 3, "#3a2a20");
  }

  function skeletonFrame(ctx, i) {
    const bob = i % 2;
    pixel(ctx, 12, 8 + bob, 8, 6, "#e8e0d0");
    pixel(ctx, 13, 10 + bob, 2, 2, "#1a1020");
    pixel(ctx, 17, 10 + bob, 2, 2, "#1a1020");
    pixel(ctx, 13, 14 + bob, 6, 10, "#d4cbb8");
    pixel(ctx, 11, 16 + bob, 3, 8, "#c8bfaa");
    pixel(ctx, 18, 16 + bob, 3, 8, "#c8bfaa");
    pixel(ctx, 12, 24 + bob, 3, 5, "#d4cbb8");
    pixel(ctx, 17, 24 + (1 - bob), 3, 5, "#d4cbb8");
    // friend rib glow
    pixel(ctx, 14, 17 + bob, 4, 2, "#6dff8a");
  }

  function huskFrame(ctx, i) {
    const bob = i % 2;
    pixel(ctx, 11, 8 + bob, 10, 8, "#4a3a28");
    pixel(ctx, 13, 10 + bob, 2, 2, "#ff3344");
    pixel(ctx, 17, 10 + bob, 2, 2, "#ff3344");
    pixel(ctx, 12, 16 + bob, 8, 10, "#3a2c1e");
    pixel(ctx, 10, 18 + bob, 3, 7, "#2e2218");
    pixel(ctx, 19, 18 + bob, 3, 7, "#2e2218");
    pixel(ctx, 12, 26 + bob, 3, 4, "#2a2018");
    pixel(ctx, 17, 26 + (1 - bob), 3, 4, "#2a2018");
  }

  function runnerFrame(ctx, i) {
    const lean = i === 1 || i === 2 ? 2 : 0;
    pixel(ctx, 10 + lean, 7, 10, 7, "#5a2040");
    pixel(ctx, 12 + lean, 9, 2, 2, "#ffe066");
    pixel(ctx, 16 + lean, 9, 2, 2, "#ffe066");
    pixel(ctx, 11 + lean, 14, 8, 9, "#4a1834");
    pixel(ctx, 8 + lean, 16, 4, 6, "#3a1228");
    pixel(ctx, 18 + lean, 16, 4, 6, "#3a1228");
    pixel(ctx, 11 + lean, 23, 3, 6, "#2a0e1c");
    pixel(ctx, 16 + lean, 23, 3, 6, "#2a0e1c");
  }

  function bruteFrame(ctx, i) {
    const bob = i % 2 ? 1 : 0;
    pixel(ctx, 8, 6 + bob, 16, 10, "#3d2a18");
    pixel(ctx, 12, 9 + bob, 3, 3, "#ff6644");
    pixel(ctx, 18, 9 + bob, 3, 3, "#ff6644");
    pixel(ctx, 9, 16 + bob, 14, 12, "#2e1e10");
    pixel(ctx, 6, 16 + bob, 4, 10, "#24180c");
    pixel(ctx, 22, 16 + bob, 4, 10, "#24180c");
    pixel(ctx, 10, 26 + bob, 5, 5, "#1a1208");
    pixel(ctx, 17, 26 + (1 - bob), 5, 5, "#1a1208");
  }

  function miteFrame(ctx, i) {
    const hop = i % 2;
    pixel(ctx, 12, 14 + hop, 8, 6, "#6a3a18");
    pixel(ctx, 13, 16 + hop, 2, 2, "#ffaa33");
    pixel(ctx, 17, 16 + hop, 2, 2, "#ffaa33");
    pixel(ctx, 10, 20 + hop, 3, 3, "#4a2810");
    pixel(ctx, 19, 20 + hop, 3, 3, "#4a2810");
  }

  function spitFrame(ctx, i) {
    const bob = i % 2;
    pixel(ctx, 11, 8 + bob, 10, 8, "#2a4030");
    pixel(ctx, 13, 10 + bob, 2, 2, "#66ff99");
    pixel(ctx, 17, 10 + bob, 2, 2, "#66ff99");
    pixel(ctx, 12, 16 + bob, 8, 10, "#1e3024");
    pixel(ctx, 20, 12 + bob, 6, 4, "#3d5a40");
    pixel(ctx, 24, 13 + bob, 3, 2, "#8dff9a");
  }

  function exploderFrame(ctx, i) {
    const pulse = i % 2;
    pixel(ctx, 11, 8 + pulse, 10, 8, "#5a1818");
    pixel(ctx, 13, 10 + pulse, 2, 2, "#ffee66");
    pixel(ctx, 17, 10 + pulse, 2, 2, "#ffee66");
    pixel(ctx, 12, 16, 8, 10, "#3a1010");
    pixel(ctx, 14, 18 + pulse, 4, 4, "#ff6644");
    pixel(ctx, 15, 19 + pulse, 2, 2, "#ffe08a");
  }

  function wraithFrame(ctx, i) {
    const drift = i % 2 ? 1 : 0;
    pixel(ctx, 11 + drift, 6, 10, 18, "#3a2a68");
    pixel(ctx, 13 + drift, 8, 6, 5, "#c8c0ff");
    pixel(ctx, 14 + drift, 9, 2, 2, "#7d3cff");
    pixel(ctx, 17 + drift, 9, 2, 2, "#7d3cff");
    pixel(ctx, 12 + drift, 16, 8, 8, "#2a1a50");
  }

  function shamanFrame(ctx, i) {
    const bob = i % 2;
    pixel(ctx, 11, 8 + bob, 10, 8, "#204050");
    pixel(ctx, 13, 10 + bob, 2, 2, "#66e0ff");
    pixel(ctx, 17, 10 + bob, 2, 2, "#66e0ff");
    pixel(ctx, 12, 16 + bob, 8, 10, "#183038");
    pixel(ctx, 10, 6 + bob, 3, 8, "#7d3cff");
    pixel(ctx, 20, 6 + bob, 3, 8, "#7d3cff");
  }

  function titanFrame(ctx, i) {
    bruteFrame(ctx, i);
    pixel(ctx, 10, 3, 12, 4, "#8a6a30");
    pixel(ctx, 14, 1, 4, 3, "#f0c75e");
  }

  function sovereignFrame(ctx, i) {
    skeletonFrame(ctx, i);
    pixel(ctx, 11, 4, 10, 3, "#7d3cff");
    pixel(ctx, 14, 2, 4, 3, "#f0c75e");
  }

  function duchessFrame(ctx, i) {
    runnerFrame(ctx, i);
    pixel(ctx, 10, 4, 12, 3, "#ffe066");
    pixel(ctx, 8, 12, 4, 8, "#c8b8a0");
  }

  function bishopFrame(ctx, i) {
    shamanFrame(ctx, i);
    pixel(ctx, 10, 3, 12, 4, "#1a4030");
    pixel(ctx, 14, 1, 4, 3, "#6dff8a");
  }

  function corpseStill(ctx) {
    pixel(ctx, 8, 18, 16, 8, "#2a2018");
    pixel(ctx, 10, 16, 8, 6, "#3a2c1e");
    pixel(ctx, 18, 17, 6, 5, "#4a3a28");
    pixel(ctx, 12, 20, 4, 2, "#6dff8a");
  }

  function gemStill(ctx) {
    pixel(ctx, 13, 10, 6, 10, "#7d3cff");
    pixel(ctx, 14, 12, 4, 6, "#d4b8ff");
    pixel(ctx, 15, 8, 2, 3, "#f0e6ff");
  }

  const sheets = {
    necro: sheet(necroFrame),
    skeleton: sheet(skeletonFrame),
    husk: sheet(huskFrame),
    mite: sheet(miteFrame),
    runner: sheet(runnerFrame),
    spit: sheet(spitFrame),
    exploder: sheet(exploderFrame),
    brute: sheet(bruteFrame),
    wraith: sheet(wraithFrame),
    shaman: sheet(shamanFrame),
    titan: sheet(titanFrame),
    sovereign: sheet(sovereignFrame),
    duchess: sheet(duchessFrame),
    bishop: sheet(bishopFrame),
    corpse: sheet((ctx) => corpseStill(ctx)),
    gem: sheet((ctx) => gemStill(ctx)),
  };

  function draw(ctx, name, x, y, scale, frame, flip) {
    const s = sheets[name];
    if (!s) return;
    const f = ((frame % 4) + 4) % 4;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    const d = SIZE * scale;
    ctx.drawImage(s, f * SIZE, 0, SIZE, SIZE, -d / 2, -d / 2, d, d);
    ctx.restore();
  }

  root.GravebornSprites = { SIZE, sheets, draw };
})(typeof window !== "undefined" ? window : globalThis);
