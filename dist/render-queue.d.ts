/**
 * Render Queue & Batch System
 * Command buffer system to batch draw calls and minimize state changes
 */
import type { BackendContext, BufferManagerAPI, RenderQueueAPI, ShaderCompilerAPI } from './types.js';
export declare function createRenderQueue(backend: BackendContext, shaderCompiler: ShaderCompilerAPI, bufferManager: BufferManagerAPI): RenderQueueAPI;
//# sourceMappingURL=render-queue.d.ts.map