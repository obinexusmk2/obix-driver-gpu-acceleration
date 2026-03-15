/**
 * Compute Shader Pipeline (WebGPU-only)
 * General-purpose GPU computing for data-parallel tasks
 */

import type { BackendContext, ComputePipelineAPI } from './types.js';

export function createComputePipeline(backend: BackendContext): ComputePipelineAPI {
  const isWebGPU = backend.type === 'webgpu';

  return {
    get supported() {
      return isWebGPU;
    },

    dispatch(shader: string, workgroups: [number, number, number]): void {
      if (!isWebGPU) {
        throw new Error(
          `Compute shaders require WebGPU backend (current: ${backend.type}). ` +
          'Set preferWebGPU: true in driver config if WebGPU is available.'
        );
      }

      // WebGPU compute dispatch would use:
      // const pipeline = device.createComputePipeline(...)
      // const encoder = device.createCommandEncoder()
      // const pass = encoder.beginComputePass()
      // pass.setPipeline(pipeline)
      // pass.dispatchWorkgroups(...workgroups)
      // pass.end()
      // device.queue.submit([encoder.finish()])

      // Placeholder: log dispatch for now since full WebGPU pipeline
      // requires device reference not currently exposed through BackendContext
      void shader;
      void workgroups;
    },

    destroy(): void {
      // Clean up compute pipelines
    },
  };
}
