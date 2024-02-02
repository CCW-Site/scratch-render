const GandiGlitch = require('./shaders/GandiGlitch');

const GandiShadow = require('./shaders/GandiShadow');
const GandiFilm = require('./shaders/GandiFilm');
const GandiShake = require('./shaders/GandiShake');
const GandiShockWave = require('./shaders/GandiShockWave');
const GandiBloom = require('./shaders/GandiBloom');
const GandiShaderLoader = require('./shaders/GandiShaderLoader');
const GandiSync = require('./shaders/GandiSync');


// const twgl = require('twgl.js');

// stage > partial system > post processing
// TODO: impliment a pipeline to run post effectors
class GandiShaderManager {
    constructor (gl, _bufferInfo, render) {
        // for debug: print current date time and version to console
        // console.log(`GandiShaderManager ${new Date().toLocaleString()} v1.0.1`);
        this._version = '1.0.2';
        this._gl = gl;
        this._bufferInfo = _bufferInfo;
        this._render = render;
        this.effectors = new Map();
        this.postProcessing = [];

        this.syncShader = new GandiSync(this._gl, this._bufferInfo, this._render, {});

        // Test shake effector
        // this.register('shake', false);
        // this.register('shadow', false);
    }

    unregister (name) {
        if (this.effectors.has(name)) {
            const oldEffector = this.effectors.get(name);
            oldEffector.bypass = true;
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
            //  TODO： cache shader object dont need new everytime
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

    sync (){
        this.syncShader.render();
    }

}
module.exports = GandiShaderManager;
