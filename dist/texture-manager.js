/**
 * Texture & Framebuffer Objects
 * Texture loading, mipmapping, and framebuffer management
 */
function getGLFormat(gl, format) {
    switch (format) {
        case 'rgba8':
            return { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, bytesPerPixel: 4 };
        case 'rgb8':
            return { internalFormat: gl.RGB8, format: gl.RGB, type: gl.UNSIGNED_BYTE, bytesPerPixel: 3 };
        case 'r8':
            return { internalFormat: gl.R8, format: gl.RED, type: gl.UNSIGNED_BYTE, bytesPerPixel: 1 };
        case 'depth24':
            return { internalFormat: gl.DEPTH_COMPONENT24, format: gl.DEPTH_COMPONENT, type: gl.UNSIGNED_INT, bytesPerPixel: 4 };
        case 'depth32f':
            return { internalFormat: gl.DEPTH_COMPONENT32F, format: gl.DEPTH_COMPONENT, type: gl.FLOAT, bytesPerPixel: 4 };
    }
}
export function createTextureManager(backend, resourceManager) {
    let maxTextureSize = 0;
    let totalMemory = 0;
    // Query max texture size on creation
    const gl = backend.gl;
    if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
    return {
        create(descriptor) {
            const gl = backend.gl;
            const id = resourceManager.nextId();
            const format = descriptor.format ?? 'rgba8';
            const { width, height } = descriptor;
            // Validate texture size
            if (maxTextureSize > 0 && (width > maxTextureSize || height > maxTextureSize)) {
                throw new Error(`Texture size ${width}x${height} exceeds maximum ${maxTextureSize}x${maxTextureSize}`);
            }
            let glTexture;
            const fmtInfo = gl ? getGLFormat(gl, format) : null;
            const byteSize = width * height * (fmtInfo?.bytesPerPixel ?? 4);
            if (gl) {
                const tex = gl.createTexture();
                if (tex) {
                    glTexture = tex;
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    // Set default filtering
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, descriptor.mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    // Upload data
                    const glFmt = getGLFormat(gl, format);
                    if (descriptor.data) {
                        gl.texImage2D(gl.TEXTURE_2D, 0, glFmt.internalFormat, width, height, 0, glFmt.format, glFmt.type, descriptor.data);
                    }
                    else {
                        gl.texImage2D(gl.TEXTURE_2D, 0, glFmt.internalFormat, width, height, 0, glFmt.format, glFmt.type, null);
                    }
                    if (descriptor.mipmaps) {
                        gl.generateMipmap(gl.TEXTURE_2D);
                    }
                    gl.bindTexture(gl.TEXTURE_2D, null);
                }
            }
            const handle = {
                id,
                type: 'texture',
                byteSize,
                glTexture,
                width,
                height,
            };
            totalMemory += byteSize;
            resourceManager.register(handle, () => {
                if (gl && glTexture) {
                    gl.deleteTexture(glTexture);
                }
                totalMemory -= byteSize;
            });
            return handle;
        },
        createFramebuffer(descriptor) {
            const gl = backend.gl;
            const id = resourceManager.nextId();
            const { width, height } = descriptor;
            let glFramebuffer;
            const byteSize = 0; // FBO itself is minimal; textures are tracked separately
            if (gl) {
                const fbo = gl.createFramebuffer();
                if (fbo) {
                    glFramebuffer = fbo;
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                    // Attach color textures
                    for (let i = 0; i < descriptor.colorAttachments.length; i++) {
                        const tex = descriptor.colorAttachments[i];
                        if (tex.glTexture) {
                            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex.glTexture, 0);
                        }
                    }
                    // Attach depth
                    if (descriptor.depthAttachment?.glTexture) {
                        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, descriptor.depthAttachment.glTexture, 0);
                    }
                    // Check completeness
                    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
                    if (status !== gl.FRAMEBUFFER_COMPLETE) {
                        console.warn(`Framebuffer incomplete: status ${status}`);
                    }
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                }
            }
            const handle = {
                id,
                type: 'framebuffer',
                byteSize,
                glFramebuffer,
                width,
                height,
            };
            resourceManager.register(handle, () => {
                if (gl && glFramebuffer) {
                    gl.deleteFramebuffer(glFramebuffer);
                }
            });
            return handle;
        },
        bind(handle, unit) {
            const gl = backend.gl;
            if (!gl || !handle.glTexture)
                return;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, handle.glTexture);
        },
        generateMipmaps(handle) {
            const gl = backend.gl;
            if (!gl || !handle.glTexture)
                return;
            gl.bindTexture(gl.TEXTURE_2D, handle.glTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
        },
        delete(handle) {
            resourceManager.release(handle.id);
        },
        getMaxTextureSize() {
            return maxTextureSize;
        },
        getMemoryUsage() {
            return totalMemory;
        },
        destroy() {
            totalMemory = 0;
        },
    };
}
//# sourceMappingURL=texture-manager.js.map