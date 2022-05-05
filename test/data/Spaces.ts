import { Absolute2DPosition, GeographicalPosition } from '@openhps/core';
import { Building, Corridor, Floor, Room, Zone } from '../../src';

const building = new Building('PL9').setUID('deployment_pl9').setBounds({
    topLeft: new GeographicalPosition(50.8203726927966, 4.392241309019189, 83),
    width: 46.275,
    length: 37.27,
    height: 50,
    rotation: -34.04,
});
const floor = new Floor('PL9.3')
    .setUID('deployment_pl9_3')
    .setBuilding(building)
    .setFloorNumber(3)
    .setBounds([
        new Absolute2DPosition(0, 0),
        new Absolute2DPosition(0, 13.73),
        new Absolute2DPosition(10.102, 13.73),
        new Absolute2DPosition(10.102, 23.54),
        new Absolute2DPosition(0, 23.54),
        new Absolute2DPosition(0, 37.27),
        new Absolute2DPosition(44.33, 37.27),
        new Absolute2DPosition(44.33, 23.54),
        new Absolute2DPosition(28.06, 23.54),
        new Absolute2DPosition(28.06, 13.73),
        new Absolute2DPosition(44.33, 13.73),
        new Absolute2DPosition(44.33, 0),
    ]);
const office1 = new Room('PL9.3.60')
    .setUID('deployment_pl9_3_60')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(0.57, 31.25), new Absolute2DPosition(4.75, 37.02)]);
const office2 = new Room('PL9.3.58')
    .setUID('deployment_pl9_3_58')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(4.75, 31.25), new Absolute2DPosition(8.35, 37.02)]);
const office3 = new Room('PL9.3.56')
    .setUID('deployment_pl9_3_56')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(8.35, 31.25), new Absolute2DPosition(13.15, 37.02)]);
const office4 = new Room('PL9.3.32')
    .setUID('deployment_pl9_3_32')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(29.97, 31.25), new Absolute2DPosition(34.77, 37.02)]);
const lab = new Room('PL9.3.54')
    .setUID('deployment_pl9_3_54')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(13.15, 31.25), new Absolute2DPosition(25.15, 37.02)]);
const classroom = new Room('PL9.3.62')
    .setUID('deployment_pl9_3_62')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(27.55, 24.105), new Absolute2DPosition(35.95, 29.5)]);
const hallway = new Corridor('Corridor')
    .setUID('deployment_pl9_3_corridor')
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
const lobby = new Zone('Lobby #1')
    .setUID('deployment_pl9_3_lobby_1')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(20.315, 20.155), new Absolute2DPosition(25.765, 27.27)]);
const lobby2 = new Zone('Lobby #2')
    .setUID('deployment_pl9_3_lobby_2')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(18.015, 0.57), new Absolute2DPosition(20.315, 6.015)]);
const toilet1 = new Zone('Toilets #1')
    .setUID('deployment_pl9_3_toilets_1')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(15.48, 10.51), new Absolute2DPosition(18.015, 12.71)]);
const toilet2 = new Zone('Toilets #2')
    .setUID('deployment_pl9_3_toilets_2')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(15.48, 24.56), new Absolute2DPosition(18.015, 26.76)]);
const elevators = new Corridor('Elevators')
    .setUID('deployment_pl9_3_elevators')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(10.73, 17.22), new Absolute2DPosition(18.02, 20.06)]);
const stairs = new Corridor('Staircase')
    .setUID('deployment_pl9_3_staircase')
    .setFloor(floor)
    .setBounds([new Absolute2DPosition(20.315, 17.22), new Absolute2DPosition(27.56, 20.06)]);
export {
    lobby,
    lobby2,
    hallway,
    classroom,
    office1,
    office2,
    office3,
    office4,
    lab,
    building,
    floor,
    elevators,
    stairs,
    toilet1,
    toilet2,
};
