import { AbsolutePosition } from '@openhps/core';
import type { SymbolicSpace } from '../data/SymbolicSpace';
import type { SpaceConnection } from '../data/SpaceConnection';
import { positionDistance } from './space-frame';

/**
 * The relaxed indoor walking speed used for the default edge weight, in metres per second.
 */
export const DEFAULT_WALKING_SPEED_MPS = 1.4;

/**
 * The default extra seconds per floor for stairs.
 */
export const DEFAULT_STAIR_PENALTY_SECONDS = 15;

/**
 * The default extra seconds per floor for an elevator (including waiting).
 */
export const DEFAULT_ELEVATOR_PENALTY_SECONDS = 30;

/**
 * Options for [[findShortestPath]].
 */
export interface SpacePathOptions {
    /**
     * Walking speed in metres per second (default 1.4 m/s, a relaxed indoor walk).
     */
    walkingSpeedMps?: number;
    /**
     * Extra seconds per floor when taking stairs (default 15 s).
     */
    stairPenaltySeconds?: number;
    /**
     * Extra seconds per floor when taking an elevator, including waiting (default 30 s).
     */
    elevatorPenaltySeconds?: number;
    /**
     * Accessibility override: stairs become impassable and the route uses elevators instead.
     * This is a weight override on the same graph, not a separate graph.
     */
    avoidStairs?: boolean;
}

/**
 * A resolved route through connected symbolic spaces.
 */
export interface SpaceRoute {
    /**
     * The ordered space uids, including both endpoints.
     */
    spaces: string[];
    /**
     * The ordered space objects (same order as {@link spaces}).
     */
    nodes: SymbolicSpace<any>[];
    /**
     * The connections traversed, in order.
     */
    connections: SpaceConnection[];
    /**
     * Total travelled distance in metres.
     */
    length: number;
    /**
     * Estimated travel time in seconds under the requested options.
     */
    eta: number;
}

/**
 * The outcome of a shortest-path query.
 */
export type SpacePathResult =
    | { reachable: true; route: SpaceRoute }
    | {
          reachable: false;
          reason: 'unknown-space' | 'no-spaces' | 'unreachable';
          from: string;
          to: string;
      };

/**
 * Merges partially supplied path options with the defaults.
 * @param {SpacePathOptions} [options] The caller's overrides
 * @returns {Required<SpacePathOptions>} A complete option set
 */
export function resolveSpacePathOptions(options?: SpacePathOptions): Required<SpacePathOptions> {
    return {
        walkingSpeedMps: DEFAULT_WALKING_SPEED_MPS,
        stairPenaltySeconds: DEFAULT_STAIR_PENALTY_SECONDS,
        elevatorPenaltySeconds: DEFAULT_ELEVATOR_PENALTY_SECONDS,
        avoidStairs: false,
        ...(options ?? {}),
    };
}

/**
 * Computes the travel time of a connection.
 *
 * Horizontal connections are pure walking time; stairs and elevators add a per-floor penalty and
 * are excluded when `avoidStairs` is set.
 * @param {SpaceConnection} connection The connection
 * @param {number} distance The travelled distance in metres
 * @param {Required<SpacePathOptions>} options The resolved options
 * @returns {number} The weight in seconds, or `Infinity` when the connection is inaccessible
 */
export function connectionWeight(
    connection: SpaceConnection,
    distance: number,
    options: Required<SpacePathOptions>,
): number {
    if (connection.type === 'stairs' && options.avoidStairs) {
        return Infinity;
    }
    const speed = options.walkingSpeedMps > 0 ? options.walkingSpeedMps : DEFAULT_WALKING_SPEED_MPS;
    let weight = distance / speed;
    if (connection.type === 'stairs') {
        weight += options.stairPenaltySeconds;
    }
    if (connection.type === 'elevator') {
        weight += options.elevatorPenaltySeconds;
    }
    return weight;
}

/**
 * Resolves the uid of a path endpoint.
 * @param {string | SymbolicSpace} space The uid or the space itself
 * @returns {string} The uid
 */
function resolveUID(space: string | SymbolicSpace<any>): string {
    return typeof space === 'string' ? space : space.uid;
}

/** A binary min-heap entry used by the Dijkstra frontier. */
interface FrontierEntry {
    /**
     * The space uid.
     */
    id: string;
    /**
     * The known cost from the start in seconds.
     */
    cost: number;
}

/**
 * A small binary min-heap. Building-sized graphs have tens to hundreds of spaces, so a
 * dependency-free heap keeps this module framework-free and deterministic.
 */
class MinHeap {
    private readonly items: FrontierEntry[] = [];

    /**
     * The number of queued entries.
     * @returns {number} The heap size
     */
    get size(): number {
        return this.items.length;
    }

    /**
     * Inserts an entry.
     * @param {FrontierEntry} entry The entry
     */
    push(entry: FrontierEntry): void {
        this.items.push(entry);
        let index = this.items.length - 1;
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.items[parent].cost <= this.items[index].cost) {
                break;
            }
            [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
            index = parent;
        }
    }

    /**
     * Removes and returns the lowest-cost entry.
     * @returns {FrontierEntry} The entry, or `undefined` when empty
     */
    pop(): FrontierEntry | undefined {
        if (this.items.length === 0) {
            return undefined;
        }
        const top = this.items[0];
        const last = this.items.pop();
        if (this.items.length > 0) {
            this.items[0] = last;
            let index = 0;
            for (;;) {
                const left = index * 2 + 1;
                const right = left + 1;
                let smallest = index;
                if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) {
                    smallest = left;
                }
                if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) {
                    smallest = right;
                }
                if (smallest === index) {
                    break;
                }
                [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
                index = smallest;
            }
        }
        return top;
    }
}

/**
 * Computes the distance of a connection between two spaces.
 *
 * The distance runs from the source centroid through the connection point to the destination
 * centroid. When the connection has no point, the straight-line centroid distance is used.
 * @param {SymbolicSpace} from The source space
 * @param {SymbolicSpace} to The destination space
 * @param {SpaceConnection} connection The connection
 * @returns {number} The distance in metres
 */
function connectionDistance(from: SymbolicSpace<any>, to: SymbolicSpace<any>, connection: SpaceConnection): number {
    const fromCentroid = from.centroid as AbsolutePosition;
    const toCentroid = to.centroid as AbsolutePosition;
    if (!fromCentroid || !toCentroid) {
        return 0;
    }
    if (connection.position) {
        return positionDistance(fromCentroid, connection.position) + positionDistance(connection.position, toCentroid);
    }
    return positionDistance(fromCentroid, toCentroid);
}

/**
 * Finds the shortest path over the `connectedSpaces` graph of a set of symbolic spaces.
 *
 * Edges are weighted by travel effort, not raw distance: walking time plus stair/elevator
 * penalties. `avoidStairs` removes stair connections from consideration (their weight is
 * infinite), so a wheelchair route uses the elevator when one exists and reports unreachable when
 * it does not.
 *
 * ```typescript
 * const result = findShortestPath('room-201', 'room-305', floor.spaces);
 * if (result.reachable) {
 *     console.log(result.route.spaces, result.route.eta);
 * }
 * ```
 * @param {string | SymbolicSpace} from The start space or its uid
 * @param {string | SymbolicSpace} to The destination space or its uid
 * @param {Iterable<SymbolicSpace>} spaces The spaces that may be traversed
 * @param {SpacePathOptions} [options] The travel options (defaults to gentle walking)
 * @returns {SpacePathResult} The route, or a clean unreachable result
 */
export function findShortestPath(
    from: string | SymbolicSpace<any>,
    to: string | SymbolicSpace<any>,
    spaces: Iterable<SymbolicSpace<any>>,
    options?: SpacePathOptions,
): SpacePathResult {
    const fromUID = resolveUID(from);
    const toUID = resolveUID(to);
    const registry = new Map<string, SymbolicSpace<any>>();
    for (const space of spaces) {
        registry.set(space.uid, space);
    }
    if (typeof from !== 'string' && from.uid) {
        registry.set(from.uid, from);
    }
    if (typeof to !== 'string' && to.uid) {
        registry.set(to.uid, to);
    }
    if (registry.size === 0) {
        return { reachable: false, reason: 'no-spaces', from: fromUID, to: toUID };
    }
    const start = registry.get(fromUID);
    const goal = registry.get(toUID);
    if (!start || !goal) {
        return { reachable: false, reason: 'unknown-space', from: fromUID, to: toUID };
    }
    if (fromUID === toUID) {
        return { reachable: true, route: { spaces: [fromUID], nodes: [start], connections: [], length: 0, eta: 0 } };
    }

    const resolved = resolveSpacePathOptions(options);
    const costs = new Map<string, number>([[fromUID, 0]]);
    const previous = new Map<string, { from: string; connection: SpaceConnection; distance: number }>();
    const frontier = new MinHeap();
    frontier.push({ id: fromUID, cost: 0 });

    while (frontier.size > 0) {
        const current = frontier.pop();
        if (current.cost > (costs.get(current.id) ?? Infinity)) {
            continue;
        }
        if (current.id === toUID) {
            break;
        }
        const space = registry.get(current.id);
        if (!space) {
            continue;
        }
        for (const connection of space.getConnectedSpaces()) {
            const neighbour = registry.get(connection.targetUID);
            if (!neighbour) {
                continue;
            }
            const distance = connectionDistance(space, neighbour, connection);
            const weight = connectionWeight(connection, distance, resolved);
            if (!Number.isFinite(weight)) {
                continue;
            }
            const candidate = current.cost + weight;
            if (candidate >= (costs.get(connection.targetUID) ?? Infinity)) {
                continue;
            }
            costs.set(connection.targetUID, candidate);
            previous.set(connection.targetUID, { from: current.id, connection, distance });
            frontier.push({ id: connection.targetUID, cost: candidate });
        }
    }

    if (!previous.has(toUID)) {
        return { reachable: false, reason: 'unreachable', from: fromUID, to: toUID };
    }

    const spaceIDs: string[] = [toUID];
    const connections: SpaceConnection[] = [];
    let length = 0;
    let cursor = toUID;
    while (cursor !== fromUID) {
        const step = previous.get(cursor);
        if (!step) {
            return { reachable: false, reason: 'unreachable', from: fromUID, to: toUID };
        }
        connections.unshift(step.connection);
        spaceIDs.unshift(step.from);
        length += step.distance;
        cursor = step.from;
    }

    return {
        reachable: true,
        route: {
            spaces: spaceIDs,
            nodes: spaceIDs.map((id) => registry.get(id)),
            connections,
            length,
            eta: costs.get(toUID),
        },
    };
}
