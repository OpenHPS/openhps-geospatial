import { expect } from "chai";
import { AbstractLocation } from "../../src";

describe('AbstractLocation', () => {
    it('should generate a random location based on UID', () => {
        const location = new AbstractLocation("room-1");
        const location2 = new AbstractLocation("room-1");
        expect(location.x).to.equal(location2.x);
        expect(location.y).to.equal(location2.y);
    });

    it('should generate different locations for different UIDs', () => {
        const location1 = new AbstractLocation("room-234");
        const location2 = new AbstractLocation("room-291");
        expect(location1.x).to.not.equal(location2.x);
        expect(location1.y).to.not.equal(location2.y);
    });

    it('should generate unique locations for multiple UIDs', () => {
        const uids = Array.from({ length: 1000 }, (_, i) => `room-${i + 1}`);
        const locations = uids.map(uid => new AbstractLocation(uid));
        const coordinates = locations.map(location => `${location.x},${location.y}`);
        const uniqueCoordinates = new Set(coordinates);

        if (uniqueCoordinates.size !== uids.length) {
            const duplicatePairs = coordinates.reduce((acc, coord, index) => {
            const firstIndex = coordinates.indexOf(coord);
            if (firstIndex !== index) {
                acc.push([uids[firstIndex], uids[index]]);
            }
            return acc;
            }, []);
            console.log("Duplicate Pairs:", duplicatePairs);
        }

        expect(uniqueCoordinates.size).to.equal(uids.length);
    });
});