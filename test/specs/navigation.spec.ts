import { expect } from 'chai';
import 'mocha';
import { Absolute2DPosition, Absolute3DPosition, DataSerializer, GeographicalPosition } from '@openhps/core';
import {
    connectionWeight,
    connectAdjacentSpaces,
    Corridor,
    findShortestPath,
    resolveSpacePathOptions,
    Room,
    snapToSpace,
    SpaceAdjacency,
    SymbolicSpace,
    VerticalPassage,
} from '../../src';

/**
 * Creates a rectangular room from two opposite corners.
 * @param uid The space uid
 * @param x1 First corner easting
 * @param y1 First corner northing
 * @param x2 Opposite corner easting
 * @param y2 Opposite corner northing
 * @returns The room
 */
function room(uid: string, x1: number, y1: number, x2: number, y2: number): Room {
    return new Room(uid).setUID(uid).setBounds([new Absolute2DPosition(x1, y1), new Absolute2DPosition(x2, y2)]);
}

/**
 * Creates a rectangular corridor from two opposite corners.
 * @param uid The space uid
 * @param x1 First corner easting
 * @param y1 First corner northing
 * @param x2 Opposite corner easting
 * @param y2 Opposite corner northing
 * @returns The corridor
 */
function corridor(uid: string, x1: number, y1: number, x2: number, y2: number): Corridor {
    return new Corridor(uid).setUID(uid).setBounds([new Absolute2DPosition(x1, y1), new Absolute2DPosition(x2, y2)]);
}

/**
 * Finds the derived adjacency for a pair of spaces, in either direction.
 * @param adjacencies The derived adjacencies
 * @param from First space uid
 * @param to Second space uid
 * @returns The adjacency, or undefined
 */
function adjacencyOf(adjacencies: SpaceAdjacency[], from: string, to: string): SpaceAdjacency {
    return adjacencies.find(
        (adjacency) =>
            (adjacency.from.uid === from && adjacency.to.uid === to) ||
            (adjacency.from.uid === to && adjacency.to.uid === from),
    );
}

/**
 * A single-floor layout with rooms of varying shared-wall widths.
 * @returns The spaces of the layout
 */
function adjacencyLayout(): SymbolicSpace<any>[] {
    return [
        corridor('corridor', 0, 0, 12, 3),
        room('a', 0, 3, 3, 7), // 3 m opening
        room('b', 3.5, 3, 6.5, 7), // 3 m opening
        room('c', 7, 3, 9.5, 7), // 2.5 m opening
        room('d', 10, 3, 11.5, 7), // 1.5 m door
        room('e', 0, -3, 1, 0), // 1 m door
        room('f', 1.5, -3, 4.5, 0), // 3 m opening
        room('g', 12, -3, 12.5, 0), // corner touch
        room('vault', 20, 20, 24, 24), // isolated
    ];
}

describe('SymbolicSpace navigation', () => {
    describe('adjacency', () => {
        it('should connect spaces that share a boundary', () => {
            const spaces = adjacencyLayout();
            const adjacencies = connectAdjacentSpaces(spaces);
            expect(adjacencies).to.have.lengthOf(7);
        });

        it('should classify a wide shared wall as an opening', () => {
            const spaces = adjacencyLayout();
            const adjacencies = connectAdjacentSpaces(spaces);
            expect(adjacencyOf(adjacencies, 'corridor', 'a').kind).to.equal('opening');
            expect(adjacencyOf(adjacencies, 'corridor', 'a').sharedLength).to.be.closeTo(3, 1e-6);
        });

        it('should classify a door-width shared wall as a door', () => {
            const spaces = adjacencyLayout();
            const adjacencies = connectAdjacentSpaces(spaces);
            expect(adjacencyOf(adjacencies, 'corridor', 'd').kind).to.equal('door');
            expect(adjacencyOf(adjacencies, 'corridor', 'd').sharedLength).to.be.closeTo(1.5, 1e-6);
            expect(adjacencyOf(adjacencies, 'corridor', 'e').kind).to.equal('door');
            expect(adjacencyOf(adjacencies, 'corridor', 'e').sharedLength).to.be.closeTo(1, 1e-6);
        });

        it('should classify a point contact as a touch', () => {
            const spaces = adjacencyLayout();
            const adjacencies = connectAdjacentSpaces(spaces);
            expect(adjacencyOf(adjacencies, 'corridor', 'g').kind).to.equal('touch');
            expect(adjacencyOf(adjacencies, 'corridor', 'g').sharedLength).to.equal(0);
        });

        it('should not connect spaces with a gap wider than the tolerance', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const a = spaces.find((space) => space.uid === 'a');
            const b = spaces.find((space) => space.uid === 'b');
            expect(a.isConnected(b)).to.be.false;
        });

        it('should not connect spaces with overlapping interiors', () => {
            const a = room('a', 0, 0, 4, 4);
            const b = room('b', 2, 2, 6, 6);
            const adjacencies = connectAdjacentSpaces([a, b]);
            expect(adjacencies).to.have.lengthOf(0);
            expect(a.isConnected(b)).to.be.false;
        });

        it('should connect spaces separated by less than the tolerance', () => {
            const a = room('a', 0, 0, 2, 2);
            const b = room('b', 2.2, 0, 4, 2);
            expect(connectAdjacentSpaces([a, b])).to.have.lengthOf(1);
            expect(a.isConnected(b)).to.be.true;
            const strict = connectAdjacentSpaces([room('c', 0, 0, 2, 2), room('d', 2.2, 0, 4, 2)], {
                adjacencyToleranceMeters: 0.1,
            });
            expect(strict).to.have.lengthOf(0);
        });

        it('should record the portal metadata and connection point on both spaces', () => {
            const spaces = adjacencyLayout();
            const adjacencies = connectAdjacentSpaces(spaces);
            const corridorSpace = spaces.find((space) => space.uid === 'corridor');
            const door = spaces.find((space) => space.uid === 'e');
            const connection = corridorSpace.getConnection(door);
            expect(connection).to.not.be.undefined;
            expect(connection.type).to.equal('door');
            expect(connection.width).to.be.closeTo(1, 1e-6);
            expect(connection.position).to.not.be.undefined;
            expect(door.getConnection(corridorSpace).type).to.equal('door');
            const connector = adjacencyOf(adjacencies, 'corridor', 'e').connector;
            expect(connector.toVector3().x).to.be.closeTo(0.5, 1e-6);
            expect(connector.toVector3().y).to.be.closeTo(0, 1e-6);
        });

        it('should leave isolated spaces unconnected', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const vault = spaces.find((space) => space.uid === 'vault');
            expect(vault.getConnectedSpaces()).to.have.lengthOf(0);
        });

        it('should derive adjacency between geographical spaces', () => {
            const west = new Room('west')
                .setUID('west')
                .setBounds([
                    new GeographicalPosition(50.82, 4.39),
                    new GeographicalPosition(50.82, 4.39025),
                    new GeographicalPosition(50.8205, 4.39025),
                    new GeographicalPosition(50.8205, 4.39),
                ]);
            const east = new Room('east')
                .setUID('east')
                .setBounds([
                    new GeographicalPosition(50.82, 4.39025),
                    new GeographicalPosition(50.82, 4.3905),
                    new GeographicalPosition(50.8205, 4.3905),
                    new GeographicalPosition(50.8205, 4.39025),
                ]);
            const adjacencies = connectAdjacentSpaces([west, east]);
            expect(adjacencies).to.have.lengthOf(1);
            expect(adjacencies[0].kind).to.equal('opening');
            expect(adjacencies[0].connector).to.be.instanceOf(GeographicalPosition);
            expect(west.isConnected(east)).to.be.true;
        });

        it('should serialize connection metadata', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const corridorSpace = spaces.find((space) => space.uid === 'corridor');
            const serialized = DataSerializer.serialize(corridorSpace);
            expect(serialized.connections).to.be.an('array').with.length.greaterThan(0);
            const deserialized = DataSerializer.deserialize(serialized, Room) as Room;
            expect(deserialized.connections.some((connection) => connection.type === 'door')).to.be.true;
            expect(deserialized.getConnectedSpaces().some((connection) => connection.type === 'door')).to.be.true;
        });
    });

    describe('shortest path', () => {
        /**
         * Builds a two-floor layout with a stairs connection.
         * @returns Every space and the two floor labels
         */
        function routingLayout(): {
            spaces: SymbolicSpace<any>[];
            stairGround: VerticalPassage;
            stairUpper: VerticalPassage;
            roomUp: Room;
        } {
            const ground = adjacencyLayout();
            const stairGround = new VerticalPassage('Stairs')
                .setUID('stairs-ground')
                .setBounds([new Absolute2DPosition(6, 8), new Absolute2DPosition(7, 11)]);
            stairGround.parentUID = 'floor-0';
            const stairUpper = new VerticalPassage('Stairs')
                .setUID('stairs-upper')
                .setBounds([new Absolute2DPosition(6, 8), new Absolute2DPosition(7, 11)]);
            stairUpper.parentUID = 'floor-1';
            const roomUp = room('room-up', 8, 8, 10, 11);
            roomUp.parentUID = 'floor-1';

            const b = ground.find((space) => space.uid === 'b');
            b.addConnectedSpace(stairGround, new Absolute2DPosition(6.5, 7.5), { type: 'door' });
            stairGround.addConnectedSpace(b, new Absolute2DPosition(6.5, 7.5), { type: 'door' });
            stairGround.addConnectedSpace(stairUpper, new Absolute3DPosition(6.5, 9.5, 0), { type: 'stairs' });
            stairUpper.addConnectedSpace(stairGround, new Absolute3DPosition(6.5, 9.5, 3), { type: 'stairs' });
            stairUpper.addConnectedSpace(roomUp, new Absolute2DPosition(7.5, 9.5), { type: 'door' });
            roomUp.addConnectedSpace(stairUpper, new Absolute2DPosition(7.5, 9.5), { type: 'door' });

            return { spaces: [...ground, stairGround, stairUpper, roomUp], stairGround, stairUpper, roomUp };
        }

        it('should find the shortest route through a corridor', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const result = findShortestPath('a', 'e', spaces);
            expect(result.reachable).to.be.true;
            if (result.reachable) {
                expect(result.route.spaces).to.deep.equal(['a', 'corridor', 'e']);
                expect(result.route.connections.map((connection) => connection.type)).to.deep.equal([
                    'opening',
                    'door',
                ]);
                expect(result.route.length).to.be.greaterThan(0);
                expect(result.route.eta).to.be.closeTo(result.route.length / 1.4, 1e-6);
                expect(result.route.nodes).to.have.lengthOf(3);
            }
        });

        it('should find a route across floors through stairs', () => {
            const layout = routingLayout();
            connectAdjacentSpaces(layout.spaces);
            const result = findShortestPath('b', 'room-up', layout.spaces);
            expect(result.reachable).to.be.true;
            if (result.reachable) {
                expect(result.route.spaces).to.deep.equal(['b', 'stairs-ground', 'stairs-upper', 'room-up']);
                expect(result.route.connections[1].type).to.equal('stairs');
                // Stairs add a penalty on top of the walking time.
                expect(result.route.eta).to.be.greaterThan(result.route.length / 1.4);
            }
        });

        it('should avoid stairs when requested', () => {
            const layout = routingLayout();
            connectAdjacentSpaces(layout.spaces);
            const result = findShortestPath('b', 'room-up', layout.spaces, { avoidStairs: true });
            expect(result.reachable).to.be.false;
            if (result.reachable === false) {
                expect(result.reason).to.equal('unreachable');
            }
        });

        it('should return a single-space route when the endpoints are equal', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const result = findShortestPath('a', 'a', spaces);
            expect(result.reachable).to.be.true;
            if (result.reachable) {
                expect(result.route.spaces).to.deep.equal(['a']);
                expect(result.route.connections).to.have.lengthOf(0);
                expect(result.route.length).to.equal(0);
                expect(result.route.eta).to.equal(0);
            }
        });

        it('should accept space instances as endpoints', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const a = spaces.find((space) => space.uid === 'a');
            const e = spaces.find((space) => space.uid === 'e');
            const result = findShortestPath(a, e, spaces);
            expect(result.reachable).to.be.true;
            if (result.reachable) {
                expect(result.route.spaces).to.deep.equal(['a', 'corridor', 'e']);
            }
        });

        it('should report unknown spaces', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const result = findShortestPath('nope', 'a', spaces);
            expect(result.reachable).to.be.false;
            if (result.reachable === false) {
                expect(result.reason).to.equal('unknown-space');
            }
        });

        it('should report isolated spaces as unreachable', () => {
            const spaces = adjacencyLayout();
            connectAdjacentSpaces(spaces);
            const result = findShortestPath('a', 'vault', spaces);
            expect(result.reachable).to.be.false;
            if (result.reachable === false) {
                expect(result.reason).to.equal('unreachable');
            }
        });

        it('should report an empty space set', () => {
            const result = findShortestPath('a', 'b', []);
            expect(result.reachable).to.be.false;
            if (result.reachable === false) {
                expect(result.reason).to.equal('no-spaces');
            }
        });

        it('should weight stairs and elevators with their penalties', () => {
            const options = resolveSpacePathOptions();
            const walking = connectionWeight({ targetUID: 'x', type: 'adjacent' } as any, 14, options);
            const stairs = connectionWeight({ targetUID: 'x', type: 'stairs' } as any, 14, options);
            const elevator = connectionWeight({ targetUID: 'x', type: 'elevator' } as any, 14, options);
            expect(walking).to.be.closeTo(10, 1e-6);
            expect(stairs).to.be.closeTo(25, 1e-6);
            expect(elevator).to.be.closeTo(40, 1e-6);
        });
    });

    describe('snap to space', () => {
        /**
         * A corridor with two rooms above it and a zone inside the corridor.
         * @returns The spaces of the layout
         */
        function snapLayout(): SymbolicSpace<any>[] {
            const zone = new Room('zone')
                .setUID('zone')
                .setBounds([new Absolute2DPosition(1, 1), new Absolute2DPosition(2, 2)]);
            return [corridor('corridor', 0, 0, 10, 3), room('a', 0, 3, 3, 7), room('b', 4, 3, 7, 7), zone];
        }

        it('should return the containing space', () => {
            const snapped = snapToSpace(new Absolute2DPosition(5, 1.5), snapLayout());
            expect(snapped).to.not.be.null;
            expect(snapped.space.uid).to.equal('corridor');
            expect(snapped.inside).to.be.true;
            expect(snapped.distance).to.equal(0);
        });

        it('should prefer the smallest containing space', () => {
            const snapped = snapToSpace(new Absolute2DPosition(1.5, 1.5), snapLayout());
            expect(snapped).to.not.be.null;
            expect(snapped.space.uid).to.equal('zone');
            expect(snapped.inside).to.be.true;
        });

        it('should snap a position outside onto the nearest boundary', () => {
            const snapped = snapToSpace(new Absolute2DPosition(1.5, 8), snapLayout());
            expect(snapped).to.not.be.null;
            expect(snapped.space.uid).to.equal('a');
            expect(snapped.inside).to.be.false;
            expect(snapped.distance).to.be.closeTo(1, 1e-6);
            expect(snapped.position.toVector3().y).to.be.closeTo(7, 1e-6);
        });

        it('should return null when the nearest space is too far away', () => {
            expect(snapToSpace(new Absolute2DPosition(100, 100), snapLayout())).to.be.null;
            expect(snapToSpace(new Absolute2DPosition(1.5, 20), snapLayout())).to.be.null;
        });

        it('should honour the maximum distance', () => {
            const snapped = snapToSpace(new Absolute2DPosition(1.5, 20), snapLayout(), { maxDistanceMeters: 20 });
            expect(snapped).to.not.be.null;
            expect(snapped.space.uid).to.equal('a');
            expect(snapped.distance).to.be.closeTo(13, 1e-6);
        });

        it('should honour the candidate filter', () => {
            const snapped = snapToSpace(new Absolute2DPosition(5, 1.5), snapLayout(), {
                filter: (space) => space.uid !== 'corridor',
            });
            expect(snapped).to.not.be.null;
            expect(snapped.space.uid).to.equal('b');
            expect(snapped.distance).to.be.closeTo(1.5, 1e-6);
        });

        it('should snap geographical positions', () => {
            const west = new Room('west')
                .setUID('west')
                .setBounds([
                    new GeographicalPosition(50.82, 4.39),
                    new GeographicalPosition(50.82, 4.39025),
                    new GeographicalPosition(50.8205, 4.39025),
                    new GeographicalPosition(50.8205, 4.39),
                ]);
            const east = new Room('east')
                .setUID('east')
                .setBounds([
                    new GeographicalPosition(50.82, 4.39025),
                    new GeographicalPosition(50.82, 4.3905),
                    new GeographicalPosition(50.8205, 4.3905),
                    new GeographicalPosition(50.8205, 4.39025),
                ]);
            const inside = snapToSpace(new GeographicalPosition(50.82025, 4.3901), [west, east]);
            expect(inside).to.not.be.null;
            expect(inside.space.uid).to.equal('west');
            expect(inside.inside).to.be.true;

            const outside = snapToSpace(new GeographicalPosition(50.82025, 4.39055), [west, east]);
            expect(outside).to.not.be.null;
            expect(outside.space.uid).to.equal('east');
            expect(outside.inside).to.be.false;
            expect(outside.distance).to.be.closeTo(3.5, 0.5);
            expect(outside.position).to.be.instanceOf(GeographicalPosition);
        });
    });
});
