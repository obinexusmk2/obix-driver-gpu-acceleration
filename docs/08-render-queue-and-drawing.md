# Render Queue and Drawing

## Frame boundaries

```ts
driver.beginFrame();   // profiler starts the frame timer
driver.clear([0, 0, 0, 1]);
// ... issue draws ...
driver.endFrame();     // flush the render queue, run GC, close the frame timer
```

`beginFrame` / `endFrame` / `clear` are safe to call before `initialize()`
completes (they no-op). `endFrame` flushes the render queue, then calls
`resourceManager.collectGarbage()`, then closes the profiler frame.

## Immediate draw

```ts
driver.drawIndexed(vertexCount, indexCount);
```

- `indexCount > 0` -> `gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)`
- `indexCount === 0` -> `gl.drawArrays(gl.TRIANGLES, 0, vertexCount)`

It draws with whatever program/buffers are currently bound (`setShaderProgram`,
plus your own attribute setup via `driver.backend.gl`). It throws if the driver
is not initialized.

## Batched draw via the render queue

For many draws per frame, submit `RenderCommand`s and let the queue sort them:

```ts
interface RenderCommand {
  shader: string;
  vertexBuffer: BufferHandle;
  indexBuffer?: BufferHandle;
  uniforms: Record<string, unknown>;
  vertexCount: number;
  indexCount: number;
  sortKey: number;      // lower renders first
}

driver.renderQueue?.submit({
  shader: 'main',
  vertexBuffer: vbuf,
  indexBuffer: ibuf,
  uniforms: { u_color: [1, 0, 0, 1] },
  vertexCount: 0,
  indexCount: 6,
  sortKey: materialId,
});
```

On `flush()` (called by `endFrame`) the queue:

1. Sorts commands by `sortKey` ascending.
2. Calls `gl.useProgram` **only when the shader name changes** between commands —
   so grouping `sortKey` by material minimizes shader switches.
3. Binds the vertex buffer (and index buffer if present), sets the command's
   uniforms, and draws.
4. Skips commands whose shader is not compiled.
5. Clears itself and updates the draw-call counter.

`driver.renderQueue` also exposes `clear()` and `getDrawCallCount()`.

## Clearing

```ts
driver.clear();                 // default [0, 0, 0, 1]
driver.clear([0.1, 0.1, 0.15, 1]);
```

Clears `COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT`.
