<h1 align="center">
  <img alt="OpenHPS" src="https://openhps.org/images/logo_text-512.png" width="40%" /><br />
  @openhps/geospatial
</h1>
<p align="center">
    <a href="https://github.com/OpenHPS/openhps-geospatial/actions/workflows/main.yml" target="_blank">
        <img alt="Build Status" src="https://github.com/OpenHPS/openhps-geospatial/actions/workflows/main.yml/badge.svg">
    </a>
    <a href="https://codecov.io/gh/OpenHPS/openhps-geospatial">
        <img src="https://codecov.io/gh/OpenHPS/openhps-geospatial/branch/master/graph/badge.svg"/>
    </a>
    <a href="https://codeclimate.com/github/OpenHPS/openhps-geospatial/" target="_blank">
        <img alt="Maintainability" src="https://img.shields.io/codeclimate/maintainability/OpenHPS/openhps-geospatial">
    </a>
    <a href="https://badge.fury.io/js/@openhps%geospatial">
        <img src="https://badge.fury.io/js/@openhps%2Fgeospatial.svg" alt="npm version" height="18">
    </a>
</p>

<h3 align="center">
    <a href="https://github.com/OpenHPS/openhps-core">@openhps/core</a> &mdash; <a href="https://openhps.org/docs/geospatial">API</a>
</h3>

<br />

## Getting Started
If you have [npm installed](https://www.npmjs.com/get-npm), start using @openhps/geospatial with the following command.
```bash
npm install @openhps/geospatial --save
```
## Usage

### Creating Symbolic Spaces 
```typescript
const building = new Building("Pleinlaan 9")
    .setBounds({
        topLeft: new GeographicalPosition(
            50.8203726927966, 4.392241309019189
        ),
        width: 46.275,
        length: 37.27,
        height: 50, // Height of the building
        rotation: -34.04
    });
const floor = new Floor("3")
    .setBuilding(building)
    .setFloorNumber(3);
const office = new Room("3.58")
    .setFloor(floor)
    .setBounds([
        new Absolute2DPosition(4.75, 31.25),
        new Absolute2DPosition(8.35, 37.02),
    ]);
const lab = new Room("3.58")
    .setFloor(floor)
    .setBounds([
        new Absolute2DPosition(13.15, 31.25),
        new Absolute2DPosition(25.15, 37.02),
    ]);
```

### Transforming Positions
```typescript
office.toPosition(); // (6.55, 34.135)
office.transform(office.toPosition()); // (lat: 50.8204372851, lng: 4.39222609676)
```

### Updating Position
```typescript
const object = new DataObject("mvdewync");
object.setPosition(new Absolute2DPosition(
    6.55,
    34.135,
    LengthUnit.METER
), office);

// Position relative to the global reference space (geographical)
office.getPosition(); // (lat: 50.8204372851, lng: 4.39222609676)

// Position relative to the floor
office.getPosition(floor); // (6.55, 34.135)
```

### Symbolic Location
Symbolic locations represent a physical position (e.g. 2D, 3D or geographical position) within a symbolic space, but are defined
deliberately as a symbolic position. An example use case would be when you know a person is in a room, but you have no idea where
in this room/space the person is located.

@openhps/spaces does not provide an additional *SymbolicLocation* for this trivial indicator. Instead, we utilise the ```referenceObjectUID```
in an ```AbsolutePosition``` to indicate that a certain position is relative to a symbolic space.

### Geospatial Accuracy
Geospatial accuracy is the accuracy set to a geospatial place.

```typescript
// Set the accuracy of the position to the floor
position.accuracy = new GeospatialAccuracy(floor);
```

## Contributors
The framework is open source and is mainly developed by PhD Student Maxim Van de Wynckel as part of his research towards *Hybrid Positioning and Implicit Human-Computer Interaction* under the supervision of Prof. Dr. Beat Signer.

## Contributing
Use of OpenHPS, contributions and feedback is highly appreciated. Please read our [contributing guidelines](CONTRIBUTING.md) for more information.

## License
Copyright (C) 2019-2025 Maxim Van de Wynckel & Vrije Universiteit Brussel

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.