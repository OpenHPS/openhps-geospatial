import { expect } from 'chai';
import 'mocha';
import { 
    Absolute2DPosition, 
    Absolute3DPosition, 
    Vector3
} from '@openhps/core';
import {
    Building,
    Floor,
    SymbolicSpace
} from '../../src';

describe('position', () => {
    describe('symbolic space', () => {
    
        describe('boundaries', () => {

            it('should create a 2D boundary from the TL and BR points', () => {
                const office = new SymbolicSpace<Absolute2DPosition>("PL9.3.58");
                office.setBounds([
                    new Absolute2DPosition(5, 5),
                    new Absolute2DPosition(10, 10)
                ]);
                expect(office.getBounds()[0].toVector3()).to.deep.equal(new Vector3(5, 5, 0));
                expect(office.getBounds()[1].toVector3()).to.deep.equal(new Vector3(10, 5, 0));
                expect(office.getBounds()[2].toVector3()).to.deep.equal(new Vector3(10, 10, 0));
                expect(office.getBounds()[3].toVector3()).to.deep.equal(new Vector3(5, 10, 0));
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
                .setBounds([

                ]);
            const floor = new Floor("3")
                .setFloorNumber(3);
        });
        
    });
});
