import { AbsolutePosition, DataObjectService, DataServiceDriver, Serializable } from '@openhps/core';
import { SymbolicSpace } from '../data';

/**
 * Geocoder service for reverse geocoding a position to a symbolic space.
 */
export class SymbolicSpaceService<T extends SymbolicSpace<any>> extends DataObjectService<T> {
    constructor(dataServiceDriver?: DataServiceDriver<string, T>) {
        super(dataServiceDriver);
    }

    /**
     * Find all children of a symbolic space
     * @param {SymbolicSpace} space Symbolic space to get children of
     * @returns {Promise<SymbolicSpace<any>[]>} Promise of an array of symbolic spaces
     */
    findChildren(space: T): Promise<SymbolicSpace<any>[]> {
        return new Promise((resolve, reject) => {
            this.findAll({
                parentUID: space.uid,
            })
                .then(resolve)
                .catch(reject);
        });
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
     * Find symbolic spaces and their probability using a type.
     * @param {Serializable} type Type of symbolic space
     * @returns {Promise<Array<[SymbolicSpace, number]>>} A promise of an array of symbolic spaces and their probability
     */
    findSymbolicSpaces(type: Serializable<T>): Promise<Array<SymbolicSpace<any>>>;
    /**
     * Find symbolic spaces and their probability using an absolute position
     * Perform reverse geocoding on an absolute position.
     * @param {AbsolutePosition} position Position to reverse geocode
     * @returns {Promise<Array<[SymbolicSpace, number]>>} A promise of an array of symbolic spaces and their probability
     */
    findSymbolicSpaces(position: AbsolutePosition): Promise<Array<[SymbolicSpace<any>, number]>>;
    findSymbolicSpaces(
        positionOrType: AbsolutePosition | Serializable<T>,
    ): Promise<Array<[SymbolicSpace<any>, number]>> | Promise<Array<SymbolicSpace<any>>> {
        return new Promise<any>((resolve, reject) => {
            if (positionOrType instanceof AbsolutePosition) {
                const position = positionOrType;
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
            } else {
                const type = positionOrType as Serializable<T>;
                this.findAll()
                    .then((results) => {
                        resolve(results.filter((res) => res instanceof type).map((res) => [res, -1]));
                    })
                    .catch(reject);
            }
        });
    }
}
