/**
 * Resource Manager - GPU resource lifecycle, reference counting, and garbage collection
 */

import type { GPUResourceHandle, ResourceManagerAPI } from './types.js';

interface TrackedResource {
  handle: GPUResourceHandle;
  destructor: () => void;
  refCount: number;
  framesSinceRelease: number;
}

export function createResourceManager(): ResourceManagerAPI {
  let currentId = 0;
  const resources = new Map<number, TrackedResource>();
  let leakHandler: ((handle: GPUResourceHandle) => void) | null = null;

  return {
    nextId(): number {
      return ++currentId;
    },

    register(handle: GPUResourceHandle, destructor: () => void): void {
      resources.set(handle.id, {
        handle,
        destructor,
        refCount: 1,
        framesSinceRelease: 0,
      });
    },

    retain(id: number): void {
      const tracked = resources.get(id);
      if (tracked) {
        tracked.refCount++;
        tracked.framesSinceRelease = 0;
      }
    },

    release(id: number): void {
      const tracked = resources.get(id);
      if (tracked) {
        tracked.refCount = Math.max(0, tracked.refCount - 1);
        if (tracked.refCount === 0) {
          tracked.framesSinceRelease = 0;
        }
      }
    },

    collectGarbage(): number {
      let freedBytes = 0;
      const toDelete: number[] = [];

      for (const [id, tracked] of resources) {
        if (tracked.refCount === 0) {
          tracked.framesSinceRelease++;

          if (tracked.framesSinceRelease > 60) {
            if (leakHandler) {
              leakHandler(tracked.handle);
            }
          }

          // Destroy resources with zero refs
          tracked.destructor();
          freedBytes += tracked.handle.byteSize;
          toDelete.push(id);
        }
      }

      for (const id of toDelete) {
        resources.delete(id);
      }

      return freedBytes;
    },

    getMemoryUsage(): { buffers: number; textures: number; shaders: number; total: number } {
      let buffers = 0;
      let textures = 0;
      let shaders = 0;

      for (const tracked of resources.values()) {
        switch (tracked.handle.type) {
          case 'buffer':
            buffers += tracked.handle.byteSize;
            break;
          case 'texture':
          case 'framebuffer':
            textures += tracked.handle.byteSize;
            break;
          case 'shader':
            shaders += tracked.handle.byteSize;
            break;
        }
      }

      return { buffers, textures, shaders, total: buffers + textures + shaders };
    },

    onLeak(handler: (handle: GPUResourceHandle) => void): void {
      leakHandler = handler;
    },

    destroy(): void {
      for (const tracked of resources.values()) {
        tracked.destructor();
      }
      resources.clear();
      leakHandler = null;
      currentId = 0;
    },
  };
}
