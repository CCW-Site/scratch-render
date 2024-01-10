/* eslint-disable */
const GandiShader = require('./GandiShader');
const twgl = require('twgl.js');
const LZString = require('lz-string');

class GandiSync extends GandiShader {
  static get vertexShader (){
    return /* glsl */`#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;

  vec2 fixedPosition = a_position;
  fixedPosition.x = -fixedPosition.x;

  gl_Position = vec4(fixedPosition * 2.0, 0.0, 1.0);
}
`;
  }

  static get fragmentShader () {
    return /* glsl */`#version 300 es
    #ifdef GL_ES
    precision mediump float;
    #endif

    in vec2 vUv;
    out vec4 fragColor;
    
    uniform sampler2D fboOriginal;
    uniform sampler2D fboPostProcessing;
    
    
    void main() {
        vec2 fragCoord = vUv;
        
        //fragColor = texture(fboOriginal, fragCoord);
        //fragColor = vec4(1.0,0.0,1.0,1.0);
        vec4 synced = texture(fboOriginal, fragCoord);
        // synced.r *= 0.5;
        fragColor = synced;
    }
  `;}

  constructor (gl, bufferInfo, render, uniforms, renderLoop = undefined){
    const vert = GandiSync.vertexShader;
    const frag = GandiSync.fragmentShader;
    const config = { passTexture : true, useTimer : false , step: 1 };
    super(gl, bufferInfo, render, vert, frag);
    this.bypass = 0;
    this.config = config;
    this.uniforms = uniforms;
    this.renderLoop = renderLoop;
    if (config.useTimer) {
      this.time = 0;
      this.step = config.step;
    }
    
  }

  render (){
    if (this.config.useTimer) {
      this.time += this.step;
    }
    
    // if (this.bypass > 0) {
    //   return false;
    // }

    if (this.renderLoop) {
      this.uniforms = this.renderLoop( this.uniforms, this.time);
    }

    const gl = this._gl;
    super.render();

    

    twgl.setUniforms(this._program, {
      byp: this.bypass,
      fboOriginal: this._render.fbo.attachments[0],
      fboPostProcessing: this._render.fbo.attachments[0],
    });    

    twgl.drawBufferInfo(gl, this._bufferInfo);

    // console.info('synced');

    // console.info('render');
    // if (textureDiff) {
    //   this._gl.deleteTexture(textureDiff);
    // }
    //this.dirty = true;
    //let dirty =  this.dirty;
    return false;
  }
}
module.exports = GandiSync;