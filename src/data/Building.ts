import { Absolute2DPosition, GeographicalPosition, SerializableObject } from '@openhps/core';
import { SymbolicSpace } from './SymbolicSpace';

@SerializableObject()
export class Building extends SymbolicSpace<GeographicalPosition> {
    public getLocalBounds(): Absolute2DPosition[] {
        return undefined;
    }
}
