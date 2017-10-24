/** @babel */
export class Dimension {

    constructor({width = NaN, height = NaN, topLeft = null, bottomRight = null} = {}) {
        this.width = this.height = 0;
        let options = arguments[0];
        if (options) {
            if (options instanceof Dimension) {
                this.width = options.width;
                this.height = options.height;
            } else {
                if (topLeft && bottomRight) {
                    let p1 = topLeft;
                    let p2 = bottomRight;
                    this.width = p2.getX() - p1.getX();
                    this.height = p2.getY() - p1.getY();
                } else {
                    if (!isNaN(width)) {
                        this.width = width;
                    }
                    if (!isNaN(height)) {
                        this.height = height;
                    }
                }
            }
        }
    }

    clone() {
        return new Dimension(this);
    }

    equals(obj) {
        if (obj instanceof Dimension) {
            let d = obj;
            return (this.width === d.width) && (this.height === d.height);
        }
        return false;
    }

    getHeight() {
        return this.height;
    }

    getSize() {
        return new Dimension({width: this.width, height: this.height});
    }

    getWidth() {
        return this.width;
    }

    hashCode() {
        let sum = this.width + this.height;
        return sum * (sum + 1) / 2 + width;
    }

    setHeight(height) {
        this.height = height;
    }

    setSize(width, height = NaN) {
        if (width instanceof Dimension) {
            this.setSize(width.getWidth(), width.getHeight());
        } else {
            this.width = width;
            this.height = height;
        }
    }

    setWidth(width) {
        this.width = width;
    }

    toString() {
        return this.constructor.name + "[width=" + this.width + ",height=" + this.height + "]";
    }
}
