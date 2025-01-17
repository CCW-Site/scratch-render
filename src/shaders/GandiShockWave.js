/* eslint-disable */
const GandiShader = require('./GandiShader');
const twgl = require('twgl.js');

class GandiShockWave extends GandiShader {
    constructor(gl, bufferInfo, render) {
        super(gl, bufferInfo, render, GandiShockWave.vertexShader, GandiShockWave.fragmentShader);
        this.uniforms = GandiShockWave.uniforms;
        this.time = 3;
        this.step = 0.05;
    }

    static get uniforms() {
        return {
            center: [0.5, 0.5],
            waveSize: 0.1,
            // tDiffuse: 0,
            radius: 0.2,
            amplitude: 0.1,
            aspect: 1.0,
            decay: 0.01,
            time: 3,
        };
    }

    static get vertexShader() {
        return /* glsl */`
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

    static get fragmentShader() {
        return /* glsl */`
#ifdef GL_ES
precision mediump float;
#endif
uniform bool byp;
uniform vec2 center;
uniform float waveSize;
uniform float radius;
uniform float amplitude;
uniform float time;
uniform float aspect;

uniform sampler2D tDiffuse;
varying vec2 vUv;

#define _PI 3.1415926535897932384626433832795


vec2 getPixelShift(vec2 center,vec2 pixelpos,float startradius,float size,float shockfactor, in vec2 fragCoord)
{
  // pixelpos.x *= aspect;
  // center.x *= aspect;
	float m_distance = distance(center,pixelpos);
	if( m_distance > startradius && m_distance < startradius+size )
	{
		float sin_dist = sin((m_distance -startradius)/size* _PI )*shockfactor;
		return ( pixelpos - normalize(pixelpos-center)*sin_dist )/ vec2(1.0,1.0);
	}
	else
		return fragCoord.xy / vec2(1,1);
}
void main() {
  vec2 uv = vUv;
	if(!byp) {
    vec2 shift = getPixelShift(center,uv.xy,time,waveSize,amplitude,uv);

    gl_FragColor = texture2D( tDiffuse, shift );
	} else {
    gl_FragColor = texture2D(tDiffuse, vUv);
  }
}
`;
    }

    drop(x, y, amplitude = 0.1, waveSize = 0.1, decay = 0.01, step = 0.05) {
        // debugger;
        this.time = 0;
        this.step = step;
        // The y axis is reversed compared to the stage
        this.uniforms.center = [x, y];
        this.uniforms.amplitude = amplitude;
        this.uniforms.waveSize = waveSize;
        this.uniforms.decay = decay;
        this.uniforms.bypass = false;
        this.uniforms.aspect = this._render._nativeSize[0] / this._render._nativeSize[1];
        this.dirty = true;
        this._render.peDirty = true;
    }

    render() {
        this.time += this.step;
        if (this.bypass > 0) {
            this.dirty = false;
            return false;
        }

        if (this.time > 1) {
            this.uniforms.bypass = true;
            // this.dirty = false;
            return false;
        }

        this.uniforms.amplitude -= this.uniforms.decay / 3.0;
        this.uniforms.amplitude = Math.max(this.uniforms.amplitude, 0);
        this.uniforms.waveSize -= this.uniforms.decay;

        if (!this.trySetupProgram()) {
            return false
        }

        const gl = this._gl;
        twgl.setUniforms(this._program, {
            tDiffuse: this._render.fbo.attachments[0],
            time: this.time,
        });
        twgl.drawBufferInfo(gl, this._bufferInfo);
        this.dirty = true;
        return true;
    }
}
module.exports = GandiShockWave;
