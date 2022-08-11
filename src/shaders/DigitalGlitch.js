/* eslint-disable no-tabs */
/**
 * RGB Shift Shader
 * Shifts red and blue channels from center in opposite directions
 * Ported from http://kriss.cx/tom/2009/05/rgb-shift/
 * by Tom Butterworth / http://kriss.cx/tom/
 *
 * amount: shift distance (1 is width of input)
 * angle: shift angle in radians
 */

const DigitalGlitch = {

    uniforms: {

        tDiffuse: null, // diffuse texture
        tDisp:  null, // displacement texture for digital glitch squares
        byp:  0, // apply the glitch ?
        amount:  0.08,
        angle: 0.02,
        seed: 0.02,
        seed_x: 0.02, // -1,1
        seed_y:  0.02, // -1,1
        distortion_x:  0.5,
        distortion_y:  0.6,
        col_s: 0.05
    },

    vertexShader: /* glsl */`
		varying vec2 vUv;
		attribute vec2 a_position;
		void main() {
			vUv = vec2(0,0);

			gl_Position =  vec4(a_position *2.0 ,0.0, 1.0 );
			// gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		}`,


		test: `
		#ifdef GL_ES
precision mediump float;
#endif

#extension GL_OES_standard_derivatives : enable

#define NUM_OCTAVES 10

uniform float time;
uniform vec2 resolution;
uniform vec2 mouse;
float snow(vec2 uv,float scale)
{

	
    float w = smoothstep(1.,0., -uv.y *(scale / 10.));
    
    if(w < .1)return -0.;
   
    uv += time / scale / 02.34;
    uv.y += time * 0./ scale;
    uv.x += sin (uv.y + time*.5) / scale;
    uv *= scale / 4.34;
    vec2 s = floor(uv), f = fract(uv), p;
    float k = 3., d;
    p = .5 + .35 * sin(11.*fract(sin((s+p+scale) * mat2(7,3,6,5))*5.)) - f;
    d = length(p);
    k = min(d,k);
    k = smoothstep(0., k, sin(f.x+f.y) * 0.01);
        return k*w;
}

void main(void) {
  
    vec2 uv = (gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y); 
    vec3 finalColor=vec3(0);
    float c = 0.;
    c+=snow(uv,30.)*.3;
    c+=snow(uv,20.)*.5;
    c+=snow(uv,15.)*.8;
    c+=snow(uv,10.);
    c+=snow(uv,8.);
    c+=snow(uv,6.);
    c+=snow(uv,5.);
    finalColor=(vec3(c));
    gl_FragColor = vec4(0,0,0,finalColor);
}
		`,

    fragmentShader: /* glsl */`
		#ifdef GL_ES
precision mediump float;
#endif
		uniform int byp; //should we apply the glitch ?
		uniform sampler2D tDiffuse;
		uniform sampler2D tDisp;
		uniform float amount;
		uniform float angle;
		uniform float seed;
		uniform float seed_x;
		uniform float seed_y;
		uniform float distortion_x;
		uniform float distortion_y;
		uniform float col_s;
		varying vec2 vUv;
		float rand(vec2 co){
			return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
		}
		void main() {
			if(byp<1) {
				vec2 p = vUv;
				float xs = floor(gl_FragCoord.x / 0.5);
				float ys = floor(gl_FragCoord.y / 0.5);
				//based on staffantans glitch shader for unity https://github.com/staffantan/unityglitch
				float disp = texture2D(tDisp, p*seed*seed).r;
				if(p.y<distortion_x+col_s && p.y>distortion_x-col_s*seed) {
					if(seed_x>0.){
						p.y = 1. - (p.y + distortion_y);
					}
					else {
						p.y = distortion_y;
					}
				}
				if(p.x<distortion_y+col_s && p.x>distortion_y-col_s*seed) {
					if(seed_y>0.){
						p.x=distortion_x;
					}
					else {
						p.x = 1. - (p.x + distortion_x);
					}
				}
				p.x+=disp*seed_x*(seed/5.);
				p.y+=disp*seed_y*(seed/5.);
				//base from RGB shift shader
				vec2 offset = amount * vec2( cos(angle), sin(angle));
				vec4 cr = texture2D(tDiffuse, p + offset);
				vec4 cga = texture2D(tDiffuse, p);
				vec4 cb = texture2D(tDiffuse, p - offset);
				gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);
				//add noise
				vec4 snow = 200.*amount*vec4(rand(vec2(xs * seed,ys * seed*50.))*0.2);
				gl_FragColor = gl_FragColor+ snow;
			}
			else {
				gl_FragColor=texture2D (tDiffuse, vUv);
			}
		}`

};

export {DigitalGlitch};
