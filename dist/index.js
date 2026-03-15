/**
 * GPU Acceleration Driver
 * WebGL/WebGPU canvas rendering and shader management
 */
export function createGPUAccelerationDriver(config) {
    let activeShader = "";
    const shaders = new Map();
    const uniforms = new Map();
    let initialized = false;
    return {
        async initialize() {
            initialized = true;
        },
        async loadShader(name, program) {
            shaders.set(name, { ...program, uniforms: { ...(program.uniforms ?? {}) } });
        },
        beginFrame() {
            if (!initialized) {
                return;
            }
            config.canvas.setAttribute?.("data-frame", "begin");
        },
        endFrame() {
            config.canvas.setAttribute?.("data-frame", "end");
        },
        clear(color = [0, 0, 0, 1]) {
            config.canvas.setAttribute?.("data-clear", color.join(","));
        },
        drawIndexed(vertexCount, indexCount) {
            config.canvas.setAttribute?.("data-draw", `${vertexCount}:${indexCount}`);
        },
        setShaderProgram(name) {
            if (!shaders.has(name)) {
                throw new Error(`Shader program not found: ${name}`);
            }
            activeShader = name;
        },
        setUniform(name, value) {
            uniforms.set(name, value);
            const program = shaders.get(activeShader);
            if (program) {
                program.uniforms = { ...(program.uniforms ?? {}), [name]: value };
            }
        },
        async destroy() {
            shaders.clear();
            uniforms.clear();
            activeShader = "";
            initialized = false;
        },
    };
}
//# sourceMappingURL=index.js.map