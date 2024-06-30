const canvas = document.createElement('canvas');
canvas.style.background = '#000'
document.body.appendChild(canvas);
document.body.style.margin = 0;
document.body.style.overflow = 'hidden';

let b = 0.208186;

addEventListener('mousemove', (e) => {
    (b = e.y/innerHeight*0.1 +  e.x/innerWidth*0.1 + 0.1)
})

const gl = canvas.getContext("webgl", {preserveDrawingBuffer: true}); 
const controls = OrbitControls(0, 0, 150);
const fullScreenTriangle = new Float32Array([-1,3,-1,-1,3,-1])
const thomasAttractor = new Float32Array(Array(15000).fill(0).map(() => Math.random()*6-3))

const clearPass = program(gl, `
attribute vec2 pt = () => fullScreenTriangle;
void main() {
    gl_Position = vec4(pt, 0.0, 1.0);
}`, `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);
}`);

const particles = program(gl, `
attribute vec3 pt = () => thomasAttractor;
uniform vec2 resolution = () => [innerWidth, innerHeight];
uniform float time = () => [window.t];
uniform float a1 = () => [controls.a1];
uniform float a2 = () => [controls.a2];
uniform float k = () => [controls.k];
void main() {
    float far = 1000.0;
    float x = pt.x*cos(a1) + pt.z*sin(a1);
    float z = pt.z*cos(a1) - pt.x*sin(a1);
    float y = pt.y*cos(a2) + z*sin(a2);
    float d = z*cos(a2) - pt.y*sin(a2) + far;
    vec2 pos = vec2( (k/d)*x, (k/d)*y );
    pos.y *= resolution.x/resolution.y;
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = 2.0;
}`, `
void main() {
    gl_FragColor = vec4(1.0);
}`);

gl.enable(gl.BLEND);

requestAnimationFrame(function draw(t) {
    window. t = t;
    thomasAttractorTick(thomasAttractor, t);

    if (canvas.width != innerWidth || canvas.height !== innerHeight) 
        gl.viewport(0, 0, canvas.width = innerWidth, canvas.height = innerHeight);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); 
    clearPass(3, gl.TRIANGLES);

    // addittive blending
    gl.blendFunc(gl.ONE, gl.ONE); 
    particles(thomasAttractor.length/3, gl.POINTS);

    requestAnimationFrame(draw);
});

function thomasAttractorTick(pts, t) {
   
    const dt = (t - pts.t0 || 0)/1000;
    const max = pts.length/3;
    for (let i = 0; i < max; i++){
        const x = pts[i*3]
        const y = pts[i*3+1]
        const z = pts[i*3+2]
        pts[i*3]   = x + dt * (Math.sin(y) - b*x);
        pts[i*3+1] = y + dt * (Math.sin(z) - b*y);
        pts[i*3+2] = z + dt * (Math.sin(x) - b*z);
        if (Math.random() > 0.9999) {
            pts[i*3] *= 2;
            pts[i*3+1] *= 2;
            pts[i*3+2] *= 2;
        }
            
    }
    pts.t0 = t;
}

function OrbitControls(a1 = 0, a2 = 0, k = 150, p){
    const _ = {a1, a2, k}
    const evt = (t, f) => addEventListener(t, f);//e => f(e)
    evt('wheel', e => _.k *= 1 - Math.sign(e.deltaY)*0.1)
    evt('mouseup', e => p = null)
    evt('mousedown', e => p = {x: e.x, y: e.y, a1:_.a1, a2:_.a2})
    evt('mousemove', e => p && (_.a1 = p.a1-(e.x-p.x)/100) + (_.a2 = p.a2-(e.y-p.y)/100))
    return _
}

function program(gl, vs, fs) {
    const uniforms = [];
    const attributes = [];
    const pid = gl.createProgram();
    shader(vs, gl.VERTEX_SHADER)    
    shader(fs, gl.FRAGMENT_SHADER)    
    gl.linkProgram(pid);
    gl.useProgram(pid);

    return (count, type) => {
      gl.useProgram(pid);
      uniforms.forEach(uf => uf());
      attributes.forEach(attr => attr());
      gl.drawArrays(type, 0, count);
    };
    
    function shader(src, type) {
        const id = gl.createShader(type);
        src = prepare(src);
        console.log(src)
        gl.shaderSource(id, 'precision highp float;\n' + src);
        gl.compileShader(id);
        const message = gl.getShaderInfoLog(id);
        if (message.length > 0) {
            console.log(src.split('\n').map((str, i) => 
                ("" + (1 + i)).padStart(4, "0") + ": " + str).join('\n'));
            throw message;
        }
        gl.attachShader(pid, id);
    }
    
    function prepare(src) {
        return src.split('\n').map(line => {
            if (~line.indexOf('attribute')) 
                line = attr(line);
            else if (~line.indexOf('uniform')) 
                line = uf(line);
            return line;
        }).join('\n');
    }
    
    function uf(line) {
        const l = line.split(/\s+/);
        const size = +l[1].split('vec')[1] || 1;
        const f = gl[`uniform${size}f`];
        const code = 'return () =' + line.split('=')[2];
        const uniformValue = (new Function('', code))();
        let loc;
        uniforms.push(() => {
            if (!loc)
                loc = gl.getUniformLocation(pid, l[2]); 
            const v = uniformValue();
            f.call(gl, loc, ...v)
        });
        return line.split('=')[0].trim() + ';';
    }
 
    function attr(line) {
        const l = line.split(/\s+/)
        const size = +l[1].split('vec')[1] || 1;
        const bufferId = gl.createBuffer();
        const code = 'return () =' + line.split('=')[2];
        const arrtibuteValue = (new Function('', code))();
        let type, loc;
        attributes.push(() => {
            gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
            if (!loc) {
                loc = gl.getAttribLocation(pid, l[2]);
                gl.enableVertexAttribArray(loc);
            }
            type = type ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW;
            const data = arrtibuteValue();
            gl.bufferData(gl.ARRAY_BUFFER, data , type);  
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); 
        })
        return line.split('=')[0].trim() + ';'
    }
}