import { expect } from 'chai';
import 'mocha';
import { 
    Absolute2DPosition, 
    Absolute3DPosition, 
    DataObject, 
    DataSerializer, 
    GeographicalPosition, 
    Vector3
} from '@openhps/core';
import {
    Building,
    Floor,
    Corridor,
    Room,
    SymbolicSpace
} from '../../src';
import * as Spaces from '../data/Spaces';
const GEOJSON = require('../data/spaces.geo.json');

describe('SymbolicSpace', () => {
    const building = new Building("Pleinlaan 9")
        .setBounds({
            topLeft: new GeographicalPosition(
                50.8203726927966, 4.392241309019189
            ),
            width: 46.275,
            length: 37.27,
            rotation: -34.04
        });
    const floor = new Floor("3")
        .setBuilding(building)
        .setFloorNumber(3);
    const office = new Room("3.58")
        .setFloor(floor)
        .setBounds([
            new Absolute2DPosition(4.75, 31.25),
            new Absolute2DPosition(8.35, 37.02),
        ]);
        
    describe('wkt', () => {

        it('should be convertable to well-known text', () => {
            expect(office.toWKT()).to.equal("POLYGON Z ((4.392245784742611 50.82046522268625 8.999999999068677, 4.39227447178681 50.8204383948112 8.999999999068677, 4.392206408821251 50.82040934759197 8.999999999068677, 4.392177721737949 50.820436175467016 8.999999999068677, 4.392245784742611 50.82046522268625 11.999999999068677, 4.392206408821251 50.82040934759197 11.999999999068677, 4.39227447178681 50.8204383948112 11.999999999068677, 4.392177721737949 50.820436175467016 11.999999999068677))");
        });

    });

    describe('geojson', () => {
        
        it('should be convertable to geojson', () => {
            office.toGeoJSON()
        });

    });

    describe('boundaries', () => {

        it('should create a 2D boundary from the TL and BR points', () => {
            const office = new SymbolicSpace<Absolute2DPosition>("PL9.3.58");
            office.setBounds([
                new Absolute2DPosition(5, 5),
                new Absolute2DPosition(10, 10)
            ]);
            expect(office.getBounds()[1].toVector3()).to.deep.equal(new Vector3(5, 5, 0));
            expect(office.getBounds()[2].toVector3()).to.deep.equal(new Vector3(10, 5, 0));
            expect(office.getBounds()[3].toVector3()).to.deep.equal(new Vector3(10, 10, 0));
            expect(office.getBounds()[0].toVector3()).to.deep.equal(new Vector3(5, 10, 0));
            expect(office.toPosition().x).to.equal(7.5);
            expect(office.toPosition().y).to.equal(7.5);
        });

        it('should create a 3D boundary from the TL and BR points', () => {
            const office = new SymbolicSpace<Absolute3DPosition>("PL9.3.58");
            office.setBounds([
                new Absolute3DPosition(5, 5, 5),
                new Absolute3DPosition(10, 10, 10)
            ]);
            expect(office.toPosition().x).to.equal(7.5);
            expect(office.toPosition().y).to.equal(7.5);
            expect(office.toPosition().z).to.equal(7.5);
        });

        it('should detect if a 2D point is within a boundary', () => {
            const office = new SymbolicSpace<Absolute2DPosition>("PL9.3.58");
            office.setBounds([
                new Absolute2DPosition(5, 5),
                new Absolute2DPosition(10, 10)
            ]);
            expect(office.isInside(new Absolute2DPosition(3, 2))).to.be.false;
            expect(office.isInside(new Absolute2DPosition(1, 1))).to.be.false;
            expect(office.isInside(new Absolute2DPosition(7.5, 7.5))).to.be.true;

            const position = new Absolute3DPosition(15.165788658871772, 30.65466981141709, 1.5999999999999999);
            expect(Spaces.hallway.isInside(position)).to.be.true;
        });

        it('should detect if a 3D point is within a boundary', () => {
            const office = new SymbolicSpace<Absolute3DPosition>("PL9.3.58");
            office.setBounds([
                new Absolute3DPosition(5, 5, 5),
                new Absolute3DPosition(10, 10, 10)
            ]);
            expect(office.isInside(new Absolute3DPosition(3, 2, 3))).to.be.false;
            expect(office.isInside(new Absolute3DPosition(1, 1, 1))).to.be.false;
            expect(office.isInside(new Absolute3DPosition(7.5, 7.5, 7.5))).to.be.true;
            expect(office.isInside(new Absolute3DPosition(5, 5, 100))).to.be.false;
        });

    });

    describe('conversion', () => {
        const building = new Building("Pleinlaan 9")
            .setBounds({
                topLeft: new GeographicalPosition(
                    50.8203726927966, 4.392241309019189, 5
                ),
                width: 46.275,
                length: 37.27,
                height: 50,
                rotation: -34.04
            });
        const floor = new Floor("3")
            .setBuilding(building)
            .setFloorNumber(3);
        const office = new Room("3.58")
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(4.75, 31.25),
                new Absolute2DPosition(8.35, 37.02),
            ]);
        const lab = new Room("3.58")
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(13.15, 31.25),
                new Absolute2DPosition(25.15, 37.02),
            ]);
        const classroom = new Room("3.63")
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(27.55, 24.105),
                new Absolute2DPosition(35.95, 29.5),
            ]);
        const hallway = new Corridor()
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(2.39, 6.015),
                new Absolute2DPosition(2.39, 7.715),
                new Absolute2DPosition(18.015, 7.715),
                new Absolute2DPosition(18.015, 29.555),
                new Absolute2DPosition(2.39, 29.555),
                new Absolute2DPosition(2.39, 31.255),
                new Absolute2DPosition(41.94, 31.255),
                new Absolute2DPosition(41.94, 29.555),
                new Absolute2DPosition(20.315, 29.555),
                new Absolute2DPosition(20.315, 7.715),
                new Absolute2DPosition(41.94, 7.715),
                new Absolute2DPosition(41.94, 6.015),
            ]);

        it('should get the accuracy of the centroid', () => {
            expect(building.toPosition().accuracy.value).to.equal(38.838455460807545);
        });

        it('building should support rectangular boundaries', () => {
            const bounds = building.getBounds();
            expect(Math.round(bounds[1].distanceTo(bounds[2]) * 1000) / 1000).to.equal(46.275);
            expect(Math.round(bounds[0].distanceTo(bounds[1]) * 100) / 100).to.equal(37.27);
        });

        it('building should support local boundaries', () => {
            const bounds = building.getLocalBounds();
            expect(bounds.length).to.equal(4);
        });

        it('should support transforming a 2d position to geographical position', () => {
            const pos: GeographicalPosition = building.transform(new Absolute2DPosition(5, 37));
            expect(Math.round(pos.altitude)).to.equal(5);
            console.log(pos)
        });

        it('should support transforming a geographical position to 2d', () => {
            const pos = building.transform(new GeographicalPosition(50.820728049498236, 4.391975920396202));
            // console.log(pos)
        });

        it('should check if a position is inside a floor', () => {
            const pos = new Absolute2DPosition(20.45354852804289, 39.14921958288905);
            const inside = floor.isInside(pos);
        });

        it('floor should use local boundaries of a building', () => {
            const buildingBounds = building.getBounds().map(b => b.toVector3());
            expect(buildingBounds.length).to.equal(8);
            const bounds = floor.getBounds().map(b => b.toVector3());
            expect(bounds.length).to.equal(8);
        });

        it('should convert a position in the office to a geographical position', () => {
            const object = new DataObject();
            const position = office.toPosition();
            object.setPosition(position, office);
            const transformed = office.transform(position);
            expect(transformed.toVector3()).to.eql(object.getPosition().toVector3());
        });

        it('should transform an office', () => {
            const pos = office.transform(office.toPosition()) as GeographicalPosition;
            expect(pos.latitude).to.equal(50.82043728514493);
            expect(pos.longitude).to.equal(4.3922260967656905);
            expect(Math.round(pos.altitude)).to.equal(9 + 6);
            const obj = new DataObject();
            obj.setPosition(office.toPosition(), office);
        });

        it('should transform a floor', () => {
            const pos = office.transform(office.toPosition()) as GeographicalPosition;
            expect(Math.round(pos.altitude)).to.equal(9 + 6);
        });

        it('should be serializable to JSON', () => {
            DataSerializer.serialize(hallway);
        });
    });
    
    describe('geojson', () => {
        const building = new Building("Pleinlaan 9")
            .setBounds({
                topLeft: new GeographicalPosition(
                    50.8203726927966, 4.392241309019189
                ),
                width: 46.275,
                length: 37.27,
                rotation: -34.04
            });
        const floor = new Floor("3")
            .setBuilding(building)
            .setFloorNumber(3);
        const office = new Room("3.58")
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(4.75, 31.25),
                new Absolute2DPosition(8.35, 37.02),
            ]);

        it('should serialize a building to geojson', () => {
            const serialized = building.toGeoJSON();
            const deserialized = Building.fromGeoJSON(serialized);
            const office2 = SymbolicSpace.fromGeoJSON(office.toGeoJSON());
            office2.parent = floor;
            expect(office2.isInside(office2.toPosition())).to.be.true;
            // console.log(office.toPosition(), office.getBounds())
            // console.log(office.transform(office.toPosition()))
            expect(office2.isInside(office.transform(office.toPosition()))).to.be.true;
            expect(office2.isInside(office2.transform(office.toPosition()))).to.be.true;
            expect(office2.isInside(office.toPosition())).to.be.true;
        });

        it('should serialize multiple spaces to geojson', () => {
            const geojson = {
                type: "FeatureCollection",
                features: Object.keys(Spaces).map(spaceName => {
                    const space: SymbolicSpace<any> = Spaces[spaceName];
                    return space.toGeoJSON();
                })  
            };
           // console.log(JSON.stringify(geojson, null, 2))
        });
    });
});
