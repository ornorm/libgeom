/** @babel */
export class Insets {

    constructor({top = 0, left = 0, bottom = 0, right = 0}={}) {
        this.top = top;
        this.left = left;
        this.bottom = bottom;
        this.right = right;
    }

    equals(obj) {
        if (obj instanceof Insets) {
            let insets = obj;
            return ((this.top === insets.top) && (this.left === insets.left) &&
            (this.bottom === insets.bottom) && (this.right === insets.right));
        }
        return false;
    }

    hashCode() {
        let sum1 = this.left + this.bottom,
            sum2 = this.right + this.top,
            val1 = sum1 * (sum1 + 1) / 2 + this.left,
            val2 = sum2 * (sum2 + 1) / 2 + this.top, sum3 = val1 + val2;
        return sum3 * (sum3 + 1) / 2 + val2;
    }

    set(top, left, bottom, right) {
        this.top = top;
        this.left = left;
        this.bottom = bottom;
        this.right = right;
    }

    toString() {
        return this.constructor.name + "[top=" + this.top + ",left=" + this.left + ",bottom=" + this.bottom + ",right=" + this.right + "]";
    }
}
