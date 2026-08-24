# Travel Stats

A lightweight personal travel map inspired by [Golf Stats](https://humphreycurtis.github.io/Golf-Stats/).

Visited countries are shaded blue, logged cities and places appear as red pins, and both datasets are available in searchable, sortable tables.

## Run locally

Serve this directory with any static web server, then open `index.html`. For example:

```sh
python3 -m http.server 8000
```

The page has no build step. It uses D3, TopoJSON, and World Atlas from public CDNs.

## Data

- `countries.json` contains the country list.
- `major_cities.json` contains the city/place list.
- `index.html` contains the current deployable snapshot, including coordinates and numeric country identifiers used by the map.
