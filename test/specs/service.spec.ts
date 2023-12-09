import { expect } from 'chai';
import 'mocha';
import { 
    Absolute2DPosition, 
    GeographicalPosition, 
    MemoryDataService, 
} from '@openhps/core';
import {
    Building,
    Floor,
    Corridor,
    Room,
    SymbolicSpace,
    SymbolicSpaceService
} from '../../src';
const GEOJSON = require('../data/spaces.geo.json');

describe('SymbolicSpaceService', () => {
    const building = new Building("Pleinlaan 9")
    .setBounds({
        topLeft: new GeographicalPosition(
            50.8203726927966, 4.392241309019189, 83
        ),
        width: 46.275,
        length: 37.27,
        rotation: -34.04,
        height: 50
    });
const floor = new Floor("3")
    .setBuilding(building)
    .setFloorNumber(3);
const base = new Floor("0")
    .setBuilding(building)
    .setFloorNumber(0);
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
    let service: SymbolicSpaceService<SymbolicSpace<any>>;

    before((done) => {
        service = new SymbolicSpaceService(new MemoryDataService(SymbolicSpace));
        Promise.all([
            service.insertObject(building),
            service.insertObject(floor),
            service.insertObject(base),
            service.insertObject(office),
            service.insertObject(hallway),
            service.insertObject(lab),
            service.insertObject(classroom)
        ]).then(() => {
            done();
        }).catch(done);
    });

    it('should find the best space', (done) => {
        service.findSymbolicSpaces(lab.toPosition()).then(results => {
            expect(results.length).to.be.greaterThan(0);
            expect(results[0][0].uid).to.equal(lab.uid);
            done();
        }).catch(done);
    });

    it('should find the best space when a geographical position is provided', (done) => {
        const position = lab.transform(lab.toPosition());
        service.findSymbolicSpaces(position).then(results => {
            expect(results[0][0].uid).to.equal(lab.uid);
            done();
        }).catch(done);
    });

    it('should return all floors of a building', (done) => {
        service.findChildren(building).then(floors => {
            expect(floors.length).to.equal(2);
            done();
        }).catch(done);
    });

    it('should find the best space when a geographical position is provided on a geojson source', (done) => {
        service.deleteAll().then(() => {
            return Promise.all(GEOJSON.features.map(
                feature => SymbolicSpace.fromGeoJSON(feature)
            ).map(space => service.insertObject(space)));
        }).then(() => {
            const position = lab.transform(lab.toPosition());
            return service.findSymbolicSpaces(position)
        }).then(results => {
            expect(results[0][0].uid).to.equal("pl9_3_54");
            done();
        }).catch(done);
    });
});
