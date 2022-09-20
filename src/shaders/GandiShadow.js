/* eslint-disable */
const twgl = require('twgl.js');

class GandiShadow {
    constructor (gl, bufferInfo, render){
        this._gl = gl;
        this._bufferInfo = bufferInfo;
        this._render = render;
        this._program = twgl.createProgramInfo(gl, [GandiShadow.vertexShader, GandiShadow.fragmentShader]);
        this.dirty = false;
        this.damp = .95;
        this.bypass = 1;
    }

    static get uniforms (){
        return {
            byp: 1,
            tOld: null,
            tNew: null,
            damp: .9,
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
uniform int byp; 
uniform float damp;
uniform sampler2D tOld;
uniform sampler2D tNew;
varying vec2 vUv;
vec4 when_gt( vec4 x, float y ) {
  return max( sign( x - y ), 0.0 );
}
void main() {
  if(byp < 1) {
    vec4 texelOld = texture2D( tOld, vUv );
    vec4 texelNew = texture2D( tNew, vUv );
    texelOld *= damp * when_gt( texelOld, 0.1 );
    gl_FragColor = max(texelNew, texelOld);
  }
  else{
    gl_FragColor = texture2D( tNew, vUv );
  }
}
`;
    }

    render (){
        if(this.bypass > 0){
          return false;
        }
        let dirty = this.dirty;
        this._gl.useProgram(this._program.program);
        twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
        twgl.setUniforms(this._program, GandiShadow.uniforms);


        if (this.tOld === null) {
          this.tOld = twgl.createTexture(this._gl, {
            src: this._gl.canvas
          });
        }
        
        this.tNew = twgl.createTexture(this._gl, {
          src: this._gl.canvas
        });
        
        twgl.setUniforms(this._program, {
            tNew: this.tNew,
            tOld: this.tOld,
            damp: this.damp,
            byp: this.bypass,
            // defaultColor: [1.0, 0.0, 1.0],

        });

        this.dirty = true;
        dirty = true;

        twgl.drawBufferInfo(this._gl, this._bufferInfo);

        this._gl.deleteTexture(this.tOld);
        this._gl.deleteTexture(this.tNew);

        this.tOld = twgl.createTexture(this._gl, {
          src: this._gl.canvas
        });

        return dirty;
    }
}
module.exports = GandiShadow;