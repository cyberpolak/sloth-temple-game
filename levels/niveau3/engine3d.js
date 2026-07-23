/* SHA'UR'NA — perspective-correct textured wall-quad software rasterizer */
(function (ST3) {
  'use strict';

  var VERSION = 'persp-quad-4';
  var FOV = Math.PI / 3; // ~60° horizontal — keep in sync with player PLANE_LEN
  var HALF_TAN = Math.tan(FOV * 0.5); // ≈0.577; sprites/plane must match
  var NEAR = 0.08;
  var EYE = 0.5;
  var TEX_SIZE = 64;
  var FOG_R = 4;
  var FOG_G = 20;
  var FOG_B = 12;
  var STAMP_FRAMES = 180; // ~3s @60fps — starts on first play render, not init
  var MAX_CLIP = 8;
  var MAX_VIS = 1024;

  var faces = [];
  var texPixels = []; // Uint32Array per texId (ABGR/RGBA packed LE)
  var depthBuf = null;
  var depthW = 0;
  var depthH = 0;
  var frameImg = null;
  var framePix32 = null;
  var frameW = 0;
  var frameH = 0;
  var stampLeft = 0;
  var stampArmed = false;
  var loggedVersion = false;
  var ampBassAccum = 0;

  // Cell → face index buckets (built at mesh time)
  var mapW = 0;
  var mapH = 0;
  var cellBuckets = null; // Array<number[]> length mapW*mapH

  // Visible-face scratch (reuse every frame)
  var visIdx = new Uint16Array(MAX_VIS);
  var visDist = new Float32Array(MAX_VIS);

  // Pooled clip / project verts — no per-face allocation
  function makeVert() {
    return {
      x: 0,
      y: 0,
      z: 0,
      u: 0,
      v: 0,
      sx: 0,
      sy: 0,
      invZ: 0,
      uOverZ: 0,
      vOverZ: 0,
    };
  }
  var camVerts = [makeVert(), makeVert(), makeVert(), makeVert()];
  var clipPoolA = [];
  var projPool = [];
  (function initPools() {
    var i;
    for (i = 0; i < MAX_CLIP; i++) {
      clipPoolA.push(makeVert());
      projPool.push(makeVert());
    }
  })();

  var isLE = (function () {
    var u = new Uint32Array([0x01020304]);
    return new Uint8Array(u.buffer)[0] === 4;
  })();

  function packRGBA(r, g, b, a) {
    r = r | 0;
    g = g | 0;
    b = b | 0;
    a = a | 0;
    if (isLE) return (a << 24) | (b << 16) | (g << 8) | r;
    return (r << 24) | (g << 16) | (b << 8) | a;
  }

  function copyVert(dst, src) {
    dst.x = src.x;
    dst.y = src.y;
    dst.z = src.z;
    dst.u = src.u;
    dst.v = src.v;
    return dst;
  }

  function lerpVert(dst, a, b, near, t) {
    dst.x = a.x + (b.x - a.x) * t;
    dst.y = a.y + (b.y - a.y) * t;
    dst.z = near;
    dst.u = a.u + (b.u - a.u) * t;
    dst.v = a.v + (b.v - a.v) * t;
    return dst;
  }

  function isWalkable(cx, cy) {
    return ST3.Map.inBounds(cx, cy) && !ST3.Map.isSolid(cx, cy);
  }

  function isAmpWall(id) {
    return (
      id === 2 ||
      id === 3 ||
      id === 5 ||
      id === 9 ||
      id === 10 ||
      id === 11 ||
      id === 12 ||
      id === 13 ||
      id === 14
    );
  }

  function isWreckedAmp(id) {
    return id === 12 || id === 13 || id === 14;
  }

  function ampPulse(animT, mapX, mapY) {
    var at = animT || 0;
    var hash = (mapX * 17 + mapY * 31) & 255;
    var period = 1.2 + (hash % 14) * 0.1;
    var phase = ((mapX * 7.3 + mapY * 13.1) % (Math.PI * 2)) * 0.18;
    var t = (at + phase) % period;
    if (t < 0) t += period;
    var pulseDur = 0.28;
    if (t > pulseDur) return 0;
    return Math.sin((t / pulseDur) * Math.PI);
  }

  /**
   * Emit a vertical wall quad.
   * World: X = map X, Z = map Y, Y up 0→1.
   * UV: u along face length, v=0 at top (y=1), v=1 at floor (y=0).
   * sideShade: 1 for ±X normals, 0.72 for ±Z.
   * nx,nz: outward normal (from solid toward walkable).
   */
  function emitFace(x0, z0, x1, z1, texId, cx, cy, sideShade, nx, nz) {
    faces.push({
      // bottom-start, top-start, top-end, bottom-end
      v: [
        { x: x0, y: 0, z: z0, u: 0, v: 1 },
        { x: x0, y: 1, z: z0, u: 0, v: 0 },
        { x: x1, y: 1, z: z1, u: 1, v: 0 },
        { x: x1, y: 0, z: z1, u: 1, v: 1 },
      ],
      texId: texId,
      cx: cx,
      cy: cy,
      sideShade: sideShade,
      amp: isAmpWall(texId),
      sparking: isWreckedAmp(texId),
      nx: nx,
      nz: nz,
      // Midpoint of face in XZ
      fcx: (x0 + x1) * 0.5,
      fcz: (z0 + z1) * 0.5,
    });
  }

  function buildCellBuckets(W, H) {
    var n = W * H;
    var i, fi, f, key;
    cellBuckets = new Array(n);
    for (i = 0; i < n; i++) cellBuckets[i] = [];
    for (fi = 0; fi < faces.length; fi++) {
      f = faces[fi];
      key = f.cy * W + f.cx;
      if (key >= 0 && key < n) cellBuckets[key].push(fi);
    }
    mapW = W;
    mapH = H;
  }

  function buildMesh(map) {
    faces = [];
    cellBuckets = null;
    mapW = 0;
    mapH = 0;
    if (!map || !map.W || !map.H) return;
    var W = map.W;
    var H = map.H;
    var cx, cy, tid;
    for (cy = 0; cy < H; cy++) {
      for (cx = 0; cx < W; cx++) {
        if (!map.isSolid(cx, cy)) continue;
        tid = map.wallId(cx, cy);
        // West (−X)
        if (isWalkable(cx - 1, cy)) {
          emitFace(cx, cy, cx, cy + 1, tid, cx, cy, 1, -1, 0);
        }
        // East (+X)
        if (isWalkable(cx + 1, cy)) {
          emitFace(cx + 1, cy + 1, cx + 1, cy, tid, cx, cy, 1, 1, 0);
        }
        // North (−Z / map −Y)
        if (isWalkable(cx, cy - 1)) {
          emitFace(cx + 1, cy, cx, cy, tid, cx, cy, 0.72, 0, -1);
        }
        // South (+Z / map +Y)
        if (isWalkable(cx, cy + 1)) {
          emitFace(cx, cy + 1, cx + 1, cy + 1, tid, cx, cy, 0.72, 0, 1);
        }
      }
    }
    buildCellBuckets(W, H);
  }

  function cacheTextures() {
    texPixels = [];
    var i, tex, c, ctx, img, src, dst, n, p;
    if (!ST3.Raycaster || !ST3.Raycaster.getTex) return;
    for (i = 1; i <= 14; i++) {
      tex = ST3.Raycaster.getTex(i);
      if (!tex) continue;
      c = ST3.Utils.createCanvas(TEX_SIZE, TEX_SIZE);
      ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tex, 0, 0, TEX_SIZE, TEX_SIZE);
      img = ctx.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
      src = img.data;
      dst = new Uint32Array(TEX_SIZE * TEX_SIZE);
      n = TEX_SIZE * TEX_SIZE;
      for (p = 0; p < n; p++) {
        dst[p] = packRGBA(src[p * 4], src[p * 4 + 1], src[p * 4 + 2], src[p * 4 + 3]);
      }
      texPixels[i] = dst;
    }
    // ensure stone fallback
    if (!texPixels[1]) {
      dst = new Uint32Array(TEX_SIZE * TEX_SIZE);
      for (p = 0; p < dst.length; p++) dst[p] = packRGBA(40, 55, 45, 255);
      texPixels[1] = dst;
    }
  }

  function ensureDepth(w, h) {
    if (!depthBuf || depthW !== w || depthH !== h) {
      depthBuf = new Float32Array(w * h);
      depthW = w;
      depthH = h;
    }
  }

  /**
   * Persistent ImageData + Uint32 view for the caller (renderer).
   * No per-frame getImageData.
   */
  function ensureFrameBuffer(w, h) {
    if (!frameImg || frameW !== w || frameH !== h) {
      frameW = w;
      frameH = h;
      frameImg = new ImageData(w, h);
      framePix32 = new Uint32Array(frameImg.data.buffer);
    }
    return { img: frameImg, pix32: framePix32 };
  }

  /** World → camera: forward +Z, right +X, Y up. */
  function toCam(wx, wy, wz, px, pz, dirX, dirY, out) {
    var dx = wx - px;
    var dz = wz - pz;
    out.x = -dx * dirY + dz * dirX;
    out.y = wy;
    out.z = dx * dirX + dz * dirY;
    return out;
  }

  /**
   * Sutherland–Hodgman clip against z >= near.
   * Writes into outPool; returns vertex count. inVerts is a fixed array (camVerts).
   */
  function clipNearPooled(inVerts, inCount, near, outPool) {
    var outCount = 0;
    var i, a, b, aIn, bIn, t, dz;
    if (inCount < 3) return 0;
    for (i = 0; i < inCount; i++) {
      a = inVerts[i];
      b = inVerts[(i + 1) % inCount];
      aIn = a.z >= near;
      bIn = b.z >= near;
      if (aIn && bIn) {
        if (outCount >= MAX_CLIP) break;
        copyVert(outPool[outCount++], b);
      } else if (aIn && !bIn) {
        if (outCount >= MAX_CLIP) break;
        dz = b.z - a.z;
        t = Math.abs(dz) < 1e-8 ? 0 : (near - a.z) / dz;
        lerpVert(outPool[outCount++], a, b, near, t);
      } else if (!aIn && bIn) {
        dz = b.z - a.z;
        t = Math.abs(dz) < 1e-8 ? 0 : (near - a.z) / dz;
        if (outCount < MAX_CLIP) {
          lerpVert(outPool[outCount++], a, b, near, t);
        }
        if (outCount < MAX_CLIP) {
          copyVert(outPool[outCount++], b);
        }
      }
    }
    return outCount;
  }

  function projectVert(c, w, h, focal, eye, out) {
    var z = c.z;
    if (z < NEAR * 0.5) z = NEAR * 0.5;
    out.sx = w * 0.5 + (c.x / z) * focal;
    out.sy = h * 0.5 - ((c.y - eye) / z) * focal;
    out.z = c.z;
    out.u = c.u;
    out.v = c.v;
    out.invZ = 1 / z;
    out.uOverZ = c.u / z;
    out.vOverZ = c.v / z;
    return out;
  }

  /**
   * Perspective-correct triangle rasterizer into Uint32 buffer + column zBuffer.
   * Verts: {sx,sy,z,invZ,uOverZ,vOverZ}
   */
  function rasterTri(v0, v1, v2, pix32, texArr, sideShade, fogMax, zBuffer, w, h) {
    var minX = Math.floor(Math.min(v0.sx, v1.sx, v2.sx));
    var maxX = Math.ceil(Math.max(v0.sx, v1.sx, v2.sx));
    var minY = Math.floor(Math.min(v0.sy, v1.sy, v2.sy));
    var maxY = Math.ceil(Math.max(v0.sy, v1.sy, v2.sy));
    if (maxX < 0 || maxY < 0 || minX >= w || minY >= h) return;
    if (minX < 0) minX = 0;
    if (minY < 0) minY = 0;
    if (maxX > w - 1) maxX = w - 1;
    if (maxY > h - 1) maxY = h - 1;

    var area = (v1.sx - v0.sx) * (v2.sy - v0.sy) - (v2.sx - v0.sx) * (v1.sy - v0.sy);
    if (area > -1e-6 && area < 1e-6) return;
    var invArea = 1 / area;

    var x, y, w0, w1, w2, invZ, u, v, z, tx, ty, di, packed;
    var fog, shade, r, g, b, pr, pg, pb, pa;
    var fogR = FOG_R;
    var fogG = FOG_G;
    var fogB = FOG_B;
    var ts = TEX_SIZE;
    var le = isLE;

    for (y = minY; y <= maxY; y++) {
      for (x = minX; x <= maxX; x++) {
        // Barycentric at pixel center
        w0 = ((v1.sx - x - 0.5) * (v2.sy - y - 0.5) - (v2.sx - x - 0.5) * (v1.sy - y - 0.5)) * invArea;
        w1 = ((v2.sx - x - 0.5) * (v0.sy - y - 0.5) - (v0.sx - x - 0.5) * (v2.sy - y - 0.5)) * invArea;
        w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;

        invZ = w0 * v0.invZ + w1 * v1.invZ + w2 * v2.invZ;
        if (invZ <= 1e-8) continue;
        z = 1 / invZ;
        di = y * w + x;
        if (z >= depthBuf[di]) continue;

        u = (w0 * v0.uOverZ + w1 * v1.uOverZ + w2 * v2.uOverZ) * z;
        v = (w0 * v0.vOverZ + w1 * v1.vOverZ + w2 * v2.vOverZ) * z;
        // wrap UV into [0,1)
        u = u - Math.floor(u);
        v = v - Math.floor(v);
        if (u < 0) u += 1;
        if (v < 0) v += 1;
        tx = (u * ts) | 0;
        ty = (v * ts) | 0;
        if (tx < 0) tx = 0;
        else if (tx >= ts) tx = ts - 1;
        if (ty < 0) ty = 0;
        else if (ty >= ts) ty = ts - 1;

        packed = texArr[ty * ts + tx];
        // Inline unpack — no object alloc
        if (le) {
          pr = packed & 255;
          pg = (packed >>> 8) & 255;
          pb = (packed >>> 16) & 255;
          pa = (packed >>> 24) & 255;
        } else {
          pr = (packed >>> 24) & 255;
          pg = (packed >>> 16) & 255;
          pb = (packed >>> 8) & 255;
          pa = packed & 255;
        }
        if (pa < 8) continue;

        fog = 1 - z / fogMax;
        if (fog < 0.12) fog = 0.12;
        else if (fog > 1) fog = 1;
        shade = fog * sideShade;
        r = (pr * shade + fogR * (1 - shade) + 0.5) | 0;
        g = (pg * shade + fogG * (1 - shade) + 0.5) | 0;
        b = (pb * shade + fogB * (1 - shade) + 0.5) | 0;

        depthBuf[di] = z;
        pix32[di] = packRGBA(r, g, b, 255);
        if (z < zBuffer[x]) zBuffer[x] = z;
      }
    }
  }

  function renderFace(face, px, pz, dirX, dirY, focal, w, h, pix32, zBuffer, fogMax, animT) {
    var i, src, wob, pulse, vx, vz;
    var clipN, projN, pminX, pmaxX, pminY, pmaxY, anyIn;
    var cellDist, zMax, zMin, xExtent, allOut, lim;
    var dx, dz;
    var texArr = texPixels[face.texId] || texPixels[1];
    if (!texArr) return;

    // Distance cull (cell center) before any transform
    cellDist = Math.hypot(face.cx + 0.5 - px, face.cy + 0.5 - pz);
    if (cellDist > fogMax * 1.15) return;

    // Backface cull: camera must be on outward side of face
    if ((px - face.fcx) * face.nx + (pz - face.fcz) * face.nz <= 0) return;

    // Optional amp vertex wobble along face tangent in XZ
    pulse = 0;
    wob = 0;
    if (face.amp) {
      pulse = ampPulse(animT, face.cx, face.cy);
      if (face.sparking) {
        // Wrecked amps stutter harder / more often
        var sparkBurst = Math.sin(animT * 38 + face.cx * 5.1 + face.cy * 3.3);
        if (sparkBurst > 0.72) pulse = Math.max(pulse, 0.55 + sparkBurst * 0.35);
      }
      if (pulse > 0.05) {
        wob = Math.sin(animT * 52 + face.cx * 2.7 + face.cy * 4.1) * pulse * (face.sparking ? 0.02 : 0.012);
        if (cellDist < 8) {
          var nearAmt = 1 - cellDist / 8;
          var bassAmt = pulse * nearAmt * (face.sparking ? 1.25 : 1);
          if (bassAmt > ampBassAccum) ampBassAccum = bassAmt > 1 ? 1 : bassAmt;
        }
      }
    }

    for (i = 0; i < 4; i++) {
      src = face.v[i];
      vx = src.x;
      vz = src.z;
      if (wob) {
        dx = face.v[3].x - face.v[0].x;
        dz = face.v[3].z - face.v[0].z;
        vx += dx * wob;
        vz += dz * wob;
      }
      toCam(vx, src.y, vz, px, pz, dirX, dirY, camVerts[i]);
      camVerts[i].u = src.u;
      camVerts[i].v = src.v;
    }

    // Quick reject: all behind near, or all beyond fog / outside lateral frustum
    if (camVerts[0].z < NEAR && camVerts[1].z < NEAR && camVerts[2].z < NEAR && camVerts[3].z < NEAR) return;
    zMax = Math.max(camVerts[0].z, camVerts[1].z, camVerts[2].z, camVerts[3].z);
    zMin = Math.min(camVerts[0].z, camVerts[1].z, camVerts[2].z, camVerts[3].z);
    if (zMin > fogMax * 1.15) return;
    xExtent = Math.max(
      Math.abs(camVerts[0].x),
      Math.abs(camVerts[1].x),
      Math.abs(camVerts[2].x),
      Math.abs(camVerts[3].x)
    );
    // Rough horizontal frustum: |x| > z * HALF_TAN * margin
    if (zMax > 0 && xExtent > zMax * HALF_TAN * 1.45 + 1.2) {
      allOut = true;
      for (i = 0; i < 4; i++) {
        lim = Math.abs(camVerts[i].z) * HALF_TAN * 1.35 + 0.8;
        if (Math.abs(camVerts[i].x) <= lim) {
          allOut = false;
          break;
        }
      }
      if (allOut) return;
    }

    clipN = clipNearPooled(camVerts, 4, NEAR, clipPoolA);
    if (clipN < 3) return;

    pminX = 1e9;
    pmaxX = -1e9;
    pminY = 1e9;
    pmaxY = -1e9;
    anyIn = false;
    projN = clipN;
    for (i = 0; i < clipN; i++) {
      projectVert(clipPoolA[i], w, h, focal, EYE, projPool[i]);
      if (projPool[i].sx < pminX) pminX = projPool[i].sx;
      if (projPool[i].sx > pmaxX) pmaxX = projPool[i].sx;
      if (projPool[i].sy < pminY) pminY = projPool[i].sy;
      if (projPool[i].sy > pmaxY) pmaxY = projPool[i].sy;
      if (projPool[i].z > NEAR) anyIn = true;
    }
    if (!anyIn) return;
    if (pmaxX < 0 || pmaxY < 0 || pminX >= w || pminY >= h) return;

    // Fan triangulate clipped polygon
    for (i = 1; i < projN - 1; i++) {
      rasterTri(projPool[0], projPool[i], projPool[i + 1], pix32, texArr, face.sideShade, fogMax, zBuffer, w, h);
    }
  }

  /** Insertion sort visIdx/visDist ascending (front-to-back). */
  function sortVisFrontToBack(n) {
    var i, j, id, d;
    for (i = 1; i < n; i++) {
      id = visIdx[i];
      d = visDist[i];
      j = i - 1;
      while (j >= 0 && visDist[j] > d) {
        visIdx[j + 1] = visIdx[j];
        visDist[j + 1] = visDist[j];
        j--;
      }
      visIdx[j + 1] = id;
      visDist[j + 1] = d;
    }
  }

  /**
   * Collect face indices near player via Chebyshev cell buckets, then
   * front-to-back sort. Returns visible count.
   */
  function collectVisibleFaces(px, pz, fogMax) {
    var pcx = px | 0;
    var pcy = pz | 0;
    var rad = (fogMax | 0) + 1;
    var cx, cy, bi, bucket, fi, f, dx, dy;
    var visCount = 0;
    if (!cellBuckets || !mapW) return 0;

    for (cy = pcy - rad; cy <= pcy + rad; cy++) {
      if (cy < 0 || cy >= mapH) continue;
      for (cx = pcx - rad; cx <= pcx + rad; cx++) {
        if (cx < 0 || cx >= mapW) continue;
        bucket = cellBuckets[cy * mapW + cx];
        if (!bucket || !bucket.length) continue;
        for (bi = 0; bi < bucket.length; bi++) {
          if (visCount >= MAX_VIS) break;
          fi = bucket[bi];
          f = faces[fi];
          dx = f.cx + 0.5 - px;
          dy = f.cy + 0.5 - pz;
          visIdx[visCount] = fi;
          visDist[visCount] = dx * dx + dy * dy;
          visCount++;
        }
      }
    }
    if (visCount > 1) sortVisFrontToBack(visCount);
    return visCount;
  }

  function init() {
    buildMesh(ST3.Map);
    cacheTextures();
    stampArmed = false;
    stampLeft = 0;
    if (!loggedVersion) {
      loggedVersion = true;
      console.info('[SHAURNA] Engine', VERSION, 'FOV', ((FOV * 180) / Math.PI).toFixed(1) + '°', 'HALF_TAN', HALF_TAN.toFixed(5));
    }
  }

  function rebuild() {
    buildMesh(ST3.Map);
  }

  /** Re-arm VERSION stamp for the next ~3s of renders (after warmup burns frames). */
  function resetStamp() {
    stampArmed = false;
    stampLeft = 0;
  }

  /**
   * Draw walls into caller-provided Uint32 pixel buffer (floor/ceiling already cast).
   * No getImageData. Returns { ampBass, stamp }.
   * stamp=true for first ~3s — renderer should draw VERSION after putImageData.
   */
  function render(pix32, w, h, player, zBuffer, fogMax, animT) {
    if (!player || !faces.length || !pix32) return { ampBass: 0, stamp: false };
    var px = player.x;
    var pz = player.y;
    var dirX = player.dirX;
    var dirY = player.dirY;
    if (!Number.isFinite(dirX) || !Number.isFinite(dirY)) {
      var yaw = Math.atan2(player.dirY || 0, player.dirX || 1);
      dirX = Math.cos(yaw);
      dirY = Math.sin(yaw);
    }
    var focal = (w * 0.5) / HALF_TAN;
    var fog = fogMax || 14;
    var t = animT || 0;
    var x, vi, visCount, showStamp;

    if (!stampArmed) {
      stampArmed = true;
      stampLeft = STAMP_FRAMES;
    }
    showStamp = stampLeft > 0;
    if (showStamp) stampLeft--;

    ampBassAccum = 0;
    ensureDepth(w, h);
    depthBuf.fill(1e9);
    for (x = 0; x < w; x++) zBuffer[x] = 1e9;

    visCount = collectVisibleFaces(px, pz, fog);
    for (vi = 0; vi < visCount; vi++) {
      renderFace(faces[visIdx[vi]], px, pz, dirX, dirY, focal, w, h, pix32, zBuffer, fog, t);
    }

    return { ampBass: ampBassAccum, stamp: showStamp };
  }

  ST3.Engine3D = {
    init: init,
    rebuild: rebuild,
    resetStamp: resetStamp,
    ensureFrameBuffer: ensureFrameBuffer,
    render: render,
    VERSION: VERSION,
    FOV: FOV,
    HALF_TAN: HALF_TAN,
    /** debug / tests */
    faceCount: function () {
      return faces.length;
    },
  };
})(window.ST3 = window.ST3 || {});
