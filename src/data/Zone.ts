import { SerializableObject } from '@openhps/core';
import { CellSpace } from './gml/CellSpace';

/**
 * A zone represents an abstract symbolic space on a floor.
 */
@SerializableObject()
export class Zone extends CellSpace {}
