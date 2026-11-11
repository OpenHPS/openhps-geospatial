import { AbsolutePosition, SerializableMember, SerializableObject } from '@openhps/core';

/**
 * The semantic kind of a connection between two symbolic spaces.
 *
 * - `adjacent` — a connection with no further semantics (a manual link, or a legacy connection).
 * - `door` — a door or explicit portal on a shared wall.
 * - `opening` — a wide open boundary, such as a corridor mouth or a hall.
 * - `touch` — two boundaries that only touch in a point or along a very short wall; traversable,
 *   but not a door.
 * - `stairs` / `elevator` — a vertical connection between two floors.
 */
export type SpaceConnectionKind = 'adjacent' | 'door' | 'opening' | 'touch' | 'stairs' | 'elevator';

/**
 * Optional metadata supplied when connecting two symbolic spaces.
 */
export interface SpaceConnectionOptions {
    /**
     * The semantic kind of the connection. Defaults to `adjacent`.
     */
    type?: SpaceConnectionKind;
    /**
     * The clear width of the connection in metres. For a door this is the door width, for an
     * opening the width of the shared boundary.
     */
    width?: number;
}

/**
 * A connection between two symbolic spaces.
 *
 * The connection point itself is stored on the owning [[SymbolicSpace]] (in the
 * `connectedSpaces` boundary map); this object adds the metadata that map cannot hold:
 * what the connection *is* (a door, an opening, a stairs link, ...) and how wide it is.
 *
 * The `position` is resolved at runtime from the boundary map and is therefore not persisted;
 * the connection point of a serialized space is still part of the serialized `connectedSpaces`
 * map, so nothing is lost.
 *
 * ```typescript
 * const connection = new SpaceConnection('room-201', 'door', new Absolute2DPosition(4, 7), 0.9);
 * ```
 */
@SerializableObject()
export class SpaceConnection {
    /**
     * The uid of the connected space.
     */
    @SerializableMember()
    targetUID: string;
    /**
     * The semantic kind of the connection.
     */
    @SerializableMember()
    type: SpaceConnectionKind = 'adjacent';
    /**
     * The clear width of the connection in metres, when known.
     */
    @SerializableMember()
    width?: number;
    /**
     * The connection point in the frame of the connected spaces.
     *
     * This is populated from the `connectedSpaces` boundary map, it is not serialized separately.
     */
    position?: AbsolutePosition;

    constructor(
        targetUID?: string,
        type: SpaceConnectionKind = 'adjacent',
        position?: AbsolutePosition,
        width?: number,
    ) {
        this.targetUID = targetUID;
        this.type = type;
        this.position = position;
        this.width = width;
    }
}
