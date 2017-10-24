/** @babel */

export class Point {

    constructor({x = 0, y = 0}={}) {
        let options = arguments[0];
        if (options instanceof Point) {
            this.x = options.x;
            this.y = options.y;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    clone() {
        return new Point(this);
    }

    distance(px, py=NaN) {
        if (px instanceof Point) {
            let pt = px;
            px = pt.getX() - this.getX();
            py = pt.getY() - this.getY();
            return Math.sqrt(px * px + py * py);
        } else {
            px -= this.getX();
            py -= this.getY();
            return Math.sqrt(px * px + py * py);
        }
    }

    distanceSq(px, py=NaN) {
        if (px instanceof Point) {
            let pt = px;
            px = pt.getX() - this.getX();
            py = pt.getY() - this.getY();
            return (px * px + py * py);
        } else {
            px -= this.getX();
            py -= this.getY();
            return (px * px + py * py);
        }
    }

    equals(obj) {
        if (obj instanceof Point) {
            let pt = obj;
            return (this.getX() === pt.getX()) && (this.getY() === pt.getY());
        }
        return false;
    }

    static getDistance(x1=0, y1=0, x2=0, y2=0) {
        x1 -= x2;
        y1 -= y2;
        return Math.sqrt(x1 * x1 + y1 * y1);
    }

    static getDistanceSq(x1=0, y1=0, x2=0, y2=0) {
        x1 -= x2;
        y1 -= y2;
        return (x1 * x1 + y1 * y1);
    }

    getLocation() {
        return new Point(this);
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    hashCode() {
        let bits = this.getX();
        bits ^= this.getY() * 31;
        return bits ^ bits >> 32;
    }

    move(x=0, y=0) {
        this.setLocation(x, y);
    }

    setLocation(x, y=NaN) {
        if (x instanceof Point) {
            this.setLocation(x.x, x.y);
        } else {
            this.x = x;
            this.y = y;
        }
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }

    toString() {
        return this.constructor.name + "[x=" + this.x + ",y=" + this.y + "]"
    }

    translate(dx=0, dy=0) {
        this.x += dx;
        this.y += dy;
    }

}
