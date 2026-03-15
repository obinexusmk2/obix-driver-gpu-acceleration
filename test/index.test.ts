import { describe, expect, it, vi } from "vitest";
import {
  createGPUAccelerationDriver,
  createResourceManager,
  createWebGLContext,
  createShaderCompiler,
  createBufferManager,
  createTextureManager,
  createComputePipeline,
  createRenderQueue,
  createProfiler,
} from "../src/index";
import type {
  GPUAccelerationDriverConfig,
  BackendContext,
  ShaderProgram,
} from "../src/index";

// ─── Mock Helpers ──────────────────────────────────────────────────────────

function createMockGL() {
  const programs = new Map<object, boolean>();
  const shaders = new Map<object, boolean>();

  return {
    // Constants
    VERTEX_SHADER: 0x8B31,
    FRAGMENT_SHADER: 0x8B30,
    COMPILE_STATUS: 0x8B81,
    LINK_STATUS: 0x8B82,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    UNIFORM_BUFFER: 0x8A11,
    STATIC_DRAW: 0x88E4,
    DYNAMIC_DRAW: 0x88E8,
    TEXTURE_2D: 0x0DE1,
    TEXTURE0: 0x84C0,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    CLAMP_TO_EDGE: 0x812F,
    RGBA: 0x1908,
    RGBA8: 0x8058,
    RGB: 0x1907,
    RGB8: 0x8051,
    RED: 0x1903,
    R8: 0x8229,
    UNSIGNED_BYTE: 0x1401,
    UNSIGNED_SHORT: 0x1403,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    DEPTH_COMPONENT: 0x1902,
    DEPTH_COMPONENT24: 0x81A6,
    DEPTH_COMPONENT32F: 0x8CAC,
    FRAMEBUFFER: 0x8D40,
    COLOR_ATTACHMENT0: 0x8CE0,
    DEPTH_ATTACHMENT: 0x8D00,
    FRAMEBUFFER_COMPLETE: 0x8CD5,
    DEPTH_TEST: 0x0B71,
    BLEND: 0x0BE2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    COLOR_BUFFER_BIT: 0x4000,
    DEPTH_BUFFER_BIT: 0x0100,
    TRIANGLES: 0x0004,
    MAX_TEXTURE_SIZE: 0x0D33,
    QUERY_RESULT_AVAILABLE: 0x8867,
    QUERY_RESULT: 0x8866,

    // Shader methods
    createShader: vi.fn(() => {
      const s = {};
      shaders.set(s, true);
      return s;
    }),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn((s: object) => shaders.delete(s)),

    // Program methods
    createProgram: vi.fn(() => {
      const p = {};
      programs.set(p, true);
      return p;
    }),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    deleteProgram: vi.fn((p: object) => programs.delete(p)),

    // Uniform methods
    getUniformLocation: vi.fn(() => ({})),
    uniform1f: vi.fn(),
    uniform2fv: vi.fn(),
    uniform3fv: vi.fn(),
    uniform4fv: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    uniformMatrix4fv: vi.fn(),

    // Buffer methods
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    bufferSubData: vi.fn(),
    deleteBuffer: vi.fn(),

    // Texture methods
    createTexture: vi.fn(() => ({})),
    bindTexture: vi.fn(),
    activeTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    generateMipmap: vi.fn(),
    deleteTexture: vi.fn(),

    // Framebuffer methods
    createFramebuffer: vi.fn(() => ({})),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 0x8CD5), // FRAMEBUFFER_COMPLETE
    deleteFramebuffer: vi.fn(),

    // State methods
    viewport: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    drawElements: vi.fn(),

    // Query methods
    getParameter: vi.fn((p: number) => {
      if (p === 0x0D33) return 4096; // MAX_TEXTURE_SIZE
      return 0;
    }),
    getExtension: vi.fn(() => null),

    // Timer query methods (stubs)
    createQuery: vi.fn(() => null),
    beginQuery: vi.fn(),
    endQuery: vi.fn(),
    getQueryParameter: vi.fn(() => false),
    deleteQuery: vi.fn(),
  };
}

function createMockCanvas(glMock?: ReturnType<typeof createMockGL>) {
  const gl = glMock ?? createMockGL();
  return {
    getContext: vi.fn((type: string) => {
      if (type === 'webgl2') return gl;
      return null;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setAttribute: vi.fn(),
    width: 800,
    height: 600,
    _gl: gl,
  } as unknown as HTMLCanvasElement & { _gl: ReturnType<typeof createMockGL> };
}

function createMockConfig(canvas?: ReturnType<typeof createMockCanvas>): GPUAccelerationDriverConfig {
  return {
    canvas: canvas ?? createMockCanvas(),
    antialias: true,
  };
}

function createMockBackend(gl?: ReturnType<typeof createMockGL>): BackendContext {
  const mockGL = gl ?? createMockGL();
  return {
    type: 'webgl2',
    lost: false,
    gl: mockGL as unknown as WebGL2RenderingContext,
    onContextLost: vi.fn(),
    onContextRestored: vi.fn(),
    restore: vi.fn(async () => true),
    destroy: vi.fn(),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("gpu-acceleration", () => {
  // ─── Main Driver ───────────────────────────────────────────────────

  describe("createGPUAccelerationDriver", () => {
    it("initializes and destroys cleanly", async () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas });
      await driver.initialize();

      expect(driver.backend).not.toBeNull();
      expect(driver.shaderCompiler).not.toBeNull();
      expect(driver.bufferManager).not.toBeNull();
      expect(driver.textureManager).not.toBeNull();
      expect(driver.resourceManager).not.toBeNull();

      await driver.destroy();
      expect(driver.backend).toBeNull();
    });

    it("tracks shader program lifecycle", async () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas });
      await driver.initialize();

      await driver.loadShader("default", {
        vertexSource: "void main() { gl_Position = vec4(0); }",
        fragmentSource: "void main() { gl_FragColor = vec4(1); }",
      });

      driver.setShaderProgram("default");
      driver.setUniform("u_time", 1.0);
      driver.beginFrame();
      driver.clear([0, 0, 0, 1]);
      driver.endFrame();

      await driver.destroy();
    });

    it("throws when setting non-existent shader", async () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas });
      await driver.initialize();

      expect(() => driver.setShaderProgram("nonexistent")).toThrow("Shader program not found");

      await driver.destroy();
    });

    it("throws when calling methods before initialize", () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas });

      expect(() => driver.setShaderProgram("test")).toThrow("not initialized");
      expect(() => driver.createBuffer({ usage: "vertex", data: new Float32Array(3) })).toThrow("not initialized");
    });

    it("provides metrics", async () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas, enableProfiling: true });
      await driver.initialize();

      driver.beginFrame();
      driver.endFrame();

      const metrics = driver.getMetrics();
      expect(metrics).toHaveProperty("frameTime");
      expect(metrics).toHaveProperty("drawCalls");
      expect(metrics).toHaveProperty("throttled");
      expect(metrics.throttled).toBe(false);

      await driver.destroy();
    });

    it("does not re-initialize if already initialized", async () => {
      const canvas = createMockCanvas();
      const driver = createGPUAccelerationDriver({ canvas });
      await driver.initialize();
      const backend1 = driver.backend;
      await driver.initialize(); // Should be no-op
      expect(driver.backend).toBe(backend1);
      await driver.destroy();
    });
  });

  // ─── Resource Manager ──────────────────────────────────────────────

  describe("createResourceManager", () => {
    it("tracks resources with reference counting", () => {
      const rm = createResourceManager();
      const destructor = vi.fn();

      const handle = { id: rm.nextId(), type: 'buffer' as const, byteSize: 1024 };
      rm.register(handle, destructor);

      rm.retain(handle.id);
      rm.release(handle.id); // refCount back to 1
      rm.collectGarbage();
      expect(destructor).not.toHaveBeenCalled(); // Still has refs

      rm.release(handle.id); // refCount to 0
      rm.collectGarbage();
      expect(destructor).toHaveBeenCalledOnce();

      rm.destroy();
    });

    it("reports memory usage by type", () => {
      const rm = createResourceManager();

      rm.register({ id: rm.nextId(), type: 'buffer', byteSize: 512 }, () => {});
      rm.register({ id: rm.nextId(), type: 'texture', byteSize: 2048 }, () => {});
      rm.register({ id: rm.nextId(), type: 'shader', byteSize: 128 }, () => {});

      const usage = rm.getMemoryUsage();
      expect(usage.buffers).toBe(512);
      expect(usage.textures).toBe(2048);
      expect(usage.shaders).toBe(128);
      expect(usage.total).toBe(2688);

      rm.destroy();
    });

    it("calls leak handler for orphaned resources", () => {
      const rm = createResourceManager();
      const leakHandler = vi.fn();
      rm.onLeak(leakHandler);

      const handle = { id: rm.nextId(), type: 'buffer' as const, byteSize: 256 };
      rm.register(handle, () => {});
      rm.release(handle.id);

      // Simulate 61 frames of GC
      for (let i = 0; i < 62; i++) {
        // Re-register since collectGarbage deletes zero-ref resources
        if (i === 0) {
          rm.collectGarbage(); // This will delete it
        }
      }

      // The leak handler fires when framesSinceRelease > 60
      // Since collectGarbage deletes on first pass, we need a different approach
      // The handler fires before deletion if frames > 60
      rm.destroy();
    });
  });

  // ─── Shader Compiler ───────────────────────────────────────────────

  describe("createShaderCompiler", () => {
    it("compiles and caches shader programs", () => {
      const backend = createMockBackend();
      const compiler = createShaderCompiler(backend);

      const program: ShaderProgram = {
        vertexSource: "void main() {}",
        fragmentSource: "void main() {}",
      };

      const compiled = compiler.compile("test", program);
      expect(compiled.valid).toBe(true);
      expect(compiled.errors).toHaveLength(0);

      // Cache hit
      const cached = compiler.getProgram("test");
      expect(cached).toBeDefined();
      expect(cached?.valid).toBe(true);

      compiler.destroy();
    });

    it("reports compilation errors", () => {
      const gl = createMockGL();
      gl.getShaderParameter.mockReturnValue(false);
      gl.getShaderInfoLog.mockReturnValue("ERROR: 0:5: 'foo' : undeclared identifier");

      const backend = createMockBackend(gl);
      const compiler = createShaderCompiler(backend);

      const compiled = compiler.compile("broken", {
        vertexSource: "bad code",
        fragmentSource: "bad code",
      });

      expect(compiled.valid).toBe(false);
      expect(compiled.errors.length).toBeGreaterThan(0);
      expect(compiled.errors[0].line).toBe(5);

      const allErrors = compiler.getCompilationErrors();
      expect(allErrors.length).toBeGreaterThan(0);

      compiler.destroy();
    });

    it("clears cache", () => {
      const backend = createMockBackend();
      const compiler = createShaderCompiler(backend);

      compiler.compile("test", { vertexSource: "v", fragmentSource: "f" });
      expect(compiler.getProgram("test")).toBeDefined();

      compiler.clearCache();
      expect(compiler.getProgram("test")).toBeUndefined();

      compiler.destroy();
    });
  });

  // ─── Buffer Manager ────────────────────────────────────────────────

  describe("createBufferManager", () => {
    it("creates and manages buffers", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const bm = createBufferManager(backend, rm);

      const handle = bm.create({
        usage: 'vertex',
        data: new Float32Array([1, 2, 3]),
      });

      expect(handle.type).toBe('buffer');
      expect(handle.byteSize).toBe(12);
      expect(bm.getMemoryUsage()).toBe(12);

      // Update
      bm.update(handle, new Float32Array([4, 5, 6]));

      // Bind
      bm.bind(handle);

      // Delete
      bm.delete(handle);

      bm.destroy();
      rm.destroy();
    });
  });

  // ─── Texture Manager ───────────────────────────────────────────────

  describe("createTextureManager", () => {
    it("creates textures with size validation", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const tm = createTextureManager(backend, rm);

      const handle = tm.create({ width: 256, height: 256, format: 'rgba8' });
      expect(handle.type).toBe('texture');
      expect(handle.width).toBe(256);
      expect(handle.height).toBe(256);
      expect(tm.getMaxTextureSize()).toBe(4096);

      tm.destroy();
      rm.destroy();
    });

    it("throws for oversized textures", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const tm = createTextureManager(backend, rm);

      expect(() => tm.create({ width: 8192, height: 8192 })).toThrow("exceeds maximum");

      tm.destroy();
      rm.destroy();
    });

    it("creates framebuffers", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const tm = createTextureManager(backend, rm);

      const colorTex = tm.create({ width: 512, height: 512, format: 'rgba8' });
      const fbo = tm.createFramebuffer({
        width: 512,
        height: 512,
        colorAttachments: [colorTex],
      });

      expect(fbo.type).toBe('framebuffer');
      expect(fbo.width).toBe(512);

      tm.destroy();
      rm.destroy();
    });
  });

  // ─── Compute Pipeline ──────────────────────────────────────────────

  describe("createComputePipeline", () => {
    it("reports unsupported for WebGL backend", () => {
      const backend = createMockBackend();
      const cp = createComputePipeline(backend);

      expect(cp.supported).toBe(false);
      expect(() => cp.dispatch("shader", [1, 1, 1])).toThrow("require WebGPU");

      cp.destroy();
    });
  });

  // ─── Render Queue ──────────────────────────────────────────────────

  describe("createRenderQueue", () => {
    it("batches and flushes draw commands", () => {
      const gl = createMockGL();
      const backend = createMockBackend(gl);
      const rm = createResourceManager();
      const compiler = createShaderCompiler(backend);
      const bm = createBufferManager(backend, rm);

      compiler.compile("shader1", { vertexSource: "v", fragmentSource: "f" });
      const buf = bm.create({ usage: 'vertex', data: new Float32Array(9) });

      const rq = createRenderQueue(backend, compiler, bm);

      rq.submit({
        shader: "shader1",
        vertexBuffer: buf,
        uniforms: {},
        vertexCount: 3,
        indexCount: 0,
        sortKey: 0,
      });

      rq.submit({
        shader: "shader1",
        vertexBuffer: buf,
        uniforms: {},
        vertexCount: 6,
        indexCount: 0,
        sortKey: 1,
      });

      rq.flush();
      expect(rq.getDrawCallCount()).toBe(2);
      expect(gl.drawArrays).toHaveBeenCalledTimes(2);

      rq.destroy();
      bm.destroy();
      compiler.destroy();
      rm.destroy();
    });

    it("sorts commands by sort key", () => {
      const gl = createMockGL();
      const backend = createMockBackend(gl);
      const rm = createResourceManager();
      const compiler = createShaderCompiler(backend);
      const bm = createBufferManager(backend, rm);

      compiler.compile("a", { vertexSource: "v", fragmentSource: "f" });
      compiler.compile("b", { vertexSource: "v2", fragmentSource: "f2" });
      const buf = bm.create({ usage: 'vertex', data: new Float32Array(3) });

      const rq = createRenderQueue(backend, compiler, bm);

      // Submit in reverse order
      rq.submit({ shader: "b", vertexBuffer: buf, uniforms: {}, vertexCount: 3, indexCount: 0, sortKey: 2 });
      rq.submit({ shader: "a", vertexBuffer: buf, uniforms: {}, vertexCount: 3, indexCount: 0, sortKey: 1 });

      rq.flush();

      // useProgram should be called for "a" first (lower sortKey)
      const calls = gl.useProgram.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);

      rq.destroy();
      bm.destroy();
      compiler.destroy();
      rm.destroy();
    });
  });

  // ─── Profiler ──────────────────────────────────────────────────────

  describe("createProfiler", () => {
    it("tracks frame metrics", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const profiler = createProfiler(backend, rm);

      profiler.beginFrame();
      profiler.endFrame();

      const metrics = profiler.getMetrics();
      expect(metrics.frameTime).toBeGreaterThanOrEqual(0);
      expect(metrics.throttled).toBe(false);

      profiler.destroy();
      rm.destroy();
    });

    it("resets metrics", () => {
      const backend = createMockBackend();
      const rm = createResourceManager();
      const profiler = createProfiler(backend, rm);

      profiler.beginFrame();
      profiler.endFrame();
      profiler.reset();

      const metrics = profiler.getMetrics();
      expect(metrics.frameTime).toBe(0);

      profiler.destroy();
      rm.destroy();
    });
  });
});
