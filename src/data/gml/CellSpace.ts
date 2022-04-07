import { Absolute2DPosition, SerializableArrayMember, SerializableMember, SerializableObject } from '@openhps/core';
import { CellBoundary } from './CellBoundary';
import { Floor } from '../Floor';
import { SymbolicSpace } from '../SymbolicSpace';
import { Slant } from './Slant';

/**
 * A cell space is an OGC standard from the IndoorGML schema that identifies a space
 */
@SerializableObject()
export class CellSpace extends SymbolicSpace<Absolute2DPosition> {
    @SerializableArrayMember(CellBoundary)
    boundaries: CellBoundary[] = [];
    @SerializableMember()
    slant?: Slant;

    /**
     * Set the floor this cell space belongs to
     *
     * @param {Floor} floor Floor object
     * @returns {CellSpace} cell space instance
     */
    setFloor(floor: Floor): this {
        this.parent = floor;
        this.priority = floor.priority + 1;
        return this;
    }
}
