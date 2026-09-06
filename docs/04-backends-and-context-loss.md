# Backends and Context Loss

## Backend selection

Selection happens once, inside `initialize()`:

```
preferWebGPU && createWebGPUBackend() succeeds  -> WebGPU
otherwise                                        -> WebGL 2.0
neither                                           -> throw
```

`driver.backend` exposes the chosen backend as a `BackendContext`:

```ts
interface BackendContext {
  readonly type: 'webgl2' | 'webgpu' | 'none';
  readonly lost: boolean;
  readonly gl: WebGL2RenderingContext | null;   // null on the WebGPU path
  onContextLost(handler: () => void): void;
  onContextRestored(handler: () => void): void;
  restore(): Promise<boolean>;
}
```

All public driver methods are backend-agnostic. Reach for `driver.backend.gl`
only for WebGL-specific work the driver does not wrap.

## Context loss and restore

WebGL contexts can be lost (GPU reset, tab backgrounded on some drivers, resource
pressure). The driver registers handlers during `initialize()`:

- **On loss** — logs a warning. Resources remain registered with the resource
  manager; GPU-side objects are invalid until restore.
- **On restore** — clears the shader cache and **recompiles every shader** from
  the retained source registry (`loadShader` stores each `ShaderProgram` by
  name), then logs recovery.

Because shader sources are retained, you do not re-issue `loadShader` calls after
a restore. You do need to re-upload buffer/texture data your app owns.

## `contextLossStrategy`

The config field is accepted and stored for forward compatibility. The current
implementation always follows the "restore + recompile shaders" path described
above regardless of its value. Treat `'restore' | 'recreate' | 'notify'` as a
declaration of intent for now.

## Manual restore

```ts
const ok = await driver.backend?.restore();
```

Returns whether the backend re-acquired a usable context. Pair it with your own
`onContextLost` handler if you want to drive recovery yourself rather than wait
for the browser's `webglcontextrestored` event.
