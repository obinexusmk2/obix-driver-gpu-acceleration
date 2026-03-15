/**
 * WebGPU Backend Support
 * Experimental WebGPU rendering backend with device/adapter management
 */

import type { BackendContext, GPUAccelerationDriverConfig } from './types.js';

// Minimal WebGPU type stubs for type safety without external dependency
interface WebGPUNavigator extends Navigator {
  gpu?: {
    requestAdapter(options?: { powerPreference?: string }): Promise<WebGPUAdapter | null>;
    getPreferredCanvasFormat?(): string;
  };
}

interface WebGPUAdapter {
  requestDevice(): Promise<WebGPUDevice>;
}

interface WebGPUDevice {
  lost: Promise<{ message: string; reason: string }>;
  destroy(): void;
}

interface WebGPUCanvasContext {
  configure(options: { device: WebGPUDevice; format: string; alphaMode: string }): void;
}

export async function createWebGPUBackend(
  config: GPUAccelerationDriverConfig
): Promise<BackendContext | null> {
  // Feature detection
  const nav = navigator as WebGPUNavigator;
  const gpu = nav.gpu;
  if (!gpu) {
    return null;
  }

  let device: WebGPUDevice | null = null;
  let gpuContext: WebGPUCanvasContext | null = null;
  let lost = false;
  const lossHandlers: Array<() => void> = [];
  const restoreHandlers: Array<() => void> = [];

  try {
    const adapter = await gpu.requestAdapter({
      powerPreference: config.powerPreference ?? 'default',
    });

    if (!adapter) return null;

    device = await adapter.requestDevice();

    // Handle device loss
    device.lost.then((info) => {
      lost = true;
      console.warn(`WebGPU device lost: ${info.message} (reason: ${info.reason})`);
      for (const handler of lossHandlers) {
        handler();
      }
    });

    // Configure canvas context
    gpuContext = config.canvas.getContext('webgpu') as unknown as WebGPUCanvasContext | null;
    if (gpuContext && device) {
      const format = nav.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
      gpuContext.configure({
        device,
        format,
        alphaMode: 'premultiplied',
      });
    }
  } catch {
    return null;
  }

  return {
    get type() {
      return 'webgpu' as const;
    },
    get lost() {
      return lost;
    },
    get gl() {
      return null; // WebGPU doesn't use WebGL context
    },
    onContextLost(handler: () => void): void {
      lossHandlers.push(handler);
    },
    onContextRestored(handler: () => void): void {
      restoreHandlers.push(handler);
    },
    async restore(): Promise<boolean> {
      // WebGPU device loss is typically unrecoverable
      // The application should re-initialize
      return false;
    },
    destroy(): void {
      device?.destroy();
      device = null;
      gpuContext = null;
      lost = true;
      lossHandlers.length = 0;
      restoreHandlers.length = 0;
    },
  };
}
