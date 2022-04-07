import { SerializableArrayMember, SerializableObject, Vector3 } from '@openhps/core';

@SerializableObject()
export class CellBoundary {
    @SerializableArrayMember(Vector3)
    coordinates: Vector3[] = [];
}
