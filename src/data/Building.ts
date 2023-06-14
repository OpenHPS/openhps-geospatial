import {
    Absolute2DPosition,
    AngleUnit,
    GeographicalPosition,
    SerializableObject,
    Vector2,
    AbsolutePosition,
    SpaceTransformationOptions,
    Absolute3DPosition,
    Vector3,
    LengthUnit,
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
        const bounds = this.getBounds();
        if (bounds.length === 0) {
            return [];
        }
        const hasElevation = bounds.reduce((a, b) => a + b.altitude, 0) / bounds.length !== bounds[0].altitude;
        const localBounds = [new Absolute2DPosition(0, 0)];
        for (let i = 1; i < bounds.length / (hasElevation ? 2 : 1); i++) {
            const b1 = bounds[i - 1];
            const b2 = bounds[i];
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
     * @param {AbsolutePosition} position Position to transform
     * @param {SpaceTransformationOptions} [options] Transformation options
     * @returns {AbsolutePosition} Transformed position
     */
    transform<In extends AbsolutePosition, Out extends AbsolutePosition = In>(
        position: In,
        options?: SpaceTransformationOptions,
    ): Out {
        const origin: GeographicalPosition = this.origin as GeographicalPosition;
        if (origin === undefined) {
            return position as unknown as Out;
        }
        const angle = this.rotationQuaternion.toEuler().yaw;
        if (position instanceof GeographicalPosition && options && options.inverse) {
            const d = origin.distanceTo(position);
            const a = angle - origin.bearing(position);
            const localOrigin = this.getLocalBounds()[0].clone();
            const localOriginVector = new Vector2(localOrigin.x, localOrigin.y);
            localOriginVector.add(
                new Vector2(d).rotateAround(new Vector2(0, 0), AngleUnit.DEGREE.convert(a, AngleUnit.RADIAN)),
            );
            localOrigin.fromVector(
                new Vector3(localOriginVector.x, localOriginVector.y, 0).applyMatrix4(this.translationMatrix),
            );
            return localOrigin as unknown as Out;
        } else if (position instanceof GeographicalPosition) {
            return position as unknown as Out;
        } else if (position instanceof Absolute3DPosition) {
            const geoPos: GeographicalPosition = origin
                .destination(angle, position.x, AngleUnit.DEGREE, LengthUnit.METER)
                .destination(angle - 90, position.y, AngleUnit.DEGREE, LengthUnit.METER);
            if (geoPos.altitude === undefined) {
                geoPos.altitude = 0;
            }
            geoPos.altitude += position.z;
            geoPos.fromVector(geoPos.toVector3().applyMatrix4(this.translationMatrix));
            return geoPos as unknown as Out;
        } else if (position instanceof Absolute2DPosition) {
            const newPosition = origin
                .destination(angle, position.x, AngleUnit.DEGREE, LengthUnit.METER)
                .destination(angle - 90, position.y, AngleUnit.DEGREE, LengthUnit.METER) as unknown as Out;
            newPosition.fromVector(newPosition.toVector3().applyMatrix4(this.translationMatrix));
            return newPosition;
        } else {
            return position as unknown as Out;
        }
    }
}
