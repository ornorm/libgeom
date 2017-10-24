/** @babel */
import {Point} from "./point";
import {Shape} from "./shape";
import {Rectangle} from "./rectangle";
import {Line} from "./line";

const BELOW = -2, LOWEDGE = -1, INSIDE = 0, HIGHEDGE = 1, ABOVE = 2;

export class QuadCurve extends Shape {

    constructor({
                    x1 = 0,
                    y1 = 0,
                    ctrlx = 0,
                    ctrly = 0,
                    x2 = 0,
                    y2 = 0
                } = {}) {
        super();
        this.x1 = x1;
        this.y1 = y1;
        this.ctrlx = ctrlx;
        this.ctrly = ctrly;
        this.x2 = x2;
        this.y2 = y2;
    }

    clone() {
        return new QuadCurve({
            x1: this.x1,
            y1: this.y1,
            ctrlx: this.ctrlx,
            ctrly: this.ctrly,
            x2: this.x2,
            y2: this.y2
        });
    }

    contains(x, y = NaN, w = NaN, h = NaN) {
        if (x instanceof Rectangle) {
            return this.contains(x.getX(), x.getY(), x.getWidth(), x.getHeight());
        }
        if (isNaN(w) && isNaN(h)) {
            let x1 = this.getX1();
            let y1 = this.getY1();
            let xc = this.getCtrlX();
            let yc = this.getCtrlY();
            let x2 = this.getX2();
            let y2 = this.getY2();
            let kx = x1 - 2 * xc + x2, ky = y1 - 2 * yc + y2, dx = x - x1, dy = y - y1, dxl = x2 - x1, dyl = y2 - y1,
                t0 = (dx * ky - dy * kx) / (dxl * ky - dyl * kx);
            if (t0 < 0 || t0 > 1 || t0 !== t0) {
                return false;
            }
            let xb = kx * t0 * t0 + 2 * (xc - x1) * t0 + x1, yb = ky * t0 * t0 + 2 * (yc - y1) * t0 + y1,
                xl = dxl * t0 + x1, yl = dyl * t0 + y1;
            return (x >= xb && x < xl) ||
                (x >= xl && x < xb) ||
                (y >= yb && y < yl) ||
                (y >= yl && y < yb);
        }
        if (w <= 0 || h <= 0) {
            return false;
        }
        return (this.contains(x, y) &&
        this.contains(x + w, y) &&
        this.contains(x + w, y + h) &&
        this.contains(x, y + h));
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof QuadCurve) {
            let cq2d = obj;
            return ((this.getX1() === cq2d.getX1()) &&
            (this.getY1() === cq2d.getY1()) &&
            (this.getCtrlX() === cq2d.getCtrlX()) &&
            (this.getCtrlY() === cq2d.getCtrlY()) &&
            (this.getX2() === cq2d.getX2()) &&
            (this.getY2() === cq2d.getY2()));
        }
        return false;
    }

    getBounds(rectangle = null) {
        let left = Math.min(Math.min(this.x1, this.x2), this.ctrlx),
            top = Math.min(Math.min(this.y1, this.y2), this.ctrly),
            right = Math.max(Math.max(this.x1, this.x2), this.ctrlx),
            bottom = Math.max(Math.max(this.y1, this.y2), this.ctrly);
        if (rectangle) {
            rectangle.reshape(left, top, right - left, bottom - top);
        } else {
            rectangle = new Rectangle({x: left, y: top, width: right - left, height: bottom - top});
        }
        return rectangle;
    }

    getCtrlPt() {
        return new Point({x: this.ctrlx, y: this.ctrly});
    }

    getCtrlX() {
        return this.ctrlx;
    }

    getCtrlY() {
        return this.ctrly;
    }

    static getEvalQuadratic(vals, num, include0, include1, inflect, c1, ctrl, c2) {
        let j = 0, t, u;
        for (let i = 0; i < num; i++) {
            t = vals[i];
            if ((include0 ? t >= 0 : t > 0) && (include1 ? t <= 1 : t < 1) && (!inflect || inflect[1] + 2 * inflect[2] * t !== 0)) {
                u = 1 - t;
                vals[j++] = c1 * u * u + 2 * ctrl * t * u + c2 * t * t;
            }
        }
        return j;
    }

    getFlatness() {
        return Line.getPtSegDist(this.getX1(), this.getY1(), this.getX2(), this.getY2(), this.getCtrlX(), this.getCtrlY());
    }

    static getTag(coord, low, high) {
        if (coord <= low) {
            return (coord < low ? BELOW : LOWEDGE);
        }
        if (coord >= high) {
            return (coord > high ? ABOVE : HIGHEDGE);
        }
        return INSIDE;
    }

    static isInwards(pttag, opt1tag, opt2tag) {
        switch (pttag) {
            case BELOW:
            case ABOVE:
            default:
                return false;
            case LOWEDGE:
                return (opt1tag >= INSIDE || opt2tag >= INSIDE);
            case INSIDE:
                return true;
            case HIGHEDGE:
                return (opt1tag <= INSIDE || opt2tag <= INSIDE);
        }
    }

    static getFlatness(x1, y1, ctrlx, ctrly, x2, y2) {
        if (Array.isArray(x1)) {
            let coords = x1, offset = y1;
            return Line.getPtSegDist(coords[offset + 0], coords[offset + 1],
                coords[offset + 4], coords[offset + 5],
                coords[offset + 2], coords[offset + 3]);
        }
        return Line.getPtSegDist(x1, y1, x2, y2, ctrlx, ctrly);
    }

    getFlatnessSq() {
        return Line.getPtSegDistSq(this.getX1(), this.getY1(), this.getX2(), this.getY2(), this.getCtrlX(), this.getCtrlY());
    }

    static getFillEqn(eqn, val, c1, c2, cp) {
        eqn[0] = c1 - val;
        eqn[1] = cp + cp - c1 - c1;
        eqn[2] = c1 - cp - cp + c2;

    }

    static setSubdivide(src, srcoff, left = null, leftoff = NaN, right = null, rightoff = NaN) {
        if (src instanceof QuadCurve && srcoff instanceof QuadCurve) {
            left = srcoff;
            right = leftoff;
            let x1 = src.getX1(),
                y1 = src.getY1(),
                ctrlx = src.getCtrlX(),
                ctrly = src.getCtrlY(),
                x2 = src.getX2(),
                y2 = src.getY2(),
                ctrlx1 = (x1 + ctrlx) / 2.0,
                ctrly1 = (y1 + ctrly) / 2.0,
                ctrlx2 = (x2 + ctrlx) / 2.0,
                ctrly2 = (y2 + ctrly) / 2.0;
            ctrlx = (ctrlx1 + ctrlx2) / 2.0;
            ctrly = (ctrly1 + ctrly2) / 2.0;
            if (left) {
                left.setCurve(x1, y1, ctrlx1, ctrly1, ctrlx, ctrly);
            }
            if (right) {
                right.setCurve(ctrlx, ctrly, ctrlx2, ctrly2, x2, y2);
            }
        } else {
            let x1 = src[srcoff + 0], y1 = src[srcoff + 1], ctrlx = src[srcoff + 2], ctrly = src[srcoff + 3],
                x2 = src[srcoff + 4], y2 = src[srcoff + 5];
            if (left) {
                left[leftoff] = x1;
                left[leftoff + 1] = y1;
            }
            if (right) {
                right[rightoff + 4] = x2;
                right[rightoff + 5] = y2;
            }
            x1 = (x1 + ctrlx) / 2.0;
            y1 = (y1 + ctrly) / 2.0;
            x2 = (x2 + ctrlx) / 2.0;
            y2 = (y2 + ctrly) / 2.0;
            ctrlx = (x1 + x2) / 2.0;
            ctrly = (y1 + y2) / 2.0;
            if (left) {
                left[leftoff + 2] = x1;
                left[leftoff + 3] = y1;
                left[leftoff + 4] = ctrlx;
                left[leftoff + 5] = ctrly;
            }
            if (right) {
                right[rightoff] = ctrlx;
                right[rightoff + 1] = ctrly;
                right[rightoff + 2] = x2;
                right[rightoff + 3] = y2;
            }
        }
    }

    static solveQuadratic(eqn, res) {
        res = res || eqn;
        let a = eqn[2], b = eqn[1], c = eqn[0], roots = 0;
        if (a === 0.0) {
            if (b === 0.0) {
                return -1;
            }
            res[roots++] = -c / b;
        } else {
            let d = b * b - 4.0 * a * c;
            if (d < 0.0) {
                return 0;
            }
            d = Math.sqrt(d);
            if (b < 0.0) {
                d = -d;
            }
            let q = (b + d) / -2.0;
            res[roots++] = q / a;
            if (q !== 0.0) {
                res[roots++] = c / q;
            }
        }
        return roots;
    }

    getP1() {
        return new Point({x: this.x1, y: this.y1});
    }

    getP2() {
        return new Point({x: this.x1, y: this.y1});
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
        bits += this.getCtrlX() * 43;
        bits += this.getCtrlY() * 47;
        bits += this.getX2() * 53;
        bits += this.getY2() * 59;
        return bits ^ bits >> 32;
    }

    intersects(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            let r = x;
            return this.intersects(r.getX(), r.getY(), r.getWidth(), r.getHeight());
        } else {
            let w = width;
            let h = height;
            if (w <= 0 || h <= 0) {
                return false;
            }
            let x1 = this.getX1(), y1 = this.getY1(), x1tag = QuadCurve.getTag(x1, x, x + w),
                y1tag = QuadCurve.getTag(y1, y, y + h);
            if (x1tag === INSIDE && y1tag === INSIDE) {
                return true;
            }
            let x2 = this.getX2(), y2 = this.getY2(), x2tag = QuadCurve.getTag(x2, x, x + w),
                y2tag = QuadCurve.getTag(y2, y, y + h);
            if (x2tag === INSIDE && y2tag === INSIDE) {
                return true;
            }
            let ctrlx = this.getCtrlX(), ctrly = this.getCtrlY(), ctrlxtag = QuadCurve.getTag(ctrlx, x, x + w),
                ctrlytag = QuadCurve.getTag(ctrly, y, y + h);
            if (x1tag < INSIDE && x2tag < INSIDE && ctrlxtag < INSIDE) {
                return false;
            }
            if (y1tag < INSIDE && y2tag < INSIDE && ctrlytag < INSIDE) {
                return false;
            }
            if (x1tag > INSIDE && x2tag > INSIDE && ctrlxtag > INSIDE) {
                return false;
            }
            if (y1tag > INSIDE && y2tag > INSIDE && ctrlytag > INSIDE) {
                return false;
            }
            if (QuadCurve.isInwards(x1tag, x2tag, ctrlxtag) && QuadCurve.isInwards(y1tag, y2tag, ctrlytag)) {
                return true;
            }
            if (QuadCurve.isInwards(x2tag, x1tag, ctrlxtag) && QuadCurve.isInwards(y2tag, y1tag, ctrlytag)) {
                return true;
            }
            let xoverlap = (x1tag * x2tag <= 0), yoverlap = (y1tag * y2tag <= 0);
            if (x1tag === INSIDE && x2tag === INSIDE && yoverlap) {
                return true;
            }
            if (y1tag === INSIDE && y2tag === INSIDE && xoverlap) {
                return true;
            }
            let eqn = new Array(3), res = new Array(3);
            if (!yoverlap) {
                QuadCurve.getFillEqn(eqn, (y1tag < INSIDE ? y : y + h), y1, ctrly, y2);
                return (QuadCurve.solveQuadratic(eqn, res) === 2 && QuadCurve.getEvalQuadratic(res, 2, true, true, null, x1, ctrlx, x2) === 2 && QuadCurve.getTag(res[0], x, x + w) * getTag(res[1], x, x + w) <= 0);
            }
            if (!xoverlap) {
                QuadCurve.getFillEqn(eqn, (x1tag < INSIDE ? x : x + w), x1, ctrlx, x2);
                return (QuadCurve.solveQuadratic(eqn, res) === 2 && QuadCurve.getEvalQuadratic(res, 2, true, true, null, y1, ctrly, y2) === 2 && QuadCurve.getTag(res[0], y, y + h) * getTag(res[1], y, y + h) <= 0);
            }
            let dx = x2 - x1, dy = y2 - y1, k = y2 * x1 - x2 * y1, c1tag, c2tag;
            if (y1tag === INSIDE) {
                c1tag = x1tag;
            } else {
                c1tag = QuadCurve.getTag((k + dx * (y1tag < INSIDE ? y : y + h)) / dy, x, x + w);
            }
            if (y2tag === INSIDE) {
                c2tag = x2tag;
            } else {
                c2tag = QuadCurve.getTag((k + dx * (y2tag < INSIDE ? y : y + h)) / dy, x, x + w);
            }
            if (c1tag * c2tag <= 0) {
                return true;
            }
            c1tag = ((c1tag * x1tag <= 0) ? y1tag : y2tag);
            QuadCurve.getFillEqn(eqn, (c2tag < INSIDE ? x : x + w), x1, ctrlx, x2);
            let num = QuadCurve.solveQuadratic(eqn, res);
            QuadCurve.getEvalQuadratic(res, num, true, true, null, y1, ctrly, y2);
            c2tag = QuadCurve.getTag(res[0], y, y + h);
            return (c1tag * c2tag <= 0);
        }
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        context.moveTo(this.getX1(), this.getY1());
        context.quadraticCurveTo(this.getCtrlX(), this.getCtrlY(), this.getX2(), this.getY2());
        context.closePath();
        super.render(context, style, clip);
    }

    setCtrlX(ctrlx) {
        this.ctrlx = ctrlx;
    }

    setCtrlY(ctrly) {
        this.ctrly = ctrly;
    }

    setCurve(x1, y1 = NaN, ctrlx = NaN, ctrly = NaN, x2 = NaN, y2 = NaN) {
        if (Array.isArray(x1)) {
            let coords = x1, offset = y1;
            if (coords[offset + 0] instanceof Point) {
                this.setCurve(coords[offset + 0].getX(), coords[offset + 0].getY(), coords[offset + 1].getX(), coords[offset + 1].getY(), coords[offset + 2].getX(), coords[offset + 2].getY());
            } else {
                this.setCurve(coords[offset + 0], coords[offset + 1], coords[offset + 2], coords[offset + 3], coords[offset + 4], coords[offset + 5]);
            }
        } else if (x1 instanceof QuadCurve) {
            let c = x1;
            this.setCurve(c.getX1(), c.getY1(), c.getCtrlX(), c.getCtrlY(), c.getX2(), c.getY2());
        } else if (x1 instanceof Point && y1 instanceof Point && ctrlx instanceof Point) {
            let p1 = x1, cp = y1, p2 = ctrlx;
            this.setCurve(p1.getX(), p1.getY(), cp.getX(), cp.getY(), p2.getX(), p2.getY());
        } else {
            this.x1 = x1;
            this.y1 = y1;
            this.ctrlx = ctrlx;
            this.ctrly = ctrly;
            this.x2 = x2;
            this.y2 = y2;
        }
    }

    setX1(x1) {
        this.x1 = x1;
    }

    setX2(x2) {
        this.x2 = x2;
    }

    setY1(y1) {
        this.y1 = y1;
    }

    setY2(y2) {
        this.y2 = y2;
    }

    subdivide(left, right) {
        QuadCurve.setSubdivide(this, left, right);
    }

    toString() {
        return this.constructor.name + "[x1=" + this.x1 + ",y1=" + this.y1 + ",ctrlx=" + this.ctrlx + ",ctrly=" + this.ctrly + ",x2=" + this.x2 + ",y2=" + this.y2 + "]";
    }
}