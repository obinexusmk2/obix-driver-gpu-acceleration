/**
 * GPU Acceleration Driver
 * Cross-platform WebGL/WebGPU canvas rendering and shader management
 */

// Re-export all types
export type {
  BackendContext,
  BackendType,
  BufferDescriptor,
  BufferHandle,
  BufferManagerAPI,
  BufferUsage,
  CompiledShader,
  ComputePipelineAPI,
  ContextLossStrategy,
  Disposable,
  FrameMetrics,
  FramebufferDescriptor,
  FramebufferHandle,
  GPUAccelerationDriverAPI,
  GPUAccelerationDriverConfig,
  GPUResourceHandle,
  PowerPreference,
  ProfilerAPI,
  RenderCommand,
  RenderQueueAPI,
  ResourceManagerAPI,
  ResourceType,
  ShaderCompilerAPI,
  ShaderError,
  ShaderProgram,
  TextureDescriptor,
  TextureFormat,
  TextureHandle,
  TextureManagerAPI,
} from './types.js';

import type {
  BackendContext,
  BufferDescriptor,
  BufferHandle,
  BufferManagerAPI,
  ComputePipelineAPI,
  FramebufferDescriptor,
  FramebufferHandle,
  FrameMetrics,
  GPUAccelerationDriverAPI,
  GPUAccelerationDriverConfig,
  ProfilerAPI,
  RenderQueueAPI,
  ResourceManagerAPI,
  ShaderCompilerAPI,
  ShaderProgram,
  TextureDescriptor,
  TextureHandle,
  TextureManagerAPI,
} from './types.js';

import { createResourceManager } from './resource-manager.js';
import { createWebGLContext } from './webgl-context.js';
import { createWebGPUBackend } from './webgpu-backend.js';
import { createShaderCompiler } from './shader-compiler.js';
import { createBufferManager } from './buffer-manager.js';
import { createTextureManager } from './texture-manager.js';
import { createComputePipeline } from './compute-pipeline.js';
import { createRenderQueue } from './render-queue.js';
import { createProfiler } from './profiler.js';

// Re-export sub-module factories
export { createResourceManager } from './resource-manager.js';
export { createWebGLContext } from './webgl-context.js';
export { createWebGPUBackend } from './webgpu-backend.js';
export { createShaderCompiler } from './shader-compiler.js';
export { createBufferManager } from './buffer-manager.js';
export { createTextureManager } from './texture-manager.js';
export { createComputePipeline } from './compute-pipeline.js';
export { createRenderQueue } from './render-queue.js';
export { createProfiler } from './profiler.js';

export function createGPUAccelerationDriver(
  config: GPUAccelerationDriverConfig
): GPUAccelerationDriverAPI {
  let initialized = false;
  let activeShader = '';
  const uniforms = new Map<string, unknown>();

  // Resource manager is always available (backend-agnostic)
  const _resourceManager: ResourceManagerAPI = createResourceManager();

  // Sub-modules initialized lazily during initialize()
  let _backend: BackendContext | null = null;
  let _shaderCompiler: ShaderCompilerAPI | null = null;
  let _bufferManager: BufferManagerAPI | null = null;
  let _textureManager: TextureManagerAPI | null = null;
  let _computePipeline: ComputePipelineAPI | null = null;
  let _renderQueue: RenderQueueAPI | null = null;
  let _profiler: ProfilerAPI | null = null;

  // Shader source registry for context loss recovery
  const shaderSources = new Map<string, ShaderProgram>();

  function requireInitialized(): void {
    if (!initialized) {
      throw new Error('GPU Acceleration Driver not initialized. Call initialize() first.');
    }
  }

  function handleContextLoss(): void {
    console.warn('GPU context lost. Resources will be restored on context recovery.');
  }

  function handleContextRestored(): void {
    // Re-compile all shaders from source registry
    if (_shaderCompiler) {
      _shaderCompiler.clearCache();
      for (const [name, program] of shaderSources) {
        _shaderCompiler.compile(name, program);
      }
    }
    console.info('GPU context restored. Shaders recompiled.');
  }

  return {
    async initialize(): Promise<void> {
      if (initialized) return;

      // Try WebGPU first if preferred
      if (config.preferWebGPU) {
        _backend = await createWebGPUBackend(config);
      }

      // Fall back to WebGL 2.0
      if (!_backend) {
        _backend = createWebGLContext(config);

        // Verify WebGL context was created
        if (!_backend.gl) {
          _backend.destroy();
          _backend = null;
          throw new Error(
            'Failed to initialize GPU context. WebGL 2.0 is not supported by this browser.'
          );
        }
      }

      // Register context loss handlers
      _backend.onContextLost(handleContextLoss);
      _backend.onContextRestored(handleContextRestored);

      // Initialize sub-modules
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

    async loadShader(name: string, program: ShaderProgram): Promise<void> {
      requireInitialized();

      // Store source for context loss recovery
      shaderSources.set(name, { ...program, uniforms: { ...(program.uniforms ?? {}) } });

      // Compile via shader compiler
      if (_shaderCompiler) {
        const compiled = _shaderCompiler.compile(name, program);
        if (!compiled.valid) {
          const errors = compiled.errors.map(e => e.message).join('; ');
          throw new Error(`Shader compilation failed for "${name}": ${errors}`);
        }
      }
    },

    beginFrame(): void {
      if (!initialized) return;
      _profiler?.beginFrame();
    },

    endFrame(): void {
      if (!initialized) return;

      // Flush render queue
      _renderQueue?.flush();

      // Collect garbage periodically
      _resourceManager.collectGarbage();

      _profiler?.endFrame();
    },

    clear(color: [number, number, number, number] = [0, 0, 0, 1]): void {
      if (!initialized) return;

      const gl = _backend?.gl;
      if (gl) {
        gl.clearColor(color[0], color[1], color[2], color[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      }
    },

    drawIndexed(vertexCount: number, indexCount: number): void {
      requireInitialized();

      const gl = _backend?.gl;
      if (gl) {
        if (indexCount > 0) {
          gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        } else {
          gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
        }
      }
    },

    setShaderProgram(name: string): void {
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

    setUniform(name: string, value: unknown): void {
      requireInitialized();

      uniforms.set(name, value);

      // Update the shader source registry
      const program = shaderSources.get(activeShader);
      if (program) {
        program.uniforms = { ...(program.uniforms ?? {}), [name]: value };
      }

      // Set uniform on the active WebGL program
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
          } else if (Array.isArray(value)) {
            switch (value.length) {
              case 2: gl.uniform2fv(location, value as number[]); break;
              case 3: gl.uniform3fv(location, value as number[]); break;
              case 4: gl.uniform4fv(location, value as number[]); break;
              case 9: gl.uniformMatrix3fv(location, false, value as number[]); break;
              case 16: gl.uniformMatrix4fv(location, false, value as number[]); break;
            }
          }
        }
      }
    },

    // ─── Buffer Operations ─────────────────────────────────────────────

    createBuffer(descriptor: BufferDescriptor): BufferHandle {
      requireInitialized();
      return _bufferManager!.create(descriptor);
    },

    updateBuffer(handle: BufferHandle, data: ArrayBufferView, offset?: number): void {
      requireInitialized();
      _bufferManager!.update(handle, data, offset);
    },

    deleteBuffer(handle: BufferHandle): void {
      requireInitialized();
      _bufferManager!.delete(handle);
    },

    // ─── Texture Operations ────────────────────────────────────────────

    createTexture(descriptor: TextureDescriptor): TextureHandle {
      requireInitialized();
      return _textureManager!.create(descriptor);
    },

    createFramebuffer(descriptor: FramebufferDescriptor): FramebufferHandle {
      requireInitialized();
      return _textureManager!.createFramebuffer(descriptor);
    },

    // ─── Compute ───────────────────────────────────────────────────────

    dispatchCompute(shader: string, workgroups: [number, number, number]): void {
      requireInitialized();
      _computePipeline!.dispatch(shader, workgroups);
    },

    // ─── Metrics ───────────────────────────────────────────────────────

    getMetrics(): FrameMetrics {
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

    // ─── Sub-feature Accessors ─────────────────────────────────────────

    get backend() { return _backend; },
    get shaderCompiler() { return _shaderCompiler; },
    get bufferManager() { return _bufferManager; },
    get textureManager() { return _textureManager; },
    get computePipeline() { return _computePipeline; },
    get renderQueue() { return _renderQueue; },
    get profiler() { return _profiler; },
    get resourceManager() { return _resourceManager; },

    // ─── Lifecycle ─────────────────────────────────────────────────────

    async destroy(): Promise<void> {
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
