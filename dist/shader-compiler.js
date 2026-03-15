/**
 * Shader Compilation & Caching System
 * Compile GLSL/WGSL shaders, cache compiled programs, error diagnostics
 */
function hashSource(vertex, fragment) {
    // Simple hash for cache deduplication
    let hash = 0;
    const combined = vertex + '\0' + fragment;
    for (let i = 0; i < combined.length; i++) {
        const ch = combined.charCodeAt(i);
        hash = ((hash << 5) - hash + ch) | 0;
    }
    return hash.toString(36);
}
function parseShaderLog(log, type) {
    if (!log || log.trim() === '')
        return [];
    const errors = [];
    const lines = log.split('\n');
    for (const line of lines) {
        if (!line.trim())
            continue;
        // Common format: ERROR: 0:lineNum: message
        const match = line.match(/ERROR:\s*\d+:(\d+):\s*(.*)/i);
        if (match) {
            errors.push({
                type,
                message: match[2].trim(),
                line: parseInt(match[1], 10),
            });
        }
        else {
            errors.push({ type, message: line.trim() });
        }
    }
    return errors;
}
function ensurePrecision(source) {
    // Insert precision qualifier for fragment shaders if missing
    if (!/precision\s+(lowp|mediump|highp)\s+float/i.test(source)) {
        return 'precision highp float;\n' + source;
    }
    return source;
}
export function createShaderCompiler(backend) {
    const cache = new Map();
    const allErrors = [];
    function compileWebGL(name, program) {
        const gl = backend.gl;
        if (!gl) {
            const err = { type: 'link', message: 'No WebGL context available' };
            return {
                name,
                program,
                uniformLocations: new Map(),
                valid: false,
                errors: [err],
            };
        }
        const errors = [];
        // Compile vertex shader
        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (!vs) {
            errors.push({ type: 'vertex', message: 'Failed to create vertex shader' });
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        gl.shaderSource(vs, program.vertexSource);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(vs) ?? '';
            errors.push(...parseShaderLog(log, 'vertex'));
            gl.deleteShader(vs);
            allErrors.push(...errors);
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        // Compile fragment shader with precision injection
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fs) {
            gl.deleteShader(vs);
            errors.push({ type: 'fragment', message: 'Failed to create fragment shader' });
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        gl.shaderSource(fs, ensurePrecision(program.fragmentSource));
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            const log = gl.getShaderInfoLog(fs) ?? '';
            errors.push(...parseShaderLog(log, 'fragment'));
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            allErrors.push(...errors);
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        // Link program
        const glProgram = gl.createProgram();
        if (!glProgram) {
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            errors.push({ type: 'link', message: 'Failed to create shader program' });
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        gl.attachShader(glProgram, vs);
        gl.attachShader(glProgram, fs);
        gl.linkProgram(glProgram);
        // Shaders can be deleted after linking
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(glProgram, gl.LINK_STATUS)) {
            const log = gl.getProgramInfoLog(glProgram) ?? '';
            errors.push(...parseShaderLog(log, 'link'));
            gl.deleteProgram(glProgram);
            allErrors.push(...errors);
            return { name, program, uniformLocations: new Map(), valid: false, errors };
        }
        // Extract uniform locations
        const uniformLocations = new Map();
        if (program.uniforms) {
            for (const uniformName of Object.keys(program.uniforms)) {
                uniformLocations.set(uniformName, gl.getUniformLocation(glProgram, uniformName));
            }
        }
        return {
            name,
            program,
            glProgram,
            uniformLocations,
            valid: true,
            errors: [],
        };
    }
    return {
        compile(name, program) {
            const cacheKey = hashSource(program.vertexSource, program.fragmentSource);
            const cached = cache.get(cacheKey);
            if (cached && cached.valid) {
                return cached;
            }
            const compiled = compileWebGL(name, program);
            if (compiled.valid) {
                cache.set(cacheKey, compiled);
            }
            // Also store by name for lookup
            cache.set(name, compiled);
            return compiled;
        },
        getProgram(name) {
            return cache.get(name);
        },
        getCompilationErrors() {
            return [...allErrors];
        },
        clearCache() {
            const gl = backend.gl;
            if (gl) {
                for (const compiled of cache.values()) {
                    if (compiled.glProgram) {
                        gl.deleteProgram(compiled.glProgram);
                    }
                }
            }
            cache.clear();
            allErrors.length = 0;
        },
        destroy() {
            const gl = backend.gl;
            if (gl) {
                for (const compiled of cache.values()) {
                    if (compiled.glProgram) {
                        gl.deleteProgram(compiled.glProgram);
                    }
                }
            }
            cache.clear();
            allErrors.length = 0;
        },
    };
}
//# sourceMappingURL=shader-compiler.js.map