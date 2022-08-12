/* eslint-disable no-tabs */
const twgl = require('twgl.js');

class GandiBloom {
  constructor (gl, bufferInfo, render){
    this._gl = gl;
    this._bufferInfo = bufferInfo;
    this._render = render;
    this._program = twgl.createProgramInfo(gl, [GandiBloom.vertexShader, GandiBloom.fragmentShader]);
    this.dirty = false;
}

    static get uniforms (){
        return {
          tDiffuse: null,
          luminosityThreshold: .2,
          smoothWidth: 1.0,
          defaultColor: [0, 0, 0],
          defaultOpacity: .5
        };
    }

    static get vertexShader (){
        return /* glsl */`
varying vec2 vUv;
attribute vec2 a_position;
attribute vec2 uv;
attribute vec2 a_texCoord;
void main() {
  vUv = uv;
  gl_Position =  vec4(-a_position *2.0 ,0.0, 1.0 );
}
`;
    }

    static get fragmentShader () {
        return /* glsl */`
#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
varying vec2 vUv;
void main() {
  vec4 texel = texture2D( tDiffuse, vUv );
  vec3 luma = vec3( 0.299, 0.587, 0.114 );
  float v = dot( texel.xyz, luma );
  vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );
  float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
  gl_FragColor = mix( outputColor, texel, alpha );
}

`;
    }

    render (){
      let dirty = this.dirty;
      this._gl.useProgram(this._program.program);
      twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
      twgl.setUniforms(this._program, GandiBloom.uniforms);


      const textureDiff = twgl.createTexture(this._gl, {
        src: this._gl.canvas
    });
      twgl.setUniforms(this._program, {
        tDiffuse: textureDiff,
        // defaultColor: [1.0, 0.0, 1.0],

      });

      this.dirty = true;
      dirty = true;

      twgl.drawBufferInfo(this._gl, this._bufferInfo);
      return dirty;
    }
}
module.exports = GandiBloom;
