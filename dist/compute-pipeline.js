export function createComputePipeline(backend) {
    const isWebGPU = backend.type === 'webgpu';
    return {
        get supported() {
            return isWebGPU;
        },
        dispatch(shader, workgroups) {
            if (!isWebGPU) {
                throw new Error(`Compute shaders require WebGPU backend (current: ${backend.type}). ` +
                    'Set preferWebGPU: true in driver config if WebGPU is available.');
            }
            void shader;
            void workgroups;
        },
        destroy() {
        },
    };
}
//# sourceMappingURL=compute-pipeline.js.map