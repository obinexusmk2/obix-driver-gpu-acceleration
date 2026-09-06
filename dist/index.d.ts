export type { BackendContext, BackendType, BufferDescriptor, BufferHandle, BufferManagerAPI, BufferUsage, CompiledShader, ComputePipelineAPI, ContextLossStrategy, Disposable, FrameMetrics, FramebufferDescriptor, FramebufferHandle, GPUAccelerationDriverAPI, GPUAccelerationDriverConfig, GPUResourceHandle, PowerPreference, ProfilerAPI, RenderCommand, RenderQueueAPI, ResourceManagerAPI, ResourceType, ShaderCompilerAPI, ShaderError, ShaderProgram, TextureDescriptor, TextureFormat, TextureHandle, TextureManagerAPI, } from './types.js';
import type { GPUAccelerationDriverAPI, GPUAccelerationDriverConfig } from './types.js';
export { createResourceManager } from './resource-manager.js';
export { createWebGLContext } from './webgl-context.js';
export { createWebGPUBackend } from './webgpu-backend.js';
export { createShaderCompiler } from './shader-compiler.js';
export { createBufferManager } from './buffer-manager.js';
export { createTextureManager } from './texture-manager.js';
export { createComputePipeline } from './compute-pipeline.js';
export { createRenderQueue } from './render-queue.js';
export { createProfiler } from './profiler.js';
export declare function createGPUAccelerationDriver(config: GPUAccelerationDriverConfig): GPUAccelerationDriverAPI;
//# sourceMappingURL=index.d.ts.map