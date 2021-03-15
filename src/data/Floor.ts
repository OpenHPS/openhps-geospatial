import { Absolute2DPosition, SerializableObject } from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

@SerializableObject()
export class Floor extends SymbolicSpace<Absolute2DPosition> {
    public setBuilding(building: Building): this {
        this.parent = building;
        this.setBounds(building.getLocalBounds());
        return this;
    }

    /**
     * Set the floor number
     *
     * @param {number} floor Floor number
     * @returns {Floor} Floor instance
     */
    public setFloorNumber(floor: number): this {
        this.translation(0, 0, floor);
        return this;
    }
}
