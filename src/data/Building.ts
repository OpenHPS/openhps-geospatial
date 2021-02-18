import { GeographicalPosition, SerializableObject } from "@openhps/core";
import { SymbolicSpace } from "./SymbolicSpace";

@SerializableObject()
export class Building extends SymbolicSpace<GeographicalPosition> {
    
    public setBounds(bounds: GeographicalPosition[]): this {
        return super.setBounds(bounds);
    }
    
}
