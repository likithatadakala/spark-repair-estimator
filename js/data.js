// Full contents of "Pricing List.csv" pasted verbatim between the backticks (header + all 108 rows).
const CSV = `id,name,cost,unit
ig-01,"Refinish Hardwood Floor",2.35,"sqft"
ig-02,"New Hardwoods 1.5""",10.00,"sqft"
ig-03,"New Hardwoods 2""",4.75,"sqft"
ig-04,"Hardwood Splicing",8.40,"sqft"
ig-05,"Vinyl Plank",2.50,"sqft"
ig-06,"Carpet",1.90,"sqft"
ig-07,"Interior Paint — 2 Tone",2.95,"sqft"
ig-08,"Drywall Repair",900.00,"1,000 sqft"
ig-09,"Wallpaper Removal",250.00,"room"
ig-10,"Interior Door — Hollow Slab",125.00,"ea."
ig-11,"Interior Door Hardware (Knob + Hinges + Labor)",25.00,"ea."
ig-12,"Bifold Door with Framing",400.00,"ea."
ig-13,"Interior Door — Pre-hung",200.00,"ea."
ig-14,"Front Entry Door",475.00,"ea."
ig-15,"Front Entry Door Hardware",80.00,"ea."
ig-16,"Exterior Door Hardware",75.00,"handle"
ig-17,"Exterior Insulated Side Door (Installed)",500.00,"ea."
ig-18,"Sliding Glass Door",1025.00,"ea."
ig-19,"Trim Out (Casing, Crown, Baseboard)",3.75,"LF"
ig-20,"MISC / Punch List",2650.00,"flat"
ig-21,"Finish Out Labor",1350.00,"flat"
ig-22,"Light Fixtures",70.00,"100 sqft"
ig-23,"Bedbug Spray / Heat Treat",475.00,"ea."
ig-24,"Termite Treatment",650.00,"ea."
ig-25,"Demo",1375.00,"variable"
ig-26,"Haul Off",725.00,"load"
ig-27,"Final Cleaning",325.00,"flat"
ig-28,"Staging",0.90,"sqft"
kt-01,"Hinges and Pulls",275.00,"kitchen"
kt-02,"Cabinets Uppers",125.00,"LF"
kt-03,"Cabinets Lowers",150.00,"LF"
kt-04,"Cabinet Door Faces Only",80.00,"door"
kt-05,"Cabinets (Labor & Paint)",1100.00,"kitchen"
kt-06,"Granite + 4"" Splash Guard",40.00,"LF"
kt-07,"Backsplash",725.00,"house"
kt-08,"Misc Woodwork",500.00,"variable"
kt-09,"Tile — Large Areas",6.45,"sqft"
kt-10,"Tile — Small Areas",10.00,"sqft"
kt-11,"Undermount Kitchen Sink",325.00,"ea."
kt-12,"Microwave / Hood",500.00,"ea."
kt-13,"Range",725.00,"ea."
kt-14,"Wall Oven",1075.00,"ea."
kt-15,"Cooktop",550.00,"ea."
kt-16,"Dishwasher",575.00,"ea."
kt-17,"Fridge",1175.00,"ea."
ba-01,"Granite ($/LF)",35.00,"LF"
ba-02,"New Bottom Vanity",125.00,"LF"
ba-03,"Home Depot Vanity w/ Sink (18"")",225.00,"ea."
ba-04,"Toilet",150.00,"ea."
ba-05,"Tile — Large Areas",5.80,"sqft"
ba-06,"Tile — Small Areas",10.00,"sqft"
ba-07,"Reglaze Tub or Chemical Clean",350.00,"ea."
ba-08,"Reglaze Tub + Surround",750.00,"ea."
ba-09,"Reglaze Shower",1325.00,"ea."
ba-10,"Tiled Shower Tear Out + Tile Install",3100.00,"ea."
ba-11,"Tub Tile Surround Tear Out + Tile Install (incl. tub)",2250.00,"ea."
ba-12,"Shower Plastic Insert Tear Out + New Insert",825.00,"ea."
ba-13,"Tub Tear Out + New Insert & Tub",1575.00,"ea."
ba-14,"Undermount Sink",150.00,"ea."
ba-15,"Mirror",200.00,"ea."
ba-16,"HVL (needed if no window)",275.00,"ea."
as-01,"Furnace",3350.00,"ea."
as-02,"Condensing Unit",3300.00,"ea."
as-03,"Package Unit",4700.00,"ea."
as-04,"A-Coil (if no condensing unit)",1625.00,"ea."
as-05,"Ducting (if NO HVAC)",3200.00,"ea."
as-06,"Duct Cleaning — Floor Vents",550.00,"ea."
as-07,"Window Unit Replacement 220",575.00,"ea."
as-08,"Hot Water Heater w/ Expansion Tank",1425.00,"ea."
as-09,"Hot Water Heater Expansion Tank Only",200.00,"ea."
as-10,"Switches / Outlets",1400.00,"house"
as-11,"Standard Electrical",1650.00,"house"
as-12,"Subfloor",8.20,"sqft"
as-13,"Framing",950.00,"variable"
as-14,"Structural (Pier)",375.00,"pier"
as-15,"Structural Foam Injection",5.85,"sqft of affected area"
as-16,"Roof",1100.00,"225 sqft L&M"
as-17,"Plumbing",1000.00,"variable"
as-18,"Electrical Panel Swap to 200A",2350.00,"ea."
as-19,"Full Electrical Rewire (to Studs)",5.65,"sqft"
as-20,"Full Electrical Rewire (leaving Drywall)",9.15,"sqft"
as-21,"Wall Insulation (to Studs)",1.20,"sqft"
as-22,"Attic Insulation",1225.00,"1,600 sqft house"
as-23,"New Drywall to Studs (L&M)",5.20,"sqft"
as-24,"Aluminum Wiring",2450.00,"variable"
ex-01,"Fence Repair — Chain Link / Wood Gate",225.00,"variable"
ex-02,"Fence Repair — Chain Link",275.00,"LF"
ex-03,"Fence Repair — Privacy 6ft",30.00,"LF"
ex-04,"Landscaping",450.00,"variable"
ex-05,"Vinyl Siding (10'x10')",300.00,"square"
ex-06,"Tuck Pointing",225.00,"variable"
ex-07,"Exterior Paint",2.60,"sqft"
ex-08,"Exterior Wood Repair",525.00,"variable"
ex-09,"Siding Repair (10'x10')",975.00,"section"
ex-10,"Tree Trimming",450.00,"variable"
ex-11,"Tree Removal (w/o stump)",1450.00,"tree"
ex-12,"Stump Grinding",250.00,"stump"
ex-13,"Aluminum Window Paint (Int/Ext)",700.00,"house"
ex-14,"Windows (3x5 sash)",425.00,"ea."
ex-15,"Window Repair — Non-Insulated (6x6+)",35.00,"sf"
ex-16,"Window Repair — Insulated (6x6+)",40.00,"sf"
ex-17,"Aluminum Framed Window Pane",100.00,"pane"
ex-18,"Guttering",4.15,"LF"
ex-19,"Concrete w/ Demo",200.00,"sqft"
ex-20,"Mowing (summer, every 2 weeks)",45.00,"mowing"
ex-21,"Garage Door — 1 Car",975.00,"ea."
ex-22,"Garage Door — 2 Car (Installed)",1225.00,"ea."
ex-23,"Garage Conversion",8850.00,"ea."`;

export function parseCSV(text) {
  const parseLine = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === ',' && !q) { out.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    out.push(cur.trim()); return out;
  };
  const lines = text.trim().split(/\r?\n/);
  const headers = parseLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const v = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), v[i] ?? '']));
  });
}

// Item ids that need a serial-number photo + year (used by OCR + export).
const SERIAL_ITEMS = new Set(['as-01', 'as-02', 'as-08']);

function buildItems() {
  const map = {};
  for (const r of parseCSV(CSV)) {
    map[r.id] = {
      id: r.id,
      name: r.name,
      cost: parseFloat(r.cost) || 0,
      unit: r.unit,
      serial: SERIAL_ITEMS.has(r.id),
    };
  }
  return map;
}
export const ITEMS = buildItems();

// 19 official groups + closet/lighting mapped to existing CSV items (no invented prices).
export const GROUP_DEFS = {
  flooring:   ['ig-01', 'ig-02', 'ig-03', 'ig-04', 'ig-05', 'ig-06'],
  paint:      ['ig-07', 'ig-08', 'ig-09'],
  doors:      ['ig-10', 'ig-11', 'ig-12', 'ig-13', 'ig-14', 'ig-15', 'ig-16', 'ig-17', 'ig-18'],
  pest:       ['ig-23', 'ig-24'],
  cabinets:   ['kt-01', 'kt-02', 'kt-03', 'kt-04', 'kt-05'],
  counters:   ['kt-06', 'kt-07', 'kt-08', 'kt-09', 'kt-10'],
  appliances: ['kt-11', 'kt-12', 'kt-13', 'kt-14', 'kt-15', 'kt-16', 'kt-17'],
  vanity:     ['ba-01', 'ba-02', 'ba-03', 'ba-14'],
  tub:        ['ba-07', 'ba-08', 'ba-09', 'ba-10', 'ba-11', 'ba-12', 'ba-13'],
  tile:       ['ba-05', 'ba-06'],
  hvac:       ['as-01', 'as-02', 'as-03', 'as-04', 'as-05', 'as-06', 'as-07'],
  electrical: ['as-10', 'as-11', 'as-18', 'as-19', 'as-20', 'as-24'],
  structural: ['as-12', 'as-13', 'as-14', 'as-15'],
  insulation: ['as-21', 'as-22', 'as-23'],
  fence:      ['ex-01', 'ex-02', 'ex-03'],
  siding:     ['ex-05', 'ex-09'],
  windows:    ['ex-13', 'ex-14', 'ex-15', 'ex-16', 'ex-17'],
  garage:     ['ex-21', 'ex-22', 'ex-23'],
  trees:      ['ex-10', 'ex-11', 'ex-12'],
  // Decoupled room groups — mapped to existing CSV items.
  closet:     ['ig-12', 'ig-11'],       // bifold door + door hardware
  lighting:   ['ig-22', 'as-10'],       // light fixtures + switches/outlets
};

export const GROUP_LABELS = {
  flooring:   'Flooring',
  paint:      'Paint & Wall Repair',
  doors:      'Doors',
  pest:       'Pest Control',
  cabinets:   'Cabinets',
  counters:   'Countertops & Tile',
  appliances: 'Appliances',
  vanity:     'Vanity & Countertop',
  tub:        'Tub & Shower',
  tile:       'Tile',
  hvac:       'HVAC',
  electrical: 'Electrical',
  structural: 'Structural',
  insulation: 'Insulation & Drywall',
  fence:      'Fence',
  siding:     'Siding',
  windows:    'Windows',
  garage:     'Garage',
  trees:      'Trees',
  closet:     'Closet',
  lighting:   'Lighting',
};

export const ROOM_TYPES = {
  interior: { label: 'Interior / General',    groups: ['flooring', 'paint', 'doors', 'pest'],                    singleton: true  },
  kitchen:  { label: 'Kitchen',               groups: ['cabinets', 'counters', 'appliances'],                    singleton: true  },
  bathroom: { label: 'Bathroom',              groups: ['vanity', 'tub', 'tile'],                                 singleton: false },
  systems:  { label: 'Systems & Structure',   groups: ['hvac', 'electrical', 'structural', 'insulation'],        singleton: true  },
  exterior: { label: 'Exterior',              groups: ['fence', 'siding', 'windows', 'garage', 'trees'],         singleton: true  },
  bedroom:  { label: 'Bedroom',               groups: ['flooring', 'paint', 'doors', 'closet'],                  singleton: false },
  living:   { label: 'Living / Common Area',  groups: ['flooring', 'paint', 'doors', 'lighting'],               singleton: false },
};
