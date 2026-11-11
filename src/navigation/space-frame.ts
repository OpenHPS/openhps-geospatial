import { Absolute2DPosition, AbsolutePosition, GeographicalPosition, LengthUnit, Vector3 } from '@openhps/core';
import type { SymbolicSpace } from '../data/SymbolicSpace';
import { openRing, Point2, polygonArea, createProjection, LocalProjection, polygonCentroid } from './geometry';

/**
 * A symbolic space together with its boundary expressed on a common planar frame.
 *
 * Spaces on the same parent (floor) share their coordinate frame, so their boundaries can be
 * compared directly. Geographical spaces are projected onto a local metre grid so tolerances and
 * distances remain metric.
 */
export interface FramedSpace {
    /**
     * The symbolic space.
     */
    space: SymbolicSpace<any>;
    /**
     * The open boundary ring on the local metre grid.
     */
    ring: Point2[];
    /**
     * The polygon centroid on the local metre grid.
     */
    centroid: Point2;
    /**
     * The polygon area in square metres.
     */
    area: number;
}

/**
 * The coordinate frame shared by a set of symbolic spaces.
 */
export interface SpaceFrame {
    /**
     * Whether the spaces have geographical boundaries.
     */
    geographic: boolean;
    /**
     * The projection used for geographical boundaries.
     */
    projection: LocalProjection;
}

/**
 * Checks whether a space uses geographical (WGS 84) boundaries.
 * @param {SymbolicSpace} space The symbolic space
 * @returns {boolean} `true` when the boundary positions are geographical
 */
export function isGeographicSpace(space: SymbolicSpace<any>): boolean {
    return space.boundaryType && space.boundaryType.name === GeographicalPosition.name;
}

/**
 * Creates the coordinate frame for a set of spaces.
 * @param {SymbolicSpace[]} spaces The spaces to frame
 * @returns {SpaceFrame} The frame
 */
export function createSpaceFrame(spaces: Iterable<SymbolicSpace<any>>): SpaceFrame {
    const points: Array<{ lon: number; lat: number }> = [];
    for (const space of spaces) {
        if (!isGeographicSpace(space)) {
            continue;
        }
        for (const bound of space.getBounds()) {
            if (Number.isFinite(bound.x) && Number.isFinite(bound.y)) {
                points.push({ lon: bound.x, lat: bound.y });
            }
        }
    }
    return { geographic: points.length > 0, projection: createProjection(points) };
}

/**
 * Reads the boundary ring of a space on the local metre grid.
 * @param {SymbolicSpace} space The symbolic space
 * @param {SpaceFrame} frame The coordinate frame
 * @returns {Point2[]} The open ring in metres
 */
export function spaceRing(space: SymbolicSpace<any>, frame: SpaceFrame): Point2[] {
    if (isGeographicSpace(space)) {
        return openRing(
            space
                .getBounds()
                .filter((bound) => Number.isFinite(bound.x) && Number.isFinite(bound.y))
                .map((bound) => frame.projection.toLocal({ lon: bound.x, lat: bound.y })),
        );
    }
    return openRing(
        space.coordinates
            .filter((coordinate) => coordinate)
            .map((coordinate) => ({ x: coordinate.x, y: coordinate.y })),
    );
}

/**
 * Frames every space with a valid boundary.
 * @param {Iterable<SymbolicSpace>} spaces The symbolic spaces
 * @param {SpaceFrame} [frame] An existing frame, created from the spaces when omitted
 * @returns {FramedSpace[]} The framed spaces
 */
export function frameSpaces(spaces: Iterable<SymbolicSpace<any>>, frame?: SpaceFrame): FramedSpace[] {
    const list = Array.from(spaces).filter((space) => space.coordinates && space.coordinates.length >= 3);
    const resolved = frame ?? createSpaceFrame(list);
    const framed: FramedSpace[] = [];
    for (const space of list) {
        const ring = spaceRing(space, resolved);
        const centroid = polygonCentroid(ring);
        if (ring.length < 3 || !centroid) {
            continue;
        }
        framed.push({ space, ring, centroid, area: polygonArea(ring) });
    }
    return framed;
}

/**
 * Creates a position of the same boundary type as a space from a local point.
 * @param {SymbolicSpace} space The symbolic space
 * @param {SpaceFrame} frame The coordinate frame
 * @param {Point2} point The local point in metres
 * @param {number} [z] The height in metres
 * @returns {AbsolutePosition} The position
 */
export function positionFromPoint(
    space: SymbolicSpace<any>,
    frame: SpaceFrame,
    point: Point2,
    z = 0,
): AbsolutePosition {
    if (isGeographicSpace(space)) {
        const geo = frame.projection.toGeo(point);
        return new GeographicalPosition(geo.lat, geo.lon, z);
    }
    const Constructor = space.boundaryType as (new () => AbsolutePosition) | undefined;
    if (!Constructor) {
        return new Absolute2DPosition(point.x, point.y);
    }
    const position = new Constructor();
    position.fromVector(new Vector3(point.x, point.y, z), LengthUnit.METER);
    return position;
}

/**
 * Computes the distance between two positions in metres.
 *
 * Cartesian positions are compared in metres, geographical positions through their ECEF
 * coordinates (a chord length, which is indistinguishable from the great-circle distance at
 * building scale).
 * @param {AbsolutePosition} a The first position
 * @param {AbsolutePosition} b The second position
 * @returns {number} The distance in metres
 */
export function positionDistance(a: AbsolutePosition, b: AbsolutePosition): number {
    return a.toVector3(LengthUnit.METER).distanceTo(b.toVector3(LengthUnit.METER));
}
