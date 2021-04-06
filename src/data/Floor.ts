import { Absolute2DPosition, SerializableObject } from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A floor represents a symbolic space inside a building.
 */
@SerializableObject()
export class Floor extends SymbolicSpace<Absolute2DPosition> {
    public setBuilding(building: Building): this {
        this.parent = building;
        this.setBounds(building.getLocalBounds());
        this.priority = building.priority + 1;
        return this;
    }

    /**
     * Set the floor number
     *
     * @param {number} floor Floor number
     * @param {number} [floorHeight=3] Floor height (meters)
     * @returns {Floor} Floor instance
     */
    public setFloorNumber(floor: number, floorHeight = 3): this {
        this.translation(0, 0, floor * floorHeight);
        return this;
    }
}
