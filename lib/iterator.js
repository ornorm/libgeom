/** @babel */
import * as util from "hjs-core/lib/util";

export class PathIterator {

    constructor() {

    }

    currentSegment(coords) {
        return null;
    }

    getWindingRule() {
        return 0;
    }

    isDone() {
        return false;
    }

    next() {
        return null;
    }

}
PathIterator.WIND_EVEN_ODD = 0;
PathIterator.WIND_NON_ZERO = 1;
PathIterator.SEG_MOVETO = 0;
PathIterator.SEG_LINETO = 1;
PathIterator.SEG_QUADTO = 2;
PathIterator.SEG_CUBICTO = 3;
PathIterator.SEG_CLOSE = 4;

export class Iterator extends PathIterator {

    constructor({shape = null} = {}) {
        super();
        this.pointIdx = 0;
        this.typeIdx = 0;
        this.path = shape;
    }

    getWindingRule() {
        return this.path.getWindingRule();
    }

    isDone() {
        return (this.typeIdx >= this.path.numTypes);
    }

    next() {
        let type = this.path.pointTypes[this.typeIdx++];
        this.pointIdx += Iterator.curvecoords[type];
    }

}
Iterator.curvecoords = [2, 2, 4, 6, 0];

export class CopyIterator extends Iterator {

    constructor({shape = null} = {}) {
        super({shape});
        if (shape) {
            this.coords = this.path.coords;
        }
    }

    currentSegment(coords) {
        let type = this.path.pointTypes[this.typeIdx];
        let numCoords = Iterator.curvecoords[type];
        if (numCoords > 0) {
            for (let i = 0; i < numCoords; i++) {
                coords[i] = this.coords[this.pointIdx + i];
            }
        }
        return type;
    }

}

export class TxIterator extends Iterator {

    constructor({shape = null, transform = null} = {}) {
        super({shape});
        this.transform = transform;
        if (shape) {
            this.coords = shape.coords;
        }
    }

    currentSegment(coords) {
        let type = this.path.pointTypes[this.typeIdx];
        let numCoords = Iterator.curvecoords[type];
        if (numCoords > 0) {
            this.transform.transform(this.coords, this.pointIdx, coords, 0, numCoords / 2);
        }
        return type;
    }

}

export class FlatteningPathIterator extends PathIterator {

    constructor({flatness = NaN, limit = NaN, shape = null} = {}) {
        super({shape});
        this.limit = 10;
        this.hold = new Array(14);
        this.curx = this.cury = this.movx = this.movy = this.squareflat = this.holdType = this.holdEnd = this.holdIndex = this.levelIndex = 0;
        if (!isNaN(flatness)) {
            if (flatness < 0.0) {
                throw new RangeError("IllegalArgumentException flatness must be >= 0");
            }
            this.squareflat = flatness * flatness;
        }
        if (!isNaN(limit)) {
            if (limit < 0) {
                throw new RangeError("IllegalArgumentException limit must be >= 0");
            }
            this.limit = limit;
        }
        this.levels = new Array(this.limit + 1);
        this.done = false;
        this.next(false);
    }

    currentSegment(coords) {
        if (this.isDone()) {
            throw new RangeError("NoSuchElementException flattening iterator out of bounds");
        }
        let type = this.holdType;
        if (type !== PathIterator.SEG_CLOSE) {
            coords[0] = this.hold[this.holdIndex + 0];
            coords[1] = this.hold[this.holdIndex + 1];
            if (type !== PathIterator.SEG_MOVETO) {
                type = PathIterator.SEG_LINETO;
            }
        }
        return type;
    }

    ensureHoldCapacity(want) {
        if (this.holdIndex - want < 0) {
            let have = this.hold.length - this.holdIndex;
            let newsize = this.hold.length + FlatteningPathIterator.GROW_SIZE;
            let newhold = new Array(newsize);
            util.arraycopy(this.hold, this.holdIndex,
                newhold, this.holdIndex + FlatteningPathIterator.GROW_SIZE,
                have);
            this.hold = newhold;
            this.holdIndex += FlatteningPathIterator.GROW_SIZE;
            this.holdEnd += FlatteningPathIterator.GROW_SIZE;
        }
    }

    getFlatness() {
        return Math.sqrt(this.squareflat);
    }

    getRecursionLimit() {
        return this.limit;
    }

    getWindingRule() {
        return this.path.getWindingRule();
    }

    isDone() {
        return this.done;
    }

    next(doNext = null) {
        if (doNext === null) {
            doNext = true;
        }
        let level = 0;
        if (this.holdIndex >= this.holdEnd) {
            if (doNext) {
                this.path.next();
            }
            if (this.path.isDone()) {
                this.done = true;
                return;
            }
            this.holdType = this.path.currentSegment(this.hold);
            this.levelIndex = 0;
            this.levels[0] = 0;
        }
        switch (this.holdType) {
            case PathIterator.SEG_MOVETO:
            case PathIterator.SEG_LINETO:
                this.curx = this.hold[0];
                this.cury = this.hold[1];
                if (this.holdType === PathIterator.SEG_MOVETO) {
                    this.movx = this.curx;
                    this.movy = this.cury;
                }
                this.holdIndex = this.holdEnd = 0;
                break;
            case PathIterator.SEG_CLOSE:
                this.curx = this.movx;
                this.cury = this.movy;
                this.holdIndex = this.holdEnd = 0;
                break;
            case PathIterator.SEG_QUADTO:
                if (this.holdIndex >= this.holdEnd) {
                    // Move the coordinates to the end of the array.
                    this.holdIndex = this.hold.length - 6;
                    this.holdEnd = this.hold.length - 2;
                    this.hold[this.holdIndex + 0] = this.curx;
                    this.hold[this.holdIndex + 1] = this.cury;
                    this.hold[this.holdIndex + 2] = this.hold[0];
                    this.hold[this.holdIndex + 3] = this.hold[1];
                    this.hold[this.holdIndex + 4] = this.curx = this.hold[2];
                    this.hold[this.holdIndex + 5] = this.cury = this.hold[3];
                }
                this.level = this.levels[this.levelIndex];
                this.holdIndex += 4;
                this.levelIndex--;
                break;
            case PathIterator.SEG_CUBICTO:
                if (this.holdIndex >= this.holdEnd) {
                    // Move the coordinates to the end of the array.
                    this.holdIndex = this.hold.length - 8;
                    this.holdEnd = this.hold.length - 2;
                    this.hold[this.holdIndex + 0] = this.curx;
                    this.hold[this.holdIndex + 1] = this.cury;
                    this.hold[this.holdIndex + 2] = this.hold[0];
                    this.hold[this.holdIndex + 3] = this.hold[1];
                    this.hold[this.holdIndex + 4] = this.hold[2];
                    this.hold[this.holdIndex + 5] = this.hold[3];
                    this.hold[this.holdIndex + 6] = this.curx = this.hold[4];
                    this.hold[this.holdIndex + 7] = this.cury = this.hold[5];
                }
                this.level = this.levels[this.levelIndex];
                this.holdIndex += 6;
                this.levelIndex--;
                break;
        }
    }

}
FlatteningPathIterator.GROW_SIZE = 24;

