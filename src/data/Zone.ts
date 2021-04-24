import { Absolute2DPosition, SerializableObject } from '@openhps/core';
import { Floor } from './Floor';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A zone represents an abstract symbolic space on a floor.
 */
@SerializableObject()
export class Zone extends SymbolicSpace<Absolute2DPosition> {
    public setFloor(floor: Floor): this {
        this.parent = floor;
        this.priority = floor.priority + 1;
        return this;
    }
}
