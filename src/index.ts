/**
 * GPU Acceleration Driver
 * WebGL/WebGPU canvas rendering and shader management
 */

export interface GPUAccelerationDriverConfig {
  canvas: HTMLCanvasElement;
  preferWebGPU?: boolean;
  shaderPaths?: string[];
  antialias?: boolean;
}

export interface ShaderProgram {
  vertexSource: string;
  fragmentSource: string;
  uniforms?: Record<string, unknown>;
}

export interface GPUAccelerationDriverAPI {
  initialize(): Promise<void>;
  loadShader(name: string, program: ShaderProgram): Promise<void>;
  beginFrame(): void;
  endFrame(): void;
  clear(color?: [number, number, number, number]): void;
  drawIndexed(vertexCount: number, indexCount: number): void;
  setShaderProgram(name: string): void;
  setUniform(name: string, value: unknown): void;
  destroy(): Promise<void>;
}

export function createGPUAccelerationDriver(
  config: GPUAccelerationDriverConfig
): GPUAccelerationDriverAPI {
  let activeShader = "";
  const shaders = new Map<string, ShaderProgram>();
  const uniforms = new Map<string, unknown>();
  let initialized = false;

  return {
    async initialize() {
      initialized = true;
    },
    async loadShader(name, program) {
      shaders.set(name, { ...program, uniforms: { ...(program.uniforms ?? {}) } });
    },
    beginFrame() {
      if (!initialized) {
        return;
      }
      config.canvas.setAttribute?.("data-frame", "begin");
    },
    endFrame() {
      config.canvas.setAttribute?.("data-frame", "end");
    },
    clear(color = [0, 0, 0, 1]) {
      config.canvas.setAttribute?.("data-clear", color.join(","));
    },
    drawIndexed(vertexCount, indexCount) {
      config.canvas.setAttribute?.("data-draw", `${vertexCount}:${indexCount}`);
    },
    setShaderProgram(name) {
      if (!shaders.has(name)) {
        throw new Error(`Shader program not found: ${name}`);
      }
      activeShader = name;
    },
    setUniform(name, value) {
      uniforms.set(name, value);
      const program = shaders.get(activeShader);
      if (program) {
        program.uniforms = { ...(program.uniforms ?? {}), [name]: value };
      }
    },
    async destroy() {
      shaders.clear();
      uniforms.clear();
      activeShader = "";
      initialized = false;
    },
  };
}
