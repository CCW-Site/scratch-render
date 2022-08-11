import GandiGlitch from './shaders/GandiGlitch';
import GandiShockWave from './shaders/GandiShockWave';
import GandiBloom from './shaders/GandiBloom';
import GandiShadow from './shaders/GandiShadow';
import GandiFilm from './shaders/GandiFilm';
import GandiComics from './shaders/GandiComics';

const twgl = require('twgl.js');

// stage > partial system > post processing
// TODO: impliment a pipeline to run post effectors
class GandiShaderManager {
    constructor (gl, _bufferInfo, render) {
        this._gl = gl;
        this._bufferInfo = _bufferInfo;
        this._render = render;
        this.effectors = new Map();

        this.postProcessing = [];
      
        const glitch = new GandiGlitch(gl, _bufferInfo, render);
        this.postProcessing.push(glitch);
        this.effectors.set('glitch', glitch);
        glitch.bypass = 1;

        // const shockWave = new GandiShockWave(gl, _bufferInfo, render);
        // this.postProcessing.push(shockWave);
        // this.effectors.set('shockWave', shockWave);

        // const bloom = new GandiBloom(gl, _bufferInfo, render);
        // this.postProcessing.push(bloom);
        // this.effectors.set('bloom', bloom);

        const shadow = new GandiShadow(gl, _bufferInfo, render);
        this.postProcessing.push(shadow);
        this.effectors.set('shadow', shadow);
        shadow.bypass = 1;

        const film = new GandiFilm(gl, _bufferInfo, render);
        this.postProcessing.push(film);
        this.effectors.set('film', film);
        film.bypass = 1;

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
export default GandiShaderManager;