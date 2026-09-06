# Shaders

## Loading

```ts
await driver.loadShader('main', {
  vertexSource:   vertGLSL,
  fragmentSource: fragGLSL,
  uniforms: { u_time: 0, u_resolution: [1920, 1080] },
});
```

`loadShader`:

1. Stores a copy of the `ShaderProgram` in the source registry under `name`
   (used for context-loss recovery — see
   [04-backends-and-context-loss.md](04-backends-and-context-loss.md)).
2. Compiles via the shader compiler. On failure it throws
   `Shader compilation failed for "<name>": <messages>`.

### `ShaderProgram`

```ts
interface ShaderProgram {
  vertexSource: string;
  fragmentSource: string;
  computeSource?: string;              // WebGPU compute
  uniforms?: Record<string, unknown>;  // names pre-registered for location lookup
}
```

## Compilation details (WebGL path)

- **Precision injection** — if the fragment source has no
  `precision (lowp|mediump|highp) float;`, `precision highp float;` is prepended.
- **Source-hash cache** — programs are keyed by a hash of
  `vertexSource + '\0' + fragmentSource`. Re-compiling identical sources returns
  the cached `CompiledShader`. Entries are also stored by `name` for lookup.
- **Uniform locations** — every key in `program.uniforms` is resolved to a
  `WebGLUniformLocation` at compile time and cached on the compiled shader.
- **Error parsing** — driver logs of the form `ERROR: 0:<line>: <message>` are
  parsed into structured `ShaderError { type, message, line? }` with
  `type` one of `'vertex' | 'fragment' | 'compute' | 'link'`.

## Using a shader and setting uniforms

```ts
driver.setShaderProgram('main');       // throws if 'main' was never loaded
driver.setUniform('u_time', performance.now() / 1000);
driver.setUniform('u_resolution', [canvas.width, canvas.height]);
```

`setUniform` updates the active shader's registry entry and, on WebGL, uploads
immediately. Value mapping by shape:

| JS value | GL call |
|----------|---------|
| `number` | `uniform1f` |
| `number[2]` / `[3]` / `[4]` | `uniform2fv` / `uniform3fv` / `uniform4fv` |
| `number[9]` | `uniformMatrix3fv` |
| `number[16]` | `uniformMatrix4fv` |

Other shapes are ignored. `setShaderProgram` / `setUniform` throw if the driver
is not initialized.

## Direct compiler access

`driver.shaderCompiler` (`ShaderCompilerAPI | null`):

| Method | Description |
|--------|-------------|
| `compile(name, program)` | Compile and cache, returns `CompiledShader` |
| `getProgram(name)` | Cached `CompiledShader \| undefined` |
| `getCompilationErrors()` | All `ShaderError`s recorded so far |
| `clearCache()` | Delete GL programs and empty the cache |
