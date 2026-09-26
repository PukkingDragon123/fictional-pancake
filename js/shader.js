// ---- Shader: a WebGL pass over the finished picture -----------------------------------
// Every frame the 640x360 canvas is uploaded as a texture and drawn again
// through one fragment shader, onto a second canvas laid exactly over it
// (clicks go straight through to the game underneath). The shader works in
// game pixels, so nothing smears:
//   - bloom: bright things (lamps, fire, sun on water, the coin) glow a little
//   - a grade: cool violet shadows, warm gold light, a touch more colour
//   - texture: a fixed canvas-and-paper grain, one value per game pixel
//   - night: a blue cast after dark, with the glow turned up
//   - a soft vignette and a faint warm light from the upper left by day
// No WebGL, or the player turns it off, and the plain canvas shows through.
const Shader = (() => {
  let gl = null, cv = null, src = null, prog = null, tex = null, U = {}, on = true, ok = false;
  const game = () => (typeof window !== 'undefined' && window.G) || null;
  const VS = `attribute vec2 p; varying vec2 v; void main(){ v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  const FS = `
precision mediump float;
uniform sampler2D u_tex; uniform vec2 u_res; uniform float u_night, u_day, u_warm, u_time;
varying vec2 v;
float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
vec3 look(vec2 off){ return texture2D(u_tex, (floor(v * u_res) + 0.5 + off) / u_res).rgb; }
void main(){
  vec2 px = floor(v * u_res);
  vec3 c = look(vec2(0.0));
  // bloom: sixteen taps on two rings, keeping only what is bright
  vec3 b = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 d = vec2(cos(a), sin(a));
    b += max(look(d * 2.0) - 0.86, 0.0);
    b += max(look(d * 5.0) - 0.86, 0.0) * 0.6;
  }
  // glow spills into what is darker than it; a big bright page stays a page
  float l0 = dot(c, vec3(0.299, 0.587, 0.114));
  c += b * (0.3 + u_night * 0.5) * (1.0 - l0);
  // the grade: shadows toward violet, light toward gold
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 shadow = c * vec3(0.93, 0.94, 1.07) + vec3(0.012, 0.0, 0.03);
  vec3 lit = c * vec3(1.05, 1.02, 0.95);
  c = mix(shadow, lit, smoothstep(0.18, 0.78, l));
  c = mix(vec3(l), c, 1.08);                                    // a touch more colour
  c = (c - 0.5) * 1.04 + 0.5;
  // texture: a fine grain on every game pixel and a coarser weave under it
  float g1 = hash(px) - 0.5, g2 = hash(floor(px / 3.0) + 17.0) - 0.5, g3 = hash(floor(px / 7.0) + 3.0) - 0.5;
  c *= 1.0 + g1 * 0.018 + g2 * 0.012 + g3 * 0.008;
  // after dark: a blue cast
  c = mix(c, c * vec3(0.7, 0.78, 1.08), u_night * 0.45);
  // by day: a faint warm light falling from the upper left
  c += vec3(1.0, 0.86, 0.6) * 0.045 * u_day * u_warm * smoothstep(1.0, 0.0, length((v - vec2(0.18, 1.02)) * vec2(1.0, 1.4)));
  // the vignette, soft and square-ish like a screen
  vec2 e = abs(v - 0.5) * 2.0;
  float vig = 1.0 - pow(max(e.x, e.y * 0.9), 6.0) * 0.18 - dot(v - 0.5, v - 0.5) * 0.28;
  c *= vig;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;
  function compile(type, text) {
    const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  // `off` is the saved setting; the pass is on unless the player turned it off
  function init(canvas, off) {
    src = canvas;
    on = !off;
    try {
      cv = document.createElement('canvas');
      cv.id = 'fx-gl';
      cv.width = src.width; cv.height = src.height;           // one texel per game pixel; CSS does the scaling
      gl = cv.getContext('webgl', { preserveDrawingBuffer: false, antialias: false, alpha: false });
      if (!gl) return;
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      for (const [k, val] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, val);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      for (const n of ['u_tex', 'u_res', 'u_night', 'u_day', 'u_warm', 'u_time']) U[n] = gl.getUniformLocation(prog, n);
      gl.uniform1i(U.u_tex, 0); gl.uniform2f(U.u_res, src.width, src.height);
      gl.viewport(0, 0, cv.width, cv.height);
      src.insertAdjacentElement('afterend', cv);
      ok = true;
      show();
    } catch (e) {
      ok = false; if (cv && cv.parentNode) cv.remove();
      console.warn('shader pass off:', e.message);
    }
  }
  function show() { if (cv) cv.style.display = ok && on ? 'block' : 'none'; }
  function frame() {
    if (!ok || !on) return;
    const G = game();
    const outdoors = G && (G.mode === 'grove' || G.mode === 'intro' || G.mode === 'menu' || G.mode === 'map');
    const day = outdoors && typeof Sky !== 'undefined' && G.mode === 'grove' ? Sky.light() : outdoors ? 1 : 0.4;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    gl.uniform1f(U.u_night, G && G.mode === 'grove' ? Math.max(0, 1 - day * 1.6) : 0);
    gl.uniform1f(U.u_day, day);
    gl.uniform1f(U.u_warm, outdoors ? 1 : 0.4);
    gl.uniform1f(U.u_time, (G && G.time) || 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function toggle() { on = !on; show(); return on; }
  return { init, frame, toggle, get on() { return ok && on; }, get ok() { return ok; } };
})();
