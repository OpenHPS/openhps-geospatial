import { expect } from 'chai';
import 'mocha';
import { 
    Absolute2DPosition, 
    Absolute3DPosition, 
    DataObject, 
    GCS, 
    GeographicalPosition, 
    LengthUnit, 
    MemoryDataService, 
    Vector3
} from '@openhps/core';
import {
    Building,
    Floor,
    Corridor,
    Room,
    SymbolicSpace,
    SymbolicSpaceService
} from '../../src';

describe('SymbolicSpaceService', () => {
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
});
