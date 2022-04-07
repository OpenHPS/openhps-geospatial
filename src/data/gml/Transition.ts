import { SerializableArrayMember, SerializableObject, Vector3 } from '@openhps/core';
import { State } from './State';

/**
 * Transition from one space to another.
 */
@SerializableObject()
export class Transition {
    @SerializableArrayMember(State)
    connects: State[] = [];
    @SerializableArrayMember(Vector3)
    points: Vector3[] = [];
}
