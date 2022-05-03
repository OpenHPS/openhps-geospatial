import { Absolute2DPosition, Absolute3DPosition, SerializableMember, SerializableObject } from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A floor represents a symbolic space inside a building.
 */
@SerializableObject()
export class Floor<P extends Absolute2DPosition | Absolute3DPosition = Absolute3DPosition> extends SymbolicSpace<P> {
    @SerializableMember()
    groundHeight = 0;
    @SerializableMember()
    floorLevel: number;
    @SerializableMember()
    ceilingHeight: number;

    setBounds(localBounds: any): this {
        let bounds: Absolute3DPosition[] = localBounds.map((bound: P) => {
            const vector = bound.toVector3();
            return new Absolute3DPosition(vector.x, vector.y, this.groundHeight ?? vector.z ?? 0);
        });
        if (this.ceilingHeight) {
            bounds = bounds.map((bound) => {
                const clonedBound = bound.clone();
                clonedBound.z = clonedBound.z + this.ceilingHeight;
                return clonedBound;
            });
        }
        super.setBounds(bounds as P[]);
        return this;
    }

    /**
     * Set the building this floor belongs to
     *
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
            this.setBounds((this.parent as Building).getLocalBounds() as P[]);
        }
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
        this.updateBounds();
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
}
