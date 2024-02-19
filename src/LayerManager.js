/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */
const LayerFolder = require('./LayerFolder');
const log = require('./util/log');

class LayerManager {
    constructor (renderer) {
        this._renderer = renderer;
        /**
         * 是否启用自动图层排序
         * @type {boolean}
         * @private
         */
        this._layerSortingEnabled = false;

        /**
         * 排序顺序，1升序/-1降序
         * @type {1|-1}
         * @private
         */
        this._order = 1;

        /**
         * 容纳所有内容的根文件夹
         * @type {LayerFolder}
         */
        this.rootFolder = new LayerFolder('__ROOT_FOLDER__', renderer, true);
        /**
         * 创建 drawable时加入的文件夹 (默认rootFolder)
         * @type {LayerFolder}
         */
        this.defaultFolderDrawableAddTo = this.rootFolder;

        /**
         * 缓存上一次排序好的drawList
         * @type {Array<number>}
         */
        this._sortedDrawList = [];

        /**
         * 保存drawList的分隔信息（用于shader的分层渲染）
         * - 每一项为 [type, value, listIdx]，标记一个shader的分界点
         *   - [0] - type - 0(值分割)|1(角色分割)|2(文件夹分割)
         *   - [1] - value = layerIdx|drawID|[layerIdx, folder] - 分割的排序值|分割角色ID|[分割的排序值, 所属folder]
         *   - [2] - listIdx - 根据[0]、[1]计算的分割位置在列表中的位置
         * @type {[[0|1|2, number|number|string, number]]}
         */
        this.shaderSeparators = [
            [0, Infinity, Infinity]
        ];
    }

    /**
     * 是否启用图层排序
     * @type {boolean}
     */
    get layerSortingEnabled () {
        return this._layerSortingEnabled;
    }

    /**
     * 设置不受shader影响的最小的layerIdx|角色ID|文件夹名称
     * @param {0|1|2} type 0(值分割)|1(角色分割)|2(文件夹分割)
     * @param {number|string} sepValue 分割的layer排序值|分割角色ID|分割文件夹名称
     */
    setMinUnshadedInfo (type, sepValue) {
        const sep = this.shaderSeparators[0];
        if (sep[0] !== type || sep[1] !== sepValue) {
            sep[0] = type;
            sep[1] = sepValue;
            LayerFolder.visualDirty = true;
            this.separatorChanged = true;
        }
    }

    /**
     * @returns {boolean} 是否需要重新图层排序
     */
    get needResort () {
        return this.layerSortingEnabled && LayerFolder.visualDirty;
    }

    /**
     * 将 drawList 中 sprite 图层进行排序并返回
     * @param {Array<number>} drawList 当前要绘制的drawableID的列表
     * @param {number} startIdx spriteLayer的开始索引
     * @param {number} endIdx spriteLayer的结束索引
     * @returns {Array<number>} 排序后的 drawList
     */
    getSortedDrawListAndUpdateSeparators (drawList, startIdx, endIdx) {
        // 将所有dirty文件夹进行排序
        if (this._layerSortingEnabled) LayerFolder.sortAllDirtyFolders(this._order);
        // 发生了排序/角色增减等图层变动
        if (LayerFolder.visualDirty) {
            // 获取排序后的内容
            const newList = [];
            // 将之前的元素直接加入数组
            for (let i = 0; i < startIdx; i++) newList.push(drawList[i]);
            this.rootFolder.getItemsAndSeparators(newList, this.shaderSeparators, this._order);
            // 将之后的元素直接加入数组
            for (let i = endIdx; i < drawList.length; i++) newList.push(drawList[i]);
            this._sortedDrawList = newList;
            // 发生了图层变动，将 renderer的dirty设为true
            this._renderer.dirty = true;
            LayerFolder.visualDirty = false;
        }
        return this._sortedDrawList;
    }

    /**
     * 开/关图层排序功能
     * @param {boolean} on 是否开启true/false
     */
    enableLayerSorting (on) {
        if (on) {
            this._layerSortingEnabled = true;
        } else {
            this._layerSortingEnabled = false;
        }
    }

    /**
     * 设置排序规则（升序/降序）
     * @param {boolean} ascending 是否升序
     */
    setSortInAscendingOrder (ascending) {
        const oldOrder = this._order;
        this._order = ascending ? 1 : -1;
        // 排序规则变化
        if (oldOrder * this._order < 0) {
            // 强制重新排序所有文件夹
            LayerFolder.sortAllDirtyFolders(this._order, true);
            // 反转 sep 的切割位置
            this.shaderSeparators.forEach(sep => {
                // 反转
                if (sep[0] === 0) sep[1] *= -1;
                else if (sep[0] === 2) sep[1][0] *= -1;
            });
        }
    }

    get order () {
        return this._order;
    }

    /**
     * 创建一个folder挂在parentFolder上
     * @param {string} name folder名
     * @param {LayerFolder} parentFolder 所属父folder
     * @returns {LayerFolder} 创建的文件夹
     */
    createLayerFolder (name, parentFolder = this.rootFolder) {
        if (!parentFolder) return null;
        if (parentFolder._subFoldersHaveUniqueName) {
            const existingFolder = parentFolder.nameToSubFolder[name];
            if (existingFolder) {
                log.warn(`Subfolder with name ${name} already exists in the parent folder.`);
                return existingFolder;
            }
        }
        const newFolder = new LayerFolder(name, this._renderer);
        parentFolder.add(newFolder);
        return newFolder;
    }

    /**
     * 刷新separators信息。目前仅用于未开启图层排序时
     * @param {Array<number>} drawList drawList
     */
    refreshShaderSeparators (drawList) {
        if (this._renderer.dirty || this.separatorChanged) {
            LayerFolder.initSeparator(this.shaderSeparators, this._order);
            for (let i = 0; i < drawList.length && this.shaderSeparators.restSeps > 0; i++) {
                LayerFolder.checkAndSetSeparator(
                    this.shaderSeparators,
                    i,
                    drawList[i],
                    true,
                    this._order,
                    this._renderer,
                    this.rootFolder
                );
            }
            this.separatorChanged = false;
        }
    }

    // /**
    //  * 根据名称，获得rootFolder的子文件夹
    //  * @param {string} name folder名
    //  * @returns {LayerFolder} 文件夹
    //  */
    // getLayerFolderByName (name) {
    //     return this.rootFolder.nameToSubFolder[name];
    //     // const items = this.rootFolder.items;
    //     // return items.find(item => item instanceof LayerFolder && item.name === name);
    // }

    // /**
    //  * 获得rootFolder的所有子文件夹的名字列表（可用于扩展下拉菜单）
    //  * @returns {Array<string>} 文件夹名字列表
    //  */
    // getAllFoldersNamesInRoot () {
    //     return Object.keys(this.rootFolder.nameToSubFolder);
    //     // const items = this.rootFolder.items;
    //     // return items.filter(item => item instanceof LayerFolder).map(item => item.name);
    // }
}

module.exports = LayerManager;
