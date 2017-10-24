/** @babel */
import {Point} from "./point";
import {Dimension} from "./dimension";
import {PathIterator} from "./iterator";
import {Shape} from "./shape";
import {Line} from "./line";

export class RectIterator extends PathIterator {

    constructor({transform = null, shape = null} = {}) {
        super();
        this.x = this.y = this.width = this.height = this.index = 0;
        this.shape = shape;
        this.transform = transform;
        if (this.shape) {
            this.x = this.shape.getX();
            this.y = this.shape.getY();
            this.w = this.shape.getWidth();
            this.h = this.shape.getHeight();
        }
        if (this.w < 0 || this.h < 0) {
            this.index = 6;
        }
    }

    currentSegment(coords) {
        if (this.isDone()) {
            throw new RangeError("NoSuchElementException rect iterator out of bounds");
        }
        if (this.index === 5) {
            return PathIterator.SEG_CLOSE;
        }
        coords[0] = this.x;
        coords[1] = this.y;
        if (this.index === 1 || this.index === 2) {
            coords[0] += this.w;
        }
        if (this.index === 2 || this.index === 3) {
            coords[1] += this.h;
        }
        if (this.transform) {
            this.transform.transform(coords, 0, coords, 0, 1);
        }
        return (this.index === 0 ? PathIterator.SEG_MOVETO : PathIterator.SEG_LINETO);
    }

    getWindingRule() {
        return PathIterator.WIND_NON_ZERO;
    }

    isDone() {
        return this.index > 5;
    }

    next() {
        this.index++;
    }
}

const MAX_VALUE = Number.MAX_VALUE,
    MIN_VALUE = Number.MIN_VALUE;

const OUT_LEFT = 1, OUT_TOP = 2, OUT_RIGHT = 4, OUT_BOTTOM = 8;

export class Rectangle extends Shape {

    constructor({x = NaN, y = NaN, width = NaN, height = NaN, insetX = NaN, insetY = NaN, point = null, dimension = null} = {}) {
        super();
        let options = arguments[0];
        if (options instanceof Rectangle) {
            this.x = options.x;
            this.y = options.y;
            this.width = options.width;
            this.height = options.height;
            this.empty = options.isEmpty();
        } else {
            this.x = this.y = this.width = this.height = 0;
            if (point) {
                this.x = point.x;
                this.y = point.y;
            } else {
                if (!isNaN(x)) {
                    this.x = x;
                }
                if (!isNaN(y)) {
                    this.x = y;
                }
            }
            if (dimension) {
                this.width = dimension.x;
                this.height = dimension.y;
            } else {
                if (!isNaN(width)) {
                    this.width = width;
                }
                if (!isNaN(height)) {
                    this.height = height;
                }
            }
            if (!isNaN(insetX) && !isNaN(insetY)) {
                this.inset(insetX, insetY);
            }
            this.empty = this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0;
        }
    }

    add(newx, newy = NaN) {
        if (newx instanceof Point) {
            this.add(newx.getX(), newx.getY());
        }
        if (newx instanceof Rectangle) {
            let r = newx;
            let tx2 = this.width, ty2 = this.height;
            if ((tx2 | ty2) < 0) {
                this.reshape(r.x, r.y, r.width, r.height);
            }
            let rx2 = r.width, ry2 = r.height;
            if ((rx2 | ry2) < 0) {
                return;
            }
            let tx1 = this.x, ty1 = this.y;
            tx2 += tx1;
            ty2 += ty1;
            let rx1 = r.x, ry1 = r.y;
            rx2 += rx1;
            ry2 += ry1;
            if (tx1 > rx1) tx1 = rx1;
            if (ty1 > ry1) ty1 = ry1;
            if (tx2 < rx2) tx2 = rx2;
            if (ty2 < ry2) ty2 = ry2;
            tx2 -= tx1;
            ty2 -= ty1;
            if (tx2 > MAX_VALUE) tx2 = MAX_VALUE;
            if (ty2 > MAX_VALUE) ty2 = MAX_VALUE;
            this.reshape(tx1, ty1, tx2, ty2);
        } else {
            if ((this.width | this.height) < 0) {
                this.x = newx;
                this.y = newy;
                this.width = this.height = 0;
                return;
            }
            let x1 = this.x, y1 = this.y, x2 = this.width, y2 = this.height;
            x2 += x1;
            y2 += y1;
            if (x1 > newx) x1 = newx;
            if (y1 > newy) y1 = newy;
            if (x2 < newx) x2 = newx;
            if (y2 < newy) y2 = newy;
            x2 -= x1;
            y2 -= y1;
            if (x2 > MAX_VALUE) x2 = MAX_VALUE;
            if (y2 > MAX_VALUE) y2 = MAX_VALUE;
            this.reshape(x1, y1, x2, y2);
        }
    }

    static clip(v = 0, doceil = false) {
        if (v === 0) {
            return 0;
        }
        if (v <= MIN_VALUE) {
            return MIN_VALUE;
        }
        if (v >= MAX_VALUE) {
            return MAX_VALUE;
        }
        return (doceil ? Math.ceil(v) : Math.floor(v));
    }

    clone() {
        return new Rectangle(this);
    }

    contains(x, y = NaN, w = NaN, h = NaN) {
        if (x instanceof Point) {
            return this.contains(x.getX(), x.getY());
        } else if (x instanceof Rectangle) {
            return this.contains(x.getX(), x.getY(), x.getWidth(), x.getHeight());
        } else {
            let x0 = this.getX(),
                y0 = this.getY();
            if (isNaN(w) && isNaN(h)) {
                return (x >= x0 && y >= y0 && x <= x0 + this.getWidth() && y <= y0 + this.getHeight());
            }
            if (this.isEmpty() || w <= 0 || h <= 0) {
                return false;
            }
            return (x >= x0 && y >= y0 && (x + w) <= x0 + this.getWidth() && (y + h) <= y0 + this.getHeight());
        }
    }

    createIntersection(r) {
        let dest = new Rectangle();
        Rectangle.intersect(this, r, dest);
        return dest;
    }

    createUnion(r) {
        return Rectangle.union(this, r, new Rectangle());
    }

    deltaRequiredToCenter(targetBounds) {
        let result = new Dimension();
        let xDelta = this.getCenterX() - targetBounds.getCenterX();
        let yDelta = this.getCenterY() - targetBounds.getCenterY();
        result.setSize(xDelta, yDelta);
        return result;
    }

    deltaRequiredToContain(targetBounds) {
        let result = new Dimension();
        if (this.contains(targetBounds)) {
            return result;
        }
        let targetMaxX = targetBounds.getMaxX();
        let targetMinX = targetBounds.getMinX();
        let targetMaxY = targetBounds.getMaxY();
        let targetMinY = targetBounds.getMinY();
        let maxX = this.getMaxX();
        let minX = this.getMinX();
        let maxY = this.getMaxY();
        let minY = this.getMinY();
        if (targetMaxX > maxX || targetMinX < minX) {
            let difMaxX = targetMaxX - maxX;
            let difMinX = targetMinX - minX;
            if (Math.abs(difMaxX) < Math.abs(difMinX)) {
                result.width = difMaxX;
            } else {
                result.width = difMinX;
            }
        }
        if (targetMaxY > maxY || targetMinY < minY) {
            let difMaxY = targetMaxY - maxY;
            let difMinY = targetMinY - minY;
            if (Math.abs(difMaxY) < Math.abs(difMinY)) {
                result.height = difMaxY;
            }
            else {
                result.height = difMinY;
            }
        }
        return result;
    }

    equals(obj) {
        if (obj === this) {
            return true;
        }
        if (obj instanceof Rectangle) {
            let r2d = obj;
            return ((this.getX() === r2d.getX()) &&
            (this.getY() === r2d.getY()) &&
            (this.getWidth() === r2d.getWidth()) &&
            (this.getHeight() === r2d.getHeight()));
        }
        return false;
    }

    expandNearestIntegerDimensions() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.width = Math.ceil(this.width);
        this.height = Math.ceil(this.height);
    }

    getBounds(rectangle = null) {
        let width = this.getWidth(), height = this.getHeight();
        if (width < 0 || height < 0) {
            return new Rectangle();
        }
        let x = this.getX(), y = this.getY(), x1 = Math.floor(x), y1 = Math.floor(y), x2 = Math.ceil(x + width),
            y2 = Math.ceil(y + height);
        if (rectangle) {
            rectangle.reshape(x1, y1, x2 - x1, y2 - y1);
        } else {
            rectangle = new Rectangle({x: x1, y: y1, width: x2 - x1, height: y2 - y1});
        }
        return rectangle;
    }

    getCenter() {
        return new Point({x: this.getCenterX(), y: this.getCenterY()});
    }

    getCenterX() {
        return this.getX() + this.getWidth() / 2.0;
    }

    getCenterY() {
        return this.getY() + this.getHeight() / 2.0;
    }

    getFrame() {
        return new Rectangle({x: this.getX(), y: this.getY(), width: this.getWidth(), height: this.getHeight()});
    }

    getHeight() {
        return this.height;
    }

    getLocation() {
        return new Point({x: this.x, y: this.y});
    }

    getMaxX() {
        return this.getX() + this.getWidth();
    }

    getMaxY() {
        return this.getY() + this.getHeight();
    }

    getMinX() {
        return this.getX();
    }

    getMinY() {
        return this.getY();
    }

    getOrigin() {
        this.getLocation();
    }

    getPath2D() {
        this.path2D = new Path2D();
        this.path2D.rect(this.getX(), this.getY(), this.getWidth(), this.getHeight());
        return this.path2D;
    }

    getPathIterator(transform, flatness = NaN) {
        return new RectIterator({shape: this, transform});
    }

    getSize() {
        return new Dimension({width: this.width, height: this.height});
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    grow(h = 0, v = 0) {
        let x0 = this.x,
            y0 = this.y,
            x1 = this.width,
            y1 = this.height;
        x1 += x0;
        y1 += y0;
        x0 -= h;
        y0 -= v;
        x1 += h;
        y1 += v;
        if (x1 < x0) {
            x1 -= x0;
            if (x1 < MIN_VALUE) x1 = MIN_VALUE;
            if (x0 < MIN_VALUE) x0 = MIN_VALUE;
            else if (x0 > MAX_VALUE) x0 = MAX_VALUE;
        } else {
            if (x0 < MIN_VALUE) x0 = MIN_VALUE;
            else if (x0 > MAX_VALUE) x0 = MAX_VALUE;
            x1 -= x0;
            if (x1 < MIN_VALUE) x1 = MIN_VALUE;
            else if (x1 > MAX_VALUE) x1 = MAX_VALUE;
        }
        if (y1 < y0) {
            y1 -= y0;
            if (y1 < MIN_VALUE) y1 = MIN_VALUE;
            if (y0 < MIN_VALUE) y0 = MIN_VALUE;
            else if (y0 > MAX_VALUE) y0 = MAX_VALUE;
        } else {
            if (y0 < MIN_VALUE) y0 = MIN_VALUE;
            else if (y0 > MAX_VALUE) y0 = MAX_VALUE;
            y1 -= y0;
            if (y1 < MIN_VALUE) y1 = MIN_VALUE;
            else if (y1 > MAX_VALUE) y1 = MAX_VALUE;
        }
        this.reshape(x0, y0, x1, y1);
    }

    hashCode() {
        let bits = this.getX();
        bits += this.getY() * 37;
        bits += this.getWidth() * 43;
        bits += this.getHeight() * 47;
        return bits ^ bits >> 32;
    }

    inset(dx = 0, dy = 0) {
        this.setRect(this.x + dx, this.y + dy, this.width - dx * 2, this.height - dy * 2);
        return this;
    }

    inside(X = 0, Y = 0, W = NaN, H = NaN) {
        let w = null;
        let h = null;
        if (isNaN(W) && isNaN(H)) {
            w = this.getWidth();
            h = this.getHeight();
            if ((w | h) < 0) {
                return false;
            }
            let x = this.x, y = this.y;
            if (X < x || Y < y) {
                return false;
            }
            w += x;
            h += y;
            return ((w < x || w > X) && (h < y || h > Y));
        }
        w = this.width;
        h = this.height;
        if ((w | h | W | H) < 0) {
            return false;
        }
        let x = this.x, y = this.y;
        if (X < x || Y < y) {
            return false;
        }
        w += x;
        W += X;
        if (W <= X) {
            if (w >= x || W > w) return false;
        } else {
            if (w >= x && W > w) return false;
        }
        h += y;
        H += Y;
        if (H <= Y) {
            if (h >= y || H > h) return false;
        } else {
            if (h >= y && H > h) return false;
        }
        return true;
    }

    static intersect(src1, src2, dest) {
        let x1 = Math.max(src1.getMinX(), src2.getMinX()), y1 = Math.max(src1.getMinY(), src2.getMinY()),
            x2 = Math.min(src1.getMaxX(), src2.getMaxX()), y2 = Math.min(src1.getMaxY(), src2.getMaxY());
        dest.setFrame(x1, y1, x2 - x1, y2 - y1);
        return dest;
    }

    intersection(r) {
        let tx1 = this.x, ty1 = this.y, rx1 = r.x, ry1 = r.y, tx2 = tx1;
        tx2 += this.width;
        let ty2 = ty1;
        ty2 += this.height;
        let rx2 = rx1;
        rx2 += r.width;
        let ry2 = ry1;
        ry2 += r.height;
        if (tx1 < rx1) tx1 = rx1;
        if (ty1 < ry1) ty1 = ry1;
        if (tx2 > rx2) tx2 = rx2;
        if (ty2 > ry2) ty2 = ry2;
        tx2 -= tx1;
        ty2 -= ty1;
        if (tx2 < MIN_VALUE) tx2 = MIN_VALUE;
        if (ty2 < MIN_VALUE) ty2 = MIN_VALUE;
        return new Rectangle({x: tx1, y: ty1, width: tx2, height: ty2});
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
            if (this.isEmpty() || width <= 0 || height <= 0) {
                return false;
            }
            let x0 = this.getX(), y0 = this.getY();
            return (x + width > x0 && y + height > y0 && x < x0 + this.getWidth() && y < y0 + this.getHeight());
        }
    }

    intersectsLine(x1, y1 = NaN, x2 = NaN, y2 = NaN) {
        if (x1 instanceof Line) {
            return this.intersectsLine(x1.getX1(), x1.getY1(), x1.getX2(), x1.getY2());
        }
        let out1, out2;
        if ((out2 = this.outcode(x2, y2)) === 0) {
            return true;
        }
        while ((out1 = this.outcode(x1, y1)) !== 0) {
            if ((out1 & out2) !== 0) {
                return false;
            }
            if ((out1 & (OUT_LEFT | OUT_RIGHT)) !== 0) {
                let x = this.getX();
                if ((out1 & OUT_RIGHT) !== 0) {
                    x += this.getWidth();
                }
                y1 = y1 + (x - x1) * (y2 - y1) / (x2 - x1);
                x1 = x;
            } else {
                let y = this.getY();
                if ((out1 & OUT_BOTTOM) !== 0) {
                    y += this.getHeight();
                }
                x1 = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
                y1 = y;
            }
        }
        return true;
    }

    isEmpty() {
        return this.width <= 0.0 || this.height <= 0.0;
    }

    move(x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.empty = false;
    }

    moveBy(dx = 0, dy = 0) {
        this.setOrigin(this.x + dx, this.y + dy);
        return this;
    }

    outcode(x, y = 0) {
        if (x instanceof Point) {
            return this.outcode(x.getX(), x.getY());
        }
        let out = 0;
        if (this.width <= 0) {
            out |= OUT_LEFT | OUT_RIGHT;
        } else if (x < this.x) {
            out |= OUT_LEFT;
        } else if (x > this.x + this.width) {
            out |= OUT_RIGHT;
        }
        if (this.height <= 0) {
            out |= OUT_TOP | OUT_BOTTOM;
        } else if (y < this.y) {
            out |= OUT_TOP;
        } else if (y > this.y + this.height) {
            out |= OUT_BOTTOM;
        }
        return out;
    }

    render(context, style = 0, clip = false) {
        context.beginPath();
        if (style === 0) {
            context.fillRect(this.getX(), this.getY(), this.getWidth(), this.getHeight());
        } else if (style === 1) {
            context.strokeRect(this.getX(), this.getY(), this.getWidth(), this.getHeight());
        } else {
            context.fillRect(this.getX(), this.getY(), this.getWidth(), this.getHeight());
            context.strokeRect(this.getX(), this.getY(), this.getWidth(), this.getHeight());
        }
        context.closePath();
        if (clip) {
            context.clip();
        }
    }

    reset() {
        this.empty = true;
        return this;
    }

    resetToZero() {
        this.x = this.y = this.width = this.height = 0;
        this.empty = true;
        return this;
    }

    reshape(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.empty = false;
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
    }

    setBounds(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            this.setBounds(x.x, x.y, x.width, x.height);
            this.empty = x.empty;
        } else {
            this.reshape(x, y, width, height);
        }
    }

    setFrame(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            this.setFrame(x.getX(), x.getY(), x.getWidth(), x.getHeight());
        } else if (x instanceof Point && y instanceof Dimension) {
            this.setFrame(x.getX(), x.getY(), y.getWidth(), y.getHeight());
        } else {
            this.setRect(x, y, width, height);
        }
    }

    setFrameFromCenter(centerX, centerY, cornerX = NaN, cornerY = NaN) {
        if (centerX instanceof Point && centerY instanceof Point) {
            let center = centerX, corner = centerY;
            this.setFrameFromCenter(center.getX(), center.getY(),
                corner.getX(), corner.getY());
        } else {
            let halfW = Math.abs(cornerX - centerX), halfH = Math.abs(cornerY - centerY);
            this.setFrame(centerX - halfW, centerY - halfH, halfW * 2.0, halfH * 2.0);
        }
    }

    setFrameFromDiagonal(x1, y1, x2 = NaN, y2 = NaN) {
        if (x1 instanceof Point && y1 instanceof Point) {
            this.setFrameFromDiagonal(x1.getX(), x1.getY(), y1.getX(), y1.getY());
        } else {
            let t = null;
            if (x2 < x1) {
                t = x1;
                x1 = x2;
                x2 = t;
            }
            if (y2 < y1) {
                t = y1;
                y1 = y2;
                y2 = t;
            }
            this.setFrame(x1, y1, x2 - x1, y2 - y1);
        }
    }

    setHeight(height) {
        this.height = height;
    }

    setLocation(x, y = NaN) {
        if (x instanceof Point) {
            this.setLocation(x.x, x.y);
        } else {
            this.move(x, y);
        }
    }

    setOrigin(x, y) {
        this.move(x, y);
        return this;
    }

    setRect(x, y = NaN, width = NaN, height = NaN) {
        if (x instanceof Rectangle) {
            let r = x;
            this.setRect(r.getX(), r.getY(), r.getWidth(), r.getHeight());
        } else {
            let newx, newy, neww, newh;
            if (x > 2.0 * MAX_VALUE) {
                newx = MAX_VALUE;
                neww = -1;
            } else {
                newx = Rectangle.clip(x, false);
                if (width >= 0) {
                    width += x - newx;
                }
                neww = Rectangle.clip(width, width >= 0);
            }
            if (y > 2.0 * MAX_VALUE) {
                newy = MAX_VALUE;
                newh = -1;
            } else {
                newy = Rectangle.clip(y, false);
                if (height >= 0) height += y - newy;
                newh = Rectangle.clip(height, height >= 0);
            }
            this.reshape(newx, newy, neww, newh);
        }
    }

    setSize(width, height = NaN) {
        if (width instanceof Dimension) {
            this.setSize(width.width, width.height);
        } else {
            this.resize(width, height);
        }
    }

    setWidth(width) {
        this.width = width;
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }

    toString() {
        return this.constructor.name + "[x=" + this.x + ",y=" + this.y + ",w=" + this.width + ",h=" + this.height + "]";
    }

    translate(dx = 0, dy = 0) {
        let oldv = this.x, newv = oldv + dx;
        if (dx < 0) {
            if (newv > oldv) {
                if (this.width >= 0) {
                    this.width += newv - MIN_VALUE;
                }
                newv = MIN_VALUE;
            }
        } else {
            if (newv < oldv) {
                if (this.width >= 0) {
                    this.width += newv - MAX_VALUE;
                    if (width < 0) this.width = MAX_VALUE;
                }
                newv = MAX_VALUE;
            }
        }
        this.x = newv;
        oldv = this.y;
        newv = oldv + dy;
        if (dy < 0) {
            if (newv > oldv) {
                if (this.height >= 0) {
                    this.height += newv - MIN_VALUE;
                }
                newv = MIN_VALUE;
            }
        } else {
            if (newv < oldv) {
                if (this.height >= 0) {
                    this.height += newv - MAX_VALUE;
                    if (this.height < 0) this.height = MAX_VALUE;
                }
                newv = MAX_VALUE;
            }
        }
        this.y = newv;
    }

    union(r) {
        let tx2 = this.width, ty2 = this.height;
        if ((tx2 | ty2) < 0) {
            return new Rectangle(r);
        }
        let rx2 = r.width, ry2 = r.height;
        if ((rx2 | ry2) < 0) {
            return new Rectangle({x: this.x, y: this.y, width: this.width, height: this.height});
        }
        let tx1 = this.x, ty1 = this.y;
        tx2 += tx1;
        ty2 += ty1;
        let rx1 = r.x, ry1 = r.y;
        rx2 += rx1;
        ry2 += ry1;
        if (tx1 > rx1) tx1 = rx1;
        if (ty1 > ry1) ty1 = ry1;
        if (tx2 < rx2) tx2 = rx2;
        if (ty2 < ry2) ty2 = ry2;
        tx2 -= tx1;
        ty2 -= ty1;
        if (tx2 > MAX_VALUE) tx2 = MAX_VALUE;
        if (ty2 > MAX_VALUE) ty2 = MAX_VALUE;
        return new Rectangle({x: tx1, y: ty1, width: tx2, height: ty2});
    }

    static union(src1, src2, dest) {
        let x1 = Math.min(src1.getMinX(), src2.getMinX()), y1 = Math.min(src1.getMinY(), src2.getMinY()),
            x2 = Math.max(src1.getMaxX(), src2.getMaxX()), y2 = Math.max(src1.getMaxY(), src2.getMaxY());
        dest.setFrameFromDiagonal(x1, y1, x2, y2);
        return dest;
    }

}