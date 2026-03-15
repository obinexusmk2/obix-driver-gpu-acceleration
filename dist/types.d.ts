/**
 * GPU Acceleration Driver - Shared Types
 * WebGL/WebGPU canvas rendering and shader management
 */
export type BackendType = 'webgl2' | 'webgpu' | 'none';
export type PowerPreference = 'default' | 'high-performance' | 'low-power';
export type ContextLossStrategy = 'restore' | 'recreate' | 'notify';
export interface GPUAccelerationDriverConfig {
    canvas: HTMLCanvasElement;
    preferWebGPU?: boolean;
    shaderPaths?: string[];
    antialias?: boolean;
    maxTextureSize?: number;
    enableProfiling?: boolean;
    powerPreference?: PowerPreference;
    contextLossStrategy?: ContextLossStrategy;
    resourcePoolSize?: number;
}
export interface ShaderProgram {
    vertexSource: string;
    fragmentSource: string;
    computeSource?: string;
    uniforms?: Record<string, unknown>;
}
export interface ShaderError {
    type: 'vertex' | 'fragment' | 'compute' | 'link';
    message: string;
    line?: number;
    source?: string;
}
export interface CompiledShader {
    name: string;
    program: ShaderProgram;
    glProgram?: WebGLProgram;
    gpuPipeline?: unknown;
    uniformLocations: Map<string, WebGLUniformLocation | null>;
    valid: boolean;
    errors: ShaderError[];
}
export type ResourceType = 'buffer' | 'texture' | 'shader' | 'framebuffer';
export interface GPUResourceHandle {
    readonly id: number;
    readonly type: ResourceType;
    readonly byteSize: number;
}
export type BufferUsage = 'vertex' | 'index' | 'uniform' | 'storage';
export interface BufferDescriptor {
    usage: BufferUsage;
    data: ArrayBufferView;
    dynamic?: boolean;
}
export interface BufferHandle extends GPUResourceHandle {
    readonly type: 'buffer';
    readonly glBuffer?: WebGLBuffer;
}
export type TextureFormat = 'rgba8' | 'rgb8' | 'r8' | 'depth24' | 'depth32f';
export interface TextureDescriptor {
    width: number;
    height: number;
    format?: TextureFormat;
    mipmaps?: boolean;
    data?: ArrayBufferView | null;
}
export interface TextureHandle extends GPUResourceHandle {
    readonly type: 'texture';
    readonly glTexture?: WebGLTexture;
    readonly width: number;
    readonly height: number;
}
export interface FramebufferDescriptor {
    width: number;
    height: number;
    colorAttachments: TextureHandle[];
    depthAttachment?: TextureHandle;
}
export interface FramebufferHandle extends GPUResourceHandle {
    readonly type: 'framebuffer';
    readonly glFramebuffer?: WebGLFramebuffer;
    readonly width: number;
    readonly height: number;
}
export interface RenderCommand {
    shader: string;
    vertexBuffer: BufferHandle;
    indexBuffer?: BufferHandle;
    uniforms: Record<string, unknown>;
    vertexCount: number;
    indexCount: number;
    sortKey: number;
}
export interface FrameMetrics {
    frameTime: number;
    gpuTime: number;
    drawCalls: number;
    triangles: number;
    textureMemory: number;
    bufferMemory: number;
    throttled: boolean;
}
export interface Disposable {
    destroy(): void;
}
export interface BackendContext extends Disposable {
    readonly type: BackendType;
    readonly lost: boolean;
    readonly gl: WebGL2RenderingContext | null;
    onContextLost(handler: () => void): void;
    onContextRestored(handler: () => void): void;
    restore(): Promise<boolean>;
}
export interface ShaderCompilerAPI extends Disposable {
    compile(name: string, program: ShaderProgram): CompiledShader;
    getProgram(name: string): CompiledShader | undefined;
    getCompilationErrors(): ShaderError[];
    clearCache(): void;
}
export interface BufferManagerAPI extends Disposable {
    create(descriptor: BufferDescriptor): BufferHandle;
    update(handle: BufferHandle, data: ArrayBufferView, offset?: number): void;
    bind(handle: BufferHandle): void;
    delete(handle: BufferHandle): void;
    getMemoryUsage(): number;
}
export interface TextureManagerAPI extends Disposable {
    create(descriptor: TextureDescriptor): TextureHandle;
    createFramebuffer(descriptor: FramebufferDescriptor): FramebufferHandle;
    bind(handle: TextureHandle, unit: number): void;
    generateMipmaps(handle: TextureHandle): void;
    delete(handle: TextureHandle): void;
    getMaxTextureSize(): number;
    getMemoryUsage(): number;
}
export interface ComputePipelineAPI extends Disposable {
    supported: boolean;
    dispatch(shader: string, workgroups: [number, number, number]): void;
}
export interface RenderQueueAPI extends Disposable {
    submit(command: RenderCommand): void;
    flush(): void;
    clear(): void;
    getDrawCallCount(): number;
}
export interface ProfilerAPI extends Disposable {
    beginFrame(): void;
    endFrame(): void;
    getMetrics(): FrameMetrics;
    reset(): void;
}
export interface ResourceManagerAPI extends Disposable {
    register(handle: GPUResourceHandle, destructor: () => void): void;
    retain(id: number): void;
    release(id: number): void;
    collectGarbage(): number;
    getMemoryUsage(): {
        buffers: number;
        textures: number;
        shaders: number;
        total: number;
    };
    onLeak(handler: (handle: GPUResourceHandle) => void): void;
    nextId(): number;
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
    createBuffer(descriptor: BufferDescriptor): BufferHandle;
    updateBuffer(handle: BufferHandle, data: ArrayBufferView, offset?: number): void;
    deleteBuffer(handle: BufferHandle): void;
    createTexture(descriptor: TextureDescriptor): TextureHandle;
    createFramebuffer(descriptor: FramebufferDescriptor): FramebufferHandle;
    dispatchCompute(shader: string, workgroups: [number, number, number]): void;
    getMetrics(): FrameMetrics;
    readonly backend: BackendContext | null;
    readonly shaderCompiler: ShaderCompilerAPI | null;
    readonly bufferManager: BufferManagerAPI | null;
    readonly textureManager: TextureManagerAPI | null;
    readonly computePipeline: ComputePipelineAPI | null;
    readonly renderQueue: RenderQueueAPI | null;
    readonly profiler: ProfilerAPI | null;
    readonly resourceManager: ResourceManagerAPI;
}
//# sourceMappingURL=types.d.ts.map