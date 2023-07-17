const Spine = require('./spine_runtime/spine-webgl');
const RenderConstants = require('./RenderConstants');
// const GetValue = require('../utils/object/GetValue');
class SpineManager {
    constructor (scratchRender, gl, assetHost) {
        this.scratchRender = scratchRender;
        this.gl = gl;
        this.renderer = new Spine.SceneRenderer(gl.canvas, gl);
        this.timeKeeper = new Spine.TimeKeeper();
        this.assetManager = new Spine.AssetManager(gl, assetHost);
        // this.skeletonAsset = null;
        this.drawDebug = false;
        this.jsonCache = {};
        this.atlasCache = {};

        this.onNativeSizeChanged = this.onNativeSizeChanged.bind(this);
        this.scratchRender.on(RenderConstants.Events.NativeSizeChanged, this.onNativeSizeChanged);
        // this.onResize(this.scratchRender.getNativeSize());
        this.runningSkeleton = new Set();
        this.frameCall = null;
    }

    isDirty () {
        return this.runningSkeleton.size > 0;
    }

    onNativeSizeChanged (event) {
        this.onResize(event.newSize);
    }

    getNativeSize () {
        return this._size;
    }

    onResize (nativeSize) {
        const [width, height] = nativeSize;

        // tw: do not resize if new size === old size
        if (this._size && this._size[0] === width && this._size[1] === height) {
            return;
        }

        this._size = nativeSize;
        // tw: use native size for Drawable positioning logic
        // this._rotationCenter[0] = this._nativeSize[0] / 2;
        // this._rotationCenter[1] = this._nativeSize[1] / 2;

        const {renderer} = this;
        // const viewportWidth = renderer.canvas.width;
        // const viewportHeight = renderer.canvas.height;

        const viewportWidth = width;
        const viewportHeight = height;
        renderer.camera.position.x = viewportWidth / 2;
        renderer.camera.position.y = viewportHeight / 2;
        renderer.camera.setViewport(viewportWidth, viewportHeight);
        console.log('onResize viewport', viewportWidth, viewportHeight);
    }

    getAtlasFileByJSONFile (jsonFile) {
        return this.atlasCache[jsonFile];
    }

    loadAtlasAndJson (atlasKey, jsonFile) {
        const loadTextureAtlas = new Promise((resolve, reject) => {
            const success = (path, asset) => {

                resolve();
            };
            const error = (path, message) => {
                console.error('loadSpineAsset error', path);
                console.error('                    ', message);
                reject(message);
            };
            this.assetManager.loadTextureAtlas(atlasKey, success, error);
        }).catch(e => {
            console.log(e);
        });

        const loadJson = new Promise((resolve, reject) => {
            const success = (path, asset) => {
                this.atlasCache[jsonFile] = atlasKey;
                resolve();
            };
            const error = (path, message) => {
                console.error('loadSpineAsset error', path);
                console.error('                    ', message);
                reject(message);
            };
            this.assetManager.loadJson(jsonFile, success, error);
        }).catch(e => {
            console.log(e);
        });
        return Promise.all([loadTextureAtlas, loadJson]);
    }

    getSkeletonNamesForJSON (jsonFile) {
        if (!jsonFile) return null;
        let skeletonJSONObj = this.jsonCache[jsonFile];
        if (!skeletonJSONObj) {
            skeletonJSONObj = this.assetManager.require(jsonFile);
            this.jsonCache[jsonFile] = skeletonJSONObj;
        }
        if (!skeletonJSONObj) {
            console.warn(`Gandi: skeleton json file not loaded - ${jsonFile}`);
            return null;
        }
        return Object.keys(skeletonJSONObj);
    }

    async createSkeleton (atlasKey, jsonFile, skeletonName) {
        await this.loadAtlasAndJson(atlasKey, jsonFile, skeletonName);

        const atlas = this.assetManager.require(atlasKey);
        if (!atlas) {
            console.warn(`Gandi: skeleton atlas data not loaded - ${atlasKey}`);
            return null;
        }

        let skeletonJSONObj = this.jsonCache[jsonFile];
        if (!skeletonJSONObj) {
            skeletonJSONObj = this.assetManager.require(jsonFile);
        }

        if (!skeletonJSONObj) {
            console.warn(`Gandi: skeleton json file not loaded - ${jsonFile}`);
            return null;
        }

        const atlasLoader = new Spine.AtlasAttachmentLoader(atlas);
        const skeletonLoader = new Spine.SkeletonJson(atlasLoader);

        if (!skeletonLoader) {
            console.warn(`Spine: No skeleton data for: ${atlasKey}`);
            return null;
        }
        if (Object.hasOwnProperty.call(skeletonJSONObj, skeletonName) === false) {
            console.warn(`Spine: No skeleton data for: ${skeletonName}`);
            // return null;
        }

        const skeletonData = skeletonLoader.readSkeletonData(skeletonJSONObj[skeletonName]);

        const skeleton = new Spine.Skeleton(skeletonData);

        return {
            skeletonData: skeletonData,
            skeleton: skeleton,
            preMultipliedAlpha: skeleton.preMultipliedAlpha
        };
    }

    createAnimationState (skeleton) {
        const stateData = new Spine.AnimationStateData(skeleton.data);
        const state = new Spine.AnimationState(stateData);
        return {stateData: stateData, state: state};
    }

    updateTime () {
        this.timeKeeper.update();
    }

    rendererSkeleton (skeleton, animationState) {
        // this.onResize();
        animationState.update(this.timeKeeper.delta);
        animationState.apply(skeleton);
        skeleton.updateWorldTransform();
        this.renderer.begin();
        this.renderer.drawSkeleton(skeleton, true);
        if (this.drawDebug) {
            console.log('rendererSkeleton');
            this.renderer.drawSkeletonDebug(skeleton, true);
            const {x, y, width, height} = skeleton.getBoundsRect();
            // this.renderer.rectLine(false, x, y, x + width, y + height, 1, new Spine.Color(1, 1, 0, 1));
            this.renderer.rect(false, x, y, width, height, new Spine.Color(0, 0, 1, 1));
        }
        this.renderer.end();
    }

    removeRunningSkeleton (skin) {
        this.runningSkeleton.delete(skin);
    }

    addRunningSkeleton (skin) {
        if (!this.runningSkeleton.has(skin)) {
            this.runningSkeleton.add(skin);
        }
    }

    stopRenderSkeleton () {
        this.runningSkeleton.forEach(skin => {
            skin.clearTracks();
        });
        this.runningSkeleton.clear();
    }

    // TODO: implement pause/resume
    pauseRenderSkeleton () {}
    resumeRenderSkeleton () {}
}
module.exports = SpineManager;
