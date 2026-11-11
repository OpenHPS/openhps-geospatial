/**
 * Planar geometry helpers used by the symbolic-space navigation primitives.
 *
 * Symbolic spaces store their boundaries as position vectors. Two spaces are typically expressed
 * in the same frame (their parent floor), so the predicates here operate on a local, planar metre
 * grid. Spaces with geographical boundaries are projected onto such a grid first; the error over
 * a building footprint is far below the positioning accuracy and the wall tolerance.
 *
 * This module is framework-free: it only depends on plain JavaScript objects.
 */

/**
 * A point in a local, planar metre grid. `x` grows east and `y` grows north.
 */
export interface Point2 {
    /**
     * Easting in metres.
     */
    x: number;
    /**
     * Northing in metres.
     */
    y: number;
}

/**
 * A WGS 84 coordinate (`lon`/`lat` in degrees).
 */
export interface GeoPoint {
    /**
     * Longitude in degrees.
     */
    lon: number;
    /**
     * Latitude in degrees.
     */
    lat: number;
}

/**
 * An axis-aligned bounding box in the local metre grid.
 */
export interface Bounds2 {
    /**
     * Minimum easting.
     */
    minX: number;
    /**
     * Minimum northing.
     */
    minY: number;
    /**
     * Maximum easting.
     */
    maxX: number;
    /**
     * Maximum northing.
     */
    maxY: number;
}

/**
 * Metres per degree of latitude at the equator (WGS 84 mean).
 */
const METRES_PER_DEGREE_LATITUDE = 111320;

/**
 * A local equirectangular projection centred on a WGS 84 origin.
 *
 * The projection is deliberately simple and deterministic: `x` is longitude scaled by the cosine
 * of the origin latitude, `y` is latitude scaled by a constant. It is invertible, so a connection
 * point computed on the metre grid can be converted back to a geographical position.
 */
export interface LocalProjection {
    /**
     * The WGS 84 origin of the projection.
     */
    origin: GeoPoint;
    /**
     * Metres represented by one degree of longitude at the origin.
     */
    metresPerDegreeLongitude: number;
    /**
     * Metres represented by one degree of latitude at the origin.
     */
    metresPerDegreeLatitude: number;
    /**
     * Projects a WGS 84 coordinate onto the local metre grid.
     * @param {GeoPoint} point The WGS 84 coordinate
     * @returns {Point2} The local point
     */
    toLocal(point: GeoPoint): Point2;
    /**
     * Converts a local metre-grid point back to WGS 84.
     * @param {Point2} point The local point
     * @returns {GeoPoint} The WGS 84 coordinate
     */
    toGeo(point: Point2): GeoPoint;
}

/**
 * Builds a local projection centred on the first point (or an explicit origin).
 * @param {GeoPoint[]} points The points the projection must cover. The first one is the origin when no explicit origin is supplied.
 * @param {GeoPoint} [origin] Optional projection origin
 * @returns {LocalProjection} The projection
 */
export function createProjection(points: readonly GeoPoint[], origin?: GeoPoint): LocalProjection {
    const first = origin ?? points[0] ?? { lon: 0, lat: 0 };
    const latitude = Math.max(-89.9, Math.min(89.9, first.lat));
    const metresPerDegreeLongitude = Math.max(1, METRES_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180));
    return {
        origin: { lon: first.lon, lat: first.lat },
        metresPerDegreeLongitude,
        metresPerDegreeLatitude: METRES_PER_DEGREE_LATITUDE,
        toLocal(point: GeoPoint): Point2 {
            return {
                x: (point.lon - first.lon) * metresPerDegreeLongitude,
                y: (point.lat - first.lat) * METRES_PER_DEGREE_LATITUDE,
            };
        },
        toGeo(point: Point2): GeoPoint {
            return {
                lon: first.lon + point.x / metresPerDegreeLongitude,
                lat: first.lat + point.y / METRES_PER_DEGREE_LATITUDE,
            };
        },
    };
}

/**
 * Removes the duplicated closing point of a ring.
 * @param {Point2[]} ring The ring
 * @returns {Point2[]} The open ring
 */
export function openRing(ring: readonly Point2[]): Point2[] {
    const points = [...ring];
    if (points.length > 1) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first.x === last.x && first.y === last.y) {
            points.pop();
        }
    }
    return points;
}

/**
 * Computes the axis-aligned bounds of a point ring.
 * @param {Point2[]} ring The ring
 * @returns {Bounds2} The bounds, or `undefined` for an empty ring
 */
export function boundsOf(ring: readonly Point2[]): Bounds2 | undefined {
    if (ring.length === 0) {
        return undefined;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of ring) {
        if (point.x < minX) {
            minX = point.x;
        }
        if (point.y < minY) {
            minY = point.y;
        }
        if (point.x > maxX) {
            maxX = point.x;
        }
        if (point.y > maxY) {
            maxY = point.y;
        }
    }
    return { minX, minY, maxX, maxY };
}

/**
 * Tests whether two bounds overlap after expanding by a tolerance.
 * @param {Bounds2} a The first bounds
 * @param {Bounds2} b The second bounds
 * @param {number} [tolerance] The expansion in metres
 * @returns {boolean} `true` when the expanded boxes intersect
 */
export function boundsIntersect(a: Bounds2, b: Bounds2, tolerance = 0): boolean {
    return (
        a.minX - tolerance <= b.maxX &&
        a.maxX + tolerance >= b.minX &&
        a.minY - tolerance <= b.maxY &&
        a.maxY + tolerance >= b.minY
    );
}

/**
 * Computes the area of a ring with the shoelace formula.
 * @param {Point2[]} ring The ring (open or closed)
 * @returns {number} The absolute area in square metres
 */
export function polygonArea(ring: readonly Point2[]): number {
    if (ring.length < 3) {
        return 0;
    }
    let area = 0;
    for (let i = 0; i < ring.length; i += 1) {
        const current = ring[i];
        const next = ring[(i + 1) % ring.length];
        area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area) / 2;
}

/**
 * Computes the centroid of a ring (the polygon centroid, not the vertex average).
 * @param {Point2[]} ring The ring (open or closed)
 * @returns {Point2} The centroid, or `undefined` for a degenerate ring
 */
export function polygonCentroid(ring: readonly Point2[]): Point2 | undefined {
    if (ring.length < 3) {
        return undefined;
    }
    let twiceArea = 0;
    let x = 0;
    let y = 0;
    for (let i = 0; i < ring.length; i += 1) {
        const current = ring[i];
        const next = ring[(i + 1) % ring.length];
        const cross = current.x * next.y - next.x * current.y;
        twiceArea += cross;
        x += (current.x + next.x) * cross;
        y += (current.y + next.y) * cross;
    }
    if (twiceArea === 0) {
        const sum = ring.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
        return { x: sum.x / ring.length, y: sum.y / ring.length };
    }
    return { x: x / (3 * twiceArea), y: y / (3 * twiceArea) };
}

/**
 * Finds the closest point on a segment.
 * @param {Point2} point The query point
 * @param {Point2} a The segment start
 * @param {Point2} b The segment end
 * @returns {{ point: Point2; distance: number }} The closest point and its distance in metres
 */
export function closestPointOnSegment(point: Point2, a: Point2, b: Point2): { point: Point2; distance: number } {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
        return { point: { x: a.x, y: a.y }, distance: Math.hypot(point.x - a.x, point.y - a.y) };
    }
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    const closest = { x: a.x + t * dx, y: a.y + t * dy };
    return { point: closest, distance: Math.hypot(point.x - closest.x, point.y - closest.y) };
}

/**
 * Finds the closest point on a polygon boundary.
 * @param {Point2} point The query point
 * @param {Point2[]} ring The polygon ring
 * @returns {{ point: Point2; distance: number }} The closest boundary point and its distance
 */
export function closestPointOnPolygon(point: Point2, ring: readonly Point2[]): { point: Point2; distance: number } {
    let best: { point: Point2; distance: number } | undefined;
    for (let i = 0; i < ring.length; i += 1) {
        const candidate = closestPointOnSegment(point, ring[i], ring[(i + 1) % ring.length]);
        if (!best || candidate.distance < best.distance) {
            best = candidate;
        }
    }
    return best ?? { point: { x: point.x, y: point.y }, distance: 0 };
}

/**
 * Tests whether a point lies inside a polygon, counting the boundary as inside.
 * @param {Point2} point The point
 * @param {Point2[]} ring The polygon ring
 * @param {number} [tolerance] Boundary tolerance in metres
 * @returns {boolean} `true` when the point is inside or on the boundary
 */
export function pointInPolygon(point: Point2, ring: readonly Point2[], tolerance = 0): boolean {
    if (ring.length < 3) {
        return false;
    }
    if (tolerance > 0 && closestPointOnPolygon(point, ring).distance <= tolerance) {
        return true;
    }
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const a = ring[i];
        const b = ring[j];
        const intersects =
            a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
        if (intersects) {
            inside = !inside;
        }
    }
    return inside;
}

/**
 * Computes the shortest distance between two segments and the pair of closest points.
 * @param {Point2} a1 First segment start
 * @param {Point2} a2 First segment end
 * @param {Point2} b1 Second segment start
 * @param {Point2} b2 Second segment end
 * @returns {{ a: Point2; b: Point2; distance: number }} The closest points and their distance
 */
export function closestPointsBetweenSegments(
    a1: Point2,
    a2: Point2,
    b1: Point2,
    b2: Point2,
): { a: Point2; b: Point2; distance: number } {
    const d1x = a2.x - a1.x;
    const d1y = a2.y - a1.y;
    const d2x = b2.x - b1.x;
    const d2y = b2.y - b1.y;
    const rx = a1.x - b1.x;
    const ry = a1.y - b1.y;
    const a = d1x * d1x + d1y * d1y;
    const e = d2x * d2x + d2y * d2y;
    const f = d2x * rx + d2y * ry;
    let s = 0;
    let t = 0;
    if (a === 0 && e === 0) {
        // Both segments are points.
    } else if (a === 0) {
        t = Math.max(0, Math.min(1, f / e));
    } else {
        const c = d1x * rx + d1y * ry;
        if (e === 0) {
            s = Math.max(0, Math.min(1, -c / a));
        } else {
            const b = d1x * d2x + d1y * d2y;
            const denominator = a * e - b * b;
            if (denominator !== 0) {
                s = Math.max(0, Math.min(1, (b * f - c * e) / denominator));
            }
            t = (b * s + f) / e;
            if (t < 0) {
                t = 0;
                s = Math.max(0, Math.min(1, -c / a));
            } else if (t > 1) {
                t = 1;
                s = Math.max(0, Math.min(1, (b - c) / a));
            }
        }
    }
    const pointA = { x: a1.x + s * d1x, y: a1.y + s * d1y };
    const pointB = { x: b1.x + t * d2x, y: b1.y + t * d2y };
    return { a: pointA, b: pointB, distance: Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y) };
}

/**
 * Computes the length of the overlap between two collinear segments.
 * @param {Point2} a1 First segment start
 * @param {Point2} a2 First segment end
 * @param {Point2} b1 Second segment start
 * @param {Point2} b2 Second segment end
 * @param {number} tolerance Maximum perpendicular distance for the segments to count as collinear
 * @returns {{ length: number; midpoint: Point2 }} The overlap length in metres and its midpoint, or `undefined`
 */
export function collinearOverlap(
    a1: Point2,
    a2: Point2,
    b1: Point2,
    b2: Point2,
    tolerance: number,
): { length: number; midpoint: Point2 } | undefined {
    const lengthA = Math.hypot(a2.x - a1.x, a2.y - a1.y);
    if (lengthA === 0) {
        return undefined;
    }
    const dirX = (a2.x - a1.x) / lengthA;
    const dirY = (a2.y - a1.y) / lengthA;
    const perpendicular = (point: Point2): number => Math.abs((point.x - a1.x) * dirY - (point.y - a1.y) * dirX);
    if (perpendicular(b1) > tolerance || perpendicular(b2) > tolerance) {
        return undefined;
    }
    const project = (point: Point2): number => (point.x - a1.x) * dirX + (point.y - a1.y) * dirY;
    const t1 = project(b1);
    const t2 = project(b2);
    const start = Math.max(0, Math.min(t1, t2));
    const end = Math.min(lengthA, Math.max(t1, t2));
    if (end - start <= tolerance) {
        return undefined;
    }
    const mid = (start + end) / 2;
    return { length: end - start, midpoint: { x: a1.x + dirX * mid, y: a1.y + dirY * mid } };
}

/**
 * Tests whether two segments cross at a single interior point (collinear overlaps and endpoint
 * touches are not proper intersections).
 * @param {Point2} a1 First segment start
 * @param {Point2} a2 First segment end
 * @param {Point2} b1 Second segment start
 * @param {Point2} b2 Second segment end
 * @param {number} [epsilon] Orientation tolerance
 * @returns {boolean} `true` when the segments properly cross
 */
export function segmentsProperlyIntersect(a1: Point2, a2: Point2, b1: Point2, b2: Point2, epsilon = 1e-9): boolean {
    const cross = (origin: Point2, first: Point2, second: Point2): number =>
        (first.x - origin.x) * (second.y - origin.y) - (first.y - origin.y) * (second.x - origin.x);
    const d1 = cross(b1, b2, a1);
    const d2 = cross(b1, b2, a2);
    const d3 = cross(a1, a2, b1);
    const d4 = cross(a1, a2, b2);
    return (
        ((d1 > epsilon && d2 < -epsilon) || (d1 < -epsilon && d2 > epsilon)) &&
        ((d3 > epsilon && d4 < -epsilon) || (d3 < -epsilon && d4 > epsilon))
    );
}

/**
 * Tests whether two polygons overlap in their interiors (as opposed to merely touching).
 * @param {Point2[]} a The first ring
 * @param {Point2[]} b The second ring
 * @param {number} tolerance The wall tolerance; vertices within it are not counted as interior
 * @returns {boolean} `true` when the interiors intersect
 */
export function polygonsOverlap(a: readonly Point2[], b: readonly Point2[], tolerance: number): boolean {
    const aCentroid = polygonCentroid(a);
    const bCentroid = polygonCentroid(b);
    if (aCentroid && pointInPolygon(aCentroid, b)) {
        return true;
    }
    if (bCentroid && pointInPolygon(bCentroid, a)) {
        return true;
    }
    for (const point of a) {
        if (pointInPolygon(point, b) && closestPointOnPolygon(point, b).distance > tolerance) {
            return true;
        }
    }
    for (const point of b) {
        if (pointInPolygon(point, a) && closestPointOnPolygon(point, a).distance > tolerance) {
            return true;
        }
    }
    for (let i = 0; i < a.length; i += 1) {
        for (let j = 0; j < b.length; j += 1) {
            if (segmentsProperlyIntersect(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])) {
                return true;
            }
        }
    }
    return false;
}

/**
 * The result of comparing two space polygons.
 */
export interface SharedBoundary {
    /**
     * Whether the polygons touch/abut within the tolerance.
     */
    touches: boolean;
    /**
     * Whether one polygon's interior overlaps the other's.
     */
    overlaps: boolean;
    /**
     * The shortest distance between the two boundaries in metres.
     */
    distance: number;
    /**
     * The total length of collinear shared wall in metres.
     */
    sharedLength: number;
    /**
     * The midpoint of the longest shared wall, or the closest boundary pair.
     */
    midpoint: Point2;
}

/**
 * Compares two space polygons: are they adjacent, do they overlap, and where do they meet?
 *
 * Adjacency is derived from the geometry rather than a hand-drawn edge: a pair of spaces is
 * adjacent when their boundaries touch or lie within `tolerance`, or when they overlap slightly
 * (a modelling gap). A fully contained polygon is reported as an overlap; callers should not
 * connect overlapping spaces.
 * @param {Point2[]} a The first ring
 * @param {Point2[]} b The second ring
 * @param {number} tolerance Wall/gap tolerance in metres
 * @returns {SharedBoundary} The relationship between the two polygons
 */
export function sharedBoundary(a: readonly Point2[], b: readonly Point2[], tolerance: number): SharedBoundary {
    let distance = Infinity;
    let midpoint: Point2 | undefined;
    let sharedLength = 0;
    let sharedMidpoint: Point2 | undefined;
    let sharedScore = 0;

    for (let i = 0; i < a.length; i += 1) {
        const a1 = a[i];
        const a2 = a[(i + 1) % a.length];
        for (let j = 0; j < b.length; j += 1) {
            const b1 = b[j];
            const b2 = b[(j + 1) % b.length];
            const closest = closestPointsBetweenSegments(a1, a2, b1, b2);
            if (closest.distance < distance) {
                distance = closest.distance;
                midpoint = { x: (closest.a.x + closest.b.x) / 2, y: (closest.a.y + closest.b.y) / 2 };
            }
            const overlap = collinearOverlap(a1, a2, b1, b2, tolerance);
            if (overlap && overlap.length > sharedScore) {
                sharedScore = overlap.length;
                sharedMidpoint = overlap.midpoint;
            }
            if (overlap) {
                sharedLength += overlap.length;
            }
        }
    }

    return {
        touches: distance <= tolerance,
        overlaps: polygonsOverlap(a, b, tolerance),
        distance: Number.isFinite(distance) ? distance : 0,
        sharedLength,
        midpoint: sharedMidpoint ?? midpoint ?? { x: 0, y: 0 },
    };
}
