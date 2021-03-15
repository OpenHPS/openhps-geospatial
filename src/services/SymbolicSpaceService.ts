import { AbsolutePosition, DataObjectService, DataServiceDriver } from '@openhps/core';
import { SymbolicSpace } from '../data';

/**
 * Geocorder service for reverse geocoding a position to a symbolic space.
 */
export class SymbolicSpaceService<T extends SymbolicSpace<any>> extends DataObjectService<T> {
    constructor(dataServiceDriver?: DataServiceDriver<string, T>) {
        super(dataServiceDriver);
    }

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
                $geoWithin: {
                    $polygon: {},
                },
            } as any);
        });
    }
}
