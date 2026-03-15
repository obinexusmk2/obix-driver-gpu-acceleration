/**
 * Vertex & Index Buffer Management
 * GPU buffer creation, data upload, and memory management
 */

import type {
  BackendContext,
  BufferDescriptor,
  BufferHandle,
  BufferManagerAPI,
  BufferUsage,
  ResourceManagerAPI,
} from './types.js';

function getGLBufferTarget(gl: WebGL2RenderingContext, usage: BufferUsage): number {
  switch (usage) {
    case 'vertex': return gl.ARRAY_BUFFER;
    case 'index': return gl.ELEMENT_ARRAY_BUFFER;
    case 'uniform': return gl.UNIFORM_BUFFER;
    case 'storage': return gl.ARRAY_BUFFER; // WebGL2 uses SSBO-like patterns via UBO
  }
}

function getGLUsageHint(gl: WebGL2RenderingContext, dynamic: boolean): number {
  return dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
}

export function createBufferManager(
  backend: BackendContext,
  resourceManager: ResourceManagerAPI
): BufferManagerAPI {
  const bufferTargets = new Map<number, BufferUsage>();
  const bufferDataCopies = new Map<number, ArrayBufferView>();
  let totalMemory = 0;

  return {
    create(descriptor: BufferDescriptor): BufferHandle {
      const gl = backend.gl;
      const id = resourceManager.nextId();
      const byteSize = descriptor.data.byteLength;

      let glBuffer: WebGLBuffer | undefined;

      if (gl) {
        const buffer = gl.createBuffer();
        if (buffer) {
          glBuffer = buffer;
          const target = getGLBufferTarget(gl, descriptor.usage);
          gl.bindBuffer(target, buffer);
          gl.bufferData(target, descriptor.data, getGLUsageHint(gl, descriptor.dynamic ?? false));
          gl.bindBuffer(target, null);
        }
      }

      const handle: BufferHandle = {
        id,
        type: 'buffer' as const,
        byteSize,
        glBuffer,
      };

      bufferTargets.set(id, descriptor.usage);
      // Keep CPU-side copy for context loss recovery
      bufferDataCopies.set(id, descriptor.data);
      totalMemory += byteSize;

      resourceManager.register(handle, () => {
        if (gl && glBuffer) {
          gl.deleteBuffer(glBuffer);
        }
        bufferTargets.delete(id);
        bufferDataCopies.delete(id);
        totalMemory -= byteSize;
      });

      return handle;
    },

    update(handle: BufferHandle, data: ArrayBufferView, offset = 0): void {
      const gl = backend.gl;
      if (!gl || !handle.glBuffer) return;

      const usage = bufferTargets.get(handle.id);
      if (!usage) return;

      const target = getGLBufferTarget(gl, usage);
      gl.bindBuffer(target, handle.glBuffer);
      gl.bufferSubData(target, offset, data);
      gl.bindBuffer(target, null);

      // Update CPU-side copy
      bufferDataCopies.set(handle.id, data);
    },

    bind(handle: BufferHandle): void {
      const gl = backend.gl;
      if (!gl || !handle.glBuffer) return;

      const usage = bufferTargets.get(handle.id);
      if (!usage) return;

      const target = getGLBufferTarget(gl, usage);
      gl.bindBuffer(target, handle.glBuffer);
    },

    delete(handle: BufferHandle): void {
      resourceManager.release(handle.id);
    },

    getMemoryUsage(): number {
      return totalMemory;
    },

    destroy(): void {
      bufferTargets.clear();
      bufferDataCopies.clear();
      totalMemory = 0;
    },
  };
}
