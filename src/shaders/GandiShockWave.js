/* eslint-disable no-tabs */
const twgl = require('twgl.js');

class GandiShockWave {
  constructor (gl, bufferInfo, render){
    this._gl = gl;
    this._bufferInfo = bufferInfo;
    this._render = render;
    this._program = twgl.createProgramInfo(gl, [GandiShockWave.vertexShader, GandiShockWave.fragmentShader]);
    this.dirty = false;
}

    static get uniforms (){
        return {
          active: true,
          center: [0.5, 0.5],
          waveSize: 0.3,
          radius: 0.2,
          maxRadius: 1,
          amplitude: 0.05
        };
    }

    static get vertexShader (){
        return /* glsl */`
varying float vSize;
attribute vec2 uv;
varying vec2 vUv;
void main() {
	vSize = 0.1;
  vUv = uv;
}
`;
    }

    static get fragmentShader () {
        return /* glsl */`
#ifdef GL_ES
precision mediump float;
#endif
uniform bool active;
uniform vec2 center;
uniform float waveSize;
uniform float radius;
uniform float maxRadius;
uniform float amplitude;

varying float vSize;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
	if(active) {

		vec2 aspectCorrection = vec2(1.0, 1.0);
		vec2 difference = uv * aspectCorrection - center * aspectCorrection;
		float distance = sqrt(dot(difference, difference)) * vSize;

		if(distance > radius) {

			if(distance < radius + waveSize) {

				float angle = (distance - radius) * 3.14 / waveSize;
				float cosSin = (1.0 - cos(angle)) * 0.5;

				float extent = maxRadius + waveSize;
				float decay = max(extent - distance * distance, 0.0) / extent;

				uv -= ((cosSin * amplitude * difference) / distance) * decay;

			}

		}
    gl_FragColor = vec4(uv, 0.0, 1.0);
	} else {
    gl_FragColor=vec4(uv, 0.0, 1.0);
  }

}
`;
    }

    render (){
      let dirty = this.dirty;
      this._gl.useProgram(this._program.program);
      twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
      twgl.setUniforms(this._program, GandiShockWave.uniforms);
      this.dirty = true;
      dirty = true;

      twgl.drawBufferInfo(this._gl, this._bufferInfo);
      return dirty;
    }
}
module.exports = GandiShockWave;