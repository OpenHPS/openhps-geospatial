import {
    SerializableArrayMember,
    SerializableObject,
    Vector3,
    AbsolutePosition,
    ReferenceSpace,
    SerializableMapMember,
    AngleUnit,
    Euler,
    LengthUnit,
} from '@openhps/core';

/**
 * A symbolic space can be used to indicate a building or room.
 * It is an extended ```ReferenceSpace``` with boundaries.
 *
 * ## About
 * A symbolic space is a ```ReferenceSpace```, and is therefore not directly as a position.
 * It indicates a symbolic space and provides several utilities. Both a hierarchical structure
 * and graph connection can be used to connect symbolic spaces together.
 *
 * ## Usage
 * ### Creation
 * Creating a symbolic space requires a generic position type. This type indicates
 * how the symbolic position should be interpreted.
 *
 * Optionally, the space can be initialized with a display name.
 * ```typescript
 * const lobby = new SymbolicSpace<Absolute2DPosition>("Main lobby");
 * const floor = new SymbolicSpace<Absolute2DPosition>("Floor 3");
 * ```
 *
 * ### Parent space
 * The parent space uses a wrapper for the ```ReferenceSpace.parentUID```.
 * ```typescript
 * lobby.parent = floor;
 * ```
 * In addition, the parent is also treated as the base reference space.
 *
 * ### Creating boundaries
 * Boundaries can be set of a symbolic space. Both 2D and 3D polygons are supported.
 * ```typescript
 * // Triangle boundary
 * lobby.setBounds([
 *  new Absolute2DPosition(2, 2),
 *  new Absolute2DPosition(5, 5),
 *  new Absolute2DPosition(8, 8)
 * ]);
 * ```
 * Positioning of boundaries is always relative to the parent (i.e. if the floor shifts position,
 * you do not have to change the lobby boundaries).
 *
 * ### Boundary utilities
 * Symbolic spaces provide several boundary utilities.
 *
 * #### Checking if a position is inside a symbolic space
 * ```typescript
 * lobby.isInside(new Absolute2DPosition(4, 4)); // true
 * lobby.isInside(new Absolute2DPosition(1, 1)); // false
 * ```
 *
 * #### Centroid
 * The centroid is determined using the boundaries, this will be
 * the position that is used.
 *
 * ### ```AbsolutePosition``` to ```SymbolicSpace```
 * Converting an absolute position to a symbolic space does not provide
 * a single result. Similar to geocoders, the results are sorted based on their
 * probability.
 *
 * For this, we make use of the [[SymbolicSpaceService]]. This service acts as the data store for
 * symbolic spaces.
 * ```typescript
 *
 * ```
 *
 * ### ```SymbolicSpace``` to ```AbsolutePosition```
 * Converting a symbolic space to a position uses the centroid that
 * is calculated from the boundaries.
 *
 * ```typescript
 * const object = new DataObject("mvdewync", "Maxim");
 * const position = lobby.toPosition();
 * ```
 */
@SerializableObject()
export class SymbolicSpace<T extends AbsolutePosition> extends ReferenceSpace {
    @SerializableArrayMember(Vector3)
    protected points: Vector3[] = [];
    protected positionConstructor: new () => T;
    protected centroid: AbsolutePosition;
    @SerializableMapMember(Vector3, String)
    protected connectedSpaces: Map<Vector3, string> = new Map();

    constructor(displayName?: string) {
        super();
        this.displayName = displayName;
    }

    public setBounds(bounds: T[]): this;
    public setBounds(bounds: RectangleCornerBoundary<T>): this;
    public setBounds(bounds: RectangleRotationBoundary<T>): this;
    public setBounds(bounds: any): this {
        if (Array.isArray(bounds)) {
            // Array bounds
            this._setArrayBounds(bounds);
        } else if ('topLeft' in bounds) {
            // Rectangle boundary
            this._setRectangleBounds(bounds);
        }
        this._update();
        return this;
    }

    private _setRectangleBounds(bounds: RectangleRotationBoundary<T>): void;
    private _setRectangleBounds(bounds: RectangleCornerBoundary<T>): void;
    private _setRectangleBounds(bounds: any): void {
        if ('width' in bounds) {
            const eulerRotation = new Euler(0, 0, bounds.rotation, 'XYZ', AngleUnit.DEGREE);
            this.rotation(eulerRotation);
            const topRight = bounds.topLeft.toVector3(LengthUnit.METER);
            topRight.add(new Vector3(bounds.width, 0, 0).applyEuler(eulerRotation));
            const bottomLeft = bounds.topLeft.toVector3(LengthUnit.METER);
            bottomLeft.add(new Vector3(0, bounds.height, 0).applyEuler(eulerRotation));
            const bottomRight = bounds.topLeft.toVector3(LengthUnit.METER);
            bottomRight.add(new Vector3(bounds.width, bounds.height, 0).applyEuler(eulerRotation));
            this._setArrayBounds([
                bounds.topLeft.clone().fromVector(bottomLeft, LengthUnit.METER),
                bounds.topLeft,
                bounds.topLeft.clone().fromVector(topRight, LengthUnit.METER),
                bounds.topLeft.clone().fromVector(bottomRight, LengthUnit.METER),
            ]);
        } else {
            this._setArrayBounds([bounds.topLeft, bounds.bottomRight]);
        }
    }

    private _setArrayBounds(bounds: T[]): void {
        this.positionConstructor = bounds[0].constructor as new () => T;
        const points = bounds.map((bound) => bound.toVector3(LengthUnit.METER));

        if (bounds.length === 2) {
            // Top left and bottom right
            const topLeft = points[0];
            const bottomRight = points[1];
            const diff = bottomRight.clone().sub(topLeft);

            const zCount = points.map((p) => p.z).reduce((a, b) => a + b);
            if (zCount !== 0) {
                // 3D
                this.points.push(topLeft);
                this.points.push(topLeft.clone().add(new Vector3(diff.x, 0, 0)));
                this.points.push(topLeft.clone().add(new Vector3(0, diff.y, 0)));
                this.points.push(topLeft.clone().add(new Vector3(diff.x, diff.y, 0)));
                this.points.push(topLeft.clone().add(new Vector3(diff.x, 0, diff.z)));
                this.points.push(topLeft.clone().add(new Vector3(0, diff.y, diff.z)));
                this.points.push(topLeft.clone().add(new Vector3(0, 0, diff.z)));
                this.points.push(bottomRight);
            } else {
                // 2D
                this.points.push(topLeft.clone().add(new Vector3(0, diff.y, 0)));
                this.points.push(topLeft);
                this.points.push(topLeft.clone().add(new Vector3(diff.x, 0, 0)));
                this.points.push(bottomRight);
            }
        } else {
            // Polygon
            this.points = points;
        }
    }

    /**
     * Get the boundaries of the space
     *
     * @returns {AbsolutePosition[]} Array of boundary position
     */
    public getBounds(): T[] {
        return this.points.map((point) => {
            const position = new this.positionConstructor();
            position.fromVector(point, LengthUnit.METER);
            return position;
        });
    }

    private _update(): void {
        this.centroid = new this.positionConstructor();
        const centerPoint = this.points.reduce((a, b) => a.clone().add(b)).divideScalar(this.points.length);
        this.centroid.fromVector(centerPoint);
    }

    /**
     * Set the parent symbolic location
     *
     * @param {SymbolicLocation} loc Parent symbolic location
     */
    public set parent(loc: SymbolicSpace<any>) {
        super.parent = loc;
    }

    /**
     * Check if a position lies within a symbolic location
     *
     * @param {AbsolutePosition} position Absolute position to check
     * @returns {boolean} Point inside boundaries
     */
    public isInside(position: T): boolean {
        const point = position.toVector3();
        let inside = false;
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            const xi = this.points[i].x;
            const yi = this.points[i].y;
            const zi = this.points[i].z;
            const xj = this.points[j].x;
            const yj = this.points[j].y;
            const zj = this.points[j].z;

            const intersect =
                yi > point.y != yj > point.y &&
                zi >= point.z != zj > point.z &&
                point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Check if the space is connected to another
     *
     * @param {SymbolicSpace} space Space to check if connected
     * @returns {boolean} connected or not
     */
    public isConnected(space: SymbolicSpace<any>): boolean {
        return Array.from(this.connectedSpaces.values()).includes(space.uid);
    }

    /**
     * Add a connected space
     *
     * @param {SymbolicSpace} space Connected space
     * @param {AbsolutePosition} [position] Position of connection
     */
    public addConnectedSpace(space: SymbolicSpace<any>, position?: T): this {
        this.connectedSpaces.set(position.toVector3(), space.uid);
        return this;
    }

    /**
     * Convert the symbolic space to an absolute position
     *
     * @returns {AbsolutePosition} Absolute position
     */
    public toPosition(): T {
        return this.centroid as T;
    }
}

type RectangleCornerBoundary<T extends AbsolutePosition> = {
    topLeft: T;
    bottomRight: T;
};

type RectangleRotationBoundary<T extends AbsolutePosition> = {
    topLeft: T;
    /**
     * Width of the boundary in meters
     */
    width: number;
    /**
     * Height of the boundary in meters
     */
    height: number;
    /**
     * Rotation of the boundary in degrees
     *
     * @default 0
     */
    rotation?: number;
};
