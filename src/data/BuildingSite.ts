import { GeographicalPosition, SerializableObject } from "@openhps/core";
import { SymbolicSpace } from "./SymbolicSpace";

@SerializableObject()
export class BuildingSite extends SymbolicSpace<GeographicalPosition> {

}
