export function createResourceManager() {
    let currentId = 0;
    const resources = new Map();
    let leakHandler = null;
    return {
        nextId() {
            return ++currentId;
        },
        register(handle, destructor) {
            resources.set(handle.id, {
                handle,
                destructor,
                refCount: 1,
                framesSinceRelease: 0,
            });
        },
        retain(id) {
            const tracked = resources.get(id);
            if (tracked) {
                tracked.refCount++;
                tracked.framesSinceRelease = 0;
            }
        },
        release(id) {
            const tracked = resources.get(id);
            if (tracked) {
                tracked.refCount = Math.max(0, tracked.refCount - 1);
                if (tracked.refCount === 0) {
                    tracked.framesSinceRelease = 0;
                }
            }
        },
        collectGarbage() {
            let freedBytes = 0;
            const toDelete = [];
            for (const [id, tracked] of resources) {
                if (tracked.refCount === 0) {
                    tracked.framesSinceRelease++;
                    if (tracked.framesSinceRelease > 60) {
                        if (leakHandler) {
                            leakHandler(tracked.handle);
                        }
                    }
                    tracked.destructor();
                    freedBytes += tracked.handle.byteSize;
                    toDelete.push(id);
                }
            }
            for (const id of toDelete) {
                resources.delete(id);
            }
            return freedBytes;
        },
        getMemoryUsage() {
            let buffers = 0;
            let textures = 0;
            let shaders = 0;
            for (const tracked of resources.values()) {
                switch (tracked.handle.type) {
                    case 'buffer':
                        buffers += tracked.handle.byteSize;
                        break;
                    case 'texture':
                    case 'framebuffer':
                        textures += tracked.handle.byteSize;
                        break;
                    case 'shader':
                        shaders += tracked.handle.byteSize;
                        break;
                }
            }
            return { buffers, textures, shaders, total: buffers + textures + shaders };
        },
        onLeak(handler) {
            leakHandler = handler;
        },
        destroy() {
            for (const tracked of resources.values()) {
                tracked.destructor();
            }
            resources.clear();
            leakHandler = null;
            currentId = 0;
        },
    };
}
//# sourceMappingURL=resource-manager.js.map