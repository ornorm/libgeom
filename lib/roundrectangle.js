/** @babel */
import {Point} from "./point";
import {Rectangle} from "./rectangle";

export class RoundRectangle extends Rectangle {

    constructor({
                    x = NaN,
                    y = NaN,
                    width = NaN,
                    height = NaN,
                    insetX = NaN,
                    insetY = NaN,
                    point = null,
                    dimension = null,
                    arcwidth = 0,
                    archeight = 0
                } = {}) {
        super({point, dimension, insetX, insetY, x, y, width, height});
        this.arcwidth = arcwidth;
        this.archeight = archeight;
    }

    classify(coord, left, right, arcsize) {
        if (coord < left) {
            return 0;
        } else if (coord < left + arcsize) {
            return 1;
        } else if (coord < right - arcsize) {
            return 2;
        } else if (coord < right) {
            return 3;
        } else {
            return 4;
        }
    }

    contains(x, y = NaN, w = NaN, h = NaN) {
        if (x instanceof Point) {
            return this.contains(x.getX(), x.getY());
        } else if (x instanceof Rectangle) {
            return this.contains(x.getX(), x.getY(), x.getWidth(), x.getHeight());
        } else {
            if (isNaN(w) && isNaN(h)) {
                if (this.isEmpty()) {
                    return false;
                }
                let rrx0 = this.getX(), rry0 = this.getY(), rrx1 = rrx0 + this.getWidth(),
                    rry1 = rry0 + this.getHeight();
                if (x < rrx0 || y < rry0 || x >= rrx1 || y >= rry1) {
                    return false;
                }
                let aw = Math.min(this.getWidth(), Math.abs(this.getArcWidth())) / 2.0,
                    ah = Math.min(this.getHeight(), Math.abs(this.getArcHeight())) / 2.0;
                if (x >= (rrx0 += aw) && x < (rrx0 = rrx1 - aw)) {
                    return true;
                }
                if (y >= (rry0 += ah) && y < (rry0 = rry1 - ah)) {
                    return true;
                }
                x = (x - rrx0) / aw;
                y = (y - rry0) / ah;
                return (x * x + y * y <= 1.0);
            } else {
                if (this.isEmpty() || w <= 0 || h <= 0) {
                    return false;
                }
                return (this.contains(x, y) && this.contains(x + w, y) && this.contains(x, y + h) && this.contains(x + w, y + h));
            }
        }
    }

    clone() {
        return new RoundRectangle({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            arcwidth: this.arcwidth,
            archeight: this.archeight,
        });
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof RoundRectangle) {
            let rr2d = obj;
            return ((this.getX() === rr2d.getX()) &&
            (this.getY() === rr2d.getY()) &&
            (this.getWidth() === rr2d.getWidth()) &&
            (this.getHeight() === rr2d.getHeight()) &&
            (this.getArcWidth() === rr2d.getArcWidth()) &&
            (this.getArcHeight() === rr2d.getArcHeight()));
        }
        return false;
    }

    getArcHeight() {
        return this.archeight;
    }

    getArcWidth() {
        return this.arcwidth;
    }

    hashCode() {
        let bits = this.getX();
        bits += this.getY() * 37;
        bits += this.getWidth() * 43;
        bits += this.getHeight() * 47;
        bits += this.getArcWidth() * 53;
        bits += this.getArcHeight() * 59;
        return bits ^ bits >> 32;
    }

    intersects(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            let r = x;
            let tw = this.width, th = this.height, rw = r.width, rh = r.height;
            if (rw <= 0 || rh <= 0 || tw <= 0 || th <= 0) {
                return false;
            }
            let tx = this.x, ty = this.y, rx = r.x, ry = r.y;
            rw += rx;
            rh += ry;
            tw += tx;
            th += ty;
            return ((rw < rx || rw > tx) && (rh < ry || rh > ty) && (tw < tx || tw > rx) && (th < ty || th > ry));
        } else {
            let w = width;
            let h = height;
            if (this.isEmpty() || w <= 0 || h <= 0) {
                return false;
            }
            let rrx0 = this.getX(), rry0 = this.getY(), rrx1 = rrx0 + this.getWidth(), rry1 = rry0 + this.getHeight();
            if (x + w <= rrx0 || x >= rrx1 || y + h <= rry0 || y >= rry1) {
                return false;
            }
            let aw = Math.min(this.getWidth(), Math.abs(this.getArcWidth())) / 2.0,
                ah = Math.min(this.getHeight(), Math.abs(this.getArcHeight())) / 2.0;
            let x0class = this.classify(x, rrx0, rrx1, aw), x1class = this.classify(x + w, rrx0, rrx1, aw),
                y0class = this.classify(y, rry0, rry1, ah), y1class = this.classify(y + h, rry0, rry1, ah);
            if (x0class === 2 || x1class === 2 || y0class === 2 || y1class === 2) {
                return true;
            }
            if ((x0class < 2 && x1class > 2) || (y0class < 2 && y1class > 2)) {
                return true;
            }
            x = (x1class === 1) ? (x + w - (rrx0 + aw)) : (x - (rrx1 - aw));
            y = (y1class === 1) ? (y + h - (rry0 + ah)) : (y - (rry1 - ah));
            x = x / aw;
            y = y / ah;
            return (x * x + y * y <= 1.0);
        }
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        context.moveTo(this.getX() + this.getArcWidth(), this.getY());
        context.arcTo(this.getX() + this.getWidth(), this.getY(), this.getX() + this.getWidth(), this.getY() + this.getHeight(), this.getArcHeight());
        context.arcTo(this.getX() + this.getWidth(), this.getY() + this.getHeight(), this.getX(), this.getY() + this.getHeight(), this.getArcWidth());
        context.arcTo(this.getX(), this.getY() + this.getHeight(), this.getX(), this.getY(), this.getArcHeight());
        context.arcTo(this.getX(), this.getY(), this.getX() + this.getWidth(), this.getY(), this.getArcWidth());
        context.closePath();
        super.render(context, style, clip);
    }

    setArcHeight(archeight) {
        this.archeight = archeight;
    }

    setArcWidth(arcwidth) {
        this.arcwidth = arcwidth;
    }

    setFrame(x, y, w, h) {
        this.setRoundRect(x, y, w, h, this.getArcWidth(), this.getArcHeight());
    }

    setRoundRect(x, y = NaN, w = NaN, h = NaN, arcw = NaN, arch = NaN) {
        if (x instanceof RoundRectangle) {
            let rr = x;
            this.setRoundRect(rr.getX(), rr.getY(), rr.getWidth(), rr.getHeight(), rr.getArcWidth(), rr.getArcHeight());
        } else {
            this.x = x;
            this.y = y;
            this.width = w;
            this.height = h;
            this.arcwidth = arcw;
            this.archeight = arch;
        }
    }

    toString() {
        return this.constructor.name + "[x=" + this.x + ",y=" + this.y + ",w=" + this.width + ",h=" + this.height + ",arcwidth=" + this.arcwidth + ",archeight=" + this.archeight + "]";
    }
}
