// This version is browser-compatible and exposes calculateMachinesSummary for use in HTML

// Example data loading (replace with your actual data source)
const data = window.BYFT_DATA || []; // Expect BYFT_DATA to be loaded globally for browser

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
function calculateMachinesSummary(name, quantity = 1, targetTime = 15) {
  // Reset maps for each call
  const machineMap = {};
  const usageMap = {};
  let totalTiles = 0;

  // Recursive calculation
  function calculateMachines(name, quantity, targetTime, parentProduct = null, parentMachine = null) {
    const item = lookup[name];
    if (!item) return;
    const timePerItem = item.Time;
    const machineType = item.Source;

    // How many of this item do we need per targetTime?
    const machinesNeeded = (quantity * timePerItem) / targetTime;

    // Initialize machine list for this type
    if (!machineMap[machineType]) machineMap[machineType] = {};

    // Track machines producing this specific item
    machineMap[machineType][name] = (machineMap[machineType][name] || 0) + machinesNeeded;

    // Track usage for output
    if (!usageMap[machineType]) usageMap[machineType] = {};
    if (!usageMap[machineType][name]) usageMap[machineType][name] = [];
    if (parentProduct && parentMachine) {
      usageMap[machineType][name].push({ parentProduct, parentMachine });
    }

    // For each ingredient, always pass the original targetTime and track parent
    for (const part in item.Parts) {
      const partQty = item.Parts[part];
      calculateMachines(part, partQty * quantity, targetTime, name, machineType);
    }
  }

  calculateMachines(name, quantity, targetTime);

  let output = "Machines and their settings:\n\n";

  for (const machineType of machineOrder) {
    if (machineMap[machineType]) {
      output += `== ${machineType} ==\n`;
      for (const product in machineMap[machineType]) {
        const count = Math.ceil(machineMap[machineType][product]);
        const tiles = (machineTileSizes[machineType] || 0) * count;
        totalTiles += tiles;

        // Build usage string
        let usageStr = "";
        if (usageMap[machineType] && usageMap[machineType][product] && usageMap[machineType][product].length > 0) {
          // Show all unique usages
          const usages = usageMap[machineType][product]
            .map(u => `into ${u.parentMachine} making ${u.parentProduct}`)
            .filter((v, i, a) => a.indexOf(v) === i) // unique
            .join(", ");
          usageStr = ` ${usages}`;
        }

        output += `- ${count} set to produce "${product}"${usageStr ? " " + usageStr : ""}\n`;
      }
      output += "\n";
    }
  }

  // Print any remaining machine types not in the order
  for (const machineType in machineMap) {
    if (!machineOrder.includes(machineType)) {
      output += `== ${machineType} ==\n`;
      for (const product in machineMap[machineType]) {
        const count = Math.ceil(machineMap[machineType][product]);
        const tiles = (machineTileSizes[machineType] || 0) * count;
        totalTiles += tiles;

        let usageStr = "";
        if (usageMap[machineType] && usageMap[machineType][product] && usageMap[machineType][product].length > 0) {
          const usages = usageMap[machineType][product]
            .map(u => `into ${u.parentMachine} making ${u.parentProduct}`)
            .filter((v, i, a) => a.indexOf(v) === i)
            .join(", ");
          usageStr = ` ${usages}`;
        }

        output += `- ${count} set to produce "${product}"${usageStr ? " " + usageStr : ""}\n`;
      }
      output += "\n";
    }
  }

  output += `Total machine space used: ${totalTiles} tiles.\n`;

  const minConveyor = Math.ceil(totalTiles * 1.15);
  const maxConveyor = Math.ceil(totalTiles * 1.30);

  output += `With conveyors adding 15-30%: ${minConveyor}-${maxConveyor} tiles`;

  return output;
}

// Expose for HTML usage
window.initBYFTData = initBYFTData;
window.calculateMachinesSummary = calculateMachinesSummary;