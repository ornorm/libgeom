/** @babel */
import * as util from "hjs-core/lib/util";
import {Point} from "./point";
import {Dimension} from "./dimension";
import {Rectangle} from "./rectangle";

export const TYPE_UNKNOWN = -1,
    TYPE_IDENTITY = 0,
    TYPE_TRANSLATION = 1,
    TYPE_UNIFORM_SCALE = 2,
    TYPE_GENERAL_SCALE = 4,
    TYPE_MASK_SCALE = (TYPE_UNIFORM_SCALE | TYPE_GENERAL_SCALE),
    TYPE_FLIP = 64,
    TYPE_QUADRANT_ROTATION = 8,
    TYPE_GENERAL_ROTATION = 16,
    TYPE_MASK_ROTATION = (TYPE_QUADRANT_ROTATION | TYPE_GENERAL_ROTATION),
    TYPE_GENERAL_TRANSFORM = 32,
    APPLY_IDENTITY = 0,
    APPLY_TRANSLATE = 1,
    APPLY_SCALE = 2,
    APPLY_SHEAR = 4,
    HI_SHIFT = 3,
    HI_IDENTITY = APPLY_IDENTITY << HI_SHIFT,
    HI_TRANSLATE = APPLY_TRANSLATE << HI_SHIFT,
    HI_SCALE = APPLY_SCALE << HI_SHIFT,
    HI_SHEAR = APPLY_SHEAR << HI_SHIFT;

const rot90conversion = [
    APPLY_SHEAR,
    APPLY_SHEAR | APPLY_TRANSLATE,
    APPLY_SHEAR,
    APPLY_SHEAR | APPLY_TRANSLATE,
    APPLY_SCALE,
    APPLY_SCALE | APPLY_TRANSLATE,
    APPLY_SHEAR | APPLY_SCALE,
    APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE
];

const MAX_VALUE = Number.MAX_VALUE,
    MIN_VALUE = Number.MIN_VALUE;

const PTS1 = new Array(8),
    PTS2 = new Array(8);

export class AffineTransform {

    constructor({
                    flatmatrix = null,
                    m00 = NaN,
                    scaleX = NaN,
                    m10 = NaN,
                    shearY = NaN,
                    m01 = NaN,
                    shearX = NaN,
                    m11 = NaN,
                    scaleY = NaN,
                    m02 = NaN,
                    translateX = NaN,
                    m12 = NaN,
                    translateY = NaN,
                    state = NaN
                } = {}) {
        this.transformStack = [];
        let options = arguments[0];
        if (options) {
            if (flatmatrix) {
                this.m00 = flatmatrix[0];
                this.m10 = flatmatrix[1];
                this.m01 = flatmatrix[2];
                this.m11 = flatmatrix[3];
                if (flatmatrix.length > 5) {
                    this.m02 = flatmatrix[4];
                    this.m12 = flatmatrix[5];
                }
            } else {
                if (options instanceof AffineTransform) {
                    this.type = options.type;
                    this.setToIdentity();
                    this.setTransform(options);
                } else {
                    if (!isNaN(m00)) {
                        this.m00 = m00;
                    } else if (!isNaN(scaleX)) {
                        this.m00 = scaleX;
                    } else {
                        this.m00 = 1;
                    }
                    if (!isNaN(m10)) {
                        this.m10 = m10;
                    } else if (!isNaN(shearY)) {
                        this.m10 = shearY;
                    } else {
                        this.m10 = 0;
                    }
                    if (!isNaN(m01)) {
                        this.m01 = m01;
                    } else if (!isNaN(shearX)) {
                        this.m01 = shearX;
                    } else {
                        this.m01 = 0;
                    }
                    if (!isNaN(m11)) {
                        this.m11 = m11;
                    } else if (!isNaN(scaleY)) {
                        this.m11 = scaleY;
                    } else {
                        this.m11 = 1;
                    }
                    if (!isNaN(m02)) {
                        this.m02 = m02;
                    } else if (!isNaN(translateX)) {
                        this.m02 = translateX;
                    } else {
                        this.m02 = 0;
                    }
                    if (!isNaN(m12)) {
                        this.m12 = m12;
                    } else if (!isNaN(translateY)) {
                        this.m12 = translateY;
                    } else {
                        this.m12 = 0;
                    }
                    if (!isNaN(state)) {
                        this.state = state;
                    } else {
                        this.state = TYPE_UNKNOWN;
                    }
                }
            }
            this.updateState();
        } else {
            this.setToIdentity();
        }
    }

    calculateType() {
        let ret = TYPE_IDENTITY, sgn0, sgn1, M0, M1, M2, M3;
        this.updateState();
        switch (this.state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                ret = TYPE_TRANSLATION;
            case (APPLY_SHEAR | APPLY_SCALE):
                if ((M0 = this.m00) * (M2 = this.m01) + (M3 = this.m10) * (M1 = this.m11) !== 0) {
                    this.type = TYPE_GENERAL_TRANSFORM;
                    return;
                }
                sgn0 = (M0 >= 0.0);
                sgn1 = (M1 >= 0.0);
                if (sgn0 === sgn1) {
                    if (M0 !== M1 || M2 !== -M3) {
                        ret |= (TYPE_GENERAL_ROTATION | TYPE_GENERAL_SCALE);
                    } else if (M0 * M1 - M2 * M3 !== 1.0) {
                        ret |= (TYPE_GENERAL_ROTATION | TYPE_UNIFORM_SCALE);
                    } else {
                        ret |= TYPE_GENERAL_ROTATION;
                    }
                } else {
                    if (M0 !== -M1 || M2 !== M3) {
                        ret |= (TYPE_GENERAL_ROTATION |
                        TYPE_FLIP |
                        TYPE_GENERAL_SCALE);
                    } else if (M0 * M1 - M2 * M3 !== 1.0) {
                        ret |= (TYPE_GENERAL_ROTATION |
                        TYPE_FLIP |
                        TYPE_UNIFORM_SCALE);
                    } else {
                        ret |= (TYPE_GENERAL_ROTATION | TYPE_FLIP);
                    }
                }
                break;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
                ret = TYPE_TRANSLATION;
            case (APPLY_SHEAR):
                sgn0 = ((M0 = this.m01) >= 0.0);
                sgn1 = ((M1 = this.m10) >= 0.0);
                if (sgn0 !== sgn1) {
                    if (M0 !== -M1) {
                        ret |= (TYPE_QUADRANT_ROTATION | TYPE_GENERAL_SCALE);
                    } else if (M0 !== 1.0 && M0 !== -1.0) {
                        ret |= (TYPE_QUADRANT_ROTATION | TYPE_UNIFORM_SCALE);
                    } else {
                        ret |= TYPE_QUADRANT_ROTATION;
                    }
                } else {
                    if (M0 === M1) {
                        ret |= (TYPE_QUADRANT_ROTATION |
                        TYPE_FLIP |
                        TYPE_UNIFORM_SCALE);
                    } else {
                        ret |= (TYPE_QUADRANT_ROTATION |
                        TYPE_FLIP |
                        TYPE_GENERAL_SCALE);
                    }
                }
                break;
            case (APPLY_SCALE | APPLY_TRANSLATE):
                ret = TYPE_TRANSLATION;
            case (APPLY_SCALE):
                sgn0 = ((M0 = this.m00) >= 0.0);
                sgn1 = ((M1 = this.m11) >= 0.0);
                if (sgn0 === sgn1) {
                    if (sgn0) {
                        if (M0 === M1) {
                            ret |= TYPE_UNIFORM_SCALE;
                        } else {
                            ret |= TYPE_GENERAL_SCALE;
                        }
                    } else {
                        if (M0 !== M1) {
                            ret |= (TYPE_QUADRANT_ROTATION | TYPE_GENERAL_SCALE);
                        } else if (M0 !== -1.0) {
                            ret |= (TYPE_QUADRANT_ROTATION | TYPE_UNIFORM_SCALE);
                        } else {
                            ret |= TYPE_QUADRANT_ROTATION;
                        }
                    }
                } else {
                    if (M0 === -M1) {
                        if (M0 === 1.0 || M0 === -1.0) {
                            ret |= TYPE_FLIP;
                        } else {
                            ret |= (TYPE_FLIP | TYPE_UNIFORM_SCALE);
                        }
                    } else {
                        ret |= (TYPE_FLIP | TYPE_GENERAL_SCALE);
                    }
                }
                break;
            case (APPLY_TRANSLATE):
                ret = TYPE_TRANSLATION;
                break;
            case (APPLY_IDENTITY):
                break;
        }
        this.type = ret;
    }

    clone() {
        return new AffineTransform(this);
    }

    concatenate(Tx) {
        let M0, M1, T00, T01, T10, T11, T02, T12, mystate = this.state, txstate = Tx.state;
        switch ((txstate << HI_SHIFT) | mystate) {
            case (HI_IDENTITY | APPLY_IDENTITY):
            case (HI_IDENTITY | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SCALE):
            case (HI_IDENTITY | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SHEAR):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_SCALE):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                return;
            case (HI_SHEAR | HI_SCALE | HI_TRANSLATE | APPLY_IDENTITY):
                this.m01 = Tx.m01;
                this.m10 = Tx.m10;
            case (HI_SCALE | HI_TRANSLATE | APPLY_IDENTITY):
                this.m00 = Tx.m00;
                this.m11 = Tx.m11;
            case (HI_TRANSLATE | APPLY_IDENTITY):
                this.m02 = Tx.m02;
                this.m12 = Tx.m12;
                this.state = txstate;
                this.type = Tx.type;
                return;
            case (HI_SHEAR | HI_SCALE | APPLY_IDENTITY):
                this.m01 = Tx.m01;
                this.m10 = Tx.m10;
            case (HI_SCALE | APPLY_IDENTITY):
                this.m00 = Tx.m00;
                this.m11 = Tx.m11;
                this.state = txstate;
                this.type = Tx.type;
                return;
            case (HI_SHEAR | HI_TRANSLATE | APPLY_IDENTITY):
                this.m02 = Tx.m02;
                this.m12 = Tx.m12;
            case (HI_SHEAR | APPLY_IDENTITY):
                this.m01 = Tx.m01;
                this.m10 = Tx.m10;
                this.m00 = this.m11 = 0.0;
                this.state = txstate;
                this.type = Tx.type;
                return;
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_SCALE):
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SHEAR):
            case (HI_TRANSLATE | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SCALE):
            case (HI_TRANSLATE | APPLY_TRANSLATE):
                this.translate(Tx.m02, Tx.m12);
                return;
            case (HI_SCALE | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SHEAR | APPLY_SCALE):
            case (HI_SCALE | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SHEAR):
            case (HI_SCALE | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SCALE):
            case (HI_SCALE | APPLY_TRANSLATE):
                this.scale(Tx.m00, Tx.m11);
                return;
            case (HI_SHEAR | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SHEAR | APPLY_SCALE):
                T01 = Tx.m01;
                T10 = Tx.m10;
                M0 = this.m00;
                this.m00 = this.m01 * T10;
                this.m01 = M0 * T01;
                M0 = this.m10;
                this.m10 = this.m11 * T10;
                this.m11 = M0 * T01;
                this.type = TYPE_UNKNOWN;
                return;
            case (HI_SHEAR | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SHEAR):
                this.m00 = this.m01 * Tx.m10;
                this.m01 = 0.0;
                this.m11 = this.m10 * Tx.m01;
                this.m10 = 0.0;
                this.state = mystate ^ (APPLY_SHEAR | APPLY_SCALE);
                this.type = TYPE_UNKNOWN;
                return;
            case (HI_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SCALE):
                this.m01 = this.m00 * Tx.m01;
                this.m00 = 0.0;
                this.m10 = this.m11 * Tx.m10;
                this.m11 = 0.0;
                this.state = mystate ^ (APPLY_SHEAR | APPLY_SCALE);
                this.type = TYPE_UNKNOWN;
                return;
            case (HI_SHEAR | APPLY_TRANSLATE):
                this.m00 = 0.0;
                this.m01 = Tx.m01;
                this.m10 = Tx.m10;
                this.m11 = 0.0;
                this.state = APPLY_TRANSLATE | APPLY_SHEAR;
                this.type = TYPE_UNKNOWN;
                return;
        }
        T00 = Tx.m00;
        T01 = Tx.m01;
        T02 = Tx.m02;
        T10 = Tx.m10;
        T11 = Tx.m11;
        T12 = Tx.m12;
        switch (mystate) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE):
                this.state = mystate | txstate;
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                M0 = this.m00;
                M1 = this.m01;
                this.m00 = T00 * M0 + T10 * M1;
                this.m01 = T01 * M0 + T11 * M1;
                this.m02 += T02 * M0 + T12 * M1;
                M0 = this.m10;
                M1 = this.m11;
                this.m10 = T00 * M0 + T10 * M1;
                this.m11 = T01 * M0 + T11 * M1;
                this.m12 += T02 * M0 + T12 * M1;
                this.type = TYPE_UNKNOWN;
                return;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
            case (APPLY_SHEAR):
                M0 = this.m01;
                this.m00 = T10 * M0;
                this.m01 = T11 * M0;
                this.m02 += T12 * M0;
                M0 = this.m10;
                this.m10 = T00 * M0;
                this.m11 = T01 * M0;
                this.m12 += T02 * M0;
                break;
            case (APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SCALE):
                M0 = this.m00;
                this.m00 = T00 * M0;
                this.m01 = T01 * M0;
                this.m02 += T02 * M0;
                M0 = this.m11;
                this.m10 = T10 * M0;
                this.m11 = T11 * M0;
                this.m12 += T12 * M0;
                break;
            case (APPLY_TRANSLATE):
                this.m00 = T00;
                this.m01 = T01;
                this.m02 += T02;
                this.m10 = T10;
                this.m11 = T11;
                this.m12 += T12;
                this.state = txstate | APPLY_TRANSLATE;
                this.type = TYPE_UNKNOWN;
                return;
        }
        this.updateState();
    }

    createInverse() {
        let det;
        switch (this.state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                det = this.m00 * this.m11 - this.m01 * this.m10;
                if (Math.abs(det) <= MIN_VALUE) {
                    throw new Error("NoninvertibleTransformException Determinant is " + det);
                }
                return new AffineTransform({
                    m00: this.m11 / det,
                    m10: -this.m10 / det,
                    m01: -this.m01 / det,
                    m11: this.m00 / det,
                    m02: (this.m01 * this.m12 - this.m11 * this.m02) / det,
                    m12: (this.m10 * this.m02 - this.m00 * this.m12) / det,
                    state: (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE)
                });
            case (APPLY_SHEAR | APPLY_SCALE):
                det = this.m00 * this.m11 - this.m01 * this.m10;
                if (Math.abs(det) <= MIN_VALUE) {
                    throw new Error("NoninvertibleTransformException Determinant is " + det);
                }
                return new AffineTransform({
                    m00: this.m11 / det,
                    m10: -this.m10 / det,
                    m01: -this.m01 / det,
                    m11: this.m00 / det,
                    m02: 0.0,
                    m12: 0.0,
                    state: (APPLY_SHEAR | APPLY_SCALE)
                });
            case (APPLY_SHEAR | APPLY_TRANSLATE):
                if (this.m01 === 0.0 || this.m10 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                return new AffineTransform({
                    m00: 0.0,
                    m10: 1.0 / this.m01,
                    m01: 1.0 / this.m10,
                    m11: 0.0,
                    m02: -this.m12 / this.m10,
                    m12: -this.m02 / this.m01,
                    state: (APPLY_SHEAR | APPLY_TRANSLATE)
                });
            case (APPLY_SHEAR):
                if (this.m01 === 0.0 || this.m10 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                return new AffineTransform({
                    m00: 0.0,
                    m10: 1.0 / this.m01,
                    m01: 1.0 / this.m10,
                    m11: 0.0,
                    m02: 0.0,
                    m12: 0.0,
                    state: (APPLY_SHEAR)
                });
            case (APPLY_SCALE | APPLY_TRANSLATE):
                if (this.m00 === 0.0 || this.m11 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                return new AffineTransform({
                    m00: 1.0 / this.m00,
                    m10: 0.0,
                    m01: 0.0,
                    m11: 1.0 / this.m11,
                    m02: -this.m02 / this.m00,
                    m12: -this.m12 / this.m11,
                    state: (APPLY_SCALE | APPLY_TRANSLATE)
                });
            case (APPLY_SCALE):
                if (this.m00 === 0.0 || this.m11 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                return new AffineTransform({
                    m00: 1.0 / this.m00,
                    m10: 0.0,
                    m01: 0.0,
                    m11: 1.0 / this.m11,
                    m02: 0.0,
                    m12: 0.0,
                    state: (APPLY_SCALE)
                });
            case (APPLY_TRANSLATE):
                return new AffineTransform({
                    m00: 1.0,
                    m10: 0.0,
                    m01: 0.0,
                    m11: 1.0,
                    m02: -this.m02,
                    m12: -this.m12,
                    state: (APPLY_TRANSLATE)
                });
            case (APPLY_IDENTITY):
                return new AffineTransform();
        }
    }

    createTransformedShape(shape) {
        if (shape) {
            return new Path({
                shape,
                transform: this
            });
        }
        return null;
    }

    deltaTransform(srcPts, srcOff, dstPts, dstOff, numPts) {
        if (srcPts instanceof Point) {
            let ptSrc = srcPts, ptDst = srcOff || new Point();
            let x = ptSrc.getX(), y = ptSrc.getY();
            switch (state) {
                default:
                    this.stateError();
                case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                case (APPLY_SHEAR | APPLY_SCALE):
                    ptDst.setLocation(x * this.m00 + y * this.m01, x * this.m10 + y * this.m11);
                    return ptDst;
                case (APPLY_SHEAR | APPLY_TRANSLATE):
                case (APPLY_SHEAR):
                    ptDst.setLocation(y * this.m01, x * this.m10);
                    return ptDst;
                case (APPLY_SCALE | APPLY_TRANSLATE):
                case (APPLY_SCALE):
                    ptDst.setLocation(x * this.m00, y * this.m11);
                    return ptDst;
                case (APPLY_TRANSLATE):
                case (APPLY_IDENTITY):
                    ptDst.setLocation(x, y);
                    return ptDst;
            }
        } else {
            let M00, M01, M10, M11;
            if (dstPts === srcPts && dstOff > srcOff && dstOff < srcOff + numPts * 2) {
                util.arraycopy(srcPts, srcOff, dstPts, dstOff, numPts * 2);
                srcOff = dstOff;
            }
            switch (state) {
                default:
                    this.stateError();
                case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                case (APPLY_SHEAR | APPLY_SCALE):
                    M00 = this.m00;
                    M01 = this.m01;
                    M10 = this.m10;
                    M11 = this.m11;
                    let x, y;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++];
                        y = srcPts[srcOff++];
                        dstPts[dstOff++] = x * M00 + y * M01;
                        dstPts[dstOff++] = x * M10 + y * M11;
                    }
                    return;
                case (APPLY_SHEAR | APPLY_TRANSLATE):
                case (APPLY_SHEAR):
                    M01 = this.m01;
                    M10 = this.m10;
                    let x;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++];
                        dstPts[dstOff++] = srcPts[srcOff++] * M01;
                        dstPts[dstOff++] = x * M10;
                    }
                    return;
                case (APPLY_SCALE | APPLY_TRANSLATE):
                case (APPLY_SCALE):
                    M00 = this.m00;
                    M11 = this.m11;
                    while (--numPts >= 0) {
                        dstPts[dstOff++] = srcPts[srcOff++] * M00;
                        dstPts[dstOff++] = srcPts[srcOff++] * M11;
                    }
                    return;
                case (APPLY_TRANSLATE):
                case (APPLY_IDENTITY):
                    if (srcPts !== dstPts || srcOff !== dstOff) {
                        util.arraycopy(srcPts, srcOff, dstPts, dstOff, numPts * 2);
                    }
                    return;
            }
        }
    }

    equals(obj) {
        if (!(obj instanceof AffineTransform)) {
            return false;
        }
        let a = obj;
        return ((this.m00 === a.m00) && (this.m01 === a.m01) && (this.m02 === a.m02) &&
        (this.m10 === a.m10) && (this.m11 === a.m11) && (this.m12 === a.m12));
    }

    getDeterminant() {
        switch (this.state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SHEAR | APPLY_SCALE):
                return this.m00 * this.m11 - this.m01 * this.m10;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
            case (APPLY_SHEAR):
                return -(this.m01 * this.m10);
            case (APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SCALE):
                return this.m00 * this.m11;
            case (APPLY_TRANSLATE):
            case (APPLY_IDENTITY):
                return 1.0;
        }
    }

    getMatrix(flatmatrix) {
        flatmatrix[0] = this.m00;
        flatmatrix[1] = this.m10;
        flatmatrix[2] = this.m01;
        flatmatrix[3] = this.m11;
        if (flatmatrix.length > 5) {
            flatmatrix[4] = this.m02;
            flatmatrix[5] = this.m12;
        }
        return flatmatrix;
    }

    static getQuadrantRotateInstance(numquadrants, anchorx = NaN, anchory = NaN) {
        let Tx = new AffineTransform();
        Tx.setToQuadrantRotation(numquadrants, anchorx, anchory);
        return Tx;
    }

    static getRotateInstance(vecx, vecy = NaN, anchorx = NaN, anchory = NaN) {
        let Tx = new AffineTransform();
        Tx.setToRotation(vecx, vecy, anchorx, anchory);
        return Tx;
    }

    getRotation() {
        PTS1[0] = 0;
        PTS1[1] = 0;
        PTS1[2] = 1;
        PTS1[3] = 0;
        this.transform(PTS1, 0, PTS2, 0, 2);
        let dy = Math.abs(PTS2[3] - PTS2[1]);
        let l = Point.getDistance(PTS2[0], PTS2[1], PTS2[2], PTS2[3]);
        let rotation = Math.asin(dy / l);
        if (PTS2[3] - PTS2[1] > 0) {
            if (PTS2[2] - PTS2[0] < 0) {
                rotation = Math.PI - rotation;
            }
        } else if (PTS2[2] - PTS2[0] > 0) {
            rotation = 2 * Math.PI - rotation;
        } else {
            rotation = rotation + Math.PI;
        }
        return rotation;
    }

    getScale() {
        PTS1[0] = 0;
        PTS1[1] = 0;
        PTS1[2] = 1;
        PTS1[3] = 0;
        this.transform(PTS1, 0, PTS2, 0, 2);
        return Point.getDistance(PTS2[0], PTS2[1], PTS2[2], PTS2[3]);
    }

    static getScaleInstance(sx, sy) {
        let Tx = new AffineTransform();
        Tx.setToScale(sx, sy);
        return Tx;
    }

    getScaleX() {
        return this.m00;
    }

    getScaleY() {
        return this.m11;
    }

    static getShearInstance(shx, shy) {
        let Tx = new AffineTransform();
        Tx.setToShear(shx, shy);
        return Tx;
    }

    getShearX() {
        return this.m01;
    }

    getShearY() {
        return this.m10;
    }

    static getTranslateInstance(tx, ty) {
        let Tx = new AffineTransform();
        Tx.setToTranslation(tx, ty);
        return Tx;
    }

    getTranslateX() {
        return this.m02;
    }

    getTranslateY() {
        return this.m12;
    }

    getType() {
        if (this.type === TYPE_UNKNOWN) {
            this.calculateType();
        }
        return this.type;
    }

    hashCode() {
        let bits = this.m00;
        bits = bits * 31 + this.m01;
        bits = bits * 31 + this.m02;
        bits = bits * 31 + this.m10;
        bits = bits * 31 + this.m11;
        bits = bits * 31 + this.m12;
        return bits ^ (bits >> 32);
    }

    invert() {
        let M00, M01, M02, M10, M11, M12, det;
        switch (this.state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                M00 = this.m00;
                M01 = this.m01;
                M02 = this.m02;
                M10 = this.m10;
                M11 = this.m11;
                M12 = this.m12;
                det = M00 * M11 - M01 * M10;
                if (Math.abs(det) <= MIN_VALUE) {
                    throw new Error("NoninvertibleTransformException Determinant is " + det);
                }
                this.m00 = M11 / det;
                this.m10 = -M10 / det;
                this.m01 = -M01 / det;
                this.m11 = M00 / det;
                this.m02 = (M01 * M12 - M11 * M02) / det;
                this.m12 = (M10 * M02 - M00 * M12) / det;
                break;
            case (APPLY_SHEAR | APPLY_SCALE):
                M00 = this.m00;
                M01 = this.m01;
                M10 = this.m10;
                M11 = this.m11;
                det = M00 * M11 - M01 * M10;
                if (Math.abs(det) <= MIN_VALUE) {
                    throw new Error("NoninvertibleTransformException Determinant is " + det);
                }
                this.m00 = M11 / det;
                this.m10 = -M10 / det;
                this.m01 = -M01 / det;
                this.m11 = M00 / det;
                break;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
                M01 = this.m01;
                M02 = this.m02;
                M10 = this.m10;
                M12 = this.m12;
                if (M01 === 0.0 || M10 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                this.m10 = 1.0 / M01;
                this.m01 = 1.0 / M10;
                this.m02 = -M12 / M10;
                this.m12 = -M02 / M01;
                break;
            case (APPLY_SHEAR):
                M01 = this.m01;
                M10 = this.m10;
                if (M01 === 0.0 || M10 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                this.m10 = 1.0 / M01;
                this.m01 = 1.0 / M10;
                break;
            case (APPLY_SCALE | APPLY_TRANSLATE):
                M00 = this.m00;
                M02 = this.m02;
                M11 = this.m11;
                M12 = this.m12;
                if (M00 === 0.0 || M11 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                this.m00 = 1.0 / M00;
                this.m11 = 1.0 / M11;
                this.m02 = -M02 / M00;
                this.m12 = -M12 / M11;
                break;
            case (APPLY_SCALE):
                M00 = this.m00;
                M11 = this.m11;
                if (M00 === 0.0 || M11 === 0.0) {
                    throw new Error("NoninvertibleTransformException Determinant is 0");
                }
                this.m00 = 1.0 / M00;
                this.m11 = 1.0 / M11;
                break;
            case (APPLY_TRANSLATE):
                this.m02 = -this.m02;
                this.m12 = -this.m12;
                break;
            case (APPLY_IDENTITY):
                break;
        }
    }

    inverseTransform(srcPts, srcOff, dstPts, dstOff, numPts) {
        if (srcPts instanceof Point) {
            let ptSrc = srcPts, ptDst = srcOff || new Point(), x = ptSrc.getX(), y = ptSrc.getY();
            switch (this.state) {
                default:
                    this.stateError();
                case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                    x -= this.m02;
                    y -= this.m12;
                case (APPLY_SHEAR | APPLY_SCALE):
                    let det = this.m00 * this.m11 - this.m01 * this.m10;
                    if (Math.abs(det) <= MIN_VALUE) {
                        throw new Error("NoninvertibleTransformException Determinant is " + det);
                    }
                    ptDst.setLocation((x * this.m11 - y * this.m01) / det, (y * this.m00 - x * this.m10) / det);
                    return ptDst;
                case (APPLY_SHEAR | APPLY_TRANSLATE):
                    x -= this.m02;
                    y -= this.m12;
                case (APPLY_SHEAR):
                    if (this.m01 === 0.0 || this.m10 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    ptDst.setLocation(y / this.m10, x / this.m01);
                    return ptDst;
                case (APPLY_SCALE | APPLY_TRANSLATE):
                    x -= this.m02;
                    y -= this.m12;
                case (APPLY_SCALE):
                    if (this.m00 === 0.0 || this.m11 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    ptDst.setLocation(x / this.m00, y / this.m11);
                    return ptDst;
                case (APPLY_TRANSLATE):
                    ptDst.setLocation(x - this.m02, y - this.m12);
                    return ptDst;
                case (APPLY_IDENTITY):
                    ptDst.setLocation(x, y);
                    return ptDst;
            }
        } else if (srcPts instanceof Dimension) {
            let dimSrc = srcPts;
            let dimDst = srcOff;
            let result = null;
            if (!dimDst) {
                result = dimSrc.clone();
            } else {
                result = dimDst;
            }
            let width = dimSrc.getWidth();
            let height = dimSrc.getHeight();
            let m00 = this.getScaleX();
            let m11 = this.getScaleY();
            let m01 = this.getShearX();
            let m10 = this.getShearY();
            let det = m00 * m11 - m01 * m10;
            if (Math.abs(det) > MIN_VALUE) {
                result.setSize((width * m11 - height * m01) / det, (height * m00 - width * m10) / det);
            } else {
                throw new Error("NoninvertibleTransformException Could not invert transform");
            }
            return result;
        } else if (srcPts instanceof Rectangle) {
            let rectSrc = srcPts;
            let rectDst = srcOff;
            let result = null;
            if (!rectDst) {
                result = rectSrc.clone();
            } else {
                result = rectDst;
            }
            if (rectSrc.isEmpty()) {
                result.setRect(rectSrc);
                return result;
            }
            let scale = 1;
            switch (this.getType()) {
                case TYPE_IDENTITY:
                    if (rectSrc !== result) {
                        result.setRect(rectSrc);
                    }
                    break;
                case TYPE_TRANSLATION:
                    result.setRect(rectSrc.getX() - this.getTranslateX(), rectSrc.getY() - this.getTranslateY(), rectSrc.getWidth(),
                        rectSrc.getHeight());
                    break;
                case TYPE_UNIFORM_SCALE:
                    scale = this.getScaleX();
                    if (scale === 0) {
                        throw new Error("NoninvertibleTransformException Could not invertTransform rectangle");
                    }
                    result.setRect(rectSrc.getX() / scale, rectSrc.getY() / scale, rectSrc.getWidth() / scale, rectSrc
                            .getHeight()
                        / scale);
                    break;

                case TYPE_TRANSLATION | TYPE_UNIFORM_SCALE:
                    scale = this.getScaleX();
                    if (scale === 0) {
                        throw new Error("NoninvertibleTransformException Could not invertTransform rectangle");
                    }
                    result.setRect((rectSrc.getX() - this.getTranslateX()) / scale, (rectSrc.getY() - this.getTranslateY()) / scale,
                        rectSrc.getWidth() / scale, rectSrc.getHeight() / scale);
                    break;
                default:
                    let pts = AffineTransform.rectToArray(rectSrc);
                    try {
                        this.inverseTransform(pts, 0, pts, 0, 4);
                    } catch (e) {
                        throw new Error("Could not invert transform", e, this);
                    }
                    AffineTransform.rectFromArray(result, pts);
                    break;
            }
            return result;
        } else {
            let M00, M01, M02, M10, M11, M12, det;
            if (dstPts === srcPts && dstOff > srcOff && dstOff < srcOff + numPts * 2) {
                util.arraycopy(srcPts, srcOff, dstPts, dstOff, numPts * 2);
                srcOff = dstOff;
            }
            switch (this.state) {
                default:
                    this.stateError();
                case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                    M00 = this.m00;
                    M01 = this.m01;
                    M02 = this.m02;
                    M10 = this.m10;
                    M11 = this.m11;
                    M12 = this.m12;
                    det = M00 * M11 - M01 * M10;
                    if (Math.abs(det) <= MIN_VALUE) {
                        throw new Error("NoninvertibleTransformException Determinant is " + det);
                    }
                    let x, y;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++] - M02;
                        y = srcPts[srcOff++] - M12;
                        dstPts[dstOff++] = (x * M11 - y * M01) / det;
                        dstPts[dstOff++] = (y * M00 - x * M10) / det;
                    }
                    return;
                case (APPLY_SHEAR | APPLY_SCALE):
                    M00 = this.m00;
                    M01 = this.m01;
                    M10 = this.m10;
                    M11 = this.m11;
                    det = M00 * M11 - M01 * M10;
                    if (Math.abs(det) <= MIN_VALUE) {
                        throw new Error("NoninvertibleTransformException Determinant is " + det);
                    }
                    let x, y;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++];
                        y = srcPts[srcOff++];
                        dstPts[dstOff++] = (x * M11 - y * M01) / det;
                        dstPts[dstOff++] = (y * M00 - x * M10) / det;
                    }
                    return;
                case (APPLY_SHEAR | APPLY_TRANSLATE):
                    M01 = this.m01;
                    M02 = this.m02;
                    M10 = this.m10;
                    M12 = this.m12;
                    if (M01 === 0.0 || M10 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    let x;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++] - M02;
                        dstPts[dstOff++] = (srcPts[srcOff++] - M12) / M10;
                        dstPts[dstOff++] = x / M01;
                    }
                    return;
                case (APPLY_SHEAR):
                    M01 = this.m01;
                    M10 = this.m10;
                    if (M01 === 0.0 || M10 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    let x;
                    while (--numPts >= 0) {
                        x = srcPts[srcOff++];
                        dstPts[dstOff++] = srcPts[srcOff++] / M10;
                        dstPts[dstOff++] = x / M01;
                    }
                    return;
                case (APPLY_SCALE | APPLY_TRANSLATE):
                    M00 = this.m00;
                    M02 = this.m02;
                    M11 = this.m11;
                    M12 = this.m12;
                    if (M00 === 0.0 || M11 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    while (--numPts >= 0) {
                        dstPts[dstOff++] = (srcPts[srcOff++] - M02) / M00;
                        dstPts[dstOff++] = (srcPts[srcOff++] - M12) / M11;
                    }
                    return;
                case (APPLY_SCALE):
                    M00 = this.m00;
                    M11 = this.m11;
                    if (M00 === 0.0 || M11 === 0.0) {
                        throw new Error("NoninvertibleTransformException Determinant is 0");
                    }
                    while (--numPts >= 0) {
                        dstPts[dstOff++] = srcPts[srcOff++] / M00;
                        dstPts[dstOff++] = srcPts[srcOff++] / M11;
                    }
                    return;
                case (APPLY_TRANSLATE):
                    M02 = this.m02;
                    M12 = this.m12;
                    while (--numPts >= 0) {
                        dstPts[dstOff++] = srcPts[srcOff++] - M02;
                        dstPts[dstOff++] = srcPts[srcOff++] - M12;
                    }
                    return;
                case (APPLY_IDENTITY):
                    if (srcPts !== dstPts || srcOff !== dstOff) {
                        util.arraycopy(srcPts, srcOff, dstPts, dstOff, numPts * 2);
                    }
                    return;
            }
        }
    }

    isIdentity() {
        return (this.state === APPLY_IDENTITY || (this.getType() === TYPE_IDENTITY));
    }

    postRotate(vecx, vecy, anchorx, anchory) {
        let Tx = AffineTransform.getRotateInstance(vecx, vecy, anchorx, anchory);
        this.concatenate(Tx);
    }

    postScale(sx, sy) {
        let Tx = AffineTransform.getScaleInstance(sx, sy);
        this.concatenate(Tx);
    }

    postSkew(shx, shy) {
        let Tx = AffineTransform.getShearInstance(shx, shy);
        this.concatenate(Tx);
    }

    postTranslate(tx, ty) {
        let Tx = AffineTransform.getTranslateInstance(tx, ty);
        this.concatenate(Tx);
    }

    preConcatenate(Tx) {
        let M0, M1, T00, T01, T10, T11, T02, T12, mystate = this.state, txstate = Tx.state;
        switch ((txstate << HI_SHIFT) | mystate) {
            case (HI_IDENTITY | APPLY_IDENTITY):
            case (HI_IDENTITY | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SCALE):
            case (HI_IDENTITY | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SHEAR):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_SCALE):
            case (HI_IDENTITY | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                return;
            case (HI_TRANSLATE | APPLY_IDENTITY):
            case (HI_TRANSLATE | APPLY_SCALE):
            case (HI_TRANSLATE | APPLY_SHEAR):
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_SCALE):
                this.m02 = Tx.m02;
                this.m12 = Tx.m12;
                this.state = mystate | APPLY_TRANSLATE;
                this.type |= TYPE_TRANSLATION;
                return;
            case (HI_TRANSLATE | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_TRANSLATE | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                this.m02 = this.m02 + Tx.m02;
                this.m12 = this.m12 + Tx.m12;
                return;
            case (HI_SCALE | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_IDENTITY):
                this.state = mystate | APPLY_SCALE;
            case (HI_SCALE | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SHEAR | APPLY_SCALE):
            case (HI_SCALE | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SHEAR):
            case (HI_SCALE | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SCALE | APPLY_SCALE):
                T00 = Tx.m00;
                T11 = Tx.m11;
                if ((mystate & APPLY_SHEAR) !== 0) {
                    this.m01 = this.m01 * T00;
                    this.m10 = this.m10 * T11;
                    if ((mystate & APPLY_SCALE) !== 0) {
                        this.m00 = this.m00 * T00;
                        this.m11 = this.m11 * T11;
                    }
                } else {
                    this.m00 = this.m00 * T00;
                    this.m11 = this.m11 * T11;
                }
                if ((mystate & APPLY_TRANSLATE) !== 0) {
                    this.m02 = this.m02 * T00;
                    this.m12 = this.m12 * T11;
                }
                this.type = TYPE_UNKNOWN;
                return;
            case (HI_SHEAR | APPLY_SHEAR | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SHEAR):
                mystate = mystate | APPLY_SCALE;
            case (HI_SHEAR | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_IDENTITY):
            case (HI_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SCALE):
                this.state = mystate ^ APPLY_SHEAR;
            case (HI_SHEAR | APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (HI_SHEAR | APPLY_SHEAR | APPLY_SCALE):
                T01 = Tx.m01;
                T10 = Tx.m10;
                M0 = this.m00;
                this.m00 = this.m10 * T01;
                this.m10 = M0 * T10;
                M0 = this.m01;
                this.m01 = this.m11 * T01;
                this.m11 = M0 * T10;
                M0 = this.m02;
                this.m02 = this.m12 * T01;
                this.m12 = M0 * T10;
                this.type = TYPE_UNKNOWN;
                return;
        }
        T00 = Tx.m00;
        T01 = Tx.m01;
        T02 = Tx.m02;
        T10 = Tx.m10;
        T11 = Tx.m11;
        T12 = Tx.m12;
        switch (mystate) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                M0 = this.m02;
                M1 = this.m12;
                T02 += M0 * T00 + M1 * T01;
                T12 += M0 * T10 + M1 * T11;
            case (APPLY_SHEAR | APPLY_SCALE):
                this.m02 = T02;
                this.m12 = T12;
                M0 = this.m00;
                M1 = this.m10;
                this.m00 = M0 * T00 + M1 * T01;
                this.m10 = M0 * T10 + M1 * T11;
                M0 = this.m01;
                M1 = this.m11;
                this.m01 = M0 * T00 + M1 * T01;
                this.m11 = M0 * T10 + M1 * T11;
                break;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
                M0 = this.m02;
                M1 = this.m12;
                T02 += M0 * T00 + M1 * T01;
                T12 += M0 * T10 + M1 * T11;
            case (APPLY_SHEAR):
                this.m02 = T02;
                this.m12 = T12;
                M0 = this.m10;
                this.m00 = M0 * T01;
                this.m10 = M0 * T11;
                M0 = this.m01;
                this.m01 = M0 * T00;
                this.m11 = M0 * T10;
                break;
            case (APPLY_SCALE | APPLY_TRANSLATE):
                M0 = this.m02;
                M1 = this.m12;
                T02 += M0 * T00 + M1 * T01;
                T12 += M0 * T10 + M1 * T11;
            case (APPLY_SCALE):
                this.m02 = T02;
                this.m12 = T12;
                M0 = this.m00;
                this.m00 = M0 * T00;
                this.m10 = M0 * T10;
                M0 = this.m11;
                this.m01 = M0 * T01;
                this.m11 = M0 * T11;
                break;
            case (APPLY_TRANSLATE):
                M0 = this.m02;
                M1 = this.m12;
                T02 += M0 * T00 + M1 * T01;
                T12 += M0 * T10 + M1 * T11;
            case (APPLY_IDENTITY):
                this.m02 = T02;
                this.m12 = T12;
                this.m00 = T00;
                this.m10 = T10;
                this.m01 = T01;
                this.m11 = T11;
                this.state = mystate | txstate;
                this.type = TYPE_UNKNOWN;
                return;
        }
        this.updateState();
    }

    preRotate(vecx, vecy = NaN, anchorx = NaN, anchory = NaN) {
        let Tx = AffineTransform.getRotateInstance(vecx, vecy, anchorx, anchory);
        this.preConcatenate(Tx);
    }

    preScale(sx, sy) {
        let Tx = AffineTransform.getScaleInstance(sx, sy);
        this.preConcatenate(Tx);
    }

    preSkew(shx, shy) {
        let Tx = AffineTransform.getShearInstance(shx, shy);
        this.preConcatenate(Tx);
    }

    preTranslate(tx, ty) {
        let Tx = AffineTransform.getTranslateInstance(tx, ty);
        this.preConcatenate(Tx);
    }

    quadrantRotate(numquadrants, anchorx = NaN, anchory = NaN) {
        if (isNaN(anchorx) && isNaN(anchory)) {
            switch (numquadrants & 3) {
                case 0:
                    break;
                case 1:
                    this.rotate90();
                    break;
                case 2:
                    this.rotate180();
                    break;
                case 3:
                    this.rotate270();
                    break;
            }
        } else {
            switch (numquadrants & 3) {
                case 0:
                    return;
                case 1:
                    this.m02 += anchorx * (this.m00 - this.m01) + anchory * (this.m01 + this.m00);
                    this.m12 += anchorx * (this.m10 - this.m11) + anchory * (this.m11 + this.m10);
                    this.rotate90();
                    break;
                case 2:
                    this.m02 += anchorx * (this.m00 + this.m00) + anchory * (this.m01 + this.m01);
                    this.m12 += anchorx * (this.m10 + this.m10) + anchory * (this.m11 + this.m11);
                    this.rotate180();
                    break;
                case 3:
                    this.m02 += anchorx * (this.m00 + this.m01) + anchory * (this.m01 - this.m00);
                    this.m12 += anchorx * (this.m10 + this.m11) + anchory * (this.m11 - this.m10);
                    this.rotate270();
                    break;
            }
            if (this.m02 === 0.0 && this.m12 === 0.0) {
                this.state &= ~APPLY_TRANSLATE;
            } else {
                this.state |= APPLY_TRANSLATE;
            }
        }
    }

    static rectFromArray(aRectangle, pts) {
        let minX = pts[0];
        let minY = pts[1];
        let maxX = pts[0];
        let maxY = pts[1];
        let x = 0;
        let y = 0;
        for (let i = 1; i < 4; i++) {
            x = pts[2 * i];
            y = pts[2 * i + 1];
            if (x < minX) {
                minX = x;
            }
            if (y < minY) {
                minY = y;
            }
            if (x > maxX) {
                maxX = x;
            }
            if (y > maxY) {
                maxY = y;
            }
        }
        aRectangle.setRect(minX, minY, maxX - minX, maxY - minY);
    }

    static rectToArray(aRectangle) {
        PTS1[0] = aRectangle.getX();
        PTS1[1] = aRectangle.getY();
        PTS1[2] = PTS1[0] + aRectangle.getWidth();
        PTS1[3] = PTS1[1];
        PTS1[4] = PTS1[0] + aRectangle.getWidth();
        PTS1[5] = PTS1[1] + aRectangle.getHeight();
        PTS1[6] = PTS1[0];
        PTS1[7] = PTS1[1] + aRectangle.getHeight();
        return PTS1;
    }

    restore() {
        let Tx = this.transformStack.pop();
        if (Tx) {
            this.setTransform(Tx);
        }
    }

    rotate(vecx, vecy = NaN, anchorx = NaN, anchory = NaN) {
        if (!isNaN(vecy) && !isNaN(anchorx) && !isNaN(anchory)) {
            this.translate(anchorx, anchory);
            this.rotate(vecx, vecy);
            this.translate(-anchorx, -anchory);
        } else if (!isNaN(vecy) && !isNaN(anchorx)) {
            this.translate(anchorx, anchory);
            this.rotate(vecx);
            this.translate(-anchorx, -anchory);
        } else if (!isNaN(vecy)) {
            if (vecy === 0.0) {
                if (vecx < 0.0) {
                    this.rotate180();
                }
            } else if (vecx === 0.0) {
                if (vecy > 0.0) {
                    this.rotate90();
                } else {
                    this.rotate270();
                }
            } else {
                let len = Math.sqrt(vecx * vecx + vecy * vecy), sin = vecy / len, cos = vecx / len, M0, M1;
                M0 = this.m00;
                M1 = this.m01;
                this.m00 = cos * M0 + sin * M1;
                this.m01 = -sin * M0 + cos * M1;
                M0 = this.m10;
                M1 = this.m11;
                this.m10 = cos * M0 + sin * M1;
                this.m11 = -sin * M0 + cos * M1;
                this.updateState();
            }
        } else {
            let sin = Math.sin(vecx);
            if (sin === 1.0) {
                this.rotate90();
            } else if (sin === -1.0) {
                this.rotate270();
            } else {
                let cos = Math.cos(vecx);
                if (cos === -1.0) {
                    this.rotate180();
                } else if (cos !== 1.0) {
                    let M0, M1;
                    M0 = this.m00;
                    M1 = this.m01;
                    this.m00 = cos * M0 + sin * M1;
                    this.m01 = -sin * M0 + cos * M1;
                    M0 = this.m10;
                    M1 = this.m11;
                    this.m10 = cos * M0 + sin * M1;
                    this.m11 = -sin * M0 + cos * M1;
                    this.updateState();
                }
            }
        }
    }

    rotate90() {
        let M0 = this.m00;
        this.m00 = this.m01;
        this.m01 = -M0;
        M0 = this.m10;
        this.m10 = this.m11;
        this.m11 = -M0;
        let state = rot90conversion[this.state];
        if ((state & (APPLY_SHEAR | APPLY_SCALE)) === APPLY_SCALE && this.m00 === 1.0 && this.m11 === 1.0) {
            state -= APPLY_SCALE;
        }
        this.state = state;
        this.type = TYPE_UNKNOWN;
    }

    rotate180() {
        this.m00 = -this.m00;
        this.m11 = -this.m11;
        let state = this.state;
        if ((state & (APPLY_SHEAR)) !== 0) {
            this.m01 = -this.m01;
            this.m10 = -this.m10;
        } else {
            if (this.m00 === 1.0 && this.m11 === 1.0) {
                this.state = state & ~APPLY_SCALE;
            } else {
                this.state = state | APPLY_SCALE;
            }
        }
        this.type = TYPE_UNKNOWN;
    }

    rotate270() {
        let M0 = this.m00;
        this.m00 = -this.m01;
        this.m01 = M0;
        M0 = this.m10;
        this.m10 = -this.m11;
        this.m11 = M0;
        let state = rot90conversion[this.state];
        if ((state & (APPLY_SHEAR | APPLY_SCALE)) === APPLY_SCALE && this.m00 === 1.0 && this.m11 === 1.0) {
            state -= APPLY_SCALE;
        }
        this.state = state;
        this.type = TYPE_UNKNOWN;
    }

    save() {
        this.transformStack.push(this.clone());
    }

    scale(sx, sy) {
        let state = this.state;
        switch (state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SHEAR | APPLY_SCALE):
                this.m00 *= sx;
                this.m11 *= sy;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
            case (APPLY_SHEAR):
                this.m01 *= sy;
                this.m10 *= sx;
                if (this.m01 === 0 && this.m10 === 0) {
                    state &= APPLY_TRANSLATE;
                    if (this.m00 === 1.0 && this.m11 === 1.0) {
                        this.type = (state === APPLY_IDENTITY
                            ? TYPE_IDENTITY
                            : TYPE_TRANSLATION);
                    } else {
                        state |= APPLY_SCALE;
                        this.type = TYPE_UNKNOWN;
                    }
                    this.state = state;
                }
                return;
            case (APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SCALE):
                this.m00 *= sx;
                this.m11 *= sy;
                if (this.m00 === 1.0 && this.m11 === 1.0) {
                    this.state = (state &= APPLY_TRANSLATE);
                    this.type = (state === APPLY_IDENTITY
                        ? TYPE_IDENTITY
                        : TYPE_TRANSLATION);
                } else {
                    this.type = TYPE_UNKNOWN;
                }
                return;
            case (APPLY_TRANSLATE):
            case (APPLY_IDENTITY):
                this.m00 = sx;
                this.m11 = sy;
                if (sx !== 1.0 || sy !== 1.0) {
                    this.state = state | APPLY_SCALE;
                    this.type = TYPE_UNKNOWN;
                }
                return;
        }
    }

    scaleAboutPoint(scale, x, y) {
        this.translate(x, y);
        this.scale(scale, scale);
        this.translate(-x, -y);
    }

    setOffset(tx, ty) {
        this.setTransform(this.getScaleX(), this.getShearY(), this.getShearX(), this.getScaleY(), tx, ty);
    }

    setRotation(theta) {
        this.rotate(theta - this.getRotation());
    }

    setScale(scale) {
        if (scale === 0) {
            throw new Error("NoninvertibleTransformException Can't set scale to 0");
        }
        this.scaleAboutPoint(scale / this.getScale(), 0, 0);
    }

    setToIdentity() {
        this.m00 = this.m11 = 1.0;
        this.m10 = this.m01 = this.m02 = this.m12 = 0.0;
        this.state = APPLY_IDENTITY;
        this.type = TYPE_IDENTITY;
    }

    setToQuadrantRotation(numquadrants, anchorx = NaN, anchory = NaN) {
        if (isNaN(anchorx) && isNaN(anchory)) {
            switch (numquadrants & 3) {
                case 0:
                    this.m00 = 1.0;
                    this.m10 = 0.0;
                    this.m01 = 0.0;
                    this.m11 = 1.0;
                    this.m02 = 0.0;
                    this.m12 = 0.0;
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                    break;
                case 1:
                    this.m00 = 0.0;
                    this.m10 = 1.0;
                    this.m01 = -1.0;
                    this.m11 = 0.0;
                    this.m02 = 0.0;
                    this.m12 = 0.0;
                    this.state = APPLY_SHEAR;
                    this.type = TYPE_QUADRANT_ROTATION;
                    break;
                case 2:
                    this.m00 = -1.0;
                    this.m10 = 0.0;
                    this.m01 = 0.0;
                    this.m11 = -1.0;
                    this.m02 = 0.0;
                    this.m12 = 0.0;
                    this.state = APPLY_SCALE;
                    this.type = TYPE_QUADRANT_ROTATION;
                    break;
                case 3:
                    this.m00 = 0.0;
                    this.m10 = -1.0;
                    this.m01 = 1.0;
                    this.m11 = 0.0;
                    this.m02 = 0.0;
                    this.m12 = 0.0;
                    this.state = APPLY_SHEAR;
                    this.type = TYPE_QUADRANT_ROTATION;
                    break;
            }
        } else {
            switch (numquadrants & 3) {
                case 0:
                    this.m00 = 1.0;
                    this.m10 = 0.0;
                    this.m01 = 0.0;
                    this.m11 = 1.0;
                    this.m02 = 0.0;
                    this.m12 = 0.0;
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                    break;
                case 1:
                    this.m00 = 0.0;
                    this.m10 = 1.0;
                    this.m01 = -1.0;
                    this.m11 = 0.0;
                    this.m02 = anchorx + anchory;
                    this.m12 = anchory - anchorx;
                    if (this.m02 === 0.0 && this.m12 === 0.0) {
                        this.state = APPLY_SHEAR;
                        this.type = TYPE_QUADRANT_ROTATION;
                    } else {
                        this.state = APPLY_SHEAR | APPLY_TRANSLATE;
                        this.type = TYPE_QUADRANT_ROTATION | TYPE_TRANSLATION;
                    }
                    break;
                case 2:
                    this.m00 = -1.0;
                    this.m10 = 0.0;
                    this.m01 = 0.0;
                    this.m11 = -1.0;
                    this.m02 = anchorx + anchorx;
                    this.m12 = anchory + anchory;
                    if (this.m02 === 0.0 && this.m12 === 0.0) {
                        this.state = APPLY_SCALE;
                        this.type = TYPE_QUADRANT_ROTATION;
                    } else {
                        this.state = APPLY_SCALE | APPLY_TRANSLATE;
                        this.type = TYPE_QUADRANT_ROTATION | TYPE_TRANSLATION;
                    }
                    break;
                case 3:
                    this.m00 = 0.0;
                    this.m10 = -1.0;
                    this.m01 = 1.0;
                    this.m11 = 0.0;
                    this.m02 = anchorx - anchory;
                    this.m12 = anchory + anchorx;
                    if (this.m02 === 0.0 && this.m12 === 0.0) {
                        this.state = APPLY_SHEAR;
                        this.type = TYPE_QUADRANT_ROTATION;
                    } else {
                        this.state = APPLY_SHEAR | APPLY_TRANSLATE;
                        this.type = TYPE_QUADRANT_ROTATION | TYPE_TRANSLATION;
                    }
                    break;
            }
        }
    }

    setToRotation(vecx, vecy = NaN, anchorx = NaN, anchory = NaN) {
        if (isNaN(vecy) && isNaN(anchorx) && isNaN(anchory)) {
            let sin = Math.sin(vecx), cos;
            if (sin === 1.0 || sin === -1.0) {
                cos = 0.0;
                this.state = APPLY_SHEAR;
                this.type = TYPE_QUADRANT_ROTATION;
            } else {
                cos = Math.cos(vecx);
                if (cos === -1.0) {
                    sin = 0.0;
                    this.state = APPLY_SCALE;
                    this.type = TYPE_QUADRANT_ROTATION;
                } else if (cos === 1.0) {
                    sin = 0.0;
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                } else {
                    this.state = APPLY_SHEAR | APPLY_SCALE;
                    this.type = TYPE_GENERAL_ROTATION;
                }
            }
            this.m00 = cos;
            this.m10 = sin;
            this.m01 = -sin;
            this.m11 = cos;
            this.m02 = 0.0;
            this.m12 = 0.0;
        } else if (isNaN(anchorx) && isNaN(anchory)) {
            let sin, cos;
            if (vecy === 0) {
                sin = 0.0;
                if (vecx < 0.0) {
                    cos = -1.0;
                    this.state = APPLY_SCALE;
                    this.type = TYPE_QUADRANT_ROTATION;
                } else {
                    cos = 1.0;
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                }
            } else if (vecx === 0) {
                cos = 0.0;
                sin = (vecy > 0.0) ? 1.0 : -1.0;
                this.state = APPLY_SHEAR;
                this.type = TYPE_QUADRANT_ROTATION;
            } else {
                let len = Math.sqrt(vecx * vecx + vecy * vecy);
                cos = vecx / len;
                sin = vecy / len;
                this.state = APPLY_SHEAR | APPLY_SCALE;
                this.type = TYPE_GENERAL_ROTATION;
            }
            this.m00 = cos;
            this.m10 = sin;
            this.m01 = -sin;
            this.m11 = cos;
            this.m02 = 0.0;
            this.m12 = 0.0;
        } else if (isNaN(anchory)) {
            this.setToRotation(vecx);
            let sin = this.m10, oneMinusCos = 1.0 - this.m00;
            this.m02 = vecy * oneMinusCos + anchorx * sin;
            this.m12 = anchorx * oneMinusCos - vecy * sin;
            if (this.m02 !== 0.0 || this.m12 !== 0.0) {
                this.state |= APPLY_TRANSLATE;
                this.type |= TYPE_TRANSLATION;
            }
        } else {
            this.setToRotation(vecx, vecy);
            let sin = this.m10, oneMinusCos = 1.0 - this.m00;
            this.m02 = anchorx * oneMinusCos + anchory * sin;
            this.m12 = anchory * oneMinusCos - anchorx * sin;
            if (this.m02 !== 0.0 || this.m12 !== 0.0) {
                this.state |= APPLY_TRANSLATE;
                this.type |= TYPE_TRANSLATION;
            }
        }
    }

    setToScale(sx, sy) {
        this.m00 = sx;
        this.m10 = 0.0;
        this.m01 = 0.0;
        this.m11 = sy;
        this.m02 = 0.0;
        this.m12 = 0.0;
        if (sx !== 1.0 || sy !== 1.0) {
            this.state = APPLY_SCALE;
            this.type = TYPE_UNKNOWN;
        } else {
            this.state = APPLY_IDENTITY;
            this.type = TYPE_IDENTITY;
        }
    }

    setToShear(shx, shy) {
        this.m00 = 1.0;
        this.m01 = shx;
        this.m10 = shy;
        this.m11 = 1.0;
        this.m02 = 0.0;
        this.m12 = 0.0;
        if (shx !== 0.0 || shy !== 0.0) {
            this.state = (APPLY_SHEAR | APPLY_SCALE);
            this.type = TYPE_UNKNOWN;
        } else {
            this.state = APPLY_IDENTITY;
            this.type = TYPE_IDENTITY;
        }
    }

    setTransform(m00, m10 = NaN, m01 = NaN, m11 = NaN, m02 = NaN, m12 = NaN) {
        if (m00 instanceof AffineTransform) {
            let Tx = m00;
            this.m00 = Tx.m00;
            this.m10 = Tx.m10;
            this.m01 = Tx.m01;
            this.m11 = Tx.m11;
            this.m02 = Tx.m02;
            this.m12 = Tx.m12;
            this.state = Tx.state;
            this.type = Tx.type;
        } else {
            this.m00 = m00;
            this.m10 = m10;
            this.m01 = m01;
            this.m11 = m11;
            this.m02 = m02;
            this.m12 = m12;
            this.updateState();
        }
    }

    setToTranslation(tx, ty) {
        this.m00 = 1.0;
        this.m10 = 0.0;
        this.m01 = 0.0;
        this.m11 = 1.0;
        this.m02 = tx;
        this.m12 = ty;
        if (tx !== 0.0 || ty !== 0.0) {
            this.state = APPLY_TRANSLATE;
            this.type = TYPE_TRANSLATION;
        } else {
            this.state = APPLY_IDENTITY;
            this.type = TYPE_IDENTITY;
        }
    }

    shear(shx, shy) {
        let state = this.state;
        switch (state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SHEAR | APPLY_SCALE):
                let M0, M1;
                M0 = this.m00;
                M1 = this.m01;
                this.m00 = M0 + M1 * shy;
                this.m01 = M0 * shx + M1;
                M0 = this.m10;
                M1 = this.m11;
                this.m10 = M0 + M1 * shy;
                this.m11 = M0 * shx + M1;
                this.updateState();
                return;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
            case (APPLY_SHEAR):
                this.m00 = this.m01 * shy;
                this.m11 = this.m10 * shx;
                if (this.m00 !== 0.0 || this.m11 !== 0.0) {
                    this.state = state | APPLY_SCALE;
                }
                this.type = TYPE_UNKNOWN;
                return;
            case (APPLY_SCALE | APPLY_TRANSLATE):
            case (APPLY_SCALE):
                this.m01 = this.m00 * shx;
                this.m10 = this.m11 * shy;
                if (this.m01 !== 0.0 || this.m10 !== 0.0) {
                    this.state = state | APPLY_SHEAR;
                }
                this.type = TYPE_UNKNOWN;
                return;
            case (APPLY_TRANSLATE):
            case (APPLY_IDENTITY):
                this.m01 = shx;
                this.m10 = shy;
                if (this.m01 !== 0.0 || this.m10 !== 0.0) {
                    this.state = state | APPLY_SCALE | APPLY_SHEAR;
                    this.type = TYPE_UNKNOWN;
                }
                return;
        }
    }

    stateError() {
        throw new Error("InternalError missing case in transform state switch");
    }

    toString() {
        return (this.constructor.name + "[["
        + Math.round(this.m00) + ", "
        + Math.round(this.m01) + ", "
        + Math.round(this.m02) + "], ["
        + Math.round(this.m10) + ", "
        + Math.round(this.m11) + ", "
        + Math.round(this.m12) + "]]");
    }

    transform(srcPts, srcOff, dstPts, dstOff, numPts) {
        if (srcPts instanceof Point) {
            let ptSrc = srcPts, ptDst = srcOff;
            if (ptDst === null) {
                ptDst = new Point();
            }
            let x = ptSrc.getX(), y = ptSrc.getY();
            switch (this.state) {
                default:
                    this.stateError();
                case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                    ptDst.setLocation(x * this.m00 + y * this.m01 + this.m02, x * this.m10 + y * this.m11 + this.m12);
                    return ptDst;
                case (APPLY_SHEAR | APPLY_SCALE):
                    ptDst.setLocation(x * this.m00 + y * this.m01, x * this.m10 + y * this.m11);
                    return ptDst;
                case (APPLY_SHEAR | APPLY_TRANSLATE):
                    ptDst.setLocation(y * this.m01 + this.m02, x * this.m10 + this.m12);
                    return ptDst;
                case (APPLY_SHEAR):
                    ptDst.setLocation(y * this.m01, x * this.m10);
                    return ptDst;
                case (APPLY_SCALE | APPLY_TRANSLATE):
                    ptDst.setLocation(x * this.m00 + this.m02, y * this.m11 + this.m12);
                    return ptDst;
                case (APPLY_SCALE):
                    ptDst.setLocation(x * this.m00, y * this.m11);
                    return ptDst;
                case (APPLY_TRANSLATE):
                    ptDst.setLocation(x + this.m02, y + this.m12);
                    return ptDst;
                case (APPLY_IDENTITY):
                    ptDst.setLocation(x, y);
                    return ptDst;
            }
        } else if (srcPts instanceof Dimension) {
            let dimSrc = srcPts;
            let dimDst = srcOff;
            let result = null;
            if (!dimDst) {
                result = dimSrc.clone();
            } else {
                result = dimDst;
            }
            PTS1[0] = dimSrc.getWidth();
            PTS1[1] = dimSrc.getHeight();
            this.deltaTransform(PTS1, 0, PTS2, 0, 1);
            result.setSize(PTS2[0], PTS2[1]);
            return result;
        } else if (srcPts instanceof Rectangle) {
            let rectSrc = srcPts;
            let rectDst = srcOff;
            let result = null;
            if (!rectDst) {
                result = rectSrc.clone();
            } else {
                result = rectDst;
            }
            if (rectSrc.isEmpty()) {
                result.setRect(rectSrc);
                return result;
            }
            let scale = 1;
            switch (this.getType()) {
                case TYPE_IDENTITY:
                    if (rectSrc !== result) {
                        result.setRect(rectSrc);
                    }
                    break;
                case TYPE_TRANSLATION:
                    result.setRect(rectSrc.getX() + this.getTranslateX(), rectSrc.getY() + this.getTranslateY(), rectSrc.getWidth(),
                        rectSrc.getHeight());
                    break;
                case TYPE_UNIFORM_SCALE:
                    scale = this.getScaleX();
                    result.setRect(rectSrc.getX() * scale, rectSrc.getY() * scale, rectSrc.getWidth() * scale, rectSrc
                            .getHeight()
                        * scale);
                    break;
                case TYPE_TRANSLATION | TYPE_UNIFORM_SCALE:
                    scale = this.getScaleX();
                    result.setRect(rectSrc.getX() * scale + this.getTranslateX(), rectSrc.getY() * scale + this.getTranslateY(),
                        rectSrc.getWidth() * scale, rectSrc.getHeight() * scale);
                    break;
                default:
                    let pts = AffineTransform.rectToArray(rectSrc);
                    this.transform(pts, 0, pts, 0, 4);
                    AffineTransform.rectFromArray(result, pts);
                    break;
            }
            return result;
        } else {
            let array = srcPts[0];
            if (srcPts[0] instanceof Point) {
                let ptSrc = srcPts, ptDst = dstPts;
                let state = this.state, src, x, y, dst;
                while (--numPts >= 0) {
                    src = ptSrc[srcOff++];
                    x = src.getX();
                    y = src.getY();
                    dst = ptDst[dstOff++];
                    if (dst === null) {
                        if (src instanceof Point) {
                            dst = new Point();
                        } else {
                            dst = new Point();
                        }
                        ptDst[dstOff - 1] = dst;
                    }
                    switch (state) {
                        default:
                            this.stateError();
                        case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                            dst.setLocation(x * this.m00 + y * this.m01 + this.m02, x * this.m10 + y * this.m11 + this.m12);
                            break;
                        case (APPLY_SHEAR | APPLY_SCALE):
                            dst.setLocation(x * this.m00 + y * this.m01, x * this.m10 + y * this.m11);
                            break;
                        case (APPLY_SHEAR | APPLY_TRANSLATE):
                            dst.setLocation(y * this.m01 + this.m02, x * this.m10 + this.m12);
                            break;
                        case (APPLY_SHEAR):
                            dst.setLocation(y * this.m01, x * this.m10);
                            break;
                        case (APPLY_SCALE | APPLY_TRANSLATE):
                            dst.setLocation(x * this.m00 + this.m02, y * this.m11 + this.m12);
                            break;
                        case (APPLY_SCALE):
                            dst.setLocation(x * this.m00, y * this.m11);
                            break;
                        case (APPLY_TRANSLATE):
                            dst.setLocation(x + this.m02, y + this.m12);
                            break;
                        case (APPLY_IDENTITY):
                            dst.setLocation(x, y);
                            break;
                    }
                }
            } else {
                let M00, M01, M02, M10, M11, M12;
                switch (this.state) {
                    default:
                        this.stateError();
                    case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                        M00 = this.m00;
                        M01 = this.m01;
                        M02 = this.m02;
                        M10 = this.m10;
                        M11 = this.m11;
                        M12 = this.m12;
                        while (--numPts >= 0) {
                            let x = srcPts[srcOff++], y = srcPts[srcOff++];
                            dstPts[dstOff++] = (M00 * x + M01 * y + M02);
                            dstPts[dstOff++] = (M10 * x + M11 * y + M12);
                        }
                        return;
                    case (APPLY_SHEAR | APPLY_SCALE):
                        M00 = this.m00;
                        M01 = this.m01;
                        M10 = this.m10;
                        M11 = this.m11;
                        while (--numPts >= 0) {
                            let x = srcPts[srcOff++], y = srcPts[srcOff++];
                            dstPts[dstOff++] = (M00 * x + M01 * y);
                            dstPts[dstOff++] = (M10 * x + M11 * y);
                        }
                        return;
                    case (APPLY_SHEAR | APPLY_TRANSLATE):
                        M01 = this.m01;
                        M02 = this.m02;
                        M10 = this.m10;
                        M12 = this.m12;
                        while (--numPts >= 0) {
                            let x = srcPts[srcOff++];
                            dstPts[dstOff++] = (M01 * srcPts[srcOff++] + M02);
                            dstPts[dstOff++] = (M10 * x + M12);
                        }
                        return;
                    case (APPLY_SHEAR):
                        M01 = this.m01;
                        M10 = this.m10;
                        while (--numPts >= 0) {
                            let x = srcPts[srcOff++];
                            dstPts[dstOff++] = (M01 * srcPts[srcOff++]);
                            dstPts[dstOff++] = (M10 * x);
                        }
                        return;
                    case (APPLY_SCALE | APPLY_TRANSLATE):
                        M00 = this.m00;
                        M02 = this.m02;
                        M11 = this.m11;
                        M12 = this.m12;
                        while (--numPts >= 0) {
                            dstPts[dstOff++] = (M00 * srcPts[srcOff++] + M02);
                            dstPts[dstOff++] = (M11 * srcPts[srcOff++] + M12);
                        }
                        return;
                    case (APPLY_SCALE):
                        M00 = this.m00;
                        M11 = this.m11;
                        while (--numPts >= 0) {
                            dstPts[dstOff++] = (M00 * srcPts[srcOff++]);
                            dstPts[dstOff++] = (M11 * srcPts[srcOff++]);
                        }
                        return;
                    case (APPLY_TRANSLATE):
                        M02 = this.m02;
                        M12 = this.m12;
                        while (--numPts >= 0) {
                            dstPts[dstOff++] = (srcPts[srcOff++] + M02);
                            dstPts[dstOff++] = (srcPts[srcOff++] + M12);
                        }
                        return;
                    case (APPLY_IDENTITY):
                        while (--numPts >= 0) {
                            dstPts[dstOff++] = (srcPts[srcOff++]);
                            dstPts[dstOff++] = (srcPts[srcOff++]);
                        }
                        return;
                }
            }

        }
    }

    translate(tx, ty) {
        switch (this.state) {
            default:
                this.stateError();
            case (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE):
                this.m02 = tx * this.m00 + ty * this.m01 + this.m02;
                this.m12 = tx * this.m10 + ty * this.m11 + this.m12;
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_SHEAR | APPLY_SCALE;
                    if (this.type !== TYPE_UNKNOWN) {
                        this.type -= TYPE_TRANSLATION;
                    }
                }
                return;
            case (APPLY_SHEAR | APPLY_SCALE):
                this.m02 = tx * this.m00 + ty * this.m01;
                this.m12 = tx * this.m10 + ty * this.m11;
                if (this.m02 !== 0.0 || this.m12 !== 0.0) {
                    this.state = APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE;
                    this.type |= TYPE_TRANSLATION;
                }
                return;
            case (APPLY_SHEAR | APPLY_TRANSLATE):
                this.m02 = ty * this.m01 + this.m02;
                this.m12 = tx * this.m10 + this.m12;
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_SHEAR;
                    if (this.type !== TYPE_UNKNOWN) {
                        this.type -= TYPE_TRANSLATION;
                    }
                }
                return;
            case (APPLY_SHEAR):
                this.m02 = ty * this.m01;
                this.m12 = tx * this.m10;
                if (this.m02 !== 0.0 || this.m12 !== 0.0) {
                    this.state = APPLY_SHEAR | APPLY_TRANSLATE;
                    this.type |= TYPE_TRANSLATION;
                }
                return;
            case (APPLY_SCALE | APPLY_TRANSLATE):
                this.m02 = tx * this.m00 + this.m02;
                this.m12 = ty * this.m11 + this.m12;
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_SCALE;
                    if (this.type !== TYPE_UNKNOWN) {
                        this.type -= TYPE_TRANSLATION;
                    }
                }
                return;
            case (APPLY_SCALE):
                this.m02 = tx * this.m00;
                this.m12 = ty * this.m11;
                if (this.m02 !== 0.0 || this.m12 !== 0.0) {
                    this.state = APPLY_SCALE | APPLY_TRANSLATE;
                    this.type |= TYPE_TRANSLATION;
                }
                return;
            case (APPLY_TRANSLATE):
                this.m02 = tx + this.m02;
                this.m12 = ty + this.m12;
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                }
                return;
            case (APPLY_IDENTITY):
                this.m02 = tx;
                this.m12 = ty;
                if (tx !== 0.0 || ty !== 0.0) {
                    this.state = APPLY_TRANSLATE;
                    this.type = TYPE_TRANSLATION;
                }
                return;
        }
    }

    updateState() {
        if (this.m01 === 0.0 && this.m10 === 0.0) {
            if (this.m00 === 1.0 && this.m11 === 1.0) {
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_IDENTITY;
                    this.type = TYPE_IDENTITY;
                } else {
                    this.state = APPLY_TRANSLATE;
                    this.type = TYPE_TRANSLATION;
                }
            } else {
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_SCALE;
                    this.type = TYPE_UNKNOWN;
                } else {
                    this.state = (APPLY_SCALE | APPLY_TRANSLATE);
                    this.type = TYPE_UNKNOWN;
                }
            }
        } else {
            if (this.m00 === 0.0 && this.m11 === 0.0) {
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = APPLY_SHEAR;
                    this.type = TYPE_UNKNOWN;
                } else {
                    this.state = (APPLY_SHEAR | APPLY_TRANSLATE);
                    this.type = TYPE_UNKNOWN;
                }
            } else {
                if (this.m02 === 0.0 && this.m12 === 0.0) {
                    this.state = (APPLY_SHEAR | APPLY_SCALE);
                    this.type = TYPE_UNKNOWN;
                } else {
                    this.state = (APPLY_SHEAR | APPLY_SCALE | APPLY_TRANSLATE);
                    this.type = TYPE_UNKNOWN;
                }
            }
        }
    }

}
