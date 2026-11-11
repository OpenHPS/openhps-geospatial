import { AbsolutePosition, GeographicalPosition, LengthUnit, Vector3 } from '@openhps/core';
import type { SymbolicSpace } from '../data/SymbolicSpace';
import { closestPointOnPolygon, pointInPolygon } from './geometry';
import type { LocalProjection, Point2 } from './geometry';
import { createSpaceFrame, frameSpaces, FramedSpace, isGeographicSpace } from './space-frame';

/**
 * The default maximum distance between a fix and a space boundary, in metres.
 */
export const DEFAULT_SNAP_DISTANCE_METERS = 10;

/**
 * Options for [[snapToSpace]].
 */
export interface SnapToSpaceOptions {
    /**
     * Do not snap when the nearest space boundary is farther than this (default 10 m).
     */
    maxDistanceMeters?: number;
    /**
     * Restrict the candidate spaces, for example to one floor or to walkable spaces only.
     */
    filter?: (space: SymbolicSpace<any>) => boolean;
}

/**
 * A position snapped onto the symbolic space model.
 */
export interface SnappedSpace {
    /**
     * The space the position belongs to.
     */
    space: SymbolicSpace<any>;
    /**
     * The snapped position; the input position when it is inside.
     */
    position: AbsolutePosition;
    /**
     * Whether the input position was already inside the space.
     */
    inside: boolean;
    /**
     * Distance from the input to the snapped position in metres.
     */
    distance: number;
}

/**
 * Snaps an absolute position to the nearest symbolic space.
 *
 * Point-in-polygon is tried first (using [[SymbolicSpace.isInside]], with the local metric
 * polygon as a fallback). A position inside a space keeps its coordinates; a position just
 * outside is projected onto the nearest boundary. When the nearest boundary is farther than
 * `maxDistanceMeters`, the result is `null`, so a caller does not pretend a fix 50 m outside the
 * building is on a corridor.
 *
 * ```typescript
 * const snapped = snapToSpace(new Absolute2DPosition(5, -1), floor.spaces);
 * if (snapped) {
 *     console.log(snapped.space.displayName, snapped.distance);
 * }
 * ```
 * @param {AbsolutePosition} position The position to snap
 * @param {Iterable<SymbolicSpace>} spaces The candidate spaces
 * @param {SnapToSpaceOptions} [options] Distance threshold and filter
 * @returns {SnappedSpace} The snapped space, or `null` when no space is close enough
 */
export function snapToSpace(
    position: AbsolutePosition,
    spaces: Iterable<SymbolicSpace<any>>,
    options: SnapToSpaceOptions = {},
): SnappedSpace | null {
    const maxDistance = options.maxDistanceMeters ?? DEFAULT_SNAP_DISTANCE_METERS;
    const geographic = position instanceof GeographicalPosition;
    const candidates: SymbolicSpace<any>[] = [];
    for (const space of spaces) {
        if (!space.coordinates || space.coordinates.length < 3) {
            continue;
        }
        if (isGeographicSpace(space) !== geographic) {
            continue;
        }
        if (options.filter && !options.filter(space)) {
            continue;
        }
        candidates.push(space);
    }
    if (candidates.length === 0) {
        return null;
    }

    const frame = createSpaceFrame(candidates);
    const framed = frameSpaces(candidates, frame);
    if (framed.length === 0) {
        return null;
    }
    const local = localPoint(position, geographic, frame.projection);

    let bestInside: FramedSpace | undefined;
    let bestOutside: { entry: FramedSpace; point: { x: number; y: number }; distance: number } | undefined;

    for (const entry of framed) {
        let inside: boolean;
        try {
            inside = entry.space.isInside(position);
        } catch {
            inside = false;
        }
        if (!inside) {
            inside = pointInPolygon(local, entry.ring, 1e-9);
        }
        if (inside) {
            // Prefer the smallest containing space: a room inside a zone is more specific.
            if (!bestInside || entry.area < bestInside.area) {
                bestInside = entry;
            }
            continue;
        }
        const closest = closestPointOnPolygon(local, entry.ring);
        if (closest.distance > maxDistance) {
            continue;
        }
        if (!bestOutside || closest.distance < bestOutside.distance) {
            bestOutside = { entry, point: closest.point, distance: closest.distance };
        }
    }

    if (bestInside) {
        return { space: bestInside.space, position, inside: true, distance: 0 };
    }
    if (bestOutside) {
        return {
            space: bestOutside.entry.space,
            position: snappedPosition(position, geographic, frame.projection, bestOutside.point),
            inside: false,
            distance: bestOutside.distance,
        };
    }
    return null;
}

/**
 * Projects the query position onto the local metre grid.
 * @param {AbsolutePosition} position The query position
 * @param {boolean} geographic Whether the position is geographical
 * @param {LocalProjection} projection The projection used by the space frame
 * @returns {Point2} The local point
 */
function localPoint(position: AbsolutePosition, geographic: boolean, projection: LocalProjection): Point2 {
    if (geographic) {
        const geo = position as GeographicalPosition;
        return projection.toLocal({ lon: geo.longitude, lat: geo.latitude });
    }
    const vector = position.toVector3(LengthUnit.METER);
    return { x: vector.x, y: vector.y };
}

/**
 * Builds a position of the input type from a snapped local point.
 * @param {AbsolutePosition} original The input position
 * @param {boolean} geographic Whether the position is geographical
 * @param {LocalProjection} projection The projection used by the space frame
 * @param {Point2} point The snapped local point
 * @returns {AbsolutePosition} The snapped position
 */
function snappedPosition(
    original: AbsolutePosition,
    geographic: boolean,
    projection: LocalProjection,
    point: Point2,
): AbsolutePosition {
    if (geographic) {
        const geo = original as GeographicalPosition;
        const snapped = projection.toGeo(point);
        return new GeographicalPosition(snapped.lat, snapped.lon, geo.altitude);
    }
    const vector = original.toVector3(LengthUnit.METER);
    const Constructor = original.constructor as new () => AbsolutePosition;
    const snapped = new Constructor();
    snapped.fromVector(new Vector3(point.x, point.y, vector.z), LengthUnit.METER);
    return snapped;
}
