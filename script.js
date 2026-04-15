import fs from 'fs';
import proj4 from 'proj4';

proj4.defs("EPSG:2039", "+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +units=m +no_defs");

const query = `
  query {
    boards(ids: [5093355269]) {
      items_page(limit: 500) {
        items {
          id
          name
          column_values {
            id
            text
            ... on MirrorValue {
              display_value
            }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.monday.com/v2", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYyNjIxMzE4MiwiYWFpIjoxMSwidWlkIjo5ODg1OTUyMywiaWFkIjoiMjAyNi0wMi0yNlQwOToyNjo0MC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI5OTMxODQsInJnbiI6ImV1YzEifQ.133ywd2P5mR750f7mgyIYII4Fn5DQhTbgvwiCnB4tWI",
  },
  body: JSON.stringify({ query }),
});

const data = await response.json();
const items = data.data.boards[0].items_page.items;

// Save regular JSON
fs.writeFileSync("board_items.json", JSON.stringify(items, null, 2));
console.log("JSON saved!");

// Build GeoJSON
const features = [];

for (const item of items) {
  const x = parseFloat(item.column_values.find(c => c.id === "numeric_mm1j4r24")?.text);
  const y = parseFloat(item.column_values.find(c => c.id === "numeric_mm1jf581")?.text);

  if (isNaN(x) || isNaN(y)) continue;

  const [lng, lat] = proj4("EPSG:2039", "WGS84", [x, y]);

  const mirrorValue = item.column_values.find(c => c.id === "lookup_mm1k5b7e")?.display_value;

  features.push({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lng, lat]
    },
    properties: {
      id: item.id,
      name: item.name,
      heb_name: item.column_values.find(c => c.id === "text_mm1jxhyf")?.text,
      eng_name: item.column_values.find(c => c.id === "text_mm1jakpn")?.text,
      muni_mirror: mirrorValue,
    }
  });
}

const geojson = { type: "FeatureCollection", features };
fs.writeFileSync("board_items_mirror.geojson", JSON.stringify(geojson, null, 2));
console.log("GeoJSON saved! Total features:", features.length);