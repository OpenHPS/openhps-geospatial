import { SerializableObject } from '@openhps/core';
import { Room } from './Room';

/**
 * A corridor is a semantically described area that represents the corridor.
 */
@SerializableObject()
export class Corridor extends Room {}
