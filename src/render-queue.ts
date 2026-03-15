/**
 * Render Queue & Batch System
 * Command buffer system to batch draw calls and minimize state changes
 */

import type {
  BackendContext,
  BufferManagerAPI,
  RenderCommand,
  RenderQueueAPI,
  ShaderCompilerAPI,
} from './types.js';

export function createRenderQueue(
  backend: BackendContext,
  shaderCompiler: ShaderCompilerAPI,
  bufferManager: BufferManagerAPI
): RenderQueueAPI {
  const queue: RenderCommand[] = [];
  let drawCallCount = 0;

  function setUniforms(gl: WebGL2RenderingContext, shaderName: string, uniforms: Record<string, unknown>): void {
    const compiled = shaderCompiler.getProgram(shaderName);
    if (!compiled?.glProgram) return;

    for (const [name, value] of Object.entries(uniforms)) {
      const location = compiled.uniformLocations.get(name) ?? gl.getUniformLocation(compiled.glProgram, name);
      if (!location) continue;

      // Cache the location for future use
      compiled.uniformLocations.set(name, location);

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

  return {
    submit(command: RenderCommand): void {
      queue.push(command);
    },

    flush(): void {
      if (queue.length === 0) return;

      const gl = backend.gl;
      if (!gl) return;

      // Sort by sort key to minimize state changes (shader switches)
      queue.sort((a, b) => a.sortKey - b.sortKey);

      let currentShader = '';
      drawCallCount = 0;

      for (const cmd of queue) {
        // Only switch shader when needed
        if (cmd.shader !== currentShader) {
          const compiled = shaderCompiler.getProgram(cmd.shader);
          if (compiled?.glProgram) {
            gl.useProgram(compiled.glProgram);
            currentShader = cmd.shader;
          } else {
            continue; // Skip commands with invalid shaders
          }
        }

        // Bind vertex buffer
        bufferManager.bind(cmd.vertexBuffer);

        // Set uniforms
        setUniforms(gl, cmd.shader, cmd.uniforms);

        // Draw
        if (cmd.indexBuffer) {
          bufferManager.bind(cmd.indexBuffer);
          gl.drawElements(gl.TRIANGLES, cmd.indexCount, gl.UNSIGNED_SHORT, 0);
        } else {
          gl.drawArrays(gl.TRIANGLES, 0, cmd.vertexCount);
        }

        drawCallCount++;
      }

      queue.length = 0;
    },

    clear(): void {
      queue.length = 0;
    },

    getDrawCallCount(): number {
      return drawCallCount;
    },

    destroy(): void {
      queue.length = 0;
      drawCallCount = 0;
    },
  };
}
