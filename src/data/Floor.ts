import {
    Absolute2DPosition,
    Absolute3DPosition,
    GeographicalPosition,
    SerializableMember,
    SerializableObject,
} from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A floor represents a symbolic space inside a building.
 */
@SerializableObject()
export class Floor extends SymbolicSpace<Absolute3DPosition | Absolute2DPosition> {
    @SerializableMember()
    groundHeight: number = undefined;
    @SerializableMember()
    floorLevel: number;
    @SerializableMember()
    ceilingHeight: number;

    protected setArrayBounds(localBounds: Absolute3DPosition[] | Absolute2DPosition[]): void {
        if (localBounds.length > 0 && localBounds[0] instanceof GeographicalPosition) {
            return super.setArrayBounds(localBounds);
        }
        const bounds: Absolute3DPosition[] = localBounds.map((bound) => {
            const vector = bound.toVector3();
            return new Absolute3DPosition(vector.x, vector.y, 0);
        });
        if (this.ceilingHeight) {
            bounds.push(
                ...bounds.map((bound) => {
                    const clonedBound = bound.clone();
                    clonedBound.z = clonedBound.z + this.ceilingHeight;
                    return clonedBound;
                }),
            );
            if (localBounds.length === 2) {
                bounds.splice(1, 2);
            }
        }
        super.setArrayBounds(bounds);
    }

    /**
     * Set the building this floor belongs to
     * @param {Building} building Building
     * @returns {Floor} instance
     */
    setBuilding(building: Building): this {
        this.parent = building;
        this.priority = building.priority + 1;
        this.updateBounds();
        return this;
    }

    protected updateBounds(): void {
        if (this.parent) {
            this.setBounds((this.parent as Building).getLocalBounds() as Absolute3DPosition[]);
        }
    }

    /**
     * Set the floor number
     * @param {number} floor Floor number
     * @param {number} [floorHeight] Ceiling floor height (meters)
     * @returns {Floor} Floor instance
     */
    setFloorNumber(floor: number, floorHeight = 3): this {
        this.floorLevel = floor;
        this.setGroundHeight(this.groundHeight ?? floor * floorHeight);
        this.setCeilingHeight(floorHeight);
        this.updateBounds();
        return this;
    }

    /**
     * Set the height of the floor
     * @deprecated Use setGroundHeight
     * @param {number} height Height of the floor
     * @returns {Floor} Floor instance
     */
    setHeight(height: number): this {
        return this.setGroundHeight(height);
    }

    /**
     * Set the ground height of the floor
     * @param {number} height Height of the floor
     * @returns {Floor} Floor instance
     */
    setGroundHeight(height: number): this {
        this.groundHeight = height;
        this.translation(0, 0, this.groundHeight);
        return this;
    }

    /**
     * Set the ceiling height of the floor
     * @param {number} height Ceiling height of the floor
     * @returns {Floor} Floor instance
     */
    setCeilingHeight(height: number): this {
        this.ceilingHeight = height;
        return this;
    }
}
