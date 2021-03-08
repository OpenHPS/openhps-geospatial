import { GeographicalPosition, SerializableObject } from '@openhps/core';
import { Building } from './Building';
import { SymbolicSpace } from './SymbolicSpace';

@SerializableObject()
export class BuildingSite extends SymbolicSpace<GeographicalPosition> {
    public addBuilding(building: Building): this {
        return this;
    }
}
