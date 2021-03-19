import { SerializableObject } from '@openhps/core';
import { Room } from './Room';

/**
 * A hallway is a semantically described room that represents the hallway.
 */
@SerializableObject()
export class Hallway extends Room {}
