/**
 * Strange Attractor Visualizations
 * 
 * Real-time WebGL particle system cycling through multiple
 * chaotic attractors. Each attractor is defined by a system
 * of differential equations integrated via Euler steps.
 * 
 * Controls:
 *   Spacebar  - cycle to next attractor
 *   Drag      - orbit / rotate
 *   Scroll    - zoom in / out
 */

const canvas = document.createElement('canvas');
canvas.style.background = '#000';
document.body.appendChild(canvas);

const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });

// ── Attractor definitions ──────────────────────────────────────────

const attractorDefs = [

    {
        name: 'Thomas Attractor',
        color: [0.35, 0.55, 1.0],
        initRange: 3,
        zoom: 150,
        steps: 8,
        stepSize: 0.025,
        center: [0, 0, 0],
        perturbChance: 0.9999,
        perturbScale: 2.0,
        tick: function (x, y, z, dt) {
            var b = 0.208186;
            return [
                x + dt * (Math.sin(y) - b * x),
                y + dt * (Math.sin(z) - b * y),
                z + dt * (Math.sin(x) - b * z)
            ];
        }
    },

    {
        name: 'Lorenz Attractor',
        color: [1.0, 0.45, 0.2],
        initRange: 2,
        zoom: 420,
        steps: 12,
        stepSize: 0.004,
        center: [0, 0, 27],
        perturbChance: 0.9998,
        perturbScale: 1.5,
        tick: function (x, y, z, dt) {
            var sigma = 10, rho = 28, beta = 8 / 3;
            return [
                x + dt * sigma * (y - x),
                y + dt * (x * (rho - z) - y),
                z + dt * (x * y - beta * z)
            ];
        }
    },

    {
        name: 'Chen Attractor',
        color: [0.2, 1.0, 0.5],
        initRange: 2,
        zoom: 450,
        steps: 12,
        stepSize: 0.0004,
        center: [0, 0, 28],
        perturbChance: 0.9998,
        perturbScale: 1.5,
        tick: function (x, y, z, dt) {
            var a = 40, b = 3, c = 28;
            return [
                x + dt * a * (y - x),
                y + dt * ((c - a) * x - x * z + c * y),
                z + dt * (x * y - b * z)
            ];
        }
    },

    {
        name: 'R\u00f6ssler Attractor',
        color: [1.0, 0.25, 0.55],
        initRange: 2,
        zoom: 250,
        steps: 10,
        stepSize: 0.008,
        center: [0, 0, 3],
        perturbChance: 0.9999,
        perturbScale: 1.3,
        tick: function (x, y, z, dt) {
            var a = 0.2, b = 0.2, c = 5.7;
            return [
                x + dt * (-(y) - z),
                y + dt * (x + a * y),
                z + dt * (b + z * (x - c))
            ];
        }
    },

    {
        name: 'Aizawa Attractor',
        color: [0.85, 0.7, 0.2],
        initRange: 0.1,
        zoom: 80,
        steps: 10,
        stepSize: 0.008,
        center: [0, 0, 0],
        perturbChance: 0.9999,
        perturbScale: 1.2,
        tick: function (x, y, z, dt) {
            var a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
            return [
                x + dt * ((z - b) * x - d * y),
                y + dt * (d * x + (z - b) * y),
                z + dt * (c + a * z - (z * z * z) / 3 -
                    (x * x + y * y) * (1 + e * z) + f * z * x * x * x)
            ];
        }
    },

    {
        name: 'Halvorsen Attractor',
        color: [0.5, 0.3, 1.0],
        initRange: 2,
        zoom: 220,
        steps: 10,
        stepSize: 0.004,
        center: [0, 0, 0],
        perturbChance: 0.9999,
        perturbScale: 1.5,
        tick: function (x, y, z, dt) {
            var a = 1.89;
            return [
                x + dt * (-a * x - 4 * y - 4 * z - y * y),
                y + dt * (-a * y - 4 * z - 4 * x - z * z),
                z + dt * (-a * z - 4 * x - 4 * y - x * x)
            ];
        }
    },

    {
        name: 'Dadras Attractor',
        color: [0.15, 0.85, 0.85],
        initRange: 1,
        zoom: 200,
        steps: 10,
        stepSize: 0.003,
        center: [0, 0, 0],
        perturbChance: 0.9999,
        perturbScale: 1.4,
        tick: function (x, y, z, dt) {
            var a = 3, b = 2.7, c = 1.7, d = 2, e = 9;
            return [
                x + dt * (y - a * x + b * y * z),
                y + dt * (c * y - x * z + z),
                z + dt * (d * x * y - e * z)
            ];
        }
    }

];

// ── State ──────────────────────────────────────────────────────────

var currentAttractor = 0;
var NUM_PARTICLES = 5000;
var particleData = new Float32Array(NUM_PARTICLES * 3);
var fullScreenTriangle = new Float32Array([-1, 3, -1, -1, 3, -1]);

var nameEl = document.getElementById('attractor-name');

// ── Particle init / reset ──────────────────────────────────────────

function initParticles() {
    var def = attractorDefs[currentAttractor];
    var r = def.initRange;
    for (var i = 0; i < particleData.length; i += 3) {
        particleData[i]     = (Math.random() * 2 - 1) * r + def.center[0];
        particleData[i + 1] = (Math.random() * 2 - 1) * r + def.center[1];
        particleData[i + 2] = (Math.random() * 2 - 1) * r + def.center[2];
    }
    controls.k = def.zoom;
    if (nameEl) nameEl.textContent = def.name;
}

// ── Orbit controls ─────────────────────────────────────────────────

var controls = OrbitControls(0.3, 0.3, 150);

function OrbitControls(a1, a2, k) {
    var _ = { a1: a1, a2: a2, k: k };
    var drag = null;

    addEventListener('wheel', function (e) {
        _.k *= 1 - Math.sign(e.deltaY) * 0.08;
    });

    addEventListener('mousedown', function (e) {
        drag = { x: e.x, y: e.y, a1: _.a1, a2: _.a2 };
    });

    addEventListener('mouseup', function () {
        drag = null;
    });

    addEventListener('mousemove', function (e) {
        if (drag) {
            _.a1 = drag.a1 - (e.x - drag.x) / 120;
            _.a2 = drag.a2 - (e.y - drag.y) / 120;
        }
    });

    // touch support
    addEventListener('touchstart', function (e) {
        var t = e.touches[0];
        drag = { x: t.clientX, y: t.clientY, a1: _.a1, a2: _.a2 };
    });

    addEventListener('touchend', function () {
        drag = null;
    });

    addEventListener('touchmove', function (e) {
        if (drag && e.touches.length === 1) {
            var t = e.touches[0];
            _.a1 = drag.a1 - (t.clientX - drag.x) / 120;
            _.a2 = drag.a2 - (t.clientY - drag.y) / 120;
        }
    });

    return _;
}

// ── Keyboard ───────────────────────────────────────────────────────

addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        e.preventDefault();
        currentAttractor = (currentAttractor + 1) % attractorDefs.length;
        initParticles();
    }
});

// ── Simulation tick ────────────────────────────────────────────────

function tickParticles() {
    var def = attractorDefs[currentAttractor];
    var pts = particleData;
    var max = pts.length / 3;
    var steps = def.steps;
    var dt = def.stepSize;
    var cx = def.center[0], cy = def.center[1], cz = def.center[2];
    var pChance = def.perturbChance;
    var pScale = def.perturbScale;

    for (var i = 0; i < max; i++) {
        var idx = i * 3;
        var x = pts[idx], y = pts[idx + 1], z = pts[idx + 2];

        // integrate N sub-steps per frame
        for (var s = 0; s < steps; s++) {
            var r = def.tick(x, y, z, dt);
            x = r[0];
            y = r[1];
            z = r[2];
        }

        // detect divergence and reset particle if needed
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) ||
            Math.abs(x) > 1e4 || Math.abs(y) > 1e4 || Math.abs(z) > 1e4) {
            x = (Math.random() * 2 - 1) * def.initRange + cx;
            y = (Math.random() * 2 - 1) * def.initRange + cy;
            z = (Math.random() * 2 - 1) * def.initRange + cz;
        }

        // occasional perturbation to keep particles from collapsing
        if (Math.random() > pChance) {
            x *= pScale;
            y *= pScale;
            z *= pScale;
        }

        pts[idx]     = x;
        pts[idx + 1] = y;
        pts[idx + 2] = z;
    }
}

// ── WebGL shader programs ──────────────────────────────────────────

var clearPass = program(gl, [
    'attribute vec2 pt = () => fullScreenTriangle;',
    'void main() {',
    '    gl_Position = vec4(pt, 0.0, 1.0);',
    '}'
].join('\n'), [
    'void main() {',
    '    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.12);',
    '}'
].join('\n'));

var particlePass = program(gl, [
    'attribute vec3 pt = () => particleData;',
    'uniform vec2 resolution = () => [innerWidth, innerHeight];',
    'uniform float a1 = () => [controls.a1];',
    'uniform float a2 = () => [controls.a2];',
    'uniform float k = () => [controls.k];',
    'uniform vec3 offset = () => attractorDefs[currentAttractor].center;',
    'void main() {',
    '    float far = 1000.0;',
    '    vec3 p = pt - offset;',
    '    float rx = p.x * cos(a1) + p.z * sin(a1);',
    '    float rz = p.z * cos(a1) - p.x * sin(a1);',
    '    float ry = p.y * cos(a2) + rz * sin(a2);',
    '    float d = rz * cos(a2) - p.y * sin(a2) + far;',
    '    vec2 pos = vec2((k / d) * rx, (k / d) * ry);',
    '    pos.y *= resolution.x / resolution.y;',
    '    gl_Position = vec4(pos, 0.0, 1.0);',
    '    gl_PointSize = max(1.5, 3.0 * k / d);',
    '}'
].join('\n'), [
    'uniform vec3 col = () => attractorDefs[currentAttractor].color;',
    'void main() {',
    '    gl_FragColor = vec4(col, 1.0);',
    '}'
].join('\n'));

gl.enable(gl.BLEND);

// ── Init and main loop ─────────────────────────────────────────────

initParticles();

requestAnimationFrame(function draw() {

    tickParticles();

    if (canvas.width !== innerWidth || canvas.height !== innerHeight)
        gl.viewport(0, 0, canvas.width = innerWidth, canvas.height = innerHeight);

    // fade previous frame
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    clearPass(3, gl.TRIANGLES);

    // additive blending for particles
    gl.blendFunc(gl.ONE, gl.ONE);
    particlePass(particleData.length / 3, gl.POINTS);

    requestAnimationFrame(draw);
});

// ── Minimal WebGL program builder ──────────────────────────────────
// Parses inline attribute / uniform declarations with JS closures.
// This keeps the rendering code compact without external dependencies.

function program(ctx, vs, fs) {
    var uniforms = [];
    var attributes = [];
    var pid = ctx.createProgram();

    compileShader(vs, ctx.VERTEX_SHADER);
    compileShader(fs, ctx.FRAGMENT_SHADER);
    ctx.linkProgram(pid);
    ctx.useProgram(pid);

    return function (count, type) {
        ctx.useProgram(pid);
        for (var i = 0; i < uniforms.length; i++) uniforms[i]();
        for (var j = 0; j < attributes.length; j++) attributes[j]();
        ctx.drawArrays(type, 0, count);
    };

    function compileShader(src, type) {
        var id = ctx.createShader(type);
        src = prepare(src);
        ctx.shaderSource(id, 'precision highp float;\n' + src);
        ctx.compileShader(id);
        var msg = ctx.getShaderInfoLog(id);
        if (msg.length > 0) {
            console.log(src.split('\n').map(function (s, i) {
                return ('000' + (1 + i)).slice(-4) + ': ' + s;
            }).join('\n'));
            throw msg;
        }
        ctx.attachShader(pid, id);
    }

    function prepare(src) {
        return src.split('\n').map(function (line) {
            if (~line.indexOf('attribute')) return attr(line);
            if (~line.indexOf('uniform')) return uf(line);
            return line;
        }).join('\n');
    }

    function uf(line) {
        var l = line.split(/\s+/);
        var size = +(l[1].split('vec')[1]) || 1;
        var fn = ctx['uniform' + size + 'f'];
        var code = 'return () =' + line.split('=')[2];
        var getValue = (new Function('', code))();
        var loc;
        uniforms.push(function () {
            if (!loc) loc = ctx.getUniformLocation(pid, l[2]);
            var v = getValue();
            fn.call(ctx, loc, ...v);
        });
        return line.split('=')[0].trim() + ';';
    }

    function attr(line) {
        var l = line.split(/\s+/);
        var size = +(l[1].split('vec')[1]) || 1;
        var bufferId = ctx.createBuffer();
        var code = 'return () =' + line.split('=')[2];
        var getData = (new Function('', code))();
        var loc, drawn;
        attributes.push(function () {
            ctx.bindBuffer(ctx.ARRAY_BUFFER, bufferId);
            if (!loc) {
                loc = ctx.getAttribLocation(pid, l[2]);
                ctx.enableVertexAttribArray(loc);
            }
            var drawType = drawn ? ctx.DYNAMIC_DRAW : ctx.STATIC_DRAW;
            drawn = true;
            var data = getData();
            ctx.bufferData(ctx.ARRAY_BUFFER, data, drawType);
            ctx.vertexAttribPointer(loc, size, ctx.FLOAT, false, 0, 0);
        });
        return line.split('=')[0].trim() + ';';
    }
}
