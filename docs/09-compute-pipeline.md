# Compute Pipeline

Compute shaders run general-purpose GPU work outside the draw pipeline. They are a
**WebGPU-only** feature — on the WebGL 2.0 backend the pipeline reports
`supported: false` and dispatch is inert.

## Checking support

```ts
if (driver.computePipeline?.supported) {
  driver.dispatchCompute('particles', [64, 1, 1]);
}
```

`driver.backend?.type === 'webgpu'` implies compute support; always feature-check
before relying on it.

## Dispatch

```ts
driver.dispatchCompute(shaderName, [x, y, z]);
```

- `shaderName` — a shader loaded with a `computeSource` in its `ShaderProgram`.
- `[x, y, z]` — the workgroup counts for each dimension.

`dispatchCompute` throws if the driver is not initialized. On a non-WebGPU
backend it does nothing.

## Loading a compute shader

```ts
await driver.loadShader('particles', {
  vertexSource: '',        // unused for pure compute
  fragmentSource: '',
  computeSource: wgslOrGlslComputeSource,
});
```

## `ComputePipelineAPI`

`driver.computePipeline` (`ComputePipelineAPI | null`):

| Member | Description |
|--------|-------------|
| `supported: boolean` | `true` only on the WebGPU backend |
| `dispatch(shader, workgroups): void` | Dispatch; no-op when unsupported |

## Portability note

Design your renderer so compute is an optimization, not a requirement — provide a
CPU or fragment-shader fallback when `supported` is `false`, since WebGL 2.0 is
still the fallback backend for many browsers.
