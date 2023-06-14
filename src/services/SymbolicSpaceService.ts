import { AbsolutePosition, DataObjectService, DataServiceDriver } from '@openhps/core';
import { SymbolicSpace } from '../data';

/**
 * Geocoder service for reverse geocoding a position to a symbolic space.
 */
export class SymbolicSpaceService<T extends SymbolicSpace<any>> extends DataObjectService<T> {
    constructor(dataServiceDriver?: DataServiceDriver<string, T>) {
        super(dataServiceDriver);
    }

    /**
     * Find a data object by its current absolute position
     * @param {AbsolutePosition} position Current absolute position
     * @returns {SymbolicSpace[]} Array of data objects that match the position
     */
    findByPosition(position: AbsolutePosition): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.findSymbolicSpaces(position)
                .then((responses) => {
                    return resolve(responses.map((r) => r[0] as T));
                })
                .catch(reject);
        });
    }

    /**
     * Find symbolic spaces and their probability using an absolute position
     * Perform reverse geocoding on an absolute position.
     * @param {AbsolutePosition} position Position to reverse geocode
     * @returns {Promise<Array<[SymbolicSpace, number]>>} A promise of an array of symbolic spaces and their probability
     */
    findSymbolicSpaces(position: AbsolutePosition): Promise<Array<[SymbolicSpace<any>, number]>> {
        return new Promise((resolve, reject) => {
            this.findAll()
                .then((results) => {
                    resolve(
                        results
                            .map((res) => {
                                if (res.parentUID) {
                                    const parent = results.filter((r) => r.uid === res.parentUID);
                                    res.parent = parent.length > 0 ? parent[0] : undefined;
                                }
                                return res;
                            })
                            .filter((res) => res.isInside(position))
                            .sort((a, b) => b.priority - a.priority)
                            .map((res) => [res, res.priority]),
                    );
                })
                .catch(reject);
        });
    }
}
