import { Absolute2DPosition, SerializableMember, SerializableObject } from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A floor represents a symbolic space inside a building.
 */
@SerializableObject()
export class Floor extends SymbolicSpace<Absolute2DPosition> {
    @SerializableMember()
    groundHeight: number;
    @SerializableMember()
    doorHeight: number;
    @SerializableMember()
    floorLevel: number;
    @SerializableMember()
    ceilingHeight: number;

    /**
     * Set the building this floor belongs to
     *
     * @param {Building} building Building
     * @returns {Floor} instance
     */
    setBuilding(building: Building): this {
        this.parent = building;
        this.setBounds(building.getLocalBounds());
        this.priority = building.priority + 1;
        return this;
    }

    /**
     * Set the floor number
     *
     * @param {number} floor Floor number
     * @param {number} [floorHeight=3] Ceiling floor height (meters)
     * @returns {Floor} Floor instance
     */
    setFloorNumber(floor: number, floorHeight = 3): this {
        this.translation(0, 0, floor * floorHeight);
        this.floorLevel = floor;
        this.setCeilingHeight(floorHeight);
        return this;
    }

    /**
     * Set the height of the floor
     *
     * @deprecated Use setGroundHeight
     * @param {number} height Height of the floor
     * @returns {Floor} Floor instance
     */
    setHeight(height: number): this {
        return this.setGroundHeight(height);
    }

    /**
     * Set the ground height of the floor
     *
     * @param {number} height Height of the floor
     * @returns {Floor} Floor instance
     */
    setGroundHeight(height: number): this {
        this.groundHeight = height;
        return this;
    }

    /**
     * Set the ceiling height of the floor
     *
     * @param {number} height Ceiling height of the floor
     * @returns {Floor} Floor instance
     */
    setCeilingHeight(height: number): this {
        this.ceilingHeight = height;
        return this;
    }

    /**
     * Set the door height of the floor
     *
     * @param {number} height Height of the floor
     * @returns {Floor} Floor instance
     */
    setDoorHeight(height: number): this {
        this.doorHeight = height;
        return this;
    }
}
