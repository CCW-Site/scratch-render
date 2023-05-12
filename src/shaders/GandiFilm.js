/* eslint-disable */
const twgl = require('twgl.js');
// import { common } from './GandiGLSLCommon';
const {common} = require('./GandiGLSLCommon');

const TIMESTEP = 0.01;

class GandiFilm {
    constructor(gl, bufferInfo, render) {
        this._gl = gl;
        this._bufferInfo = bufferInfo;
        this._render = render;
        this._program = twgl.createProgramInfo(gl, [GandiFilm.vertexShader, GandiFilm.fragmentShader]);
        this.uniforms = GandiFilm.uniforms;
        this.dirty = false;
        this.bypass = 1;
        this.time = 0.1;

    }

    static get uniforms () {
        return {
            byp: 1,
            tDiffuse: 0,
            time: 0.0,
            nIntensity: 0.15,
            sIntensity: 0.05,
            sCount: 4096.0,
            grayscale: false,
        };
    }

    static get vertexShader () {
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
        return /* glsl */ common + `
#ifdef GL_ES
precision mediump float;
#endif

uniform int byp;

uniform float time;
uniform bool grayscale;
// noise effect intensity value (0 = no effect, 1 = full effect)
uniform float nIntensity;
// scanlines effect intensity value (0 = no effect, 1 = full effect)
uniform float sIntensity;
// scanlines effect count value (0 = no effect, 4096 = full effect)
uniform float sCount;
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  if(byp < 1) {
  // sample the source
    vec4 cTextureScreen = texture2D( tDiffuse, vUv );
  // make some noise
    float dx = rand( vUv + time );
  // add noise
    vec3 cResult = cTextureScreen.rgb + cTextureScreen.rgb * clamp( 0.1 + dx, 0.0, 1.0 );
  // get us a sine and cosine
    vec2 sc = vec2( sin( vUv.y * sCount ), cos( vUv.y * sCount ) );
  // add scanlines
    cResult += cTextureScreen.rgb * vec3( sc.x, sc.y, sc.x ) * sIntensity;
  // interpolate between source and result by intensity
    cResult = cTextureScreen.rgb + clamp( nIntensity, 0.0,1.0 ) * ( cResult - cTextureScreen.rgb );
  // convert to grayscale if desired
    if( grayscale ) {
      cResult = vec3( cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11 );
    }
    gl_FragColor =  vec4( cResult, cTextureScreen.a );
  }
  else {
    gl_FragColor = texture2D( tDiffuse, vUv );
  }
}

`;
    }

    render () {
        if (!this._program) {
            console.warn('[Gandi Render]: GandiFilm shader program is ', this._program);
        }
        if (this.bypass > 0) {
            return false;
        }
        let dirty = this.dirty;
        this.time += TIMESTEP;

        this._gl.useProgram(this._program.program);
        twgl.setBuffersAndAttributes(this._gl, this._program, this._bufferInfo);
        twgl.setUniforms(this._program, this.uniforms);


        const texture = twgl.createTexture(this._gl, {
            src: this._gl.canvas
        });

        twgl.setUniforms(this._program, {
            time: this.time,
            byp: this.bypass,
            // grayscale: this.grayscale || false,
            tDiffuse: texture || 0,

        });

        this.dirty = true;
        dirty = true;

        twgl.drawBufferInfo(this._gl, this._bufferInfo);
        this._gl.deleteTexture(texture);
        return dirty;
    }
}

module.exports = GandiFilm;
