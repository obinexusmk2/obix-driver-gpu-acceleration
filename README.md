# @obinexusltd/obix-driver-gpu-acceleration

**Version:** 0.1.0 | **License:** MIT | **Author:** OBINexus <okpalan@protonmail.com>

A unified GPU acceleration driver for the OBIX SDK, providing WebGL 2.0 and WebGPU canvas rendering with shader management, resource lifecycle tracking, and performance profiling.

---

## Features

- **Dual backend support** — WebGPU (preferred) with automatic fallback to WebGL 2.0
- **Shader management** — GLSL compilation, caching, and deduplication via source hashing
- **Buffer management** — Vertex, index, and uniform buffer creation with CPU-side copies for context recovery
- **Texture management** — Multi-format texture allocation (`rgba8`, `rgb8`, `r8`, `depth24`, `depth32f`), mipmapping, and framebuffer objects
- **Render queue** — Command batching sorted by shader to minimize GPU state changes
- **Compute pipeline** — WebGPU compute shader dispatch
- **Resource manager** — Reference counting and garbage collection with leak detection
- **Profiler** — Frame time tracking, GPU timing queries, and throttle detection

---

## Installation

```bash
npm install @obinexusltd/obix-driver-gpu-acceleration
```

---

## Quick Start

```typescript
import { createGPUAccelerationDriver } from '@obinexusltd/obix-driver-gpu-acceleration';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;

const driver = createGPUAccelerationDriver({
  canvas,
  preferWebGPU: true,
  enableProfiling: true,
  powerPreference: 'high-performance',
});

await driver.initialize();

// Load and compile a shader
const shader = await driver.loadShader('main', vertSrc, fragSrc);

// Frame loop
function render() {
  driver.beginFrame();
  driver.clear([0, 0, 0, 1]);

  // Create a vertex buffer
  const vbuf = driver.createBuffer('vertex', new Float32Array([...]));

  // Queue a draw call
  driver.drawIndexed(shader, vbuf, indexBuf, indexCount);

  driver.endFrame();

  const metrics = driver.getMetrics();
  console.log(`Frame: ${metrics.frameTime.toFixed(2)}ms | Draw calls: ${metrics.drawCalls}`);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// Cleanup
window.addEventListener('beforeunload', () => driver.destroy());
```

---

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvas` | `HTMLCanvasElement` | required | Target canvas element |
| `preferWebGPU` | `boolean` | `false` | Use WebGPU when available; falls back to WebGL 2.0 |
| `antialias` | `boolean` | `true` | Enable antialiasing (WebGL only) |
| `enableProfiling` | `boolean` | `true` | Enable frame time and GPU query tracking |
| `powerPreference` | `'default' \| 'high-performance' \| 'low-power'` | `'default'` | GPU power hint |
| `contextLossStrategy` | `'restore' \| 'recreate' \| 'notify'` | `'restore'` | How to handle WebGL context loss |
| `maxTextureSize` | `number` | queried from GL | Maximum texture dimension |
| `shaderPaths` | `string[]` | `[]` | Planned: paths for shader asset loading |
| `resourcePoolSize` | `number` | — | Planned: pre-allocated resource pool size |

---

## API Overview

### Lifecycle

| Method | Description |
|--------|-------------|
| `initialize()` | Set up the GPU backend and all sub-modules |
| `destroy()` | Release all GPU resources and tear down the backend |

### Frame

| Method | Description |
|--------|-------------|
| `beginFrame()` | Start a new render frame |
| `endFrame()` | Flush the render queue and submit commands |
| `clear(color?)` | Clear the canvas with an optional RGBA color |

### Shaders

| Method | Description |
|--------|-------------|
| `loadShader(name, vert, frag)` | Compile and cache a GLSL shader program |
| `useShader(shader)` | Bind a compiled shader program |

### Buffers

| Method | Description |
|--------|-------------|
| `createBuffer(usage, data)` | Allocate a vertex, index, or uniform buffer |
| `updateBuffer(handle, data)` | Upload new data to an existing buffer |
| `deleteBuffer(handle)` | Free a buffer and release its GPU memory |

### Textures

| Method | Description |
|--------|-------------|
| `createTexture(width, height, format, data?)` | Allocate a 2D texture |
| `createFramebuffer(texture)` | Create a framebuffer backed by a texture |

### Draw

| Method | Description |
|--------|-------------|
| `drawIndexed(shader, vbuf, ibuf, count, uniforms?)` | Queue an indexed draw call |

### Compute (WebGPU only)

| Method | Description |
|--------|-------------|
| `dispatchCompute(shader, x, y, z)` | Dispatch a compute shader workgroup |

### Profiler

| Method | Description |
|--------|-------------|
| `getMetrics()` | Returns `FrameMetrics`: frameTime, gpuTime, drawCalls, triangles, memory, throttled |

---

## Architecture

```
GPUAccelerationDriver
├── Backend selection
│   ├── WebGPU  (preferred, when navigator.gpu is available)
│   └── WebGL 2.0  (fallback)
├── ShaderCompiler    — GLSL compilation & uniform caching
├── BufferManager     — Vertex / index / uniform buffers
├── TextureManager    — 2D textures & framebuffers
├── RenderQueue       — Batched, shader-sorted draw commands
├── ComputePipeline   — WebGPU compute dispatch
├── ResourceManager   — Reference counting & GC
└── Profiler          — Frame timing & GPU queries
```

Backend selection happens at `initialize()`. If `preferWebGPU: true` and `navigator.gpu` is present the WebGPU path is taken; otherwise the driver falls back to WebGL 2.0. All public APIs are backend-agnostic.

---

## Development

```bash
# Build (TypeScript -> dist/)
npm run build

# Run tests
npm test
```

- Source: `src/`
- Output: `dist/` (ES modules + `.d.ts` declarations)
- Test runner: [Vitest](https://vitest.dev)

---

## Documentation

In-depth guides live in [`docs/`](docs/):

| # | Guide |
|---|-------|
| 01 | [Overview](docs/01-overview.md) |
| 02 | [Installation and Setup](docs/02-installation-and-setup.md) |
| 03 | [Driver Lifecycle and Configuration](docs/03-driver-lifecycle.md) |
| 04 | [Backends and Context Loss](docs/04-backends-and-context-loss.md) |
| 05 | [Shaders](docs/05-shaders.md) |
| 06 | [Buffers](docs/06-buffers.md) |
| 07 | [Textures and Framebuffers](docs/07-textures-and-framebuffers.md) |
| 08 | [Render Queue and Drawing](docs/08-render-queue-and-drawing.md) |
| 09 | [Compute Pipeline](docs/09-compute-pipeline.md) |
| 10 | [Resources and Profiling](docs/10-resources-and-profiling.md) |

---

## License

MIT — Copyright (c) OBINexus (okpalan@protonmail.com)
