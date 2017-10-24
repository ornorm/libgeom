/** @babel */
import {Point} from "./point";
import {Rectangle} from "./rectangle";

export class Ellipse extends Rectangle {

    constructor({x = NaN, y = NaN, width = NaN, height = NaN, insetX = NaN, insetY = NaN, point = null, dimension = null} = {}) {
        super({x, y, width, height, insetX, insetY, point, dimension});
    }

    contains(x, y = NaN, w = NaN, h = NaN) {
        if (x instanceof Point) {
            return this.contains(x.getX(), x.getY());
        } else if (x instanceof Rectangle) {
            let r = x;
            return this.contains(x.getX(), x.getY(), x.getWidth(), x.getHeight());
        } else {
            let x0 = this.getX(), y0 = this.getY();
            if (isNaN(w) && isNaN(h)) {
                let ellw = this.getWidth();
                if (ellw <= 0.0) {
                    return false;
                }
                let normx = (x - this.getX()) / ellw - 0.5, ellh = this.getHeight();
                if (ellh <= 0.0) {
                    return false;
                }
                let normy = (y - this.getY()) / ellh - 0.5;
                return (normx * normx + normy * normy) < 0.25;
            } else {
                return (this.contains(x, y) &&
                this.contains(x + w, y) &&
                this.contains(x, y + h) &&
                this.contains(x + w, y + h));
            }
        }
        return false;
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof Ellipse) {
            let e2d = obj;
            return ((this.getX() === e2d.getX()) &&
            (this.getY() === e2d.getY()) &&
            (this.getWidth() === e2d.getWidth()) &&
            (this.getHeight() === e2d.getHeight()));
        }
        return false;
    }

    hashCode() {
        let bits = this.getX();
        bits += this.getY() * 37;
        bits += this.getWidth() * 43;
        bits += this.getHeight() * 47;
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
            let w = width, h = height;
            if (w <= 0.0 || h <= 0.0) {
                return false;
            }
            let ellw = this.getWidth();
            if (ellw <= 0.0) {
                return false;
            }
            let normx0 = (x - this.getX()) / ellw - 0.5, normx1 = normx0 + w / ellw, ellh = this.getHeight();
            if (ellh <= 0.0) {
                return false;
            }
            let normy0 = (y - this.getY()) / ellh - 0.5, normy1 = normy0 + h / ellh;
            let nearx, neary;
            if (normx0 > 0.0) {
                nearx = normx0;
            } else if (normx1 < 0.0) {
                nearx = normx1;
            } else {
                nearx = 0.0;
            }
            if (normy0 > 0.0) {
                neary = normy0;
            } else if (normy1 < 0.0) {
                neary = normy1;
            } else {
                neary = 0.0;
            }
            return (nearx * nearx + neary * neary) < 0.25;
        }
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        context.ellipse(this.getCenterX(), this.getCenterY(), this.getWidth() / 2, this.getHeight() / 2, 45 * Math.PI / 180, 0, 2 * Math.PI, true);
        context.closePath();
        super.render(context, style, clip);
    }

    toString() {
        return this.constructor.name + "[x=" + this.x + ",y=" + this.y + ",w=" + this.width + ",h=" + this.height + "]";
    }
}