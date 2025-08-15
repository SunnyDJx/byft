// Machine base prices
const machineBasePrices = {
  "Miner": 500,
  "Oil Rig": 500,
  "Smelter": 1000,
  "Blast Furnace": 2000,
  "Shaper": 3000,
  "Oil Refinery": 1200,
  "Constructor I": 7000,
  "Constructor II": 16000,
  "Assembler I": 50000,
  "Assembler II": 125000,
  "Assembler III": 300000,
  "Assembler IV": 800000,
  "Vehicle Maker I": 250000,
  "Vehicle Maker II": 500000,
  "Vehicle Maker III": 1000000,
  "Vehicle Maker IV": 2000000
};

const data = window.BYFT_DATA || [];

// Lookup table
let lookup = {};
data.forEach(item => {
  lookup[item.Name] = item;
});

// Define the desired machine order
let machineOrder = [
  "Miner",
  "Oil Rig",
  "Smelter",
  "Oil Refinery",
  "Shaper",
  "Blast Furnace",
  "Constructor I",
  "Constructor II",
  "Assembler I",
  "Assembler II",
  "Assembler III",
  "Assembler IV",
  "Vehicle Maker I",
  "Vehicle Maker II",
  "Vehicle Maker III",
  "Vehicle Maker IV"
];

// Map machine types to their tile sizes
let machineTileSizes = {
  "Miner": 6,
  "Oil Rig": 6,
  "Smelter": 6,
  "Shaper": 6,
  "Blast Furnace": 9,
  "Oil Refinery": 9,
  "Constructor I": 12,
  "Constructor II": 12,
  "Assembler I": 15,
  "Assembler II": 15,
  "Assembler III": 15,
  "Assembler IV": 15,
  "Vehicle Maker I": 15,
  "Vehicle Maker II": 15,
  "Vehicle Maker III": 15,
  "Vehicle Maker IV": 15
};

// Initialize BYFT data
function initBYFTData(data) {
  lookup = {};
  data.forEach(item => {
    lookup[item.Name] = item;
  });
}

// Main function to call from HTML
function calculateMachinesSummary(name, quantity = 1, targetTime = 15, level = 1, enablePackager = false, enableLoadingDock = false) {
  // Reset maps for each call
  const machineMap = {};
  const usageMap = {};
  let totalTiles = 0;
  let packagerTiles = 0;
  let loadingDockTiles = 0;
  let packagerPrice = 0;
  let loadingDockPrice = 0;
  let packagerMultiplier = 1;

  // Recursive calculation
  function calculateMachines(name, quantity, targetTime, parentProduct = null, parentMachine = null) {
    const item = lookup[name];
    if (!item) return;
    const timePerItem = item.Time;
    const machineType = item.Source;

    // Adjust production speed by level
    const effectiveTimePerItem = timePerItem / level;

    // How many of this item do we need per targetTime?
    const machinesNeeded = (quantity * effectiveTimePerItem) / targetTime;

    // Initialize machine list for this type
    if (!machineMap[machineType]) machineMap[machineType] = [];

    // Always push a new split entry, never combine
    let key = name;
    if (parentProduct && parentMachine) {
      key = name + ' (for ' + parentProduct + ' in a ' + parentMachine + ')';
    }
    machineMap[machineType].push({ key, machinesNeeded });

    // Track usage for output (optional, not used in display)
    if (!usageMap[machineType]) usageMap[machineType] = [];
    if (parentProduct && parentMachine) {
      usageMap[machineType].push({ key, parentProduct, parentMachine });
    }

    // For each ingredient, always pass the original targetTime and track parent
    for (const part in item.Parts) {
      const partQty = item.Parts[part];
      calculateMachines(part, partQty * quantity, targetTime, name, machineType);
    }
  }

  calculateMachines(name, quantity, targetTime);

  let output = "Machines and their settings:\n\n";

  let totalFarmPrice = 0;

  // Level price multipliers
  const levelPriceMultipliers = [1, 3, 6, 10, 15];
  let priceMultiplier = 1;
  if (typeof level === 'number' && !isNaN(level) && level >= 1 && level <= 5) {
    priceMultiplier = levelPriceMultipliers[level - 1];
  }

  // Packager and Loading Dock price tables (by level)
  const packagerBasePrices = [100000, 300000, 600000, 1000000, 1500000];
  const loadingDockBasePrices = [50000, 150000, 300000, 500000, 750000];

  // Sort machine types by the defined order
  for (const machineType of machineOrder) {
    if (machineMap[machineType]) {
      output += `== ${machineType} ==\n`;
      // Combine by key after rounding up each split
      const combined = {};
      for (const entry of machineMap[machineType]) {
        const count = Math.ceil(entry.machinesNeeded);
        if (!combined[entry.key]) combined[entry.key] = 0;
        combined[entry.key] += count;
      }
      // Sort keys by the product being created (before ' (to ...')
      const sortedKeys = Object.keys(combined).sort((a, b) => {
        const prodA = a.split(' (to ')[0];
        const prodB = b.split(' (to ')[0];
        return prodA.localeCompare(prodB);
      });
      for (const key of sortedKeys) {
        const count = combined[key];
        const tiles = (machineTileSizes[machineType] || 0) * count;
        totalTiles += tiles;
        output += `- ${count} set to produce \"${key}\"\n`;
        // Add to farm price only if count is a valid number and machineType is in base prices
        if (machineBasePrices[machineType]) {
          totalFarmPrice += count * machineBasePrices[machineType] * priceMultiplier;
        }
      }
      output += "\n";
    }
  }

  if (enablePackager) {
    packagerTiles = 9;
    packagerPrice = packagerBasePrices[level - 1] || 0;
    totalTiles += packagerTiles;
    totalFarmPrice += packagerPrice;
    packagerMultiplier = 1.35;
  }
  if (enableLoadingDock) {
    loadingDockTiles = 9;
    loadingDockPrice = loadingDockBasePrices[level - 1] || 0;
    totalTiles += loadingDockTiles;
    totalFarmPrice += loadingDockPrice;
  }

  output += `Total machine space: ${totalTiles} tiles.\n`;
  output += `Total machine price: $${totalFarmPrice.toLocaleString()}\n`;

  const minConveyor = Math.ceil(totalTiles * 1.15);
  const maxConveyor = Math.ceil(totalTiles * 1.40);

  output += `\nWith conveyors adding 15-40%: ${minConveyor}-${maxConveyor} Tiles. ${(minConveyor / 16).toFixed(2)}-${(maxConveyor / 16).toFixed(2)} Game Squares.`;
  if (window.BYFT_ADVANCED_MODE) {
    output += `\nSquared Farm with conveyors: ${Math.ceil(Math.sqrt(minConveyor))}² - ${Math.ceil(Math.sqrt(maxConveyor))}² Tiles. ${Math.ceil(Math.sqrt(minConveyor / 4))}² - ${Math.ceil(Math.sqrt(maxConveyor / 4))}² Game Squares.`;
    output += `\n50x Farm with conveyors: ${Math.ceil(minConveyor / 50)}x50 - ${Math.ceil(maxConveyor / 50)}x50 Tiles\n`;

    const finalProduct = lookup[name];
    let cashPerSecond = finalProduct ? finalProduct.Value / targetTime : 0;
    cashPerSecond = cashPerSecond * quantity * packagerMultiplier;
    output += `\nCash per second for ${name} Level ${level}: $${cashPerSecond.toFixed(2)}\n`;
    output += `F2P Plot amount: ${Math.floor(6000 / maxConveyor)} - ${Math.floor(6000 / minConveyor)} / P2W Plot amount: ${Math.floor(10000 / maxConveyor)} - ${Math.floor(10000 / minConveyor)}\n`;
    output += `F2P Cash per second: $${(cashPerSecond * (Math.floor(6000 / maxConveyor))).toLocaleString()} - $${(cashPerSecond * (Math.floor(6000 / minConveyor))).toLocaleString()}\n`;
    output += `P2W Cash per second: $${(cashPerSecond * (Math.floor(10000 / maxConveyor))).toLocaleString()} - $${(cashPerSecond * (Math.floor(10000 / minConveyor))).toLocaleString()}\n`;
  }

  return output;
}

// Expose for HTML usage
window.initBYFTData = initBYFTData;
window.calculateMachinesSummary = calculateMachinesSummary;

// Build graph data (nodes/links) for a product
function buildMachineGraph(name, quantity = 1, targetTime = 15, level = 1) {
  const nodes = [];
  const links = [];
  const nodeMap = {};

  // Helper to generate a unique node id for split sources
  function getSplitNodeId(machineType, product, parentId) {
    return machineType + ':' + product + (parentId ? ':to:' + parentId : '');
  }

  function addNode(machineType, product, parentId = null, count = null) {
    const nodeId = getSplitNodeId(machineType, product, parentId);
    if (!nodeMap[nodeId]) {
      const item = lookup[product];
      nodeMap[nodeId] = {
        id: nodeId,
        machine: machineType,
        product: product,
        parts: item ? item.Parts : {},
        parent: parentId,
        count: count
      };
      nodes.push(nodeMap[nodeId]);
    }
    if (parentId) {
      links.push({ source: nodeId, target: parentId });
    }
    return nodeId;
  }

  // Recursive traversal, splitting sources by destination
  function traverse(product, parentId = null, quantity = 1, targetTime = 15, level = 1) {
    const item = lookup[product];
    if (!item) return;
    const machineType = item.Source;
    // Adjust production speed by level
    const effectiveTimePerItem = item.Time / level;
    // Calculate machines needed for this connection
    const machinesNeeded = (quantity * effectiveTimePerItem) / targetTime;
    const nodeId = addNode(machineType, product, parentId, Math.ceil(machinesNeeded)); // set split count for this node
    // For each ingredient, always pass the RAW quantity (to match summary logic)
    for (const part in item.Parts) {
      const partQty = item.Parts[part];
      traverse(part, nodeId, partQty * quantity, targetTime, level);
    }
  }

  traverse(name, null, quantity, targetTime, level);
  return { nodes, links };
}
// Cytoscape.js visualization for machine graph
function generateMachineGraphCytoscape(productName, container) {
  // Get input values from the form if available
  let quantity = 1, targetTime = 15, level = 1;
  if (document.getElementById('quantity')) quantity = parseFloat(document.getElementById('quantity').value);
  if (document.getElementById('targetTime')) targetTime = parseFloat(document.getElementById('targetTime').value);
  if (document.getElementById('level')) level = parseInt(document.getElementById('level').value);
  // Build graph data with correct machine counts
  const graphData = buildMachineGraph(productName, quantity, targetTime, level);
  container.innerHTML = '';
  if (!graphData.nodes.length) {
    container.textContent = 'No graph data available.';
    return;
  }

  // Get actual machine counts from summary logic
  const machineMap = {};
  // Recalculate machine counts for the selected product
  (function calculateMachines(name, quantity = 1, targetTime = 15) {
    const item = lookup[name];
    if (!item) return;
    const timePerItem = item.Time;
    const machineType = item.Source;
    const machinesNeeded = (quantity * timePerItem) / targetTime;
    if (!machineMap[machineType]) machineMap[machineType] = {}; // Initialize machine type if not already done
    machineMap[machineType][name] = (machineMap[machineType][name] || 0) + machinesNeeded; // Track machines producing this specific item
    for (const part in item.Parts) {
      const partQty = item.Parts[part];
      calculateMachines(part, partQty * quantity, targetTime);
    }
  })(productName);

  // Prepare Cytoscape elements
  const elements = [];
  graphData.nodes.forEach(n => {
    const machineType = n.machine;
    const product = n.product;
    const count = n.count || 1;
    let label = `${count}x ${machineType}\n${product}`;
    elements.push({
      data: {
        id: n.id,
        label: label
      }
    });
  });

  // Add edges without labels
  graphData.links.forEach(l => {
    elements.push({
      data: {
        id: l.source + '_' + l.target,
        source: l.source,
        target: l.target
      }
    });
  });

  // Final product node id (root)
  const rootId = graphData.nodes.length ? graphData.nodes[0].id : null;

  // Create Cytoscape instance with dagre layout for web-like spacing
  const cy = window.cytoscape({
    container: container,
    elements: elements,
    style: [
      {
        selector: 'node',
        style: {
          'background-color': '#4e8cff',
          'label': 'data(label)',
          'color': '#fff',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-size': '16px',
          'font-weight': 'bold',
          'width': 140,
          'height': 70,
          'padding': '4px',
          'shape': 'rectangle',
          'text-wrap': 'wrap',
          'text-max-width': 180
        }
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#aaa',
          'target-arrow-color': '#aaa',
          'target-arrow-shape': 'triangle',
          'curve-style': 'straight', // sharp bends
          'label': 'data(label)',
          'color': '#222',
          'font-size': '14px',
          'text-background-opacity': 1,
          'text-background-color': '#fff',
          'text-background-shape': 'roundrectangle',
          'text-margin-y': -8,
          'z-index': 9999,
          'opacity': 1 // always fully visible
        }
      }
    ],
    layout: {
      name: 'dagre',
      rankDir: 'BT', // Bottom to Top (final product at top)
      nodeSep: 2,   // More space between nodes
      edgeSep: 10,   // More space between edges
      rankSep: 50,   // More space between levels
      roots: rootId ? [rootId] : undefined,
      animate: true
    },
    userZoomingEnabled: true,
    userPanningEnabled: true,
    boxSelectionEnabled: false,
    autoungrabify: true, // disables node dragging
    wheelSensitivity: 2.5, // increase mouse wheel zoom speed (default is 1)
    zoomFactor: 1.2 // increase zoom step for double-click/touchpad (default is 0.05)
  });

  // Zoom in on the graph after layout
  cy.ready(function () {
    cy.fit(undefined, 30); // fit to graph with less padding (more zoomed in)
    cy.zoom(cy.zoom() * 1.5); // zoom in further
  });
}

window.generateMachineGraphCytoscape = generateMachineGraphCytoscape;

window.generateMachineGraph = generateMachineGraph;

