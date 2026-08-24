// Local travel data plus the public country geometry used to draw the map.
const DATA_FILES = {
  countries: "countries.json",
  cities: "major_cities.json",
  world: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json",
};

// Loaded data and the current table sort settings.
let countries = [];
let cities = [];
let countrySort = { key: "name", dir: 1 };
let citySort = { key: "name", dir: 1 };

const compareBy = (sort) => (a, b) =>
  sort.dir * String(a[sort.key] || "").localeCompare(String(b[sort.key] || ""));

// ---------- Header summary ----------
function renderStats() {
  const continents = new Set(
    countries.map((country) =>
      country.continent.split(" ")[0].split("/")[0].replace(/[(),]/g, ""),
    ),
  );
  const stats = [
    { num: countries.length, label: "Countries" },
    {
      num: `${Math.round((countries.length / 195) * 100)}%`,
      label: "of the world",
    },
    { num: cities.length, label: "Cities" },
    { num: continents.size, label: "Continents" },
  ];
  d3.select("#stats-strip")
    .selectAll(".stat")
    .data(stats)
    .join("div")
    .attr("class", "stat")
    .html(
      (item) =>
        `<span class="num">${item.num}</span><span class="label">${item.label}</span>`,
    );
  d3.select("#footer-counts").text(
    `${countries.length} countries and ${cities.length} places logged`,
  );
}

// ---------- Searchable data tables ----------
function renderCountries(filter = "") {
  const query = filter.trim().toLowerCase();
  const data = countries
    .filter((country) => country.name.toLowerCase().includes(query))
    .sort(compareBy(countrySort));
  d3.select("#countries-count").text(
    `${data.length} of ${countries.length} shown`,
  );
  const rows = d3
    .select("#countries-table tbody")
    .selectAll("tr")
    .data(data, (country) => country.name)
    .join("tr");
  rows.selectAll("*").remove();
  rows.append("td").each(function (country) {
    d3.select(this).append("span").attr("class", "flag").text(country.flag);
    d3.select(this).append("span").attr("class", "name").text(country.name);
  });
  rows.append("td").text((country) => country.continent);
  rows
    .append("td")
    .text((country) => country.regions_visited?.join(", ") || "—");
}

function renderCities(filter = "") {
  const query = filter.trim().toLowerCase();
  const data = cities
    .filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query),
    )
    .sort(compareBy(citySort));
  d3.select("#cities-count").text(`${data.length} of ${cities.length} shown`);
  const rows = d3
    .select("#cities-table tbody")
    .selectAll("tr")
    .data(data, (city) => `${city.name}-${city.country}`)
    .join("tr");
  rows.selectAll("*").remove();
  rows.append("td").text((city) => city.name);
  rows.append("td").text((city) => city.country);
  rows.append("td").each(function (city) {
    if (city.notes)
      d3.select(this).append("span").attr("class", "pill").text(city.notes);
  });
}

// Keep the quick-sort buttons and clickable table headings in sync.
function bindTableControls() {
  d3.select("#country-search").on("input", function () {
    renderCountries(this.value);
  });
  d3.selectAll("[data-country-sort]").on("click", function () {
    d3.selectAll("[data-country-sort]").classed("active", false);
    d3.select(this).classed("active", true);
    countrySort = { key: this.dataset.countrySort, dir: 1 };
    renderCountries(d3.select("#country-search").property("value"));
  });
  d3.selectAll("#countries-table th").on("click", function () {
    const key = this.dataset.key;
    countrySort = { key, dir: countrySort.key === key ? -countrySort.dir : 1 };
    renderCountries(d3.select("#country-search").property("value"));
  });
  d3.select("#city-search").on("input", function () {
    renderCities(this.value);
  });
  d3.selectAll("[data-city-sort]").on("click", function () {
    d3.selectAll("[data-city-sort]").classed("active", false);
    d3.select(this).classed("active", true);
    citySort = { key: this.dataset.citySort, dir: 1 };
    renderCities(d3.select("#city-search").property("value"));
  });
  d3.selectAll("#cities-table th").on("click", function () {
    const key = this.dataset.key;
    citySort = { key, dir: citySort.key === key ? -citySort.dir : 1 };
    renderCities(d3.select("#city-search").property("value"));
  });
}

// ---------- Interactive travel map ----------
function renderMap(world) {
  const width = 960,
    height = 500;
  const svg = d3.select("#map"),
    mapWrap = d3.select("#map-wrap"),
    tooltip = d3.select("#tooltip");
  // A flat projection keeps pins visually aligned with their coordinates.
  const projection = d3.geoEquirectangular().fitExtent(
    [
      [14, 14],
      [width - 14, height - 14],
    ],
    { type: "Sphere" },
  );
  const path = d3.geoPath(projection);
  const features = topojson.feature(world, world.objects.countries).features;
  const visitedByISO = new Map(
    countries.map((country) => [+country.iso_numeric, country]),
  );
  // Reusable SVG gradients give the tiny pushpins depth without image files.
  const defs = svg.append("defs");
  const pinHead = defs
    .append("radialGradient")
    .attr("id", "pin-head")
    .attr("cx", "32%")
    .attr("cy", "27%")
    .attr("r", "72%");
  pinHead.append("stop").attr("offset", "0%").attr("stop-color", "#c9dce4");
  pinHead.append("stop").attr("offset", "16%").attr("stop-color", "#5d8799");
  pinHead.append("stop").attr("offset", "58%").attr("stop-color", "#315f73");
  pinHead.append("stop").attr("offset", "100%").attr("stop-color", "#183b4a");
  const pinMetal = defs
    .append("linearGradient")
    .attr("id", "pin-metal")
    .attr("x1", "0%")
    .attr("x2", "100%");
  pinMetal.append("stop").attr("offset", "0%").attr("stop-color", "#3d3937");
  pinMetal.append("stop").attr("offset", "48%").attr("stop-color", "#f0e7df");
  pinMetal.append("stop").attr("offset", "68%").attr("stop-color", "#77706c");
  pinMetal.append("stop").attr("offset", "100%").attr("stop-color", "#262321");
  const layer = svg.append("g").attr("class", "map-layer");

  layer
    .append("path")
    .attr("class", "map-sphere")
    .attr("d", path({ type: "Sphere" }));
  layer
    .append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "graticule")
    .attr("d", path);

  function showTooltip(event, title, lines = []) {
    const [x, y] = d3.pointer(event, mapWrap.node());
    tooltip
      .html("")
      .style("left", `${x}px`)
      .style("top", `${y}px`)
      .style("opacity", 1)
      .attr("aria-hidden", "false");
    tooltip.append("strong").text(title);
    lines.filter(Boolean).forEach((line) => tooltip.append("span").text(line));
  }
  function hideTooltip() {
    tooltip.style("opacity", 0).attr("aria-hidden", "true");
  }

  layer
    .selectAll("path.country")
    .data(features)
    .join("path")
    .attr(
      "class",
      (feature) => `country${visitedByISO.has(+feature.id) ? " visited" : ""}`,
    )
    .attr("d", path)
    .on("mousemove", (event, feature) => {
      const visited = visitedByISO.get(+feature.id);
      showTooltip(
        event,
        visited?.name || feature.properties?.name || "Country",
        [visited ? "Visited" : "Not yet visited"],
      );
    })
    .on("mouseleave", hideTooltip);

  // Labels are deliberately sparse so they do not compete with the data.
  const labels = [
    { name: "North America", coordinates: [-105, 45] },
    { name: "South America", coordinates: [-61, -19] },
    { name: "Europe", coordinates: [18, 51] },
    { name: "Africa", coordinates: [20, 5] },
    { name: "Asia", coordinates: [91, 42] },
    { name: "Australia", coordinates: [135, -27] },
  ];
  layer
    .selectAll("text.map-label")
    .data(labels)
    .join("text")
    .attr("class", "map-label")
    .attr(
      "transform",
      (label) => `translate(${projection(label.coordinates).join(",")})`,
    )
    .text((label) => label.name);

  // The group origin is the needle tip, so it marks the exact lat/lon.
  const pins = layer
    .selectAll("g.city-pin")
    .data(
      cities.filter(
        (city) => Number.isFinite(city.lat) && Number.isFinite(city.lon),
      ),
    )
    .join("g")
    .attr("class", "city-pin")
    .attr("transform", (city) => {
      const point = projection([city.lon, city.lat]);
      return point
        ? `translate(${point[0]},${point[1]})`
        : "translate(-999,-999)";
    })
    .on("mousemove", (event, city) =>
      showTooltip(event, city.name, [city.country, city.notes]),
    )
    .on("mouseleave", hideTooltip);
  pins
    .append("circle")
    .attr("class", "pin-hit")
    .attr("cx", 1.6)
    .attr("cy", -2.2)
    .attr("r", 5.5);
  pins
    .append("line")
    .attr("class", "pin-stem")
    .attr("x1", 0)
    .attr("y1", 0)
    .attr("x2", 1.2)
    .attr("y2", -2.9);
  pins
    .append("line")
    .attr("class", "pin-stem-highlight")
    .attr("x1", 0.2)
    .attr("y1", -0.25)
    .attr("x2", 1.35)
    .attr("y2", -2.75);
  pins.append("circle").attr("class", "pin-tip").attr("r", 0.3);
  pins
    .append("circle")
    .attr("class", "pin-head")
    .attr("cx", 1.7)
    .attr("cy", -4.2)
    .attr("r", 2.1);
  pins
    .append("circle")
    .attr("class", "pin-rim")
    .attr("cx", 1.7)
    .attr("cy", -4.2)
    .attr("r", 1.85);
  pins
    .append("ellipse")
    .attr("class", "pin-shine")
    .attr("cx", 1.05)
    .attr("cy", -4.8)
    .attr("rx", 0.55)
    .attr("ry", 0.28)
    .attr("transform", "rotate(-25 1.05 -4.8)");

  // Geography scales during zoom; pin graphics scale inversely to stay 4.8 px.
  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      layer.attr("transform", event.transform);
      layer.selectAll(".city-pin").attr("transform", (city) => {
        const point = projection([city.lon, city.lat]);
        return point
          ? `translate(${point[0]},${point[1]}) scale(${1 / event.transform.k})`
          : "translate(-999,-999)";
      });
      layer
        .selectAll(".map-label")
        .style("opacity", event.transform.k > 2 ? 0 : 0.66);
      hideTooltip();
    });
  svg.call(zoom).on("dblclick.zoom", null);
  d3.select("#zoom-in").on("click", () =>
    svg.transition().duration(220).call(zoom.scaleBy, 1.6),
  );
  d3.select("#zoom-out").on("click", () =>
    svg.transition().duration(220).call(zoom.scaleBy, 0.625),
  );
  d3.select("#zoom-reset").on("click", () =>
    svg.transition().duration(260).call(zoom.transform, d3.zoomIdentity),
  );
}

// Load the editable JSON files before rendering any dependent interface.
async function init() {
  try {
    [countries, cities] = await Promise.all([
      d3.json(DATA_FILES.countries),
      d3.json(DATA_FILES.cities),
    ]);
    renderStats();
    renderCountries();
    renderCities();
    bindTableControls();
    try {
      renderMap(await d3.json(DATA_FILES.world));
    } catch (error) {
      d3.select("#load-error")
        .classed("show", true)
        .text(
          "The map could not be loaded. The country and city tables are still available below.",
        );
      console.error(error);
    }
  } catch (error) {
    d3.select("#load-error")
      .classed("show", true)
      .text(
        "The travel data could not be loaded. Run the site through a local web server or try again.",
      );
    console.error(error);
  }
}

init();
