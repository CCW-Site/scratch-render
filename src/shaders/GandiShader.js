/* eslint-disable */
const twgl = require('twgl.js');

class GandiShader {
    constructor(gl, bufferInfo, render, vert, frag) {
        this._gl = gl;
        this._bufferInfo = bufferInfo;
        this._render = render;
        const onErr = (e) => {
            console.error('Gandi Shader Error - ',e)
            this._program = null;
            // throw new Error(e);
        };
        this._program = twgl.createProgramInfo(gl, [vert, frag], onErr);
        this.dirty = false;
        this.bypass = true;
    }

    static get uniforms () {
        return {
        };
    }

    static get vertexShader () {
        return /* glsl */`
`;
    }

    static get fragmentShader () {
        return /* glsl */`
#ifdef GL_ES
precision mediump float;
#endif
`;
    }
    trySetupProgram () {
        if (!this._program || this._program == null || this._program.program == null) {
            return false;
        }
        this._gl.useProgram(this._program.program);
        twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
        twgl.setUniforms(this._program, this.uniforms);
        return true;
    }

    render () {
        // need override
        if (this.bypass > 0 || !this.trySetupProgram()) {
            this.dirty = false;
            return false;
        }
        this.dirty = true;
        return true;
    }
}
module.exports = GandiShader;
