import * as Spaces from '../data/Spaces';
import * as fs from 'fs';
import * as path from 'path';

const data = {
    type: "FeatureCollection",
    features: []
};

Object.values(Spaces).forEach(item => {
    data.features.push(item.toGeoJSON());
});

fs.writeFileSync(path.join(__dirname, "../data/spaces.geo.json"), JSON.stringify(data, null, 4));
