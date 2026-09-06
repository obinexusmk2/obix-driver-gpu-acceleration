# GPU Acceleration Driver Overview

The `@obinexusltd/obix-driver-gpu-acceleration` package is a unified GPU rendering
driver for browser applications. It presents one backend-agnostic API over
**WebGPU** (preferred) and **WebGL 2.0** (fallback), covering shader compilation,
buffers, textures, a batched render queue, compute dispatch, resource lifecycle
tracking, and frame profiling.

## Purpose

The driver centralizes GPU plumbing so teams can:

- Target one API and let the driver pick WebGPU or WebGL 2.0 at runtime.
- Compile and cache GLSL shaders with structured error diagnostics.
- Allocate buffers and textures through handles that carry byte sizes.
- Batch draw calls, sorted to minimize shader switches.
- Track GPU resource reference counts and detect leaks.
- Read per-frame timing and memory metrics.

## Core Capabilities

1. Dual backend — WebGPU when `navigator.gpu` is present, else WebGL 2.0
2. Shader compiler — GLSL compile, source-hash cache, precision injection, error parsing
3. Buffer manager — vertex / index / uniform / storage buffers
4. Texture manager — 2D textures (`rgba8`, `rgb8`, `r8`, `depth24`, `depth32f`), mipmaps, framebuffers
5. Render queue — command batching sorted by `sortKey` to reduce state changes
6. Compute pipeline — WebGPU compute dispatch (`supported` flag on other backends)
7. Resource manager — reference counting, deferred GC, leak callback
8. Profiler — frame time, GPU timing, draw calls, triangle count, memory, throttle detection

## Design Principles

- **Backend-agnostic surface:** the public API never mentions WebGL or WebGPU.
- **Lazy initialization:** sub-modules are built inside `initialize()` once the
  backend is chosen.
- **Handle-based resources:** buffers/textures are opaque handles with an `id`,
  `type`, and `byteSize`, registered with the resource manager.
- **Recoverable:** shader sources are retained so the driver can recompile after
  a WebGL context loss/restore cycle.

## Typical Use Cases

- Custom canvas renderers that need a portable GPU layer.
- Data-visualization engines with many draw calls per frame.
- Effects/compositing passes that benefit from compute shaders on WebGPU.
- Long-running visual apps where GPU resource leaks must be caught.

## Module Map

| Module | File | Responsibility |
|--------|------|---------------|
| Types | `src/types.ts` | Shared interfaces and type aliases |
| WebGL Context | `src/webgl-context.ts` | WebGL 2.0 backend, context-loss events |
| WebGPU Backend | `src/webgpu-backend.ts` | WebGPU backend (async adapter/device) |
| Shader Compiler | `src/shader-compiler.ts` | GLSL compile, cache, diagnostics |
| Buffer Manager | `src/buffer-manager.ts` | Buffer create/update/bind/delete |
| Texture Manager | `src/texture-manager.ts` | Textures, mipmaps, framebuffers |
| Compute Pipeline | `src/compute-pipeline.ts` | WebGPU compute dispatch |
| Render Queue | `src/render-queue.ts` | Batched, sorted draw commands |
| Resource Manager | `src/resource-manager.ts` | Ref counting, GC, leak detection |
| Profiler | `src/profiler.ts` | Frame timing and memory metrics |
| Driver | `src/index.ts` | Orchestrates all sub-modules, public API |
