const THROTTLE_WINDOW = 60;
const THROTTLE_THRESHOLD = 1.5;
export function createProfiler(backend, resourceManager) {
    let frameStartTime = 0;
    let lastFrameTime = 0;
    let drawCalls = 0;
    let triangles = 0;
    let gpuTime = 0;
    const frameTimes = [];
    let throttled = false;
    let timerQuery = null;
    let timerExt = null;
    function initTimerExtension() {
        const gl = backend.gl;
        if (!gl)
            return;
        const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
        if (ext) {
            timerExt = ext;
        }
    }
    initTimerExtension();
    return {
        beginFrame() {
            frameStartTime = performance.now();
            drawCalls = 0;
            triangles = 0;
            gpuTime = 0;
            const gl = backend.gl;
            if (gl && timerExt) {
                timerQuery = gl.createQuery();
                if (timerQuery) {
                    gl.beginQuery(0x88BF, timerQuery);
                }
            }
        },
        endFrame() {
            lastFrameTime = performance.now() - frameStartTime;
            const gl = backend.gl;
            if (gl && timerQuery && timerExt) {
                gl.endQuery(0x88BF);
                const available = gl.getQueryParameter(timerQuery, gl.QUERY_RESULT_AVAILABLE);
                if (available && timerExt) {
                    const disjoint = gl.getParameter(timerExt.GPU_DISJOINT_EXT);
                    if (!disjoint) {
                        gpuTime = gl.getQueryParameter(timerQuery, gl.QUERY_RESULT) / 1e6;
                    }
                }
                gl.deleteQuery(timerQuery);
                timerQuery = null;
            }
            frameTimes.push(lastFrameTime);
            if (frameTimes.length > THROTTLE_WINDOW) {
                frameTimes.shift();
            }
            if (frameTimes.length >= THROTTLE_WINDOW) {
                const firstHalf = frameTimes.slice(0, THROTTLE_WINDOW / 2);
                const secondHalf = frameTimes.slice(THROTTLE_WINDOW / 2);
                const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
                const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
                throttled = avgFirst > 0 && (avgSecond / avgFirst) > THROTTLE_THRESHOLD;
            }
        },
        getMetrics() {
            const mem = resourceManager.getMemoryUsage();
            return {
                frameTime: lastFrameTime,
                gpuTime,
                drawCalls,
                triangles,
                textureMemory: mem.textures,
                bufferMemory: mem.buffers,
                throttled,
            };
        },
        reset() {
            lastFrameTime = 0;
            gpuTime = 0;
            drawCalls = 0;
            triangles = 0;
            frameTimes.length = 0;
            throttled = false;
        },
        destroy() {
            const gl = backend.gl;
            if (gl && timerQuery) {
                gl.deleteQuery(timerQuery);
            }
            timerQuery = null;
            timerExt = null;
            frameTimes.length = 0;
        },
    };
}
//# sourceMappingURL=profiler.js.map