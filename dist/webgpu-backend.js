export async function createWebGPUBackend(config) {
    const nav = navigator;
    const gpu = nav.gpu;
    if (!gpu) {
        return null;
    }
    let device = null;
    let gpuContext = null;
    let lost = false;
    const lossHandlers = [];
    const restoreHandlers = [];
    try {
        const adapter = await gpu.requestAdapter({
            powerPreference: config.powerPreference ?? 'default',
        });
        if (!adapter)
            return null;
        device = await adapter.requestDevice();
        device.lost.then((info) => {
            lost = true;
            console.warn(`WebGPU device lost: ${info.message} (reason: ${info.reason})`);
            for (const handler of lossHandlers) {
                handler();
            }
        });
        gpuContext = config.canvas.getContext('webgpu');
        if (gpuContext && device) {
            const format = nav.gpu?.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
            gpuContext.configure({
                device,
                format,
                alphaMode: 'premultiplied',
            });
        }
    }
    catch {
        return null;
    }
    return {
        get type() {
            return 'webgpu';
        },
        get lost() {
            return lost;
        },
        get gl() {
            return null;
        },
        onContextLost(handler) {
            lossHandlers.push(handler);
        },
        onContextRestored(handler) {
            restoreHandlers.push(handler);
        },
        async restore() {
            return false;
        },
        destroy() {
            device?.destroy();
            device = null;
            gpuContext = null;
            lost = true;
            lossHandlers.length = 0;
            restoreHandlers.length = 0;
        },
    };
}
//# sourceMappingURL=webgpu-backend.js.map