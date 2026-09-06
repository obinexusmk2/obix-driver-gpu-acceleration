# Buffers

Buffers hold vertex, index, and uniform data on the GPU. They are created through
descriptors and returned as opaque handles registered with the resource manager.

## `BufferDescriptor` and `BufferHandle`

```ts
interface BufferDescriptor {
  usage: 'vertex' | 'index' | 'uniform' | 'storage';
  data: ArrayBufferView;   // Float32Array, Uint16Array, ...
  dynamic?: boolean;       // hint: updated frequently
}

interface BufferHandle {
  readonly id: number;
  readonly type: 'buffer';
  readonly byteSize: number;
  readonly glBuffer?: WebGLBuffer;
}
```

## API

| Method | Description |
|--------|-------------|
| `createBuffer(descriptor): BufferHandle` | Allocate and upload initial data |
| `updateBuffer(handle, data, offset?): void` | Upload new data, optionally at a byte offset |
| `deleteBuffer(handle): void` | Free the GPU buffer and unregister the handle |

All three throw if the driver is not initialized.

## Example

```ts
const positions = new Float32Array([
  -1, -1,  1, -1,  1, 1,
  -1, -1,  1,  1, -1, 1,
]);
const vbuf = driver.createBuffer({ usage: 'vertex', data: positions });

const indices = new Uint16Array([0, 1, 2, 3, 4, 5]);
const ibuf = driver.createBuffer({ usage: 'index', data: indices });

// later, per frame
driver.updateBuffer(vbuf, nextPositions);

// on teardown of this mesh
driver.deleteBuffer(vbuf);
driver.deleteBuffer(ibuf);
```

## Index buffer type

`drawIndexed` and the render queue issue `gl.drawElements(..., gl.UNSIGNED_SHORT, 0)`.
Use `Uint16Array` for index data. Meshes with more than 65 535 vertices must be
split.

## Memory accounting

Each handle's `byteSize` is tracked by the resource manager. `getMetrics()`
reports `bufferMemory` as the sum of live buffer handle sizes. See
[10-resources-and-profiling.md](10-resources-and-profiling.md).
