import { SerializableMember, SerializableObject } from '@openhps/core';

@SerializableObject()
export class Slant {
    @SerializableMember()
    direction: SlantDirection = SlantDirection.DOWN;
}

export enum SlantDirection {
    DOWN,
}
