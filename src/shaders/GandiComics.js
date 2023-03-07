/* eslint-disable */
const twgl = require('twgl.js');

class GandiComics {
    constructor (gl, bufferInfo, render){
        this._gl = gl;
        this._bufferInfo = bufferInfo;
        this._render = render;
        this._program = twgl.createProgramInfo(gl, [GandiComics.vertexShader, GandiComics.fragmentShader]);
        this.uniforms = GandiComics.uniforms;
        this.uniforms.tSize = [480,360];
        this.dirty = false;
        this.bypass = 1;
       
    }

    static get uniforms (){
        return {
            byp: 1,
            tDiffuse: 0,
            tSize: [256, 256],
            center: [0.5, 0.5],
            angle: 1.56,
            scale: 1.0,
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
        return /* glsl */ `
#ifdef GL_ES
precision mediump float;
#endif
uniform vec2 center;
uniform float angle;
uniform float scale;
uniform vec2 tSize;
uniform sampler2D tDiffuse;
varying vec2 vUv;
float pattern() {
  float s = sin( angle ), c = cos( angle );
  vec2 tex = vUv * tSize - center;
  vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;
  return ( sin( point.x ) * sin( point.y ) ) * 4.0;
}
void main() {
  vec4 color = texture2D( tDiffuse, vUv );
  float average = ( color.r + color.g + color.b ) / 3.0;
  gl_FragColor = vec4( vec3( average * 10.0 - 5.0 + pattern() ), color.a );
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
        twgl.setUniforms(this._program, this.uniforms);
        

        const texture = twgl.createTexture(this._gl, {
          src: this._gl.canvas
        });
        
        twgl.setUniforms(this._program, {
            tDiffuse: texture || 0,
        });

        this.dirty = true;
        dirty = true;

        twgl.drawBufferInfo(this._gl, this._bufferInfo);
        this._gl.deleteTexture(texture);
        return dirty;
    }
}

module.exports = GandiComics;

