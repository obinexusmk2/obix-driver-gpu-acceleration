# Driver Lifecycle and Configuration

## Factory

```ts
const driver = createGPUAccelerationDriver(config);
```

`config.canvas` is required. All other fields are optional.

## Configuration fields

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `canvas` | `HTMLCanvasElement` | **required** | Render target |
| `preferWebGPU` | `boolean` | `false` | Try WebGPU before falling back to WebGL 2.0 |
| `antialias` | `boolean` | `true` | WebGL antialiasing hint |
| `enableProfiling` | `boolean` | `true` | Create the profiler; `driver.profiler` is `null` when `false` |
| `powerPreference` | `'default' \| 'high-performance' \| 'low-power'` | `'default'` | GPU power hint |
| `contextLossStrategy` | `'restore' \| 'recreate' \| 'notify'` | `'restore'` | Reserved — see [04-backends-and-context-loss.md](04-backends-and-context-loss.md) |
| `maxTextureSize` | `number` | queried from GL | Clamp for texture allocation |
| `shaderPaths` | `string[]` | `[]` | Reserved for asset-based shader loading |
| `resourcePoolSize` | `number` | — | Reserved for pre-allocated pools |

## Lifecycle

### `initialize(): Promise<void>`

1. If `preferWebGPU`, try `createWebGPUBackend(config)`.
2. If no backend yet, create the WebGL 2.0 context. If `gl` is null, throw.
3. Register context-loss / context-restored handlers.
4. Build sub-modules: shader compiler, buffer manager, texture manager, compute
   pipeline, render queue, and (unless disabled) the profiler.

Calling `initialize()` twice is a no-op after the first success. Every draw/
resource method except `beginFrame`/`endFrame`/`clear` throws
`GPU Acceleration Driver not initialized` until it completes.

### `destroy(): Promise<void>`

Destroys every sub-module in reverse dependency order, destroys the backend,
clears the shader-source registry and uniform cache, and resets `initialized` to
`false`. Create a new driver to use the GPU again.

```ts
await driver.initialize();
// render loop ...
window.addEventListener('beforeunload', () => { void driver.destroy(); });
```

## Sub-feature accessors

Available after `initialize()` (all `null` before it, except `resourceManager`):

```ts
driver.backend          // BackendContext | null
driver.shaderCompiler   // ShaderCompilerAPI | null
driver.bufferManager    // BufferManagerAPI | null
driver.textureManager   // TextureManagerAPI | null
driver.computePipeline  // ComputePipelineAPI | null
driver.renderQueue      // RenderQueueAPI | null
driver.profiler         // ProfilerAPI | null
driver.resourceManager  // ResourceManagerAPI  (always present)
```
