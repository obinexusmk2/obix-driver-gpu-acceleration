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
export declare function createGPUAccelerationDriver(config: GPUAccelerationDriverConfig): GPUAccelerationDriverAPI;
//# sourceMappingURL=index.d.ts.map