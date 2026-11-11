import { AbsolutePosition } from '@openhps/core';
import type { SymbolicSpace } from '../data/SymbolicSpace';
import type { SpaceConnectionKind } from '../data/SpaceConnection';
import { boundsIntersect, boundsOf, sharedBoundary } from './geometry';
import {
    createSpaceFrame,
    frameSpaces,
    FramedSpace,
    isGeographicSpace,
    positionDistance,
    positionFromPoint,
} from './space-frame';

/**
 * The default distance within which two boundaries are considered adjacent, in metres.
 */
export const DEFAULT_ADJACENCY_TOLERANCE_METERS = 0.3;

/**
 * The default minimum shared-wall width of a door, in metres.
 */
export const DEFAULT_MIN_DOOR_WIDTH_METERS = 0.75;

/**
 * The default shared-wall width above which a connection is an open boundary, in metres.
 */
export const DEFAULT_MAX_DOOR_WIDTH_METERS = 2.5;

/**
 * Options for [[connectAdjacentSpaces]].
 */
export interface ConnectAdjacentSpacesOptions {
    /**
     * Spaces whose boundaries are at most this far apart are adjacent (default 0.3 m).
     */
    adjacencyToleranceMeters?: number;
    /**
     * Shared walls at least this wide are classified as doors (default 0.75 m).
     */
    minDoorWidthMeters?: number;
    /**
     * Shared walls wider than this are open boundaries, not doors (default 2.5 m).
     */
    maxDoorWidthMeters?: number;
}

/**
 * One derived adjacency between two symbolic spaces.
 */
export interface SpaceAdjacency {
    /**
     * The first space.
     */
    from: SymbolicSpace<any>;
    /**
     * The second space.
     */
    to: SymbolicSpace<any>;
    /**
     * The semantic classification of the shared boundary.
     */
    kind: SpaceConnectionKind;
    /**
     * The length of the shared wall in metres.
     */
    sharedLength: number;
    /**
     * The distance between the two centroids through the connection point, in metres.
     */
    distance: number;
    /**
     * The connection point in the frame of the two spaces.
     */
    connector: AbsolutePosition;
}

/**
 * Derives adjacency from the boundaries of symbolic spaces and records it on the spaces.
 *
 * Spaces are compared pairwise within the same parent (floor) and the same coordinate system.
 * When their boundaries touch or lie within `adjacencyToleranceMeters` they are connected with
 * [[SymbolicSpace.addConnectedSpace]], and the connection carries the semantic kind and width:
 *
 * - a shared wall at least `maxDoorWidthMeters` wide is an `opening` (a corridor mouth or hall),
 * - a shared wall at least `minDoorWidthMeters` wide is a `door`,
 * - a shorter contact or a point touch is a `touch` (traversable, but not a door).
 *
 * Spaces whose interiors overlap are reported by the returned adjacency not being created: an
 * overlap is a modelling error, not a connection.
 *
 * ```typescript
 * connectAdjacentSpaces(floor.spaces, { adjacencyToleranceMeters: 0.2 });
 * room.isConnected(corridor); // true
 * ```
 * @param {Iterable<SymbolicSpace>} spaces The spaces to connect; they should share a parent frame
 * @param {ConnectAdjacentSpacesOptions} [options] Construction options
 * @returns {SpaceAdjacency[]} Every newly derived adjacency
 */
export function connectAdjacentSpaces(
    spaces: Iterable<SymbolicSpace<any>>,
    options: ConnectAdjacentSpacesOptions = {},
): SpaceAdjacency[] {
    const tolerance = options.adjacencyToleranceMeters ?? DEFAULT_ADJACENCY_TOLERANCE_METERS;
    const minDoorWidth = options.minDoorWidthMeters ?? DEFAULT_MIN_DOOR_WIDTH_METERS;
    const maxDoorWidth = options.maxDoorWidthMeters ?? DEFAULT_MAX_DOOR_WIDTH_METERS;
    const frame = createSpaceFrame(spaces);
    const framed = frameSpaces(spaces, frame);

    const groups = new Map<string, FramedSpace[]>();
    for (const entry of framed) {
        const geographic = isGeographicSpace(entry.space);
        const key = `${entry.space.parentUID ?? ''}|${geographic ? 'geo' : 'local'}`;
        const group = groups.get(key) ?? [];
        group.push(entry);
        groups.set(key, group);
    }

    const adjacencies: SpaceAdjacency[] = [];
    for (const group of groups.values()) {
        for (let i = 0; i < group.length; i += 1) {
            for (let j = i + 1; j < group.length; j += 1) {
                const from = group[i];
                const to = group[j];
                const fromBounds = boundsOf(from.ring);
                const toBounds = boundsOf(to.ring);
                if (!fromBounds || !toBounds) {
                    continue;
                }
                if (!boundsIntersect(fromBounds, toBounds, tolerance)) {
                    continue;
                }
                const shared = sharedBoundary(from.ring, to.ring, tolerance);
                if (shared.overlaps || !shared.touches) {
                    continue;
                }
                const kind = classifyConnection(shared.sharedLength, minDoorWidth, maxDoorWidth);
                const connector = positionFromPoint(from.space, frame, shared.midpoint);
                const width = shared.sharedLength > 0 ? shared.sharedLength : undefined;
                record(from.space, to.space, connector, kind, width);
                adjacencies.push({
                    from: from.space,
                    to: to.space,
                    kind,
                    sharedLength: shared.sharedLength,
                    distance: connectorDistance(from, to, connector),
                    connector,
                });
            }
        }
    }
    return adjacencies;
}

/**
 * Classifies a connection from the width of its shared wall.
 * @param {number} sharedLength The shared wall length in metres
 * @param {number} minDoorWidth The minimum door width in metres
 * @param {number} maxDoorWidth The maximum door width in metres
 * @returns {SpaceConnectionKind} The connection kind
 */
function classifyConnection(sharedLength: number, minDoorWidth: number, maxDoorWidth: number): SpaceConnectionKind {
    if (sharedLength >= maxDoorWidth) {
        return 'opening';
    }
    if (sharedLength >= minDoorWidth) {
        return 'door';
    }
    return 'touch';
}

/**
 * Records a connection on both spaces.
 * @param {SymbolicSpace} from The source space
 * @param {SymbolicSpace} to The destination space
 * @param {AbsolutePosition} connector The connection point
 * @param {SpaceConnectionKind} kind The connection kind
 * @param {number} [width] The clear width in metres
 */
function record(
    from: SymbolicSpace<any>,
    to: SymbolicSpace<any>,
    connector: AbsolutePosition,
    kind: SpaceConnectionKind,
    width?: number,
): void {
    from.addConnectedSpace(to, connector, { type: kind, width });
    to.addConnectedSpace(from, connector, { type: kind, width });
}

/**
 * Computes the distance between two space centroids through a connection point.
 * @param {FramedSpace} from The source space
 * @param {FramedSpace} to The destination space
 * @param {AbsolutePosition} connector The connection point
 * @returns {number} The distance in metres
 */
function connectorDistance(from: FramedSpace, to: FramedSpace, connector: AbsolutePosition): number {
    const fromCentroid = from.space.centroid;
    const toCentroid = to.space.centroid;
    if (!fromCentroid || !toCentroid) {
        return Math.hypot(from.centroid.x - to.centroid.x, from.centroid.y - to.centroid.y);
    }
    return positionDistance(fromCentroid, connector) + positionDistance(connector, toCentroid);
}
