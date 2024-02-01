/* eslint-disable */
const twgl = require('twgl.js');
const {common} = require('./GandiGLSLCommon');
const GandiShader = require('./GandiShader');

const TIMESTEP = 0.01;

class GandiFilm extends GandiShader {
    constructor(gl, bufferInfo, render) {
        super(gl, bufferInfo, render, GandiFilm.vertexShader, GandiFilm.fragmentShader);
        this.uniforms = GandiFilm.uniforms;
        this.time = 0.1;
    }

    static get uniforms () {
        return {
            byp: 1,
            // tDiffuse: 0,
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
  vec2 fixedPosition = a_position;
  fixedPosition.y = -fixedPosition.y;
  gl_Position =  vec4(-fixedPosition *2.0 ,0.0, 1.0 );
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
        if (this.bypass > 0 || !this.trySetupProgram()) {
            this.dirty = false;
            return false;
        }
        this.time += TIMESTEP;
        twgl.setUniforms(this._program, {
            time: this.time,
            byp: this.bypass,
            // grayscale: this.grayscale || false,
            tDiffuse: this._render.fbo.attachments[0],
        });
        twgl.drawBufferInfo(this._gl, this._bufferInfo);
        this.dirty = true;
        return this.dirty;
    }
}

module.exports = GandiFilm;
