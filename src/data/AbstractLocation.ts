import { Absolute2DPosition, SerializableMember, SerializableObject } from '@openhps/core';

/**
 * An abstract location is identified by a unique identifier (UID).
 * It generates a random location based on the UID allowing it to be used in fingerprinting algorithms.
 */
@SerializableObject()
export class AbstractLocation extends Absolute2DPosition {
    @SerializableMember({
        name: 'uid',
    })
    private _uid: string;

    constructor(uid?: string, range: number = 1000) {
        super();
        this._uid = uid;
        // Generate X and Y coordinate based on the UID (random)
        // This should be a hash based on the UID string.
        // Range is the radius of the circle around the origin (0,0).
        const hashX = this.hashCode(uid + 'x' + range);
        const hashY = this.hashCode(uid + 'y' + range * 2);
        const angleX = ((hashX % 360) + 45) * (Math.PI / 180); // Offset angle for better distribution
        const angleY = ((hashY % 360) + 90) * (Math.PI / 180); // Offset angle for better distribution
        const radiusX = ((hashX % range) + 1) * 0.9; // Slightly scale radius for distinction
        const radiusY = ((hashY % range) + 1) * 1.1; // Slightly scale radius for distinction
        this.x = Math.cos(angleX) * radiusX;
        this.y = Math.sin(angleY) * radiusY;
    }

    get uid(): string {
        return this._uid;
    }

    hashCode(str: string): number {
        str = str.toLowerCase();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = Math.imul(hash ^ char, 2654435761); // Use a prime multiplier for better distribution
            hash = (hash << 13) | (hash >>> 19); // Bitwise rotation for added randomness
        }
        return Math.abs(hash);
    }
}
