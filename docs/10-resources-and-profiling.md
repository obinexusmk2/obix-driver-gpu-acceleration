# Resources and Profiling

## Resource manager

Every buffer, texture, and framebuffer handle is registered with the resource
manager, which does reference counting and deferred garbage collection.

```ts
interface ResourceManagerAPI {
  register(handle, destructor): void;
  retain(id): void;
  release(id): void;
  collectGarbage(): number;   // bytes freed
  getMemoryUsage(): { buffers: number; textures: number; shaders: number; total: number };
  onLeak(handler: (handle) => void): void;
  nextId(): number;
}
```

`driver.resourceManager` is always available (even before `initialize()`).

### Lifecycle

- `register` sets `refCount = 1`.
- `retain(id)` increments; `release(id)` decrements (floored at 0).
- `collectGarbage()` — called automatically each `endFrame()` — runs the
  destructor for every resource at `refCount === 0`, sums the freed
  `byteSize`, and removes the entries.
- A resource that sits at `refCount === 0` for **more than 60 GC passes** fires
  the `onLeak` handler before being collected.

```ts
driver.resourceManager.onLeak((handle) => {
  console.warn(`GPU resource leaked: #${handle.id} (${handle.type}, ${handle.byteSize} B)`);
});
```

Share a resource across frames? `retain` it when you cache it and `release` it
when you drop the reference — otherwise the next `endFrame` may collect it.

## Profiler

```ts
interface FrameMetrics {
  frameTime: number;      // ms, CPU frame duration
  gpuTime: number;        // ms, from GPU timing queries when available
  drawCalls: number;
  triangles: number;
  textureMemory: number;  // bytes, textures + framebuffers
  bufferMemory: number;   // bytes
  throttled: boolean;     // frame budget consistently exceeded
}
```

```ts
const m = driver.getMetrics();
console.log(`${m.frameTime.toFixed(2)}ms  draws=${m.drawCalls}  tris=${m.triangles}`);
if (m.throttled) reduceQuality();
```

- With profiling **on**, `getMetrics()` returns the profiler snapshot.
- With profiling **off** (`enableProfiling: false`), it returns a minimal object:
  timing and counts are `0`, `throttled` is `false`, and `textureMemory` /
  `bufferMemory` come straight from `resourceManager.getMemoryUsage()`.

`driver.profiler` (`ProfilerAPI | null`) also exposes `beginFrame()`,
`endFrame()`, and `reset()` for manual control.

## Teardown checklist

```ts
await driver.destroy();
```

`destroy()` runs every registered destructor, destroys sub-modules and the
backend, and clears caches. After it, `getMetrics()` is not meaningful — the
driver is finished.
