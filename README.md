# Travel Stats

A lightweight personal travel map inspired by [Golf Stats](https://humphreycurtis.github.io/Golf-Stats/).

Visited countries are shaded ochre on a dark atlas, logged cities and places appear as mint navigation beacons, and both datasets are available in searchable, sortable tables.

## Run locally

Serve this directory with any static web server, then open `index.html`. For example:

```sh
python3 -m http.server 8000
```

The page has no build step. It uses D3, TopoJSON, and World Atlas from public CDNs.

## Data

- `countries.json` is the country source of truth, including the numeric identifiers used by the map.
- `major_cities.json` is the city/place source of truth, including map coordinates.
- `index.html`, `styles.css`, and `app.js` contain the structure, design, and behavior.
