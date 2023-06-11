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
    Quaternion,
    Absolute3DPosition,
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
    @SerializableMember()
    origin: AbsolutePosition;

    constructor(displayName?: string) {
        super();
        this.displayName = displayName;
    }

    /**
     * Get the boundary type
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
            this.rotation(eulerRotation); // Reference space transformation

            const boundsArray: AbsolutePosition[] = [];
            if (topLeft instanceof GeographicalPosition) {
                const topRight: GeographicalPosition = topLeft.destination(bounds.rotation, bounds.width);
                const bottomLeft: GeographicalPosition = topLeft.destination(bounds.rotation + 90, bounds.length);
                const bottomRight: GeographicalPosition = topRight.destination(bounds.rotation + 90, bounds.length);
                boundsArray.push(topLeft);
                boundsArray.push(topRight);
                boundsArray.push(bottomRight);
                boundsArray.push(bottomLeft);
                boundsArray.push(topLeft);
                this.origin = bottomLeft.clone();
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
                boundsArray.push(topLeft);
                boundsArray.push(topLeft.clone().fromVector(topRight, LengthUnit.METER));
                boundsArray.push(topLeft.clone().fromVector(bottomRight, LengthUnit.METER));
                boundsArray.push(topLeft.clone().fromVector(bottomLeft, LengthUnit.METER));
                boundsArray.push(topLeft);

                this.origin = new this.positionConstructor();
                this.origin.fromVector(bottomLeft.clone());
            }
            if (bounds.height) {
                boundsArray.forEach((bound) => {
                    const boundUp = bound.clone() as Absolute3DPosition;
                    boundUp.z = boundUp.z + bounds.height;
                    boundsArray.push(boundUp);
                });
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
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, diff.y, 0)));
                const bottomLeft = topLeft.clone().add(new Vector3(0, diff.y, 0));
                this.coordinates.push(bottomLeft);
                this.origin = new this.positionConstructor();
                this.origin.fromVector(bottomLeft.clone());

                this.coordinates.push(topLeft.clone().add(new Vector3(0, 0, diff.z)));
                this.coordinates.push(topLeft.clone().add(new Vector3(diff.x, 0, diff.z)));
                this.coordinates.push(bottomRight);
                this.coordinates.push(topLeft.clone().add(new Vector3(0, diff.y, diff.z)));
                this.coordinates.push(topLeft); // Closed
            } else {
                // 2D
                this.coordinates.push(topLeft);
                this.coordinates.push(topLeft.clone().add(new Vector3(0, diff.y, 0)));
                this.coordinates.push(bottomRight);
                const bottomLeft = topLeft.clone().add(new Vector3(diff.x, 0, 0));
                this.origin = new this.positionConstructor();
                this.origin.fromVector(bottomLeft.clone());
                this.coordinates.push(bottomLeft);
                this.coordinates.push(topLeft);
            }
        } else {
            // Polygon
            this.coordinates = points;
            if (this.coordinates[0].toArray() !== this.coordinates[this.coordinates.length - 1].toArray()) {
                this.coordinates.push(this.coordinates[0]);
            }
        }
    }

    /**
     * Get the boundaries of the space
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
        const filteredCoordinates = this.coordinates.filter((e, i) => this.coordinates.indexOf(e) === i);
        const centerPoint = filteredCoordinates
            .reduce((a, b) => a.clone().add(b))
            .divideScalar(filteredCoordinates.length);
        this.centroid.fromVector(centerPoint, LengthUnit.METER);
    }

    /**
     * Set the parent symbolic location
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
     * @param {AbsolutePosition} position Absolute position to check
     * @returns {boolean} Point inside boundaries
     */
    isInside(position: AbsolutePosition): boolean {
        const transformedPosition = position instanceof this.positionConstructor ? position : this.transform(position);
        const isGeo = position instanceof GeographicalPosition;
        const point = isGeo ? transformedPosition.toVector3() : transformedPosition.toVector3(LengthUnit.METER);
        let coordinates: Vector3[] = this.coordinates;
        if (isGeo) {
            const bounds = this.getBounds();
            if (this.positionConstructor.name === GeographicalPosition.name) {
                coordinates = bounds.map((pos) => pos.toVector3());
            } else {
                coordinates = bounds.map((pos) => this.transform(pos)).map((pos) => pos.toVector3());
            }
        }
        const zSorted = coordinates.map((c) => c.z).sort((a, b) => a - b);
        const minZ = zSorted[0];
        const maxZ = zSorted[zSorted.length - 1];
        if (minZ !== maxZ) {
            coordinates = coordinates.filter((c) => Math.round(c.z) === Math.round(minZ));
        }
        return (
            this._rayCasting(
                [point.x, point.y],
                coordinates.map((c) => [c.x, c.y]),
            ) &&
            point.z >= minZ &&
            point.z <= maxZ
        );
    }

    private _rayCasting(point: number[], polygon: number[][]) {
        const n = polygon.length;
        if (n === 0) {
            return false;
        }
        let isIn = false;
        const x = point[0];
        const y = point[1];
        let x1, x2, y1, y2;
        x1 = polygon[n - 1][0];
        y1 = polygon[n - 1][1];

        for (let i = 0; i < n; ++i) {
            x2 = polygon[i][0];
            y2 = polygon[i][1];

            if (y < y1 !== y < y2 && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
                isIn = !isIn;
            }
            x1 = x2;
            y1 = y2;
        }

        return isIn;
    }

    /**
     * Check if the space is connected to another
     * @param {SymbolicSpace} space Space to check if connected
     * @returns {boolean} connected or not
     */
    isConnected(space: SymbolicSpace<any>): boolean {
        return Array.from(this.connectedSpaces.values()).includes(space.uid);
    }

    /**
     * Add a connected space
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
     * @param {any} json GeoJSON
     * @returns {SymbolicSpace} symbolic space instance
     */
    static fromGeoJSON<T extends typeof SymbolicSpace>(json: any): InstanceType<T> {
        if (!json) {
            return undefined;
        }
        if (!json.properties) {
            json.properties = {};
        }
        let instance = undefined;
        if (json.properties.type) {
            const dataType = DataSerializer.findTypeByName(json.properties.type) as Constructor<T>;
            instance = new dataType() as InstanceType<T>;
        } else {
            instance = new SymbolicSpace();
        }
        instance.uid = json.properties.uid;
        instance.parentUID = json.properties.parent_uid;
        instance.priority = json.properties.priority;
        instance.displayName = json.properties.name;
        if (json.properties.transformationMatrix) {
            instance.transformationMatrix.elements = json.properties.transformationMatrix;
        }
        if (json.properties.translationMatrix) {
            instance.translationMatrix.elements = json.properties.translationMatrix;
        }
        if (json.properties.scaleMatrix) {
            instance.scaleMatrix.elements = json.properties.scaleMatrix;
        }
        if (json.properties.rotationQuaternion) {
            instance.rotationQuaternion = new Quaternion(...instance.rotationQuaternion);
        }
        instance.coordinates = (
            json.geometry && json.geometry.coordinates ? json.geometry.coordinates : json.coordinates
        )[0].map((pos: number[]) => {
            const position = new GeographicalPosition();
            position.x = pos[0];
            position.y = pos[1];
            position.z = pos[2];
            return position.toVector3(LengthUnit.METER);
        });
        instance.positionConstructor = GeographicalPosition;
        instance.updateCentroid();
        return instance as InstanceType<T>;
    }

    static fromWKT<T extends typeof SymbolicSpace>(wktLiteral: string): InstanceType<T> {
        const geojson = wkt.parse(wktLiteral);
        if (!geojson) {
            throw new Error(`Unable to deserialize well-known text for ${wktLiteral}`);
        }
        return this.fromGeoJSON(geojson);
    }

    /**
     * Convert the symbolic space to GeoJSON
     * @param {boolean} [flat] Flat GeoJSON
     * @returns {any} GeoJSON
     */
    toGeoJSON(flat?: boolean): any {
        let coordinates = this.getBounds()
            .map((pos) => (pos instanceof GeographicalPosition ? pos : this.transform(pos)))
            .map((p) => p.toVector3().toArray())
            .map((p) => (flat ? [p[0], p[1]] : p));
        if (flat) {
            coordinates = coordinates.filter((e, i) => coordinates.indexOf(e) === i);
        }
        return {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coordinates],
            },
            properties: {
                name: this.displayName,
                uid: this.uid,
                parent_uid: this.parentUID,
                priority: this.priority,
                type: this.constructor.name,
                transformationMatrix: this.transformationMatrix.elements,
                rotationQuaternion: [
                    this.rotationQuaternion.x,
                    this.rotationQuaternion.y,
                    this.rotationQuaternion.z,
                    this.rotationQuaternion.w,
                ],
                scaleMatrix: this.scaleMatrix.elements,
                translationMatrix: this.translationMatrix.elements,
                boundaryType: this.positionConstructor.name,
            },
        };
    }

    /**
     * Convert the symbolic space to well-known text representation
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
     * @default 0
     */
    rotation?: number;
};
