import { Absolute2DPosition } from '@openhps/core';

/**
 * An abstract location is identified by a unique identifier (UID).
 * It generates a random location based on the UID allowing it to be used in fingerprinting algorithms.
 */
export class AbstractLocation extends Absolute2DPosition {
    private _uid: string;

    constructor(uid: string, range: number = 100) {
        super();
        this._uid = uid;
        // Generate X and Y coordinate based on the UID (random)
        // This should be a hash based on the UID string.
        // Range is the maximum distance from the origin (0,0) to the location.
        const hash = this.hashCode(uid);
        this.x = (hash % range) - range / 2;
        this.y = (hash % range) - range / 2;
    }

    get uid(): string {
        return this._uid;
    }

    hashCode(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
}
