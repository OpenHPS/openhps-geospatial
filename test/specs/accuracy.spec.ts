import { Absolute2DPosition, GeographicalPosition } from '@openhps/core';
import { expect } from 'chai';
import 'mocha';
import { Building, Floor, Room, GeospatialAccuracy } from '../../src';

describe('GeospatialAccuracy', () => {
    it('shoud get the largest radius of a space', () => {
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
        const lab = new Room("3.58")
            .setFloor(floor)
            .setBounds([
                new Absolute2DPosition(13.15, 31.25),
                new Absolute2DPosition(25.15, 37.02),
            ]);
        const accuracy = new GeospatialAccuracy(lab);
        expect(Math.round(accuracy.valueOf())).to.equal(7);
    });

    it('should output de space name on toString()', () => {
        const building = new Building("Pleinlaan 9")
            .setBounds({
                topLeft: new GeographicalPosition(
                    50.8203726927966, 4.392241309019189
                ),
                width: 46.275,
                length: 37.27,
                rotation: -34.04
            });
        const accuracy = new GeospatialAccuracy(building);
        expect(accuracy.toString()).to.eql(building.displayName);
    });
});
