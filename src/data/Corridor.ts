import { SerializableObject } from '@openhps/core';
import { Zone } from './Zone';

/**
 * A corridor is a semantically described area that represents the corridor.
 */
@SerializableObject()
export class Corridor extends Zone {}
