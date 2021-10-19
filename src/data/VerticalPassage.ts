import { Absolute2DPosition, SerializableObject } from '@openhps/core';
import { SymbolicSpace } from './SymbolicSpace';

@SerializableObject()
export class VerticalPassage extends SymbolicSpace<Absolute2DPosition> {}
