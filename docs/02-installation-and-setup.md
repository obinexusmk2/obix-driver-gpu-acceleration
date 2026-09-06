# Installation and Setup

## Install

```bash
npm install @obinexusltd/obix-driver-gpu-acceleration
```

The package ships as ES modules with `.d.ts` declarations and has no runtime
dependencies.

## Import

```ts
import { createGPUAccelerationDriver } from '@obinexusltd/obix-driver-gpu-acceleration';
```

Sub-module factories and all types are re-exported from the package root:

```ts
import {
  createGPUAccelerationDriver,
  createShaderCompiler,
  createBufferManager,
  createTextureManager,
  createRenderQueue,
  createComputePipeline,
  createResourceManager,
  createProfiler,
  createWebGLContext,
  createWebGPUBackend,
  type GPUAccelerationDriverConfig,
  type ShaderProgram,
  type FrameMetrics,
} from '@obinexusltd/obix-driver-gpu-acceleration';
```

## Requirements

| Backend | Requirement |
|---------|-------------|
| WebGPU | `navigator.gpu` present and `preferWebGPU: true` |
| WebGL 2.0 | `canvas.getContext('webgl2')` succeeds (fallback, always attempted) |

`initialize()` throws `WebGL 2.0 is not supported by this browser` if neither
backend can be created. A canvas element is **required** in config.

## Environment support

| Environment | Support |
|-------------|---------|
| Browser with WebGPU | Full — compute shaders available |
| Browser with WebGL 2.0 only | Full except `dispatchCompute` |
| Node.js / SSR | Import is safe; `initialize()` needs a real canvas + GL context |
| jsdom | `initialize()` fails — jsdom has no WebGL 2.0; unit-test sub-modules with a stub `BackendContext` |

## Build from source

```bash
npm run build   # tsc -> dist/
npm test        # vitest run
```

- Source: `src/`
- Output: `dist/` (ES modules + declaration files + source maps)
- Test runner: [Vitest](https://vitest.dev)
