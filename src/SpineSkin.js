// const twgl = require('twgl.js');

const Skin = require('./Skin');

const SpineEvents = {
    COMPLETE: 'SpineEvents.complete',
    DISPOSE: 'SpineEvents.dispose',
    END: 'SpineEvents.end',
    EVENT: 'SpineEvents.event',
    INTERRUPTED: 'SpineEvents.interrupted',
    START: 'SpineEvents.start'
};

class SpineSkin extends Skin {
    constructor (id, spineManager) {
        super(id);

        /** @type {!int} */
        this._costumeResolution = 1;

        /** @type {Array<int>} */
        this._textureSize = [0, 0];
        this.lastFrameTime = 0;

        /** spine.skeleton */
        this.spine = spineManager;
        this.skeleton = null;
        this.animationState = null;
        this.preMultipliedAlpha = false;
        this.originPosition = [0, 0];
        this.originSize = [200, 200];
        this._size = this.originSize;
        this.originScale = [1, 1]; //  scale skeleton size to originSize
        this.originRotation = 0;
        // this.waitingForCompleteTrack = new Set();
        this.eventListeners = new Set();
        this.EVENT = SpineEvents;
    }

    dispose () {
        this.clearTracks();
        super.dispose();
    }

    getAABB () {
        if (this.skeleton) {
            return this.skeleton.getBoundsRect();
        }
        return null;
    }

    get size () {
        return this._size;
    }

    set size (value) {
        this._size = value;
    }

    setSkin (skinName) {
        this.skeleton.setSkinByName(skinName);
    }

    // TODO - not used
    //
    // addWaitForCompleteTrack (track) {
    //     this.waitingForCompleteTrack.add(track);
    // }
    // removeWaitForCompleteTrack (track) {
    //     this.waitingForCompleteTrack.delete(track);
    // }
    // clearAllWaitForCompleteTrack () {
    //     this.waitingForCompleteTrack.clear();
    // }

    async setSkeleton (atlasDataKey, JSONFile, skeletonName, animationName, loop) {
        const skData = await this.spine.createSkeleton(atlasDataKey, JSONFile, skeletonName);

        this.preMultipliedAlpha = skData.preMultipliedAlpha;

        const skeleton = skData.skeleton;
        this.skeleton = skeleton;
        this.originPosition = null; // reset originPosition

        //  AnimationState
        const aniData = this.spine.createAnimationState(skeleton);

        if (this.animationState) {
            this.animationState.clearListeners();
            this.animationState.clearListenerNotifications();
        }

        this.animationState = aniData.state;

        this.animationState.addListener({
            event: this.onEvent.bind(this),
            complete: this.onComplete.bind(this),
            start: this.onStart.bind(this),
            end: this.onEnd.bind(this),
            dispose: this.onDispose.bind(this),
            interrupted: this.onInterrupted.bind(this)
        });

        if (animationName) {
            this.setAnimation(0, animationName, loop);
        }

        this.root = this.getRootBone();
        this.originRotation = this.root.rotation;

        // if (this.root) {
        //     //  +90 degrees to account for the difference in Spine vs. Phaser rotation
        //     this.root.rotation = RadToDeg(CounterClockwise(this.rotation)) + 90;
        // }
        this.animationState.apply(skeleton);
        skeleton.setSkin();
        // skeleton.setSkinByName('Assassin');
        skeleton.setToSetupPose();
        skeleton.updateCache();
        this.resetSize();
        this.emit(Skin.Events.WasAltered);
    }

    removeListener (event, callback) {
        super.removeListener(event, callback);
        this.eventListeners.delete(event);
    }

    addListener (event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.add(event);
            super.addListener(event, callback);
        }
    }

    // refresh () {
    //     // if (this.root)
    //     // {
    //     //     //  +90 degrees to account for the difference in Spine vs. Phaser rotation
    //     //     this.root.rotation = RadToDeg(CounterClockwise(this.rotation)) + 90;
    //     // }

    //     this.updateSize();
    //     this.skeleton.updateCache();
    // }

    setPosition ([x, y]) {
        if (this.skeleton) {
            this.skeleton.x = this.originPosition[0] + x;
            this.skeleton.y = this.originPosition[1] + y;
        }
    }

    updateSizeWithScale (scaleX, scaleY) {
        const [w, h] = this.size;
        const sw = this.originSize[0] * scaleX;
        const sh = this.originSize[1] * scaleY;
        const dy = -(sh - h) / 2;
        this.originPosition[1] += dy;

        // const dx = -(sw - w) / 2;
        // this.originPosition[0] += dx;

        this.size = [sw, sh];
    }

    setScale ([scaleX, scaleY]) {
        if (this.skeleton) {
            this.updateSizeWithScale(scaleX, scaleY);
            this.skeleton.scaleX = this.originScale[0] * scaleX;
            this.skeleton.scaleY = this.originScale[1] * scaleY;
        }
    }

    setDirection (rotation) {
        this.root.rotation = this.originRotation + rotation;
    }

    resetSize () {
        const {skeleton, spine} = this;
        this.originScale = [1, 1];
        skeleton.scaleX = this.originScale[0];
        skeleton.scaleY = this.originScale[1];
        skeleton.updateWorldTransform();
        const skeletonBounds = skeleton.getBoundsRect();

        const [width, height] = this.originSize;

        let skScale = 1;
        const scaleX = width / skeletonBounds.width;
        const scaleY = height / skeletonBounds.height;
        skScale = Math.min(scaleX, scaleY);
        const [stageWidth, stageHeight] = spine.getNativeSize();
        // make center as origin point, and position to stage center
        const center = [(stageWidth / 2), (stageHeight / 2)];
        this.originPosition = [
            -((skeletonBounds.x + (skeletonBounds.width / 2)) * skScale) + center[0],
            -((skeletonBounds.y + (skeletonBounds.height / 2)) * skScale) + center[1]];
        this.originScale = [skScale, skScale];
    }

    getRootBone () {
        return this.skeleton.getRootBone();
    }

    getBoneList () {
        const output = [];
        const skeletonData = this.skeleton.data;
        if (skeletonData) {
            for (let i = 0; i < skeletonData.bones.length; i++) {
                output.push(skeletonData.bones[i].name);
            }
        }
        return output;
    }

    getSkinList () {
        const output = [];
        const skeletonData = this.skeleton.data;
        if (skeletonData) {
            for (let i = 0; i < skeletonData.skins.length; i++) {
                output.push(skeletonData.skins[i].name);
            }
        }
        return output;
    }

    getSlotList () {
        const output = [];
        const skeleton = this.skeleton;
        for (let i = 0; i < skeleton.slots.length; i++) {
            output.push(skeleton.slots[i].data.name);
        }
        return output;
    }

    getBoneAttribute (boneName, attrName) {
        if (boneName) {
            const bone = this.findBone(boneName);
            if (bone) {
                switch (attrName) {
                case 'worldY':
                    return bone[attrName] - this.originPosition[1];
                case 'worldX':
                    return bone[attrName] - this.originPosition[0];
                default:
                    return bone[attrName];
                }
            }
        }
        return '';
    }

    findBone (boneName){
        return this.skeleton.findBone(boneName);
    }
    findBoneIndex (boneName) {
        return this.skeleton.findBoneIndex(boneName);
    }
    findSlot (slotName) {
        return this.skeleton.findSlot(slotName);
    }
    findSlotIndex (slotName) {
        return this.skeleton.findSlotIndex(slotName);
    }
    findSkin (skinName) {
        return this.skeletonData.findSkin(skinName);
    }
    findEvent (eventDataName) {
        return this.skeletonData.findEvent(eventDataName);
    }

    getAnimationList () {
        const output = [];
        const skeletonData = this.skeleton.data;
        if (skeletonData) {
            for (let i = 0; i < skeletonData.animations.length; i++) {
                output.push(skeletonData.animations[i].name);
            }
        }
        return output;
    }

    setToSetupPose () {
        if (this.skeleton) {
            this.skeleton.setToSetupPose();
        }
    }

    getCurrentAnimation (trackIndex = 0) {
        const current = this.animationState.getCurrent(trackIndex);
        if (current) {
            return current.animation;
        }
        return null;
    }

    getCurrentAnimationName (trackIndex = 0) {
        const current = this.getCurrentAnimation(trackIndex);
        if (current) {
            return current.name;
        }
        return null;
    }

    play (animationName, loop, ignoreIfPlaying) {
        this.setAnimation(0, animationName, loop, ignoreIfPlaying);
        return this;
    }

    findAnimation (animationName) {
        return this.skeleton.data.findAnimation(animationName);
    }

    setAnimation (
        trackIndex,
        animationName,
        loop = false,
        ignoreIfPlaying = false
    ) {
        // if (this.waitingForCompleteTrack.has(trackIndex)) return;
        if (ignoreIfPlaying && this.animationState) {
            const currentTrack = this.animationState.getCurrent(trackIndex);
            if (
                currentTrack &&
                currentTrack.animation.name === animationName &&
                !currentTrack.isComplete()
            ) {
                return;
            }
        }
        if (this.findAnimation(animationName)) {
            this.spine.addRunningSkeleton(this);
            return this.animationState.setAnimation(trackIndex, animationName, !!loop);
        }
    }

    addAnimation (trackIndex, animationName, loop = false, delay = 0) {
        return this.animationState.addAnimation(trackIndex, animationName, loop, delay);
    }

    setEmptyAnimation (trackIndex, mixDuration) {
        return this.animationState.setEmptyAnimation(trackIndex, mixDuration);
    }

    clearTracks () {
        this.animationState.clearTracks();
        this.spine.removeRunningSkeleton(this);
    }

    clearTrack (trackIndex) {
        this.animationState.clearTrack(trackIndex);
        const isMore = this.animationState.tracks.find(track => Boolean(track));
        if (!isMore) {
            this.spine.removeRunningSkeleton(this);
        }
        return isMore;
    }

    onComplete (entry) {
        // console.log('onComplete', entry);
        this.emit(SpineEvents.COMPLETE, {entry, skin: this});
    }
    onDispose (entry) {
        // console.log('onDispose', entry);
        this.emit(SpineEvents.DISPOSE, {entry, skin: this});
    }
    onEnd (entry) {
        // console.log('onEnd', entry);
        this.emit(SpineEvents.END, {entry, skin: this});
    }
    onEvent (entry, event) {
        // console.log('onEvent', entry);
        this.emit(SpineEvents.EVENT, {entry, skin: this, event});
    }
    onInterrupted (entry) {
        // console.log('onInterrupted', entry);
        this.emit(SpineEvents.INTERRUPTED, {entry, skin: this});
    }
    onStart (entry) {
        // console.log('onStart', entry);
        this.emit(SpineEvents.START, {entry, skin: this});
    }

    updateTransform (drawable) {
        if (drawable._skinScaleDirty) {
            // console.log('need scale to ', drawable._scale);
            this.setScale([drawable._scale[0] / 100, drawable._scale[1] / 100]);
        }
        if (drawable._rotationTransformDirty) {
            // update direction
            // console.log('need update direction to ', drawable._direction);
            this.setDirection(90 - drawable._direction);
        }
        if (drawable._transformDirty) {
            // console.log('need _position to ', drawable._position);
            this.setPosition(drawable._position);
        }
        if (drawable._rotationCenterDirty) {
            // console.log('need update _rotationCenter to ');
        }

        // let drawable calculate the matrix if needed
        // make sure the matrix is updated when use normal scratch render
        // and update dirty flag
        // TODO: directly use the matrix from drawable
        drawable.getUniforms();
    }

    render (drawable, drawableScale, projection, opts){
        const {skeleton, animationState: state} = this;
        if (skeleton && state) {
            this.updateTransform(drawable);
            this.spine.rendererSkeleton(skeleton, state);
        }
    }

    // /**
    //  * Dispose of this object. Do not use it after calling this method.
    //  */
    // dispose () {
    //     if (this._texture) {
    //         this._renderer.gl.deleteTexture(this._texture);
    //         this._texture = null;
    //     }
    //     super.dispose();
    // }

    /**
     * @param {Array<number>} scale - The scaling factors to be used.
     * @return {WebGLTexture} The GL texture representation of this skin when drawing at the given scale.
     */
    // eslint-disable-next-line no-unused-vars
    getTexture (scale) {
        return 1;
        return this._texture || super.getTexture();
    }
}

module.exports = SpineSkin;
