# Textures and Framebuffers

## Textures

```ts
interface TextureDescriptor {
  width: number;
  height: number;
  format?: 'rgba8' | 'rgb8' | 'r8' | 'depth24' | 'depth32f';  // default 'rgba8'
  mipmaps?: boolean;
  data?: ArrayBufferView | null;
}

interface TextureHandle {
  readonly id: number;
  readonly type: 'texture';
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
  readonly glTexture?: WebGLTexture;
}
```

```ts
const tex = driver.createTexture({
  width: 512,
  height: 512,
  format: 'rgba8',
  mipmaps: true,
  data: pixelBytes,          // or null to allocate an empty texture
});
```

`createTexture` throws if the driver is not initialized. The maximum dimension is
`config.maxTextureSize` when set, otherwise the value queried from the GL context;
reach it via `driver.textureManager?.getMaxTextureSize()`.

## Framebuffers (render-to-texture)

```ts
interface FramebufferDescriptor {
  width: number;
  height: number;
  colorAttachments: TextureHandle[];
  depthAttachment?: TextureHandle;
}
```

```ts
const color = driver.createTexture({ width: 1024, height: 1024, format: 'rgba8' });
const depth = driver.createTexture({ width: 1024, height: 1024, format: 'depth24' });

const fbo = driver.createFramebuffer({
  width: 1024,
  height: 1024,
  colorAttachments: [color],
  depthAttachment: depth,
});
```

`FramebufferHandle` carries `id`, `type: 'framebuffer'`, `byteSize`, `width`,
`height`, and `glFramebuffer?`.

## Direct texture-manager access

`driver.textureManager` (`TextureManagerAPI | null`):

| Method | Description |
|--------|-------------|
| `create(descriptor)` | Same as `driver.createTexture` |
| `createFramebuffer(descriptor)` | Same as `driver.createFramebuffer` |
| `bind(handle, unit)` | Bind a texture to a sampler unit |
| `generateMipmaps(handle)` | Rebuild the mip chain |
| `delete(handle)` | Free the texture |
| `getMaxTextureSize()` | Effective maximum dimension |
| `getMemoryUsage()` | Bytes held by live textures |

Texture and framebuffer bytes are reported together as `textureMemory` in
`getMetrics()`.
