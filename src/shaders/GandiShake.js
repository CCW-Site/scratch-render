/* eslint-disable */
const GandiShader = require('./GandiShader');
const twgl = require('twgl.js');

const { MathUtils } = require('three');


class GandiShake extends GandiShader{
  constructor (gl, bufferInfo, render){
    super(gl, bufferInfo, render, GandiShake.vertexShader, GandiShake.fragmentShader);
    this.uniforms = GandiShake.uniforms;
    this.step = 0.05; 
    this.count = 0;
    this.skip = 1;
    this.offset =  [ 1, 1];
    this.bypass = true;
  }

  shake(x, y, step = 0.05, skip = 1){
    this.offset = [Math.abs(x), Math.abs(y)];
    this.step = Math.abs(step);
    this.dirty = true;
    this.count = 0;
    this.skip = skip;
    this._render.dirty = true;
  }

  static get uniforms (){
    return {
    };
  }

  static get vertexShader (){
    return /* glsl */`
    #version 300 es
    in vec2 a_position;
    in vec2 uv;
    out vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = vec4(-a_position * 2.0, 0.0, 1.0);
    }
  `;
  }

  static get fragmentShader () {
    return /* glsl */`
    #version 300 es
    precision mediump float;
    
    uniform int byp; 
    uniform vec2 offset;
    uniform sampler2D tDiffuse;
    
    in vec2 vUv;
    out vec4 outColor;
    
    float rand(vec2 co){
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
    
    void main() {
      if(byp<1) {
        vec2 p = vUv;
        vec4 cr = texture(tDiffuse, p + offset/100.0);
        outColor = cr;
      } else{
        outColor = texture(tDiffuse, vUv);
      }
    }
  `;
  }
  render(){
    if (this.bypass > 0) {
      return false;
    }
    
    const xRange = Math.max(0, this.offset[0]);
    const yRange = Math.max(0, this.offset[1]);

    if (xRange === 0 && yRange === 0) {
      this.dirty = false;
      return false;
    }

    this.offset[0] -= this.step;
    this.offset[1] -= this.step;

    this.count ++;
    if ((this.count % this.skip) != 0) {
      // skip this frame
      return true;
    }

    super.render();
    let dirty =  this.dirty;
    const gl = this._gl;

    const textureDiff = twgl.createTexture(gl, {
      src: gl.canvas
    });
    twgl.setUniforms(this._program, {
      byp: this.bypass,
      tDiffuse: textureDiff,
      offset: [MathUtils.randFloat(-xRange, xRange),MathUtils.randFloat(-yRange, yRange)],
    });

    twgl.drawBufferInfo(gl, this._bufferInfo);

    this._gl.deleteTexture(textureDiff);

    dirty = true;
    this.dirty = dirty;

    return dirty;
  }


}
module.exports = GandiShake;
