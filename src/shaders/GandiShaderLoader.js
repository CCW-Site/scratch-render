/* eslint-disable */
const GandiShader = require('./GandiShader');
const twgl = require('twgl.js');
const LZString = require('lz-string');

class GandiShaderLoader extends GandiShader {
    static get vertexShader() {
        return /* glsl */`//
varying vec2 vUv;
attribute vec2 a_position;
attribute vec2 uv;
attribute vec2 a_texCoord;
void main() {
vUv = uv;
vec2 fixedPosition = a_position;
fixedPosition.y = -fixedPosition.y;
gl_Position =  vec4(-fixedPosition *2.0 ,0.0, 1.0 );
}
`;
    }

    constructor(gl, bufferInfo, render, vertex, fragment, uniforms, renderLoop = undefined, config = { passTexture: false, useTimer: false, step: 1 }) {
        let vert = vertex || GandiShaderLoader.vertexShader;
        if (!(vert.indexOf('//') == 0 || vert.indexOf('#version') == 0)) {
            // compressed
            vert = LZString.decompressFromUTF16(vert) || vert;
        }
        let frag = fragment;
        if (!(frag.indexOf('//') == 0 || frag.indexOf('#version') == 0)) {
            // compressed
            frag = LZString.decompressFromUTF16(frag) || frag;
        }

        super(gl, bufferInfo, render, vert, frag);
        this.config = config;
        this.uniforms = uniforms;
        this.renderLoop = renderLoop;
        if (config.useTimer) {
            this.time = 0;
            this.step = config.step;
        }

    }

    render() {
        if (this.config.useTimer) {
            this.time += this.step;
        }

        if (this.bypass > 0) {
            return false;
        }

        if (this.renderLoop) {
            this.uniforms = this.renderLoop(this.uniforms, this.time);
        }

        if (!this.trySetupProgram()) {
            return false
        }

        const gl = this._gl;
        twgl.setUniforms(this._program, {
            byp: this.bypass,
        });

        if (this.config.passTexture) {
            twgl.setUniforms(this._program, {
                tDiffuse: this._render.fbo.attachments[0],
            });
        }

        if (this.config.useTimer) {
            twgl.setUniforms(this._program, {
                time: this.time,
            });
        }
        twgl.drawBufferInfo(gl, this._bufferInfo);
        this.dirty = true;
        return true;
    }
}
module.exports = GandiShaderLoader;
