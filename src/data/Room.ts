import { Absolute2DPosition, SerializableObject } from '@openhps/core';
import { Floor } from './Floor';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A room represents a symbolic space inside a floor.
 */
@SerializableObject()
export class Room extends SymbolicSpace<Absolute2DPosition> {
    public setFloor(floor: Floor): this {
        this.parent = floor;
        this.priority = floor.priority + 1;
        return this;
    }
}
