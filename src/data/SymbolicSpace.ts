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
    SerializableMember,
    DataSerializer,
    GeographicalPosition,
    Constructor,
    Accuracy1D,
} from '@openhps/core';
const wkt = require('wkt');

/**
 * A symbolic space can be used to indicate an abstract space with a boundary.
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
    coordinates: Vector3[] = [];
    @SerializableMember({
        serializer: (constructor) => {
            if (!constructor) {
                return AbsolutePosition.name;
            }
            return constructor.name;
        },
        deserializer: (constructorName) => {
            return DataSerializer.findTypeByName(constructorName);
        },
    })
    protected positionConstructor: new () => T;
    @SerializableMember()
    centroid: AbsolutePosition;
    @SerializableMapMember(Vector3, String)
    protected connectedSpaces: Map<Vector3, string> = new Map();
    @SerializableMember({
        constructor: Number,
    })
    priority = 0;

    constructor(displayName?: string) {
        super();
        this.displayName = displayName;
    }

    /**
     * Get the boundary type
     *
     * @returns {Constructor<AbsolutePosition>} Absolute position constructor
     */
    get boundaryType(): new () => T {
        return this.positionConstructor;
    }

    setBounds(bounds: T[]): this;
    setBounds(bounds: RectangleCornerBoundary<T>): this;
    setBounds(bounds: RectangleRotationBoundary<T>): this;
    setBounds(bounds: any): this {
        if (Array.isArray(bounds)) {
            // Array bounds
            this.setArrayBounds(bounds);
        } else if ('topLeft' in bounds) {
            // Rectangle boundary
            this.setRectangleBounds(bounds);
        }
        this.updateCentroid();
        return this;
    }

    protected setRectangleBounds(bounds: RectangleRotationBoundary<T>): void;
    protected setRectangleBounds(bounds: RectangleCornerBoundary<T>): void;
    protected setRectangleBounds(bounds: any): void {
        if ('width' in bounds) {
            const topLeft: T = bounds.topLeft;

            const eulerRotation = new Euler(0, 0, bounds.rotation, 'XYZ', AngleUnit.DEGREE);
            this.rotation(eulerRotation);

            const boundsArray: AbsolutePosition[] = [];
            if (topLeft instanceof GeographicalPosition) {
                const topRight: GeographicalPosition = topLeft.destination(bounds.rotation, bounds.width);
                const bottomLeft: GeographicalPosition = topLeft.destination(bounds.rotation + 90, bounds.length);
                const bottomRight: GeographicalPosition = topRight.destination(bounds.rotation + 90, bounds.length);
                boundsArray.push(bottomLeft);
                boundsArray.push(topLeft);
                boundsArray.push(topRight);
                boundsArray.push(bottomRight);
                if (bounds.height) {
                    boundsArray.forEach((bound) => {
                        const boundUp = bound.clone() as GeographicalPosition;
                        boundUp.altitude = boundUp.altitude + bounds.height;
                        boundsArray.push(boundUp);
                    });
                }
            } else {
                const topRight = topLeft
                    .toVector3(LengthUnit.METER)
                    .add(new Vector3(bounds.width, 0, 0).applyEuler(eulerRotation));
                const bottomLeft = topLeft
                    .toVector3(LengthUnit.METER)
                    .add(new Vector3(0, bounds.length, 0).applyEuler(eulerRotation));
                const bottomRight = topLeft
                    .toVector3(LengthUnit.METER)
                    .add(new Vector3(bounds.width, bounds.length, 0).applyEuler(eulerRotation));
                boundsArray.push(topLeft.clone().fromVector(bottomLeft, LengthUnit.METER));
                boundsArray.push(topLeft);
                boundsArray.push(topLeft.clone().fromVector(topRight, LengthUnit.METER));
                boundsArray.push(topLeft.clone().fromVector(bottomRight, LengthUnit.METER));
            }
            this.setArrayBounds(boundsArray as T[]);
        } else {
            this.setArrayBounds([bounds.topLeft, bounds.bottomRight]);
        }
    }

    protected setArrayBounds(bounds: T[]): void {
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
                this.coordinates.push(topLeft);
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, 0, 0)));
                this.coordinates.push(topLeft.clone().add(new Vector3(0, diff.y, 0)));
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, diff.y, 0)));
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, 0, diff.z)));
                this.coordinates.push(topLeft.clone().add(new Vector3(0, diff.y, diff.z)));
                this.coordinates.push(topLeft.clone().add(new Vector3(0, 0, diff.z)));
                this.coordinates.push(bottomRight);
            } else {
                // 2D
                this.coordinates.push(topLeft.clone().add(new Vector3(0, diff.y, 0)));
                this.coordinates.push(topLeft);
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, 0, 0)));
                this.coordinates.push(bottomRight);
            }
        } else {
            // Polygon
            this.coordinates = points;
        }
    }

    /**
     * Get the boundaries of the space
     *
     * @returns {AbsolutePosition[]} Array of boundary position
     */
    getBounds(): T[] {
        return this.coordinates.map((point) => {
            const position = new this.positionConstructor();
            position.fromVector(point, LengthUnit.METER);
            return position;
        });
    }

    protected updateCentroid(): void {
        this.centroid = new this.positionConstructor();
        this.centroid.referenceSpaceUID = this.uid;
        const centerPoint = this.coordinates.reduce((a, b) => a.clone().add(b)).divideScalar(this.coordinates.length);
        this.centroid.fromVector(centerPoint, LengthUnit.METER);
    }

    /**
     * Set the parent symbolic location
     *
     * @param {SymbolicSpace} loc Parent symbolic location
     */
    set parent(loc: SymbolicSpace<any>) {
        super.parent = loc;
    }

    get parent(): SymbolicSpace<any> {
        return super.parent as SymbolicSpace<any>;
    }

    /**
     * Check if a position lies within a symbolic location
     *
     * @param {AbsolutePosition} position Absolute position to check
     * @returns {boolean} Point inside boundaries
     */
    isInside(position: AbsolutePosition): boolean {
        const transformedPosition = position instanceof this.positionConstructor ? position : this.transform(position);
        const point = transformedPosition.toVector3(LengthUnit.METER);
        let inside = false;
        const coordinates: Vector3[] =
            position instanceof GeographicalPosition && this.positionConstructor.name !== GeographicalPosition.name
                ? this.getBounds()
                      .map((pos) => this.transform(pos))
                      .map((pos) => pos.toVector3(LengthUnit.METER))
                : this.coordinates;
        const zSorted = coordinates.map((c) => c.z).sort((a, b) => a - b);
        const minZ = zSorted[0];
        const maxZ = zSorted[zSorted.length - 1];
        for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
            const xi = coordinates[i].x;
            const yi = coordinates[i].y;
            const xj = coordinates[j].x;
            const yj = coordinates[j].y;
            const intersect = yi > point.y != yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }
        return inside && point.z >= minZ && point.z <= maxZ;
    }

    /**
     * Check if the space is connected to another
     *
     * @param {SymbolicSpace} space Space to check if connected
     * @returns {boolean} connected or not
     */
    isConnected(space: SymbolicSpace<any>): boolean {
        return Array.from(this.connectedSpaces.values()).includes(space.uid);
    }

    /**
     * Add a connected space
     *
     * @param {SymbolicSpace} space Connected space
     * @param {AbsolutePosition} [position] Position of connection
     * @returns {SymbolicSpace} instance
     */
    addConnectedSpace(space: SymbolicSpace<any>, position?: T): this {
        this.connectedSpaces.set(position.toVector3(), space.uid);
        return this;
    }

    /**
     * Convert the symbolic space to an absolute position
     *
     * @returns {AbsolutePosition} Absolute position
     */
    toPosition(): T {
        const centroid = this.centroid as T;
        const centroidVector = centroid.toVector3(LengthUnit.METER);
        const maxDistance = this.coordinates.map((coord) => centroidVector.distanceTo(coord)).sort((a, b) => a - b)[0];
        centroid.accuracy = new Accuracy1D(maxDistance, LengthUnit.METER);
        return centroid;
    }

    /**
     * Create a new symbolic space GeoJSON
     *
     * @param {any} json GeoJSON
     * @returns {SymbolicSpace} symbolic space instance
     */
    static fromGeoJSON<T extends typeof SymbolicSpace>(json: any): InstanceType<T> {
        const dataType = DataSerializer.findTypeByName(json.properties.type) as Constructor<T>;
        const instance = new dataType() as InstanceType<T>;
        instance.uid = json.properties.uid;
        instance.parentUID = json.properties.parent_uid;
        instance.priority = json.properties.priority;
        instance.displayName = json.properties.name;
        instance.coordinates = json.geometry.coordinates[0].map((pos: number[]) => {
            const position = new GeographicalPosition();
            position.x = pos[0];
            position.y = pos[1];
            position.z = pos[2];
            return position.toVector3(LengthUnit.METER);
        });
        instance.positionConstructor = GeographicalPosition;
        instance.updateCentroid();
        return instance;
    }

    static fromWKT<T extends typeof SymbolicSpace>(wktLiteral: string): InstanceType<T> {
        return this.fromGeoJSON(wkt.parse(wktLiteral));
    }

    /**
     * Convert the symbolic space to GeoJSON
     *
     * @returns {any} GeoJSON
     */
    toGeoJSON(): any {
        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    this.getBounds()
                        .map((pos) => this.transform(pos))
                        .map((p) => p.toVector3().toArray()),
                ],
            },
            properties: {
                name: this.displayName,
                uid: this.uid,
                parent_uid: this.parentUID,
                priority: this.priority,
                type: this.constructor.name,
                boundaryType: this.positionConstructor.name,
            },
        };
    }

    /**
     * Convert the symbolic space to well-known text representation
     *
     * @returns {string} WKT
     */
    toWKT(): string {
        return wkt.stringify(this.toGeoJSON());
    }
}

export type RectangleCornerBoundary<T extends AbsolutePosition> = {
    topLeft: T;
    bottomRight: T;
};

export type RectangleRotationBoundary<T extends AbsolutePosition> = {
    topLeft: T;
    /**
     * Width of the boundary in meters
     */
    width: number;
    /**
     * Length of the boundary in meters
     */
    height?: number;
    /**
     * Height of the boundary in meters
     */
    length: number;
    /**
     * Rotation of the boundary in degrees
     *
     * @default 0
     */
    rotation?: number;
};
