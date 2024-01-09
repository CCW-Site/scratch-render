/* eslint-disable */
const twgl = require('twgl.js');

class GandiShader {
    constructor(gl, bufferInfo, render, vert, frag) {
        this._gl = gl;
        this._bufferInfo = bufferInfo;
        this._render = render;
        const onErr = (e) => {
            throw new Error(e);
        };
        this._program = twgl.createProgramInfo(gl, [vert, frag], onErr);
        this.dirty = false;
        this.bypass = 1;
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

    __setupProgram () {
        if (this._program == null || this._program.program == null) {
            return;
        }
        this._gl.useProgram(this._program.program);
        twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
        twgl.setUniforms(this._program, this.uniforms);
    }

    render () {
        if (!this._program) {
            console.warn('[Gandi Render]: GandiShader program is ', this._program);
        }
        if (this.bypass > 0) {
            return false;
        }
        this.__setupProgram();


    }
}
module.exports = GandiShader;
