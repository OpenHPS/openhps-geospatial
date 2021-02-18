import { AbsolutePosition, DataObjectService } from "@openhps/core";
import { SymbolicSpace } from "../data";

export class GeocoderService<T extends SymbolicSpace<any>> extends DataObjectService<T> {
    /**
     * Find symbolic spaces and their probability using an absolute position
     * Perform reverse geocoding on an absolute position.
     *
     * @param {AbsolutePosition} position Position to reverse geocode
     * @returns {Promise<Array<[SymbolicSpace, number]>>} A promise of an array of symbolic spaces and their probability
     */
    public findSymbolicSpaces(position: AbsolutePosition): Promise<Array<[SymbolicSpace<any>, number]>> {
        return new Promise((resolve, reject) => {
            this.findAll({
                
            });
        });
    }
}
