/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */

/**
 * 文件夹项：drawableID 或 子文件夹
 * @typedef {number|LayerFolder} folderItem
 */

/**
 * 图层文件夹，容纳一系列drawableID或子文件夹
 */
class LayerFolder {
    /**
     * 创建文件夹
     * @param {string} name 文件夹名称
     * @param {Renderer} renderer 传入renderer实例
     * @param {boolean} subFoldersHaveUniqueName 文件夹的子文件夹是否不能重名
     */
    constructor (name, renderer, subFoldersHaveUniqueName = false) {
        // this._layerManager = layerManager;
        this._renderer = renderer;
        /**
         * 文件夹名称（也作为文件夹id，同一个父文件夹内，两文件夹不能重名）
         * @type {string}
         */
        this.name = name;
        /**
         * 文件夹的内容，每一项可以是 drawableID 或 子文件夹
         * @type {Array<folderItem>}
         * @private
         */
        this._items = [];
        // 如果子文件夹不能重名，为子文件夹建立名字的索引
        if (subFoldersHaveUniqueName) {
            this._subFoldersHaveUniqueName = true;
            /**
             * 建立子文件夹的 名字→文件夹 的映射
             * @type {{[folderName: string]: LayerFolder}}
             */
            this.nameToSubFolder = Object.create(null);
        }
        /**
         * 文件夹图层排序值
         * @type {number}
         * @private
         */
        this._layerIndex = 0;
        /**
         * 文件夹内容是否打乱，需要排序
         * @type {boolean}
         * @private
         */
        this._orderDirty = false;
        /**
         * 指向父文件夹
         * @type {LayerFolder}
         */
        this.parent = null;

    }

    /**
     * 记录需要排序的文件夹
     * @type {Array<LayerFolder>}
     */
    static orderDirtyFolders = [];
    /**
     * 是否有文件夹发生了会导致render变化的改变（如发生排序/增删）
     * @type {boolean}
     */
    static visualDirty = false;

    /**
     * 将所有标记为dirty的文件夹进行排序
     * @param {1|-1} sortOrder 排序顺序：1升序/-1降序
     */
    static sortAllDirtyFolders (sortOrder = 1) {
        // 记录是否有被打乱的文件夹
        LayerFolder.orderDirtyFolders.forEach(folder => {
            folder.sortIfOrderDirty(sortOrder, false);
        });
        LayerFolder.orderDirtyFolders = [];
    }

    get items () {
        return this._items;
    }

    /**
     * 文件夹内容是否打乱，需要排序
     * @returns {boolean} dirty
     */
    get orderDirty () {
        return this._orderDirty;
    }

    /**
     * 从列表删除
     * @param {Array} list 列表
     * @param {any} item 项目
     * @private
     */
    __removeFromList (list, item) {
        const index = list.indexOf(item);
        if (index !== -1) {
            list.splice(index, 1);
        }
    }

    /**
     * 标记是否dirty（是否需要重新排序）
     * @param {boolean} dirty 是否dirty
     * @param {boolean} removeFromDirtyList 清除dirty标记时，是否移出dirtyList
     */
    setOrderDirty (dirty, removeFromDirtyList = false) {
        if (dirty) {
            // 记录等待排序的folder
            if (!this._orderDirty) {
                LayerFolder.orderDirtyFolders.push(this);
            }
            this._orderDirty = true;
            this.itemsChanged = true;
        } else {
            this._orderDirty = false;
            if (removeFromDirtyList) {
                this.__removeFromList(LayerFolder.orderDirtyFolders, this);
            }
        }
    }

    get layerIndex () {
        return this._layerIndex;
    }

    set layerIndex (idx) {
        if (this._layerIndex !== idx) {
            this._layerIndex = idx;
            // 父文件夹标记为dirty
            this.parent.setOrderDirty(true);
        }
    }

    /**
     * 向文件夹加入item（如果item之前属于其他文件夹，先将item移出旧文件夹）
     * @param {folderItem} item 内容（drawableID/文件夹）
     * @param {boolean} deleteEmptyFolder 将item移出旧文件夹后，如果文件夹为空，是否删除
     * @param {boolean} sortImmediately 加入内容后是否立即排序
     */
    // TODO: 完善加入文件夹时立即排序的方式
    add (item, deleteEmptyFolder = false, sortImmediately = false) {
        // 不能把自己加入文件夹
        if (item === this) return;
        // item 的 parent
        const parent = item instanceof LayerFolder ?
            item.parent : this._renderer.getDrawableLayerFolder(item);
        // item 已在当前文件夹，退出
        if (parent === this) return;
        if (item instanceof LayerFolder && this._subFoldersHaveUniqueName) {
            // 检查是否已有重名文件夹
            // TODO: 文件夹重名处理（目前是直接退出）
            if (this.nameToSubFolder[item.name]) return;
        }
        // 从旧文件夹移除角色
        if (parent) parent.remove(item, deleteEmptyFolder);

        // 更新父文件夹
        if (item instanceof LayerFolder) {
            item.parent = this;
            // 记录 文件夹名 → 文件夹
            if (this._subFoldersHaveUniqueName) this.nameToSubFolder[item.name] = item;
        } else {
            this._renderer.setDrawableLayerFolder(item, this);
        }
        // 加入当前文件夹
        this._items.push(item);
        LayerFolder.visualDirty = true;
        this.setOrderDirty(true);
    }

    /**
     * 从文件夹移除内容
     * @param {folderItem} item 内容（drawableID/文件夹）
     * @param {boolean} deleteEmptyFolder 移除内容后，如果文件夹为空，是否删除文件夹
     */
    remove (item, deleteEmptyFolder = false) {
        const index = this._items.indexOf(item);
        if (index !== -1) {
            // 更新item父文件夹
            if (item instanceof LayerFolder) {
                item.parent = null;
                if (this._subFoldersHaveUniqueName) delete this.nameToSubFolder[item.name];
            } else {
                this._renderer.setDrawableLayerFolder(item, null);
            }
            // 将item移出文件夹
            this._items.splice(index, 1);
            LayerFolder.visualDirty = true;
            if (deleteEmptyFolder && this._items.length === 0) {
                // 如果自己为空文件夹，删除自己
                if (this.parent) this.parent.remove(this, true); // 递归删除空文件夹
            }
        }
    }

    /**
     * 修改文件夹中drawable的位置（用于兼容原版的图层操作）
     * @param {folderItem} item 要更改位置的item
     * @param {1|-1} sortOrder 排序顺序：1升序/-1降序
     * @param {number} order 要设置的位置
     * @param {boolean} isRelative 是否是相对位置（如前移/后移x层）
     */
    changeDrawableOrder (item, sortOrder, order, isRelative = false) {
        // 无效的order值
        if (!order && order !== 0) return;
        // 文件夹中至少有两个内容才能改变顺序
        if (this._items.length < 2) return;
        // 将文件夹排序
        this.sortIfOrderDirty(sortOrder, true);
        const myIdx = this._items.indexOf(item);
        // 目标在文件夹内
        if (myIdx !== -1) {
            this._items.splice(myIdx, 1);
            LayerFolder.visualDirty = true;
            // Determine new index.
            let IdxToInsert = order;
            if (isRelative) IdxToInsert += myIdx;

            // 移到开头
            if (IdxToInsert <= 0) {
                this._items.unshift(item);
                const newLayerIdx = this.getLayerIndexForItem(this._items[0]) - (0.1 * sortOrder);
                this.setLayerIndexForItem(item, newLayerIdx);
            } else if (IdxToInsert > this._items.length - 1) {
            // 移到末尾
                this._items.push(item);
                const newLayerIdx = this.getLayerIndexForItem(this._items[0]) + (0.1 * sortOrder);
                this.setLayerIndexForItem(item, newLayerIdx);
            } else {
            // 其他情况
                // 更新排序值，取平均值
                const v1 = this.getLayerIndexForItem(this._items[IdxToInsert]);
                const v2 = this.getLayerIndexForItem(this._items[IdxToInsert - 1]);
                const newLayerIdx = (v1 + v2) / 2;
                this.setLayerIndexForItem(item, newLayerIdx);
                // 插入到中间
                this._items.splice(IdxToInsert, 0, item);
            }
        }
    }

    /**
     * get layerIndex of item (drawableID or folder)
     * @param {folderItem} item drawableID or folder
     * @param {Renderer} renderer renderer
     * @returns {number} layerIndex
     */
    getLayerIndexForItem (item, renderer = this._renderer) {
        if (item instanceof LayerFolder) {
            return item.layerIndex;
        }
        return renderer.getDrawableLayerIndex(item);
    }

    /**
     * set layerIndex of item (drawableID or folder)
     * @param {folderItem} item drawableID or folder
     * @param {number} value 值
     * @param {boolean} changing 是否是增加
     */
    setLayerIndexForItem (item, value, changing = false) {
        const newValue = (changing * this.getLayerIndexForItem(item)) + value;
        if (item instanceof LayerFolder) {
            item.layerIndex = newValue;
        } else {
            this._renderer.setDrawableLayerIndex(item, newValue);
        }
    }

    /**
     * 排序文件夹（如果满足 orderDirty = true）
     * @param {1|-1} sortOrder 排序顺序：1升序/-1降序
     * @param {boolean} removeFromDirtyList 清除dirty标记时，是否移出dirtyList
     * @param {boolean} needSorting 是否强制排序
     */
    sortIfOrderDirty (sortOrder = 1, removeFromDirtyList = false, needSorting = this.orderDirty) {
        if (needSorting) {
            this._items.sort((a, b) => {
                const idx1 = this.getLayerIndexForItem(a);
                const idx2 = this.getLayerIndexForItem(b);
                return sortOrder * (idx1 - idx2);
            });
            LayerFolder.visualDirty = true;
            this.setOrderDirty(false, removeFromDirtyList);
        }
    }

    static initSeparator (separators) {
        for (let i = 0; i < separators.length; i++) {
            const sep = separators[i];
            sep[2] = Infinity; // 初始化分割位置为 Infinity
            sep[3] = true; // sep是否需要读取
        }
        // 剩余的要更新的sep数量
        separators.restSeps = separators.length;
    }

    static checkAndSetSeparator (separators, i, item, root, sortOrder, renderer) {
        if (separators.restSeps === 0) return;
        for (let j = 0; j < separators.length; j++) {
            const sep = separators[j];
            if (sep[3]) {
                switch (sep[0]) {
                case 0: {
                // 值
                    // itemIdx >= sepIdx，标记当前项位置为分割点
                    const layerIdx = item instanceof LayerFolder ?
                        item.layerIndex : renderer.getDrawableLayerIndex(item);
                    if (root && sortOrder * (layerIdx - sep[1]) >= 0) {
                        sep[2] = i;
                        sep[3] = false;
                        separators.restSeps--;
                    }
                    break;
                }
                case 1:
                // 角色ID
                    if (item === sep[1]) {
                        sep[2] = i;
                        sep[3] = false;
                        separators.restSeps--;
                    }
                    break;
                case 2:
                // 文件夹名
                    if (root && (item instanceof LayerFolder) && item.name === sep[1]) {
                        sep[2] = i;
                        sep[3] = false;
                        separators.restSeps--;
                    }
                    break;
                default:
                }
            }
        }
    }

    /**
     * 递归地获取当前文件夹（包括子文件夹）的内容，并展平为一个一维列表。
     * 同时更新 separators 信息（比如从哪个idx开始不受雷神shader影响
     * @param {Array<number>} list (选填) 初始列表
     * @param {Array} separators (选填) 要更新的separators信息
     * @param {1|-1} sortOrder 排序顺序：1升序/-1降序
     * @param {boolean} root 是否是第一层
     * @returns {Array <Array<number>, Array>} [list, separators]
     */
    getItemsAndSeparators (list = [], separators = null, sortOrder = 1, root = true) {
        if (root && separators) {
            LayerFolder.initSeparator(separators);
        }
        for (let i = 0; i < this._items.length; i++) {
            const item = this._items[i];
            // 更新separators信息
            if (separators) {
                LayerFolder.checkAndSetSeparator(separators, list.length, item, root, sortOrder, this._renderer);
            }
            // item 是文件夹，递归地将内容加入 list
            if (item instanceof LayerFolder) {
                item.getItemsAndSeparators(list, separators, sortOrder, false);
            } else {
            // item 是 drawableID，加入列表
                list.push(item);
            }
        }
        return [list, separators];
    }
}

module.exports = LayerFolder;
