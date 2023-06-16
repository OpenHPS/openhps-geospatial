import {
    Absolute2DPosition,
    Absolute3DPosition,
    GeographicalPosition,
    SerializableArrayMember,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { CellBoundary } from './CellBoundary';
import { Floor } from '../Floor';
import { SymbolicSpace } from '../SymbolicSpace';
import { Slant } from './Slant';

/**
 * A cell space is an OGC standard from the IndoorGML schema that identifies a space
 */
@SerializableObject()
export class CellSpace extends SymbolicSpace<Absolute3DPosition | Absolute2DPosition> {
    @SerializableArrayMember(CellBoundary)
    boundaries: CellBoundary[] = [];
    @SerializableMember()
    slant?: Slant;

    /**
     * Set the floor this cell space belongs to
     * @param {Floor} floor Floor object
     * @returns {CellSpace} cell space instance
     */
    setFloor(floor: Floor): this {
        this.parent = floor;
        this.priority = floor.priority + 1;
        return this;
    }

    set parent(floor: Floor) {
        super.parent = floor;
    }

    get parent(): Floor {
        return super.parent as Floor;
    }

    protected setArrayBounds(localBounds: Absolute3DPosition[] | Absolute2DPosition[]): void {
        if (localBounds.length > 0 && localBounds[0] instanceof GeographicalPosition) {
            return super.setArrayBounds(localBounds);
        }
        const bounds: Absolute3DPosition[] = localBounds.map((bound: Absolute3DPosition) => {
            const vector = bound.toVector3();
            return new Absolute3DPosition(vector.x, vector.y, 0);
        });
        if (this.parent && this.parent.ceilingHeight) {
            bounds.push(
                ...bounds.map((bound) => {
                    const clonedBound = bound.clone();
                    clonedBound.z = clonedBound.z + this.parent.ceilingHeight;
                    return clonedBound;
                }),
            );
            if (localBounds.length === 2) {
                bounds.splice(1, 2);
            }
        }
        super.setArrayBounds(bounds);
        return;
    }
}
