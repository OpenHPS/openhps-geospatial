import { SerializableObject } from '@openhps/core';
import { Zone } from './Zone';

/**
 * A room represents a symbolic space inside a floor.
 */
@SerializableObject()
export class Room extends Zone {}
