import { SerializableMember, SerializableObject, Vector3 } from '@openhps/core';

@SerializableObject()
export class State {
    /**
     * Unique identifier of the state
     */
    @SerializableMember()
    uid: string;
    /**
     * Point of the state
     */
    @SerializableMember()
    point: Vector3;
}
