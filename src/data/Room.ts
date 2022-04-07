import { SerializableObject } from '@openhps/core';
import { CellSpace } from './gml/CellSpace';

/**
 * A room represents a symbolic space inside a floor.
 */
@SerializableObject()
export class Room extends CellSpace {}
