/** @babel */
import {Point} from "./point";
import {Shape} from "./shape";
import {Rectangle} from "./rectangle";

export class Line extends Shape {

    constructor({x1 = 0, y1 = 0, x2 = 0, y2 = 0} = {}) {
        super();
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    clone() {
        return new Line({x1: this.x1, y1: this.y1, x2: this.x2, y2: this.y2});
    }

    contains(x, y, width, height) {
        return false;
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof Line) {
            let l = obj;
            return ((this.getX1() === l.getX1()) &&
            (this.getY1() === l.getY1()) &&
            (this.getX2() === l.getX2()) &&
            (this.getY2() === l.getY2()));
        }
        return false;
    }

    getBounds(rectangle = null) {
        let x, y, w, h;
        if (this.x1 < this.x2) {
            x = this.x1;
            w = this.x2 - this.x1;
        } else {
            x = this.x2;
            w = this.x1 - this.x2;
        }
        if (this.y1 < this.y2) {
            y = this.y1;
            h = this.y2 - this.y1;
        } else {
            y = this.y2;
            h = this.y1 - this.y2;
        }
        if (rectangle) {
            rectangle.reshape(x, y, w, h);
        } else {
            rectangle = new Rectangle({x: x, y: y, w: w, h: h});
        }
        return rectangle;
    }

    static getLinesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        return ((Line.getRelativeCCW(x1, y1, x2, y2, x3, y3) *
        Line.getRelativeCCW(x1, y1, x2, y2, x4, y4) <= 0)
        && (Line.getRelativeCCW(x3, y3, x4, y4, x1, y1) *
        Line.getRelativeCCW(x3, y3, x4, y4, x2, y2) <= 0));
    }

    static getPtLineDist(x1, y1, x2, y2, px, py) {
        return Math.sqrt(Line.getPtLineDistSq(x1, y1, x2, y2, px, py));
    }

    static getPtLineDistSq(x1, y1, x2, y2, px, py) {
        x2 -= x1;
        y2 -= y1;
        px -= x1;
        py -= y1;
        let dotprod = px * x2 + py * y2, projlenSq = dotprod * dotprod / (x2 * x2 + y2 * y2),
            lenSq = px * px + py * py - projlenSq;
        if (lenSq < 0) {
            lenSq = 0;
        }
        return lenSq;
    }

    static getPtSegDist(x1, y1, x2, y2, px, py) {
        return Math.sqrt(Line.getPtSegDistSq(x1, y1, x2, y2, px, py));
    }

    static getPtSegDistSq(x1, y1, x2, y2, px, py) {
        x2 -= x1;
        y2 -= y1;
        px -= x1;
        py -= y1;
        let dotprod = px * x2 + py * y2, projlenSq;
        if (dotprod <= 0.0) {
            projlenSq = 0.0;
        } else {
            px = x2 - px;
            py = y2 - py;
            dotprod = px * x2 + py * y2;
            if (dotprod <= 0.0) {
                projlenSq = 0.0;
            } else {
                projlenSq = dotprod * dotprod / (x2 * x2 + y2 * y2);
            }
        }
        let lenSq = px * px + py * py - projlenSq;
        if (lenSq < 0) {
            lenSq = 0;
        }
        return lenSq;
    }

    static getRelativeCCW(x1, y1, x2, y2, px, py) {
        x2 -= x1;
        y2 -= y1;
        px -= x1;
        py -= y1;
        let ccw = px * y2 - py * x2;
        if (ccw === 0.0) {
            ccw = px * x2 + py * y2;
            if (ccw > 0.0) {
                py -= y2;
                ccw = px * x2 + py * y2;
                if (ccw < 0.0) {
                    ccw = 0.0;
                }
            }
        }
        return (ccw < 0.0) ? -1 : ((ccw > 0.0) ? 1 : 0);
    }

    getP1() {
        return new Point({x: this.x1, y: this.y1});
    }

    getP2() {
        return new Point({x: this.x2, y: this.y2});
    }

    getX1() {
        return this.x1;
    }

    getX2() {
        return this.x2;
    }

    getY1() {
        return this.y1;
    }

    getY2() {
        return this.y2;
    }

    hashCode() {
        let bits = this.getX1();
        bits += this.getY1() * 37;
        bits += this.getX2() * 43;
        bits += this.getY2() * 47;
        return bits ^ bits >> 32;
    }

    intersects(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            return x.intersectsLine(this.getX1(), this.getY1(), this.getX2(), this.getY2());
        }
        return this.intersects(new Rectangle({x: x, y: y, width: width, height: height}));
    }

    intersectsLine(x1, y1 = NaN, x2 = NaN, y2 = NaN) {
        if (x1 instanceof Line) {
            return Line.getLinesIntersect(x1.getX1(), x1.getY1(), x1.getX2(), x1.getY2(),
                this.getX1(), this.getY1(), this.getX2(), this.getY2());
        }
        return Line.getLinesIntersect(x1, y1, x2, y2,
            this.getX1(), this.getY1(), this.getX2(), this.getY2());
    }

    ptLineDist(px, py = NaN) {
        if (px instanceof Point) {
            return Line.getPtLineDist(this.getX1(), this.getY1(), this.getX2(), this.getY2(),
                px.getX(), px.getY());
        }
        return Line.getPtLineDist(this.getX1(), this.getY1(), this.getX2(), this.getY2(), px, py);
    }

    ptLineDistSq(px, py = NaN) {
        if (px instanceof Point) {
            return Line.getPtLineDistSq(this.getX1(), this.getY1(), this.getX2(), this.getY2(),
                px.getX(), px.getY());
        }
        return Line.getPtLineDistSq(this.getX1(), this.getY1(), this.getX2(), this.getY2(), px, py);
    }

    ptSegDist(px, py = NaN) {
        if (px instanceof Point) {
            return Line.getPtSegDist(this.getX1(), this.getY1(), this.getX2(), this.getY2(),
                px.getX(), px.getY());
        }
        return Line.getPtSegDist(this.getX1(), this.getY1(), this.getX2(), this.getY2(), px, py);
    }

    ptSegDistSq(px, py = NaN) {
        if (px instanceof Point) {
            return Line.getPtSegDistSq(this.getX1(), this.getY1(), this.getX2(), this.getY2(),
                px.getX(), px.getY());
        }
        return Line.getPtSegDistSq(this.getX1(), this.getY1(), this.getX2(), this.getY2(), px, py);
    }

    relativeCCW(px, py = NaN) {
        if (px instanceof Point) {
            return Line.getRelativeCCW(this.getX1(), this.getY1(), this.getX2(), this.getY2(),
                px.getX(), px.getY());
        }
        return Line.getRelativeCCW(this.getX1(), this.getY1(), this.getX2(), this.getY2(), px, py);
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        context.moveTo(this.getX1(), this.getY1());
        context.lineTo(this.getX2(), this.getY2());
        context.closePath();
        super.render(context, style, clip);
    }

    setLine(x1, y1 = NaN, x2 = NaN, y2 = NaN) {
        if (x1 instanceof Line) {
            this.setLine(x1.getX1(), x1.getY1(), x1.getX2(), x1.getY2());
        } else if (x1 instanceof Point && y1 instanceof Point) {
            this.setLine(x1.getX(), x1.getY(), y1.getX(), y1.getY());
        } else {
            this.x1 = x1;
            this.y1 = y1;
            this.x2 = x2;
            this.y2 = y2;
        }
    }

    toString() {
        return this.constructor.name + "[x1=" + this.x1 + ",y1=" + this.y1 + ",x2=" + this.x2 + ",y2=" + this.y2 + "]";
    }
}
