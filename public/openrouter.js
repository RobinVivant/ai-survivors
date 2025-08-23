// openrouter.js
// Utility to fetch AI-generated game config from OpenRouter API.
// NOTE: For production, do NOT expose your API key client-side.
// Instead, proxy this request through your own backend.

// Option 1) Hard-code token (NOT recommended)
// export const OPENROUTER_API_KEY = "sk-PLACEHOLDER";

// Option 2) Read from browser localStorage for quick testing:
const OPENROUTER_API_KEY =
  localStorage.getItem("OPENROUTER_KEY") || "sk-PLACEHOLDER";

/**
 * Call OpenRouter chat/completions endpoint asking it to produce a JSON configuration
 * describing enemies, weapons, waves and a background color for our game.
 * Returns a safe fallback if the request fails or the model output is invalid.
 */
export async function getAIConfigFromOpenRouter() {
  const prompt = `
    You are a master game designer AI, specializing in creating balanced and engaging content for a cyberpunk-themed roguelike survivor game. Your task is to generate a complete game configuration in valid, minified JSON format.

    **THEME:**
    The game is set in a dystopian digital realm where a rogue AI has unleashed digital demons, glitches, and corrupted data entities. The player is a neural hacker fighting back with an arsenal of unique digital weapons. The aesthetic is dark, neon-drenched, and inspired by demoscene visuals and classic cyberpunk tropes (think Neuromancer, Ghost in the Shell, The Matrix).

    **JSON STRUCTURE:**
    Please adhere strictly to the following JSON structure. Do not add any extra text, comments, or markdown formatting outside of the single JSON object.

    \\\`\\\`\\\`json
    {
      "enemies": [],
      "weapons": [],
      "waves": [],
      "upgrades": [],
      "background": "#0a0420"
    }
    \\\`\\\`\\\`

    **CONTENT REQUIREMENTS:**

    1.  **\\\`enemies\\\`** (array of 8-12 objects):
        -   \\\`name\\\`: Creative, thematic name (e.g., "Data Leech", "Glitch Crawler", "Firewall Golem").
        -   \\\`color\\\`: A hex color code that fits the theme.
        -   \\\`speed\\\`: Float between 0.5 (slow) and 3.0 (fast).
        -   \\\`hp\\\`: Integer between 5 (fodder) and 150 (boss).
        -   \\\`size\\\`: Integer between 4 (tiny) and 20 (huge).
        -   \\\`damage\\\`: Integer, how much damage it deals on collision.
        -   \\\`points\\\`: Integer, score value for defeating it.
        -   \\\`behavior\\\`: Must be one of: "chase", "orbit", "zigzag", "sniper", "kamikaze".
         -   \\\`projectile\\\`: (Optional) Boolean. If true, the enemy shoots projectiles.\n         -   \\\`splittable\\\`: (Optional) Boolean. If true, the enemy will split into smaller versions on death.
         -   \\\`specialAbility\\\`: (Optional) Must be one of: "teleport" (blinks randomly), "shield" (has a temporary shield), "rage" (gets faster and stronger at low health).

    2.  **\\\`weapons\\\`** (array of 8-12 objects):
        -   \\\`name\\\`: Creative, thematic name (e.g., "Neural Pulse", "Data Shredder", "Quantum Beam").
        -   \\\`dmg\\\`: Integer, base damage.
        -   \\\`fireRate\\\`: Float, attacks per second.
        -   \\\`bulletSpeed\\\`: Float, speed of the projectile.
        -   \\\`bulletSize\\\`: Integer, pixel size of the projectile.
        -   \\\`bulletColor\\\`: A hex color code.
        -   \\\`price\\\`: Integer, cost in the upgrade shop. First weapon should be 0.
        -   \\\`description\\\`: Brief, cool-sounding description.
        -   Special properties (optional booleans/floats/integers):
            -   \\\`piercing\\\`: Integer, how many enemies the bullet can pass through.
            -   \\\`homing\\\`: Float, strength of homing effect (e.g., 0.1).
            -   \\\`explosive\\\`: Integer, radius of explosion on impact.
            -   \\\`chain\\\`: Integer, number of times lightning can chain to a new target.
            -   \\\`splitShot\\\`: Integer, number of extra projectiles to fire.
            -   \\\`poison\\\`: Integer, duration of poison effect in milliseconds.
            -   \\\`freeze\\\`: Integer, duration of freeze effect in milliseconds.
            -   \\\`bounces\\\`: Integer, number of times projectile can bounce off screen edges.

    3.  **\\\`waves\\\`** (array of 12-20 arrays of strings):
        -   Each inner array represents one wave.
        -   Each string is the \\\`name\\\` of an enemy to spawn in that wave.
        -   Create a progression: start easy, introduce new enemies gradually, mix them up, and create challenging combinations. End with a boss wave.

    4.  **\\\`upgrades\\\`** (array of 15-25 objects):
        -   \\\`name\\\`: Descriptive name (e.g., "Neural Overclock", "Quantum Shield", "Purchase: Data Shredder").
        -   \\\`description\\\`: What the upgrade does.
        -   \\\`rarity\\\`: Must be one of: "common", "rare", "epic", "legendary".
        -   \\\`effect\\\`: An object describing the upgrade's effect:
            -   \\\`type\\\`: Must be one of: "speed" (player speed), "maxhealth", "damage" (global), "firerate" (global), "bulletspeed" (global), "piercing" (global), "homing" (global), "explosive" (global), "health" (instant heal), "weapon" (grants a new weapon).
            -   \\\`value\\\`: The numerical value of the effect (e.g., 0.5 for speed, 10 for maxhealth, "Data Shredder" for a weapon).

    5.  **\\\`background\\\`**:
        -   A single, dark, cyberpunk-themed hex color code for the game's background (e.g., "#0a0420", "#100828", "#00001a").

    **FINAL INSTRUCTIONS:**
    -   Generate a diverse and balanced set of enemies, weapons, and waves.
    -   Ensure the content is creative and fits the cyberpunk theme.
    -   The final output must be ONLY the minified JSON object, with no surrounding text or formatting.
    `;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a creative cyberpunk game design AI specializing in roguelike mechanics.",
          },
          {role: "user", content: prompt},
        ],
        temperature: 1.2,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let raw = data?.choices?.[0]?.message?.content || "{}";
    // Clean potential markdown fences
    raw = raw.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/m, "");
    }
    // Extract JSON between first '{' and last '}' in case chat added text
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first !== -1 && last !== -1) {
      raw = raw.slice(first, last + 1);
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("OpenRouter fetch failed:", err);
    // Enhanced fallback config with cyberpunk theme
    return {
      enemies: [
        {
          name: "DataMite",
          color: "#00ff00",
          speed: 1.5,
          hp: 10,
          size: 6,
          damage: 1,
          points: 5,
          behavior: "chase",
        },
        {
          name: "VirusSwarm",
          color: "#ff00ff",
          speed: 2,
          hp: 5,
          size: 4,
          damage: 1,
          points: 3,
          behavior: "zigzag",
        },
        {
          name: "NeuralHacker",
          color: "#00ffff",
          speed: 1,
          hp: 20,
          size: 10,
          damage: 2,
          points: 10,
          behavior: "orbit",
          projectile: true,
        },
        {
          name: "QuantumGlitch",
          color: "#ffff00",
          speed: 3,
          hp: 15,
          size: 8,
          damage: 2,
          points: 8,
          behavior: "teleport",
          specialAbility: "teleport",
        },
        {
          name: "CyberWraith",
          color: "#ff6600",
          speed: 1.2,
          hp: 30,
          size: 12,
          damage: 3,
          points: 15,
          behavior: "chase",
          specialAbility: "shield",
        },
        {
          name: "MatrixSentinel",
          color: "#ff0066",
          speed: 0.8,
          hp: 50,
          size: 16,
          damage: 4,
          points: 25,
          behavior: "sniper",
          projectile: true,
        },
        {
          name: "DataDemon",
          color: "#9900ff",
          speed: 2.5,
          hp: 25,
          size: 10,
          damage: 3,
          points: 20,
          behavior: "kamikaze",
          specialAbility: "rage",
        },
        {
          name: "AIOverlord",
          color: "#ff0000",
          speed: 1,
          hp: 100,
          size: 20,
          damage: 5,
          points: 50,
          behavior: "orbit",
          specialAbility: "split",
          projectile: true,
        },
      ],
      weapons: [
        {
          name: "NeuralPulse",
          dmg: 5,
          fireRate: 2,
          bulletSpeed: 6,
          bulletSize: 3,
          bulletColor: "#00ffff",
          price: 0,
          description: "Basic neural disruptor",
        },
        {
          name: "DataShredder",
          dmg: 3,
          fireRate: 5,
          bulletSpeed: 8,
          bulletSize: 2,
          bulletColor: "#00ff00",
          piercing: 1,
          price: 100,
          description: "High-speed data fragmenter",
        },
        {
          name: "QuantumBeam",
          dmg: 10,
          fireRate: 1,
          bulletSpeed: 10,
          bulletSize: 5,
          bulletColor: "#ff00ff",
          piercing: 3,
          price: 200,
          description: "Piercing quantum energy",
        },
        {
          name: "VirusLauncher",
          dmg: 4,
          fireRate: 1.5,
          bulletSpeed: 4,
          bulletSize: 4,
          bulletColor: "#ffff00",
          poison: 2000,
          price: 150,
          description: "Inflicts digital poison",
        },
        {
          name: "PlasmaCore",
          dmg: 8,
          fireRate: 2,
          bulletSpeed: 5,
          bulletSize: 6,
          bulletColor: "#ff6600",
          explosive: 30,
          price: 250,
          description: "Explosive plasma rounds",
        },
        {
          name: "CyberSeeker",
          dmg: 6,
          fireRate: 1.8,
          bulletSpeed: 5,
          bulletSize: 3,
          bulletColor: "#00ff99",
          homing: 0.1,
          price: 300,
          description: "Self-guided projectiles",
        },
        {
          name: "ChainLightning",
          dmg: 5,
          fireRate: 1.2,
          bulletSpeed: 12,
          bulletSize: 2,
          bulletColor: "#6666ff",
          chain: 3,
          price: 350,
          description: "Jumps between targets",
        },
        {
          name: "MatrixSplitter",
          dmg: 4,
          fireRate: 2.5,
          bulletSpeed: 6,
          bulletSize: 3,
          bulletColor: "#ff0066",
          splitShot: 3,
          price: 280,
          description: "Splits into multiple shots",
        },
        {
          name: "CryoFreeze",
          dmg: 3,
          fireRate: 1.5,
          bulletSpeed: 5,
          bulletSize: 4,
          bulletColor: "#66ccff",
          freeze: 1500,
          price: 200,
          description: "Slows enemy processes",
        },
        {
          name: "QuantumBouncer",
          dmg: 7,
          fireRate: 1.8,
          bulletSpeed: 7,
          bulletSize: 3,
          bulletColor: "#ff99cc",
          bounces: 3,
          price: 320,
          description: "Ricochets off screen edges",
        },
      ],
      waves: [
        ["DataMite", "DataMite", "DataMite"],
        ["DataMite", "DataMite", "VirusSwarm", "VirusSwarm"],
        ["VirusSwarm", "VirusSwarm", "VirusSwarm", "NeuralHacker"],
        ["DataMite", "DataMite", "NeuralHacker", "NeuralHacker"],
        ["QuantumGlitch", "VirusSwarm", "VirusSwarm", "DataMite", "DataMite"],
        ["NeuralHacker", "NeuralHacker", "QuantumGlitch", "QuantumGlitch"],
        ["CyberWraith", "DataMite", "DataMite", "VirusSwarm", "VirusSwarm"],
        ["MatrixSentinel", "NeuralHacker", "NeuralHacker", "DataMite"],
        ["DataDemon", "DataDemon", "QuantumGlitch", "CyberWraith"],
        ["CyberWraith", "CyberWraith", "MatrixSentinel", "DataDemon"],
        ["AIOverlord"],
        ["AIOverlord", "MatrixSentinel", "MatrixSentinel"],
        ["AIOverlord", "DataDemon", "DataDemon", "CyberWraith", "CyberWraith"],
      ],
      upgrades: [
        {
          name: "Neural Overclock",
          effect: {type: "speed", value: 0.5},
          description: "Boost movement speed",
          rarity: "common",
        },
        {
          name: "Quantum Shield",
          effect: {type: "maxhealth", value: 10},
          description: "Increase max health",
          rarity: "common",
        },
        {
          name: "Data Surge",
          effect: {type: "damage", value: 1},
          description: "All weapons +1 damage",
          rarity: "common",
        },
        {
          name: "Rapid Fire Protocol",
          effect: {type: "firerate", value: 0.3},
          description: "Increase fire rate",
          rarity: "common",
        },
        {
          name: "Velocity Matrix",
          effect: {type: "bulletspeed", value: 1},
          description: "Faster projectiles",
          rarity: "common",
        },
        {
          name: "Purchase: DataShredder",
          effect: {type: "weapon", value: "DataShredder"},
          description: "High-speed data fragmenter",
          rarity: "rare",
        },
        {
          name: "Purchase: QuantumBeam",
          effect: {type: "weapon", value: "QuantumBeam"},
          description: "Piercing quantum energy",
          rarity: "rare",
        },
        {
          name: "Purchase: VirusLauncher",
          effect: {type: "weapon", value: "VirusLauncher"},
          description: "Inflicts digital poison",
          rarity: "rare",
        },
        {
          name: "Purchase: PlasmaCore",
          effect: {type: "weapon", value: "PlasmaCore"},
          description: "Explosive plasma rounds",
          rarity: "epic",
        },
        {
          name: "Purchase: CyberSeeker",
          effect: {type: "weapon", value: "CyberSeeker"},
          description: "Self-guided projectiles",
          rarity: "epic",
        },
        {
          name: "Purchase: ChainLightning",
          effect: {type: "weapon", value: "ChainLightning"},
          description: "Jumps between targets",
          rarity: "epic",
        },
        {
          name: "Purchase: MatrixSplitter",
          effect: {type: "weapon", value: "MatrixSplitter"},
          description: "Splits into multiple shots",
          rarity: "epic",
        },
        {
          name: "Purchase: CryoFreeze",
          effect: {type: "weapon", value: "CryoFreeze"},
          description: "Slows enemy processes",
          rarity: "rare",
        },
        {
          name: "Purchase: QuantumBouncer",
          effect: {type: "weapon", value: "QuantumBouncer"},
          description: "Ricochets off edges",
          rarity: "epic",
        },
        {
          name: "Piercing Matrix",
          effect: {type: "piercing", value: 1},
          description: "Bullets pierce +1 enemy",
          rarity: "rare",
        },
        {
          name: "Homing Algorithm",
          effect: {type: "homing", value: 0.05},
          description: "Slight bullet homing",
          rarity: "epic",
        },
        {
          name: "Explosive Rounds",
          effect: {type: "explosive", value: 20},
          description: "Add explosion damage",
          rarity: "epic",
        },
        {
          name: "Quantum Regeneration",
          effect: {type: "health", value: 20},
          description: "Instant health restore",
          rarity: "rare",
        },
        {
          name: "Overcharge Protocol",
          effect: {type: "damage", value: 3},
          description: "All weapons +3 damage",
          rarity: "legendary",
        },
        {
          name: "Time Dilation",
          effect: {type: "firerate", value: 1},
          description: "Major fire rate boost",
          rarity: "legendary",
        },
      ],
      background: "#0a0420",
    };
  }
}