import { createResourceManager } from './resource-manager.js';
import { createWebGLContext } from './webgl-context.js';
import { createWebGPUBackend } from './webgpu-backend.js';
import { createShaderCompiler } from './shader-compiler.js';
import { createBufferManager } from './buffer-manager.js';
import { createTextureManager } from './texture-manager.js';
import { createComputePipeline } from './compute-pipeline.js';
import { createRenderQueue } from './render-queue.js';
import { createProfiler } from './profiler.js';
export { createResourceManager } from './resource-manager.js';
export { createWebGLContext } from './webgl-context.js';
export { createWebGPUBackend } from './webgpu-backend.js';
export { createShaderCompiler } from './shader-compiler.js';
export { createBufferManager } from './buffer-manager.js';
export { createTextureManager } from './texture-manager.js';
export { createComputePipeline } from './compute-pipeline.js';
export { createRenderQueue } from './render-queue.js';
export { createProfiler } from './profiler.js';
export function createGPUAccelerationDriver(config) {
    let initialized = false;
    let activeShader = '';
    const uniforms = new Map();
    const _resourceManager = createResourceManager();
    let _backend = null;
    let _shaderCompiler = null;
    let _bufferManager = null;
    let _textureManager = null;
    let _computePipeline = null;
    let _renderQueue = null;
    let _profiler = null;
    const shaderSources = new Map();
    function requireInitialized() {
        if (!initialized) {
            throw new Error('GPU Acceleration Driver not initialized. Call initialize() first.');
        }
    }
    function handleContextLoss() {
        console.warn('GPU context lost. Resources will be restored on context recovery.');
    }
    function handleContextRestored() {
        if (_shaderCompiler) {
            _shaderCompiler.clearCache();
            for (const [name, program] of shaderSources) {
                _shaderCompiler.compile(name, program);
            }
        }
        console.info('GPU context restored. Shaders recompiled.');
    }
    return {
        async initialize() {
            if (initialized)
                return;
            if (config.preferWebGPU) {
                _backend = await createWebGPUBackend(config);
            }
            if (!_backend) {
                _backend = createWebGLContext(config);
                if (!_backend.gl) {
                    _backend.destroy();
                    _backend = null;
                    throw new Error('Failed to initialize GPU context. WebGL 2.0 is not supported by this browser.');
                }
            }
            _backend.onContextLost(handleContextLoss);
            _backend.onContextRestored(handleContextRestored);
            _shaderCompiler = createShaderCompiler(_backend);
            _bufferManager = createBufferManager(_backend, _resourceManager);
            _textureManager = createTextureManager(_backend, _resourceManager);
            _computePipeline = createComputePipeline(_backend);
            _renderQueue = createRenderQueue(_backend, _shaderCompiler, _bufferManager);
            _profiler = config.enableProfiling !== false
                ? createProfiler(_backend, _resourceManager)
                : null;
            initialized = true;
        },
        async loadShader(name, program) {
            requireInitialized();
            shaderSources.set(name, { ...program, uniforms: { ...(program.uniforms ?? {}) } });
            if (_shaderCompiler) {
                const compiled = _shaderCompiler.compile(name, program);
                if (!compiled.valid) {
                    const errors = compiled.errors.map(e => e.message).join('; ');
                    throw new Error(`Shader compilation failed for "${name}": ${errors}`);
                }
            }
        },
        beginFrame() {
            if (!initialized)
                return;
            _profiler?.beginFrame();
        },
        endFrame() {
            if (!initialized)
                return;
            _renderQueue?.flush();
            _resourceManager.collectGarbage();
            _profiler?.endFrame();
        },
        clear(color = [0, 0, 0, 1]) {
            if (!initialized)
                return;
            const gl = _backend?.gl;
            if (gl) {
                gl.clearColor(color[0], color[1], color[2], color[3]);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            }
        },
        drawIndexed(vertexCount, indexCount) {
            requireInitialized();
            const gl = _backend?.gl;
            if (gl) {
                if (indexCount > 0) {
                    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
                }
                else {
                    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
                }
            }
        },
        setShaderProgram(name) {
            requireInitialized();
            if (!shaderSources.has(name)) {
                throw new Error(`Shader program not found: ${name}`);
            }
            const compiled = _shaderCompiler?.getProgram(name);
            if (compiled?.glProgram && _backend?.gl) {
                _backend.gl.useProgram(compiled.glProgram);
            }
            activeShader = name;
        },
        setUniform(name, value) {
            requireInitialized();
            uniforms.set(name, value);
            const program = shaderSources.get(activeShader);
            if (program) {
                program.uniforms = { ...(program.uniforms ?? {}), [name]: value };
            }
            const gl = _backend?.gl;
            const compiled = _shaderCompiler?.getProgram(activeShader);
            if (gl && compiled?.glProgram) {
                let location = compiled.uniformLocations.get(name);
                if (location === undefined) {
                    location = gl.getUniformLocation(compiled.glProgram, name);
                    compiled.uniformLocations.set(name, location);
                }
                if (location) {
                    if (typeof value === 'number') {
                        gl.uniform1f(location, value);
                    }
                    else if (Array.isArray(value)) {
                        switch (value.length) {
                            case 2:
                                gl.uniform2fv(location, value);
                                break;
                            case 3:
                                gl.uniform3fv(location, value);
                                break;
                            case 4:
                                gl.uniform4fv(location, value);
                                break;
                            case 9:
                                gl.uniformMatrix3fv(location, false, value);
                                break;
                            case 16:
                                gl.uniformMatrix4fv(location, false, value);
                                break;
                        }
                    }
                }
            }
        },
        createBuffer(descriptor) {
            requireInitialized();
            return _bufferManager.create(descriptor);
        },
        updateBuffer(handle, data, offset) {
            requireInitialized();
            _bufferManager.update(handle, data, offset);
        },
        deleteBuffer(handle) {
            requireInitialized();
            _bufferManager.delete(handle);
        },
        createTexture(descriptor) {
            requireInitialized();
            return _textureManager.create(descriptor);
        },
        createFramebuffer(descriptor) {
            requireInitialized();
            return _textureManager.createFramebuffer(descriptor);
        },
        dispatchCompute(shader, workgroups) {
            requireInitialized();
            _computePipeline.dispatch(shader, workgroups);
        },
        getMetrics() {
            if (_profiler) {
                return _profiler.getMetrics();
            }
            const mem = _resourceManager.getMemoryUsage();
            return {
                frameTime: 0,
                gpuTime: 0,
                drawCalls: 0,
                triangles: 0,
                textureMemory: mem.textures,
                bufferMemory: mem.buffers,
                throttled: false,
            };
        },
        get backend() { return _backend; },
        get shaderCompiler() { return _shaderCompiler; },
        get bufferManager() { return _bufferManager; },
        get textureManager() { return _textureManager; },
        get computePipeline() { return _computePipeline; },
        get renderQueue() { return _renderQueue; },
        get profiler() { return _profiler; },
        get resourceManager() { return _resourceManager; },
        async destroy() {
            _profiler?.destroy();
            _renderQueue?.destroy();
            _computePipeline?.destroy();
            _textureManager?.destroy();
            _bufferManager?.destroy();
            _shaderCompiler?.destroy();
            _backend?.destroy();
            _resourceManager.destroy();
            _profiler = null;
            _renderQueue = null;
            _computePipeline = null;
            _textureManager = null;
            _bufferManager = null;
            _shaderCompiler = null;
            _backend = null;
            shaderSources.clear();
            uniforms.clear();
            activeShader = '';
            initialized = false;
        },
    };
}
//# sourceMappingURL=index.js.map