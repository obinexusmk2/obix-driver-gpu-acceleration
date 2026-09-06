function getGLBufferTarget(gl, usage) {
    switch (usage) {
        case 'vertex': return gl.ARRAY_BUFFER;
        case 'index': return gl.ELEMENT_ARRAY_BUFFER;
        case 'uniform': return gl.UNIFORM_BUFFER;
        case 'storage': return gl.ARRAY_BUFFER;
    }
}
function getGLUsageHint(gl, dynamic) {
    return dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
}
export function createBufferManager(backend, resourceManager) {
    const bufferTargets = new Map();
    const bufferDataCopies = new Map();
    let totalMemory = 0;
    return {
        create(descriptor) {
            const gl = backend.gl;
            const id = resourceManager.nextId();
            const byteSize = descriptor.data.byteLength;
            let glBuffer;
            if (gl) {
                const buffer = gl.createBuffer();
                if (buffer) {
                    glBuffer = buffer;
                    const target = getGLBufferTarget(gl, descriptor.usage);
                    gl.bindBuffer(target, buffer);
                    gl.bufferData(target, descriptor.data, getGLUsageHint(gl, descriptor.dynamic ?? false));
                    gl.bindBuffer(target, null);
                }
            }
            const handle = {
                id,
                type: 'buffer',
                byteSize,
                glBuffer,
            };
            bufferTargets.set(id, descriptor.usage);
            bufferDataCopies.set(id, descriptor.data);
            totalMemory += byteSize;
            resourceManager.register(handle, () => {
                if (gl && glBuffer) {
                    gl.deleteBuffer(glBuffer);
                }
                bufferTargets.delete(id);
                bufferDataCopies.delete(id);
                totalMemory -= byteSize;
            });
            return handle;
        },
        update(handle, data, offset = 0) {
            const gl = backend.gl;
            if (!gl || !handle.glBuffer)
                return;
            const usage = bufferTargets.get(handle.id);
            if (!usage)
                return;
            const target = getGLBufferTarget(gl, usage);
            gl.bindBuffer(target, handle.glBuffer);
            gl.bufferSubData(target, offset, data);
            gl.bindBuffer(target, null);
            bufferDataCopies.set(handle.id, data);
        },
        bind(handle) {
            const gl = backend.gl;
            if (!gl || !handle.glBuffer)
                return;
            const usage = bufferTargets.get(handle.id);
            if (!usage)
                return;
            const target = getGLBufferTarget(gl, usage);
            gl.bindBuffer(target, handle.glBuffer);
        },
        delete(handle) {
            resourceManager.release(handle.id);
        },
        getMemoryUsage() {
            return totalMemory;
        },
        destroy() {
            bufferTargets.clear();
            bufferDataCopies.clear();
            totalMemory = 0;
        },
    };
}
//# sourceMappingURL=buffer-manager.js.map