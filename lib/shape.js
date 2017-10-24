/** @babel */
import * as util from "hjs-core/lib/util";
import * as math from "hjs-core/lib/math";
import {Dimension, Point} from "./point";
import {CopyIterator, FlatteningPathIterator, Iterator, PathIterator, TxIterator} from "./iterator";
import {Rectangle, RectIterator} from "./rectangle";

export class Shape {

    constructor() {

    }

    static clampAngle(angle) {
        return (angle % 360) + (angle < 0 ? 360 : 0);
    }

    contains(x, y, w, h) {
        return false;
    }

    getBounds(rectangle = null) {
        return null;
    }

    getPath2D() {
        if (!this.path2D) {
            this.path2D = new Path({shape: this});
        }
        return this.path2D;
    }

    getInternalContext() {
        if (!this.internalContext) {
            let bounds = this.getBounds();
            let canvas = document.createElement("canvas");
            canvas.width = bounds.getWidth();
            canvas.height = bounds.getHeight();
            this.internalContext = canvas.getContext("2d");
        }
        return this.internalContext;
    }

    getPathIterator(at, flatness) {
        return null;
    }

    static IEEEremainder(x, y) {
        return math.IEEEremainder(x, y);
    }

    intersects(x, y, width, height) {
        return false;
    }

    static normalizeDegrees(angle) {
        return math.normalizeDegrees(angle);
    }

    render(context, style = 0, clip = false) {
        if (clip) {
            context.clip();
        }
        switch (style) {
            case 0:
                context.fill();
                break;
            case 1:
                context.stroke();
                break;
            default:
                context.fill();
                context.stroke();
                break;
        }
    }

    setPath2D(path2D) {
        this.path2D = path2D;
    }

    static toDegrees(radian) {
        return math.toDegrees(radian);
    }

    static toRadians(degree) {
        return (Math.PI / 180) * degree;
    }
}

export class Path extends Shape {

    constructor({
                    rule = NaN,
                    initialCapacity = NaN,
                    initialTypes = NaN,
                    transform = null,
                    path = null,
                    shape = null
                } = {}) {
        super();
        if (!isNaN(rule) &&
            rule === PathIterator.WIND_EVEN_ODD ||
            rule === PathIterator.WIND_NON_ZERO) {
            this.setWindingRule(rule);
        } else {
            this.setWindingRule(Path.WIND_EVEN_ODD);
        }
        if (!isNaN(initialCapacity)) {
            this.pointTypes = new Array(initialCapacity);
        } else {
            if (path) {
                let p2d = path;
                let at = transform;
                this.setWindingRule(p2d.windingRule);
                this.numTypes = p2d.numTypes;
                this.pointTypes = util.copyOf(p2d.pointTypes, p2d.pointTypes.length);
                this.numCoords = p2d.numCoords;
                this.coords = p2d.cloneCoords(at);
            } else if (shape) {
                let s = shape;
                let at = transform;
                let pi = s.getPathIterator(at);
                this.setWindingRule(pi.getWindingRule());
                this.pointTypes = new Array(Path.INIT_SIZE);
                this.coords = new Array(Path.INIT_SIZE * 2);
                this.append(pi, false);
            } else if (!isNaN(initialTypes)) {
                this.pointTypes = new Array(initialTypes);
            }
        }
        if (!this.pointTypes) {
            this.pointTypes = new Array(Path.INIT_SIZE);
        }
        if (!this.coords) {
            this.coords = new Array(this.pointTypes.length * 2);
        }
    }

    append(x, y = 0) {
        if (x instanceof PathIterator) {
            //here y is a connect flag
            let coords = new Array(6);
            while (!x.isDone()) {
                switch (x.currentSegment(coords)) {
                    case Path.SEG_MOVETO:
                        if (!y || this.numTypes < 1 || this.numCoords < 1) {
                            this.moveTo(coords[0], coords[1]);
                            break;
                        }
                        if (this.pointTypes[this.numTypes - 1] !== Path.SEG_CLOSE &&
                            this.coords[this.numCoords - 2] === coords[0] &&
                            this.coords[this.numCoords - 1] === coords[1]) {
                            // Collapse out initial moveto/lineto
                            break;
                        }
                        this.lineTo(coords[0], coords[1]);
                        break;
                    case Path.SEG_LINETO:
                        this.lineTo(coords[0], coords[1]);
                        break;
                    case Path.SEG_QUADTO:
                        this.quadTo(coords[0], coords[1],
                            coords[2], coords[3]);
                        break;
                    case Path.SEG_CUBICTO:
                        this.curveTo(coords[0], coords[1],
                            coords[2], coords[3],
                            coords[4], coords[5]);
                        break;
                    case Path.SEG_CLOSE:
                        this.closePath();
                        break;
                }
                x.next();
                y = 0;
            }
        } else if (x instanceof Shape) {
            this.append(x.getPathIterator(null), y);
        } else {
            this.coords[this.numCoords++] = x;
            this.coords[this.numCoords++] = y;
        }
    }

    clone() {
        if (this instanceof GeneralPath) {
            return new GeneralPath({shape: this});
        }
        return new Path({shape: this});
    }

    cloneCoords(at = null) {
        let ret = null;
        if (!at) {
            ret = util.copyOf(this.coords, this.coords.length);
        } else {
            ret = new Array(this.coords.length);
            at.transform(this.coords, 0, ret, 0, this.numCoords / 2);
        }
        return ret;
    }

    closePath() {
        if (this.numTypes === 0 || this.pointTypes[this.numTypes - 1] !== Path.SEG_CLOSE) {
            this.needRoom(true, 0);
            this.pointTypes[this.numTypes++] = Path.SEG_CLOSE;
        }
    }

    createTransformedShape(at = null) {
        let p2d = this.clone();
        if (at) {
            p2d.transform(at);
        }
        return p2d;
    }

    curveTo(x1 = 0, y1 = 0, x2 = 0, y2 = 0, x3 = 0, y3 = 0) {
        this.needRoom(true, 6);
        this.pointTypes[this.numTypes++] = Path.SEG_CUBICTO;
        this.coords[this.numCoords++] = x1;
        this.coords[this.numCoords++] = y1;
        this.coords[this.numCoords++] = x2;
        this.coords[this.numCoords++] = y2;
        this.coords[this.numCoords++] = x3;
        this.coords[this.numCoords++] = y3;
    }

    getBounds(rectangle = null) {
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        let i = this.numCoords;
        if (i > 0) {
            y1 = y2 = this.coords[--i];
            x1 = x2 = this.coords[--i];
            while (i > 0) {
                let y = this.coords[--i];
                let x = this.coords[--i];
                if (x < x1) x1 = x;
                if (y < y1) y1 = y;
                if (x > x2) x2 = x;
                if (y > y2) y2 = y;
            }
        } else {
            x1 = y1 = x2 = y2 = 0;
        }
        if (rectangle) {
            rectangle.reshape(x1, y1, x2 - x1, y2 - y1);
        } else {
            rectangle = new Rectangle({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
        }
        return rectangle;
    }

    getCurrentPoint() {
        let index = this.numCoords;
        if (this.numTypes < 1 || index < 1) {
            return null;
        }
        if (this.pointTypes[this.numTypes - 1] === Path.SEG_CLOSE) {
            loop:
                for (let i = this.numTypes - 2; i > 0; i--) {
                    switch (this.pointTypes[i]) {
                        case Path.SEG_MOVETO:
                            break loop;
                        case Path.SEG_LINETO:
                            index -= 2;
                            break;
                        case Path.SEG_QUADTO:
                            index -= 4;
                            break;
                        case Path.SEG_CUBICTO:
                            index -= 6;
                            break;
                        case Path.SEG_CLOSE:
                            break;
                    }
                }
        }
        return this.getPoint(index - 2);
    }

    getPathIterator(transform = null, flatness = NaN) {
        if (!isNaN(flatness)) {
            return new FlatteningPathIterator({flatness, shape: this.getPathIterator(transform)});
        } else {
            if (!transform) {
                return new CopyIterator({shape: this});
            }
            return new TxIterator({transform, shape: this});
        }
    }

    getPoint(coordindex = 0) {
        return new Point({
            x: this.coords[coordindex],
            y: this.coords[coordindex + 1]
        });
    }

    getWindingRule() {
        return this.windingRule;
    }

    lineTo(x = 0, y = 0) {
        this.needRoom(true, 2);
        this.pointTypes[this.numTypes++] = Path.SEG_LINETO;
        this.coords[this.numCoords++] = x;
        this.coords[this.numCoords++] = y;
    }

    moveTo(x = 0, y = 0) {
        if (this.numTypes > 0 && this.pointTypes[this.numTypes - 1] === Path.SEG_MOVETO) {
            this.coords[this.numCoords - 2] = x;
            this.coords[this.numCoords - 1] = y;
        } else {
            this.needRoom(false, 2);
            this.pointTypes[this.numTypes++] = Path.SEG_MOVETO;
            this.coords[this.numCoords++] = x;
            this.coords[this.numCoords++] = y;
        }
    }

    needRoom(needMove = false, newCoords = 0) {
        if (needMove && this.numTypes === 0) {
            throw new Error("IllegalPathStateException missing initial moveto " +
                "in path definition");
        }
        let size = this.pointTypes.length;
        if (this.numTypes >= size) {
            let grow = size;
            if (grow > Path.EXPAND_MAX) {
                grow = Path.EXPAND_MAX;
            }
            this.pointTypes = util.copyOf(this.pointTypes, size + grow);
        }
        size = this.coords.length;
        if (this.numCoords + newCoords > size) {
            let grow = size;
            if (grow > Path.EXPAND_MAX * 2) {
                grow = Path.EXPAND_MAX * 2;
            }
            if (grow < newCoords) {
                grow = newCoords;
            }
            this.coords = util.copyOf(this.coords, size + grow);
        }
    }

    pointCrossings(px = 0, py = 0) {
        return false;
    }

    quadTo(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
        this.needRoom(true, 4);
        this.pointTypes[this.numTypes++] = Path.SEG_QUADTO;
        this.coords[this.numCoords++] = x1;
        this.coords[this.numCoords++] = y1;
        this.coords[this.numCoords++] = x2;
        this.coords[this.numCoords++] = y2;
    }

    rectCrossings(rxmin = 0, rymin = 0, rxmax = 0, rymax = 0) {
        return false;
    }

    render(context, style = 0, clip = false) {
        let pi = this.getPathIterator();
        context.beginPath();
        let coords = new Array(6);
        while (!pi.isDone()) {
            switch (pi.currentSegment(coords)) {
                case Path.SEG_MOVETO:
                    context.moveTo(coords[0], coords[1]);
                    break;
                case Path.SEG_LINETO:
                    context.lineTo(coords[0], coords[1]);
                    break;
                case Path.SEG_QUADTO:
                    context.quadraticCurveTo(coords[0], coords[1], coords[2], coords[3]);
                    break;
                case Path.SEG_CUBICTO:
                    context.bezierCurveTo(coords[0], coords[1], coords[2], coords[3], coords[4], coords[5]);
                    break;
                case Path.SEG_CLOSE:
                    context.closePath();
                    break;
            }
            pi.next();
        }
        super.render(context, style, clip);
    }

    reset() {
        this.numTypes = this.numCoords = 0;
    }

    setWindingRule(rule) {
        if (rule !== Path.WIND_EVEN_ODD && rule !== Path.WIND_NON_ZERO) {
            throw new Error("IllegalArgumentException winding rule must be " +
                "WIND_EVEN_ODD or " +
                "WIND_NON_ZERO");
        }
        this.windingRule = rule;
    }

    transform(transform = null) {
        if (transform) {
            transform.transform(this.coords, 0, this.coords, 0, this.numCoords / 2);
        }
    }

}
Path.CopyIterator = CopyIterator;
Path.TxIterator = TxIterator;
Path.Iterator = Iterator;
Path.RectIterator = RectIterator;
Path.WIND_EVEN_ODD = PathIterator.WIND_EVEN_ODD;
Path.WIND_NON_ZERO = PathIterator.WIND_NON_ZERO;
Path.SEG_MOVETO = PathIterator.SEG_MOVETO;
Path.SEG_LINETO = PathIterator.SEG_LINETO;
Path.SEG_QUADTO = PathIterator.SEG_QUADTO;
Path.SEG_CUBICTO = PathIterator.SEG_CUBICTO;
Path.SEG_CLOSE = PathIterator.SEG_CLOSE;
Path.EXPAND_MAX = 500;
Path.INIT_SIZE = 20;

export class GeneralPath extends Path {

    constructor({
                    rule = NaN,
                    initialCapacity = NaN,
                    initialTypes = NaN,
                    pointTypes = null,
                    numTypes = NaN,
                    coords = null,
                    numCoords = NaN,
                    transform = null,
                    path = null,
                    shape = null
                } = {}) {
        super({rule, initialCapacity, initialTypes, transform, path, shape});
        if (pointTypes) {
            this.pointTypes = pointTypes;
        }
        if (!isNaN(numTypes)) {
            this.numTypes = numTypes;
        }
        if (coords) {
            this.coords = coords;
        }
        if (!isNaN(numCoords)) {
            this.numCoords = numCoords;
        }
    }

}