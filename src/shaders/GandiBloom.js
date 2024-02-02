/* eslint-disable */
const twgl = require('twgl.js');
const GandiShader = require('./GandiShader');

class GandiBloom extends GandiShader {
  constructor (gl, bufferInfo, render){
    super(gl, bufferInfo, render, GandiBloom.vertexShader, GandiBloom.fragmentShader);
    this.uniforms = GandiBloom.uniforms;
}

    static get uniforms (){
        return {
          // tDiffuse: 0,
          threshold: .2,
          intensity: 1.0,
          blurSize: 10.0,
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
  vec2 fixedPosition = a_position;
  fixedPosition.y = -fixedPosition.y;
  gl_Position =  vec4(-fixedPosition *2.0 ,0.0, 1.0 );
}
`;
    }

    static get fragmentShader () {
        return /* glsl */`
#ifdef GL_ES
precision mediump float;
#endif
uniform float threshold;
uniform float intensity;
uniform float blurSize;
uniform sampler2D tDiffuse;
varying vec2 vUv;

vec3 makeBloom(float lod, vec2 offset, vec2 bCoord, sampler2D tex){

  vec2 pixelSize = 1.0 / vec2(1.0, 1.0);

  offset += pixelSize;

  float lodFactor = exp2(lod);

  vec3 bloom = vec3(0.0);
  vec2 scale = lodFactor * pixelSize;

  vec2 coord = (bCoord.xy-offset)*lodFactor;
  float totalWeight = 0.0;

  if (any(greaterThanEqual(abs(coord - 0.5), scale + 0.5)))
      return vec3(0.0);

  for (int i = -5; i < 5; i++) {
      for (int j = -5; j < 5; j++) {

          float wg = pow(1.0-length(vec2(i,j)) * 0.125,6.0);

          bloom = pow(texture2D(tex,vec2(i,j) * scale + lodFactor * pixelSize + coord, lod).rgb,vec3(2.2))*wg + bloom;
          totalWeight += wg;

      }
  }

  bloom /= totalWeight;

  return bloom;
}


void main( )
{
	vec2 uv = vUv;
  // vec3 blur = makeBloom(2.,vec2(0.0,0.0), uv,tDiffuse);
		// blur += makeBloom(3.,vec2(0.3,0.0), uv,tDiffuse);
		// blur += makeBloom(4.,vec2(0.0,0.3), uv,tDiffuse);
		// blur += makeBloom(5.,vec2(0.1,0.3), uv,tDiffuse);
		// blur += makeBloom(6.,vec2(0.2,0.3), uv,tDiffuse);
  vec4 color = texture2D(tDiffuse, uv);

    // gl_FragColor = vec4(pow(blur, vec3(1.0 / 2.2)),1.0);
    gl_FragColor = color + color;

   // gl_FragColor = 1.0-(1.0-Color)*(1.0-Highlight*intensity); //Screen Blend Mode
}

`;
    }

    render (){
      if (this.bypass > 0 || !this.trySetupProgram()) {
        this.dirty = false;
        return false;
      }
      twgl.setUniforms(this._program, {
        byp: this.bypass,
        tDiffuse: this._render.fbo.attachments[0],
      });

      twgl.drawBufferInfo(this._gl, this._bufferInfo);
      this.dirty = true;
      return true;
    }
}
module.exports = GandiBloom;
