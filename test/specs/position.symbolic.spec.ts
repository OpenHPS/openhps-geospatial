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

describe('SymbolicSpace', () => {
    const building = new Building("Pleinlaan 9")
        .setBounds({
            topLeft: new GeographicalPosition(
                50.8203726927966, 4.392241309019189
            ),
            width: 46.275,
            height: 37.27,
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
            expect(office.toWKT()).to.equal("POLYGON Z ((4.3922064088170245 50.820409347596424 9, 4.392274471790824 50.82043839481918 9, 4.392245784743152 50.820465222697464 9, 4.392177721730248 50.82043617547472 9))");
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
                    50.8203726927966, 4.392241309019189
                ),
                width: 46.275,
                height: 37.27,
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
            const pos = building.transform(new Absolute2DPosition(5, 37));
            //  console.log(pos)
        });

        it('should support transforming a geographical position to 2d', () => {
            const pos = building.transform(new GeographicalPosition(50.820728049498236, 4.391975920396202));
            // console.log(pos)
        });

        it('should find a floor', () => {
            const pos = new Absolute2DPosition(20.45354852804289, 39.14921958288905);
            const inside = floor.isInside(pos);
            //   console.log(inside);
        });

        it('floor should use local boundaries of a building', () => {
            const bounds = floor.getBounds().map(b => b.toVector3());
            expect(bounds.length).to.equal(4);
        });

        it('should convert a position in the office to a geographical position', () => {
            const object = new DataObject();
            object.setPosition(office.toPosition(), office);
        });

        it('should transform an office', () => {
            const pos = office.transform(office.toPosition()) as GeographicalPosition;
            expect(pos.latitude).to.equal(50.820437285152764);
            expect(pos.longitude).to.equal(4.3922260967638485);
            expect(pos.altitude).to.equal(9);
            const obj = new DataObject();
            obj.setPosition(office.toPosition(), office);
        });

        it('should transform a floor', () => {
            const pos = office.transform(office.toPosition()) as GeographicalPosition;
            expect(pos.altitude).to.equal(9);
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
                height: 37.27,
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
            console.log(building.toPosition())
            const deserialized = Building.fromGeoJSON(serialized);
            console.log(deserialized.toPosition())
        });

    });
});
