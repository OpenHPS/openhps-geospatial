import { Absolute2DPosition, SerializableObject } from "@openhps/core";
import { Floor } from "./Floor";
import { SymbolicSpace } from "./SymbolicSpace";

@SerializableObject()
export class Room extends SymbolicSpace<Absolute2DPosition> {

    public setFloor(floor: Floor): this {
        this.parent = floor;
        return this;
    }
    
}
