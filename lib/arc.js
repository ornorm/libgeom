/** @babel */
import {Point} from "./point";
import {Dimension} from "./dimension";
import {Shape} from "./shape";
import {Rectangle} from "./rectangle";
import {Line} from "./line";

export const OPEN = 0, CHORD = 1, PIE = 2;

export class Arc extends Rectangle {

    constructor({
                    x = NaN,
                    y = NaN,
                    width = NaN,
                    height = NaN,
                    insetX = NaN,
                    insetY = NaN,
                    point = null,
                    dimension = null,
                    start = 0,
                    extent = 0,
                    type = 0
                } = {}) {
        super({x, y, width, height, insetX, insetY, point, dimension});
        this.start = start;
        this.extent = extent;
        this.type = type;
    }

    contains(x, y = NaN, w = NaN, h = NaN, origrect = null) {
        if (x instanceof Point) {
            return this.contains(x.getX(), x.getY());
        } else if (x instanceof Rectangle) {
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
                let normy = (y - this.getY()) / ellh - 0.5, distSq = (normx * normx + normy * normy);
                if (distSq >= 0.25) {
                    return false;
                }
                let angExt = Math.abs(this.getAngleExtent());
                if (angExt >= 360.0) {
                    return true;
                }
                let inarc = this.containsAngle(-Shape.toDegrees(Math.atan2(normy, normx)));
                if (type === PIE) {
                    return inarc;
                }
                if (inarc) {
                    if (angExt >= 180.0) {
                        return true;
                    }
                } else {
                    if (angExt <= 180.0) {
                        return false;
                    }
                }
                let angle = Shape.toRadians(-this.getAngleStart()), x1 = Math.cos(angle), y1 = Math.sin(angle);
                angle += Shape.toRadians(-this.getAngleExtent());
                let x2 = Math.cos(angle), y2 = Math.sin(angle),
                    inside = (Line.getRelativeCCW(x1, y1, x2, y2, 2 * normx, 2 * normy) *
                    Line.getRelativeCCW(x1, y1, x2, y2, 0, 0) >= 0);
                return inarc ? !inside : inside;
            } else {
                if (!(this.contains(x, y) &&
                    this.contains(x + w, y) &&
                    this.contains(x, y + h) &&
                    this.contains(x + w, y + h))) {
                    return false;
                }
                if (this.type !== PIE || Math.abs(this.getAngleExtent()) <= 180.0) {
                    return true;
                }
                origrect = origrect || new Rectangle({x: x, y: y, width: w, height: h});
                let halfW = this.getWidth() / 2.0, halfH = this.getHeight() / 2.0, xc = this.getX() + halfW,
                    yc = this.getY() + halfH, angle = Shape.toRadians(-this.getAngleStart()),
                    xe = xc + halfW * Math.cos(angle), ye = yc + halfH * Math.sin(angle);
                if (origrect.intersectsLine(xc, yc, xe, ye)) {
                    return false;
                }
                angle += Shape.toRadians(-this.getAngleExtent());
                xe = xc + halfW * Math.cos(angle);
                ye = yc + halfH * Math.sin(angle);
                return !origrect.intersectsLine(xc, yc, xe, ye);
            }
        }
    }

    containsAngle(angle) {
        let angExt = this.getAngleExtent(), backwards = (angExt < 0.0);
        if (backwards) {
            angExt = -angExt;
        }
        if (angExt >= 360.0) {
            return true;
        }
        angle = Shape.normalizeDegrees(angle) - Shape.normalizeDegrees(this.getAngleStart());
        if (backwards) {
            angle = -angle;
        }
        if (angle < 0.0) {
            angle += 360.0;
        }
        return (angle >= 0.0) && (angle < angExt);
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof Arc) {
            let a2d = obj;
            return ((this.getX() === a2d.getX()) &&
            (this.getY() === a2d.getY()) &&
            (this.getWidth() === a2d.getWidth()) &&
            (this.getHeight() === a2d.getHeight()) &&
            (this.getAngleStart() === a2d.getAngleStart()) &&
            (this.getAngleExtent() === a2d.getAngleExtent()) &&
            (this.getArcType() === a2d.getArcType()));
        }
        return false;
    }

    getAngleExtent() {
        return this.extent;
    }

    getAngleStart() {
        return this.start;
    }

    getArcType() {
        return this.type;
    }

    getBounds(rectangle = null) {
        if (this.isEmpty()) {
            return this.makeBounds(this.getX(), this.getY(), this.getWidth(), this.getHeight());
        }
        let x1, y1, x2, y2;
        if (this.getArcType() === PIE) {
            x1 = y1 = x2 = y2 = 0.0;
        } else {
            x1 = y1 = 1.0;
            x2 = y2 = -1.0;
        }
        let angle = 0.0;
        for (let i = 0; i < 6; i++) {
            if (i < 4) {
                angle += 90.0;
                if (!this.containsAngle(angle)) {
                    continue;
                }
            } else if (i === 4) {
                angle = this.getAngleStart();
            } else {
                angle += this.getAngleExtent();
            }
            let rads = Shape.toRadians(-angle), xe = Math.cos(rads), ye = Math.sin(rads);
            x1 = Math.min(x1, xe);
            y1 = Math.min(y1, ye);
            x2 = Math.max(x2, xe);
            y2 = Math.max(y2, ye);
        }
        let w = this.getWidth(), h = this.getHeight();
        x2 = (x2 - x1) * 0.5 * w;
        y2 = (y2 - y1) * 0.5 * h;
        x1 = this.getX() + (x1 * 0.5 + 0.5) * w;
        y1 = this.getY() + (y1 * 0.5 + 0.5) * h;
        if (rectangle) {
            rectangle.reshape(x1, y1, x2, y2);
        } else {
            rectangle = this.makeBounds(x1, y1, x2, y2);
        }
        return rectangle;
    }

    getEndPoint() {
        let angle = Shape.toRadians(-this.getAngleStart() - this.getAngleExtent()),
            x = this.getX() + (Math.cos(angle) * 0.5 + 0.5) * this.getWidth(),
            y = this.getY() + (Math.sin(angle) * 0.5 + 0.5) * this.getHeight();
        return new Point({x: x, y: y});
    }

    getStartPoint() {
        let angle = Shape.toRadians(-this.getAngleStart()),
            x = this.getX() + (Math.cos(angle) * 0.5 + 0.5) * this.getWidth(),
            y = this.getY() + (Math.sin(angle) * 0.5 + 0.5) * this.getHeight();
        return new Point({x: x, y: y});
    }

    hashCode() {
        let bits = this.getX();
        bits += this.getY() * 37;
        bits += this.getWidth() * 43;
        bits += this.getHeight() * 47;
        bits += this.getAngleStart() * 53;
        bits += this.getAngleExtent() * 59;
        bits += this.getArcType() * 61;
        return bits ^ bits >> 32;
    }

    intersects(x, y, width, height) {
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
            let aw = this.getWidth(), ah = this.getHeight();
            let w = width;
            let h = height;
            if (w <= 0 || h <= 0 || aw <= 0 || ah <= 0) {
                return false;
            }
            let ext = this.getAngleExtent();
            if (ext === 0) {
                return false;
            }
            let ax = this.getX(), ay = this.getY(), axw = ax + aw, ayh = ay + ah, xw = x + w, yh = y + h;
            if (x >= axw || y >= ayh || xw <= ax || yh <= ay) {
                return false;
            }
            let axc = this.getCenterX(), ayc = this.getCenterY(), sp = this.getStartPoint(), ep = this.getEndPoint(),
                sx = sp.getX(), sy = sp.getY(), ex = ep.getX(), ey = ep.getY();
            if (ayc >= y && ayc <= yh) {
                if ((sx < xw && ex < xw && axc < xw &&
                    axw > x && this.containsAngle(0)) ||
                    (sx > x && ex > x && axc > x &&
                    ax < xw && this.containsAngle(180))) {
                    return true;
                }
            }
            if (axc >= x && axc <= xw) {
                if ((sy > y && ey > y && ayc > y &&
                    ay < yh && this.containsAngle(90)) ||
                    (sy < yh && ey < yh && ayc < yh &&
                    ayh > y && this.containsAngle(270))) {
                    return true;
                }
            }
            let rect = new Rectangle({x: x, y: y, width: w, height: h});
            if (type === PIE || Math.abs(ext) > 180) {
                if (rect.intersectsLine(axc, ayc, sx, sy) ||
                    rect.intersectsLine(axc, ayc, ex, ey)) {
                    return true;
                }
            } else {
                if (rect.intersectsLine(sx, sy, ex, ey)) {
                    return true;
                }
            }
            if (this.contains(x, y) || this.contains(x + w, y) ||
                this.contains(x, y + h) || this.contains(x + w, y + h)) {
                return true;
            }
        }
        return false;
    }

    makeBounds(x, y, w, h) {
        return new Rectangle({x: x, y: y, width: w, height: h});
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        context.arc(this.getCenterX(), this.getCenterY(), Math.max(this.getWidth(), this.getHeight()), this.getAngleStart(), this.getAngleExtent(), true);
        context.closePath();
        super.render(context, style, clip);
    }

    setAngleExtent(extent) {
        this.extent = extent;
    }

    setAngles(x1, y1, x2 = NaN, y2 = NaN) {
        if (x1 instanceof Point && y2 instanceof Point) {
            let p1 = x1,
                p2 = x2;
            this.setAngles(p1.getX(), p1.getY(), p2.getX(), p2.getY());
        } else {
            let x = this.getCenterX(), y = this.getCenterY(), w = this.getWidth(), h = this.getHeight();
            let ang1 = Math.atan2(w * (y - y1), h * (x1 - x)), ang2 = Math.atan2(w * (y - y2), h * (x2 - x));
            ang2 -= ang1;
            if (ang2 <= 0.0) {
                ang2 += Math.PI * 2.0;
            }
            this.setAngleStart(Shape.toDegrees(ang1));
            this.setAngleExtent(Shape.toDegrees(ang2));
        }
    }

    setAngleStart(start) {
        if (start instanceof Point) {
            let p = start;
            let dx = this.getHeight() * (p.getX() - this.getCenterX()),
                dy = this.getWidth() * (p.getY() - this.getCenterY());
            this.setAngleStart(-Shape.toDegrees(Math.atan2(dy, dx)));
        } else {
            this.start = start;
        }
    }

    setArc(x, y = NaN, w = NaN, h = NaN, angSt = NaN, angExt = NaN, closure = NaN) {
        if (x instanceof Arc) {
            let a = x;
            this.setArc(a.getX(), a.getY(), a.getWidth(), a.getHeight(), a.getAngleStart(), a.getAngleExtent(), a.type);
        } else if (x instanceof Rectangle) {
            let rect = x, a = y, e = w, c = h;
            this.setArc(rect.getX(), rect.getY(), rect.getWidth(), rect.getHeight(), a, e, c);
        } else if (x instanceof Point && y instanceof Dimension) {
            let loc = x, size = y, a = w, e = h, c = angSt;
            this.setArc(loc.getX(), loc.getY(), size.getWidth(), size.getHeight(), a, e, c);
        } else {
            this.setArcType(closure);
            this.x = x;
            this.y = y;
            this.width = w;
            this.height = h;
            this.start = angSt;
            this.extent = angExt;
        }
    }

    setArcByCenter(x, y, radius, angSt, angExt, closure) {
        this.setArc(x - radius, y - radius, radius * 2.0, radius * 2.0, angSt, angExt, closure);
    }

    setArcByTangent(p1, p2, p3, radius) {
        let ang1 = Math.atan2(p1.getY() - p2.getY(), p1.getX() - p2.getX()),
            ang2 = Math.atan2(p3.getY() - p2.getY(), p3.getX() - p2.getX()), diff = ang2 - ang1;
        if (diff > Math.PI) {
            ang2 -= Math.PI * 2.0;
        } else if (diff < -Math.PI) {
            ang2 += Math.PI * 2.0;
        }
        let bisect = (ang1 + ang2) / 2.0, theta = Math.abs(ang2 - bisect), dist = radius / Math.sin(theta),
            y = p2.getY() + dist * Math.sin(bisect);
        if (ang1 < ang2) {
            ang1 -= Math.PI / 2.0;
            ang2 += Math.PI / 2.0;
        } else {
            ang1 += Math.PI / 2.0;
            ang2 -= Math.PI / 2.0;
        }
        ang1 = Shape.toDegrees(-ang1);
        ang2 = Shape.toDegrees(-ang2);
        diff = ang2 - ang1;
        if (diff < 0) {
            diff += 360;
        } else {
            diff -= 360;
        }
        this.setArcByCenter(x, y, radius, ang1, diff, type);
    }

    setArcType(type) {
        if (type < OPEN || type > PIE) {
            throw new Error("IllegalArgumentException", "invalid type for Arc: " + type);
        }
        this.type = type;
    }

    setFrame(x, y, w, h) {
        this.setArc(x, y, w, h, this.getAngleStart(), this.getAngleExtent(), this.type);
    }

    toString() {
        return this.constructor.name + "[x=" + this.x + ",y=" + this.y + ",w=" + this.width + ",h=" + this.height + ",start=" + this.start + ",extent=" + this.extent + ",type=" + this.type + "]";
    }
}

