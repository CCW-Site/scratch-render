/* eslint-disable */
const GandiShader = require('./GandiShader');
const twgl = require('twgl.js');



class GandiMultiPass extends GandiShader{
  constructor (gl, bufferInfo, render){
    super(gl, bufferInfo, render, GandiMultiPass.vertexShader, GandiMultiPass.fragmentShader);
    this.uniforms = GandiMultiPass.uniforms;
    this.bypass = false;
  }

  static get uniforms (){
    return {
      byp: 0,
    };
  }

  static get vertexShader (){
    return /* glsl */`
    #version 300 es
    precision mediump float;


    uniform mat4 u_projectionMatrix;
    uniform mat4 u_modelMatrix;
    //uniform vec2 a_texCoord;

    in vec2 uv;
    in vec2 a_position;
    in vec2 a_texCoord;


    out vec2 v_texCoord;
    out vec2 vUv;

    void main() {
      vUv = uv;
      //gl_Position = u_projectionMatrix * u_modelMatrix * vec4(a_position*2.0, 0, 1);
      //gl_Position = u_projectionMatrix * u_modelMatrix * vec4(-a_position*2.0, 0, 1);
      gl_Position = vec4(-a_position * 2.0, 0.0, 1.0);
      v_texCoord = a_texCoord;
      // gl_Position = vec4(a_position * 2.0, 0, 1.);
    }
  `;
  }

  static get fragmentShader () {
    return /* glsl */`
    #version 300 es
    precision mediump float;

    uniform int byp;
    uniform sampler2D tDiffuse;

    in vec2 vUv;
    in vec2 v_texCoord;
    out vec4 outColor;


    void main() {
      vec2 flipped = vec2(vUv.x, 1.0 - vUv.y);
      outColor = texture(tDiffuse, v_texCoord) * 1.5;
      // outColor = texture(tDiffuse, flipped) * 1.5 ;
      //outColor = vec4(1.0,0.0,1.0,1.0);
    }
  `;
  }
  render(texture, uniforms){
    super.render();
    //debugger;

    const gl = this._gl;

    let uni = {};
    Object.assign(uni, uniforms);
    Object.assign(uni, {
      byp: this.bypass,
      tDiffuse: texture,
    });
    twgl.setUniforms(this._program, uni);

    twgl.drawBufferInfo(gl, this._bufferInfo);
    this._gl.deleteTexture(texture);
  }
}
module.exports = GandiMultiPass;
