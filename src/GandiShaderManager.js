const GandiGlitch = require('./shaders/GandiGlitch');

const GandiShadow = require('./shaders/GandiShadow');
const GandiFilm = require('./shaders/GandiFilm');
const GandiShake = require('./shaders/GandiShake');
const GandiShockWave = require('./shaders/GandiShockWave');
const GandiBloom = require('./shaders/GandiBloom');
const GandiShaderLoader = require('./shaders/GandiShaderLoader');


// const twgl = require('twgl.js');

// stage > partial system > post processing
// TODO: impliment a pipeline to run post effectors
class GandiShaderManager {
    static get version () {
        return '1.0';
    }
    constructor (gl, _bufferInfo, render) {
        this._gl = gl;
        this._bufferInfo = _bufferInfo;
        this._render = render;
        this.effectors = new Map();
        this.postProcessing = [];
    }

    unregister (name) {
        if (this.effectors.has(name)) {
            const oldEffector = this.effectors.get(name);
            oldEffector.bypass = 1;
            const newPP = this.postProcessing.filter(pp => pp !== oldEffector);
            this.postProcessing = newPP;
            this.effectors.delete(name);
        }
    }

    register (name, bypass = true, vertex = null, frag = null, uniforms = {}, renderLoop = null, config = {}) {
        let effector;
        if (vertex === null && frag === null){
            // load default
            switch (name) {
            case 'glitch':
                effector = new GandiGlitch(this._gl, this._bufferInfo, this._render);
                break;
            case 'film':
                effector = new GandiFilm(this._gl, this._bufferInfo, this._render);
                break;
            case 'shadow':
                effector = new GandiShadow(this._gl, this._bufferInfo, this._render);
                break;
            case 'shake':
                effector = new GandiShake(this._gl, this._bufferInfo, this._render);
                break;
            case 'shockwave':
                effector = new GandiShockWave(this._gl, this._bufferInfo, this._render);
                break;
            case 'bloom':
                effector = new GandiBloom(this._gl, this._bufferInfo, this._render);
                break;
            default:
                // no vertex & frag, and not founded in default effector
                return null;
            }
        } else {
            effector = new GandiShaderLoader(
                this._gl, this._bufferInfo, this._render,
                vertex, frag, uniforms, renderLoop, config);
        }
        
        this.unregister(name);

        effector.bypass = bypass;
        if (!bypass) {
            effector.dirty = true;
        }
        this.postProcessing.push(effector);
        this.effectors.set(name, effector);
        return effector;
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
