import { AbsolutePosition, Accuracy, LengthUnit, SerializableObject } from '@openhps/core';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * Geospatial accuracy that uses a [[SymbolicSpace]] as the accuracy.
 */
@SerializableObject()
export class GeospatialAccuracy<T extends SymbolicSpace<P>, P extends AbsolutePosition> extends Accuracy<
    LengthUnit,
    T
> {
    constructor(space?: T) {
        super(space, LengthUnit.METER);
    }

    toString(): string {
        return this.value.displayName;
    }

    /**
     * Get the largest distance as a 1D accuracy
     * @returns {number} 1D Accuracy
     */
    valueOf(): number {
        return this.value
            .getBounds()
            .map((pos) => this.value.centroid.distanceTo(pos))
            .reduce((a, b) => Math.max(a, b), 0);
    }
}
