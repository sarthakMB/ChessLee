// --- Shader Logic ---
const initShader = () => {
    const canvas = document.getElementById("shader-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("WebGL not supported");
        return;
    }

    // Resize canvas to fill window
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Vertex Shader
    const vertexShaderSource = `
        attribute vec4 aVertexPosition;
        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    // Fragment Shader
    const fragmentShaderSource = `
        precision highp float;
        uniform vec2 iResolution;
        uniform float iTime;
        
        vec3 spectral_colour(float l) {
            float r=0.0,g=0.0,b=0.0;
            if ((l>=400.0)&&(l<410.0)) { float t=(l-400.0)/(410.0-400.0); r=+(0.33*t)-(0.20*t*t); }
            else if ((l>=410.0)&&(l<475.0)) { float t=(l-410.0)/(475.0-410.0); r=0.14-(0.13*t*t); }
            else if ((l>=545.0)&&(l<595.0)) { float t=(l-545.0)/(595.0-545.0); r=+(1.98*t)-(t*t); }
            else if ((l>=595.0)&&(l<650.0)) { float t=(l-595.0)/(650.0-595.0); r=0.98+(0.06*t)-(0.40*t*t); }
            else if ((l>=650.0)&&(l<700.0)) { float t=(l-650.0)/(700.0-650.0); r=0.65-(0.84*t)+(0.20*t*t); }
            if ((l>=415.0)&&(l<475.0)) { float t=(l-415.0)/(475.0-415.0); g=+(0.80*t*t); }
            else if ((l>=475.0)&&(l<590.0)) { float t=(l-475.0)/(590.0-475.0); g=0.8+(0.76*t)-(0.80*t*t); }
            else if ((l>=585.0)&&(l<639.0)) { float t=(l-585.0)/(639.0-585.0); g=0.82-(0.80*t); }
            if ((l>=400.0)&&(l<475.0)) { float t=(l-400.0)/(475.0-400.0); b=+(2.20*t)-(1.50*t*t); }
            else if ((l>=475.0)&&(l<560.0)) { float t=(l-475.0)/(560.0-475.0); b=0.7-(t)+(0.30*t*t); }
            return vec3(r,g,b);
        }
        
        void main() {
            vec2 p = (2.0*gl_FragCoord.xy - iResolution.xy) / min(iResolution.x, iResolution.y);
            p *= 2.0;
            for(int i=0;i<8;i++) {
                vec2 newp = vec2(
                    p.y + cos(p.x + iTime) - sin(p.y * cos(iTime * 0.2)),
                    p.x - sin(p.y - iTime) - cos(p.x * sin(iTime * 0.3))
                );
                p = newp;
            }
            gl_FragColor = vec4(spectral_colour(p.y * 50.0 + 500.0 + sin(iTime * 0.6)), 1.0);
        }
    `;

    // Compile Shader Helper
    const createShader = (gl, type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Create Program
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const timeUniformLocation = gl.getUniformLocation(shaderProgram, "iTime");
    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, "iResolution");

    // Animation Loop
    let startTime = Date.now();
    const render = () => {
        // Slow down the animation by multiplying by a factor (e.g., 0.2)
        const currentTime = ((Date.now() - startTime) / 1000) * 0.2;

        gl.uniform1f(timeUniformLocation, currentTime);
        gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    };

    render();
};

// Initialize on load
window.addEventListener('load', initShader);
