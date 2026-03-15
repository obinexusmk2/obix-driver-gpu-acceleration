/**
 * WebGL 2.0 Context Manager
 * Initialize and manage WebGL 2.0 contexts with fallback and context loss recovery
 */
export function createWebGLContext(config) {
    let gl = null;
    let lost = false;
    const lossHandlers = [];
    const restoreHandlers = [];
    const onLost = (event) => {
        event.preventDefault();
        lost = true;
        for (const handler of lossHandlers) {
            handler();
        }
    };
    const onRestored = () => {
        lost = false;
        for (const handler of restoreHandlers) {
            handler();
        }
    };
    function initContext() {
        const attributes = {
            antialias: config.antialias ?? true,
            alpha: true,
            depth: true,
            stencil: false,
            premultipliedAlpha: true,
            preserveDrawingBuffer: false,
            powerPreference: config.powerPreference ?? 'default',
            failIfMajorPerformanceCaveat: false,
        };
        const context = config.canvas.getContext('webgl2', attributes);
        if (context) {
            // Set default state
            context.viewport(0, 0, config.canvas.width, config.canvas.height);
            context.enable(context.DEPTH_TEST);
            context.enable(context.BLEND);
            context.blendFunc(context.SRC_ALPHA, context.ONE_MINUS_SRC_ALPHA);
            context.clearColor(0, 0, 0, 1);
        }
        return context;
    }
    // Initialize
    gl = initContext();
    if (gl) {
        config.canvas.addEventListener('webglcontextlost', onLost);
        config.canvas.addEventListener('webglcontextrestored', onRestored);
    }
    return {
        get type() {
            return 'webgl2';
        },
        get lost() {
            return lost;
        },
        get gl() {
            return gl;
        },
        onContextLost(handler) {
            lossHandlers.push(handler);
        },
        onContextRestored(handler) {
            restoreHandlers.push(handler);
        },
        async restore() {
            if (!lost)
                return true;
            // Try using WEBGL_lose_context extension to force restore
            const ext = gl?.getExtension('WEBGL_lose_context');
            if (ext) {
                ext.restoreContext();
                // The actual restore happens asynchronously via the event listener
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(false), 3000);
                    const tempHandler = () => {
                        clearTimeout(timeout);
                        resolve(true);
                    };
                    restoreHandlers.push(tempHandler);
                });
            }
            // Attempt full re-creation
            gl = initContext();
            if (gl) {
                lost = false;
                for (const handler of restoreHandlers) {
                    handler();
                }
                return true;
            }
            return false;
        },
        destroy() {
            config.canvas.removeEventListener('webglcontextlost', onLost);
            config.canvas.removeEventListener('webglcontextrestored', onRestored);
            // Force context loss to free resources
            const ext = gl?.getExtension('WEBGL_lose_context');
            if (ext) {
                ext.loseContext();
            }
            gl = null;
            lost = true;
            lossHandlers.length = 0;
            restoreHandlers.length = 0;
        },
    };
}
//# sourceMappingURL=webgl-context.js.map