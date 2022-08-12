const GandiGlitch = require('./shaders/GandiGlitch');

const GandiShadow = require('./shaders/GandiShadow');
const GandiFilm = require('./shaders/GandiFilm');
const GandiShake = require('./shaders/GandiShake');
const GandiShockWave = require('./shaders/GandiShockWave');


// const twgl = require('twgl.js');

// stage > partial system > post processing
// TODO: impliment a pipeline to run post effectors
class GandiShaderManager {
    constructor (gl, _bufferInfo, render) {
        this._gl = gl;
        this._bufferInfo = _bufferInfo;
        this._render = render;
        this.effectors = new Map();

        this.postProcessing = [];

        const shake = new GandiShake(gl, _bufferInfo, render);
        this.postProcessing.push(shake);
        this.effectors.set('shake', shake);
        shake.bypass = true;

        const shockWave = new GandiShockWave(gl, _bufferInfo, render);
        this.postProcessing.push(shockWave);
        this.effectors.set('shockWave', shockWave);
        shockWave.bypass = true;
        
      
        const glitch = new GandiGlitch(gl, _bufferInfo, render);
        this.postProcessing.push(glitch);
        this.effectors.set('glitch', glitch);
        glitch.bypass = 1;



        // const bloom = new GandiBloom(gl, _bufferInfo, render);
        // this.postProcessing.push(bloom);
        // this.effectors.set('bloom', bloom);

        const shadow = new GandiShadow(gl, _bufferInfo, render);
        this.postProcessing.push(shadow);
        this.effectors.set('shadow', shadow);
        shadow.bypass = true;

        const film = new GandiFilm(gl, _bufferInfo, render);
        this.postProcessing.push(film);
        this.effectors.set('film', film);
        film.bypass = true;

        // const comics = new GandiComics(gl, _bufferInfo, render);
        // this.postProcessing.push(comics);
        // this.effectors.set('comics', comics);
        // comics.bypass = 0;

        
    }

    effector (name) {
        return this.effectors.get(name);
    }

    execPostProcessingRender () {
        let dirty = false;
        this.postProcessing.forEach(effector => {
            dirty |= effector.render();
        });
        return dirty;
    }
  
}
module.exports = GandiShaderManager;
