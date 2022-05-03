import {
    Absolute2DPosition,
    AngleUnit,
    GeographicalPosition,
    SerializableObject,
    Vector2,
    AbsolutePosition,
    SpaceTransformationOptions,
} from '@openhps/core';
import { SymbolicSpace } from './SymbolicSpace';

/**
 * A building is a symbolic space that uses geographical positions as its boundaries.
 * Each building has a local boundary with an origin (0, 0) that can be used to determine
 * to position within the building.
 */
@SerializableObject()
export class Building extends SymbolicSpace<GeographicalPosition> {
    getLocalBounds(): Absolute2DPosition[] {
        const localBounds = [new Absolute2DPosition(0, 0)];
        for (let i = 1; i < this.getBounds().length; i++) {
            const b1 = this.getBounds()[i - 1];
            const b2 = this.getBounds()[i];
            const d = b1.distanceTo(b2);
            const a = b1.angleTo(b2) - this.rotationQuaternion.toEuler().z;
            const prev = localBounds[i - 1];
            const positionVector = new Vector2(prev.x, prev.y);
            localBounds.push(
                new Absolute2DPosition().fromVector(
                    positionVector.add(new Vector2(d, 0).rotateAround(new Vector2(0, 0), -a)),
                ),
            );
        }
        return localBounds;
    }

    /**
     * Transform a position
     *
     * @param {AbsolutePosition} position Position to transform
     * @param {SpaceTransformationOptions} [options] Transformation options
     * @returns {AbsolutePosition} Transformed position
     */
    transform<In extends AbsolutePosition, Out extends AbsolutePosition = In>(
        position: In,
        options?: SpaceTransformationOptions,
    ): Out {
        const origin: GeographicalPosition = this.getBounds()[0];
        const angle = this.rotationQuaternion.toEuler().yaw;
        if (position instanceof GeographicalPosition) {
            const d = origin.distanceTo(position);
            const a = angle - origin.bearing(position);
            const localOrigin = this.getLocalBounds()[0].clone();
            const localOriginVector = new Vector2(localOrigin.x, localOrigin.y);
            localOriginVector.add(
                new Vector2(d).rotateAround(new Vector2(0, 0), AngleUnit.DEGREE.convert(a, AngleUnit.RADIAN)),
            );
            localOrigin.fromVector(localOriginVector);
            return localOrigin as unknown as Out;
        } else if (position instanceof Absolute2DPosition) {
            return origin.destination(angle, position.x).destination(angle - 90, position.y) as unknown as Out;
        }
    }
}
