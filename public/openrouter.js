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
        -   Spawn count targets to slow level-ups: Early waves 16–22 total enemies; Mid 24–36; Late 36–45. Boss waves: 1 boss plus 20–30 additional enemies. Avoid more than 45 enemies in any non-boss wave.

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
        temperature: 0.9,
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
        { name: "DataMite", color: "#8aff00", speed: 1.8, hp: 8,  size: 6,  damage: 1, points: 4,  behavior: "chase" },
        { name: "VirusSwarm", color: "#ff00e1", speed: 2.2, hp: 7,  size: 5,  damage: 1, points: 4,  behavior: "zigzag" },
        { name: "GlitchCrawler", color: "#00fff2", speed: 1.6, hp: 14, size: 8,  damage: 2, points: 8,  behavior: "zigzag" },
        { name: "FirewallGolem", color: "#ffa200", speed: 0.9, hp: 35, size: 14, damage: 3, points: 18, behavior: "chase", specialAbility: "shield" },
        { name: "NeuralHacker", color: "#00d4ff", speed: 1.1, hp: 22, size: 10, damage: 2, points: 12, behavior: "orbit", projectile: true },
        { name: "QuantumWraith", color: "#a466ff", speed: 2.7, hp: 18, size: 9,  damage: 2, points: 14, behavior: "chase", specialAbility: "teleport" },
        { name: "SentinelSniper", color: "#ff4070", speed: 1.2, hp: 40, size: 12, damage: 3, points: 20, behavior: "sniper", projectile: true },
        { name: "OverclockedBrute", color: "#ff2a2a", speed: 1.3, hp: 55, size: 15, damage: 4, points: 28, behavior: "chase", specialAbility: "rage" },
        { name: "FractalSwarm", color: "#66ff99", speed: 1.7, hp: 16, size: 9,  damage: 2, points: 10, behavior: "orbit", splittable: true },
        { name: "GhostKernel", color: "#66ccff", speed: 2.4, hp: 24, size: 10, damage: 3, points: 18, behavior: "kamikaze" },
        { name: "AIOverlord", color: "#ff2222", speed: 1.0, hp: 120,size: 20, damage: 6, points: 60, behavior: "orbit", projectile: true, specialAbility: "split" },
        { name: "KernelTyrant", color: "#ff5599", speed: 1.1, hp: 180,size: 22, damage: 8, points: 80, behavior: "orbit", projectile: true, specialAbility: "shield" }
      ],
      weapons: [
        { name: "Machine Gun",   dmg: 5, fireRate: 7,  bulletSpeed: 9, bulletSize: 2, bulletColor: "#00ffff", price: 0,   description: "High RPM all-rounder", spread: 0.08 },
        { name: "Shotgun",       dmg: 3, fireRate: 1.3,bulletSpeed: 7, bulletSize: 3, bulletColor: "#ffcc66", price: 120, description: "Close-range burst", splitShot: 6, spread: 0.25, range: 1 },
        { name: "Rocket Launcher", dmg: 12, fireRate: 1.1, bulletSpeed: 4.5, bulletSize: 5, bulletColor: "#ffaa33", price: 220, description: "Explosive payload", explosive: 50 },
        { name: "Railgun",       dmg: 9, fireRate: 1.8,bulletSpeed: 13, bulletSize: 3, bulletColor: "#b3e5ff", price: 250, description: "Sharp piercing beam", piercing: 4 },
        { name: "ChainLightning",dmg: 5, fireRate: 1.6,bulletSpeed: 12, bulletSize: 2, bulletColor: "#7f7fff", price: 260, description: "Arcs between targets", chain: 4 },
        { name: "Cryo Ray",      dmg: 4, fireRate: 2.0,bulletSpeed: 8, bulletSize: 3, bulletColor: "#66ccff", price: 180, description: "Freezes systems", freeze: 1600 },
        { name: "Plasma Repeater", dmg: 6, fireRate: 3.5, bulletSpeed: 8, bulletSize: 3, bulletColor: "#ff66aa", price: 200, description: "Fast, relentless fire", piercing: 1, spread: 0.06 },
        { name: "Homing Missiles", dmg: 6, fireRate: 1.9, bulletSpeed: 6, bulletSize: 3, bulletColor: "#00ff99", price: 280, description: "Seeks targets", homing: 0.12, explosive: 28 },
        { name: "Quantum Bouncer", dmg: 7, fireRate: 2.2, bulletSpeed: 8, bulletSize: 3, bulletColor: "#ff99cc", price: 240, description: "Ricocheting rounds", bounces: 3 },
        { name: "Laser Storm",   dmg: 3, fireRate: 6.5,bulletSpeed: 10, bulletSize: 2, bulletColor: "#ffff66", price: 230, description: "Shredding light", splitShot: 2, spread: 0.12 }
      ],
      waves: [
        // Early game: 16–22 spawns
        Array(16).fill("DataMite"),
        [...Array(12).fill("DataMite"), ...Array(6).fill("VirusSwarm")],
        [...Array(10).fill("VirusSwarm"), ...Array(6).fill("GlitchCrawler"), ...Array(4).fill("DataMite")],
        [...Array(12).fill("VirusSwarm"), ...Array(4).fill("NeuralHacker")],
        [...Array(10).fill("DataMite"), ...Array(8).fill("QuantumWraith"), ...Array(4).fill("GlitchCrawler")],
        // Mid game: 24–36 spawns
        [...Array(16).fill("VirusSwarm"), ...Array(6).fill("FirewallGolem"), ...Array(6).fill("NeuralHacker")],
        [...Array(14).fill("QuantumWraith"), ...Array(10).fill("VirusSwarm"), ...Array(6).fill("FractalSwarm")],
        [...Array(12).fill("FirewallGolem"), ...Array(10).fill("GlitchCrawler"), ...Array(8).fill("NeuralHacker"), ...Array(6).fill("GhostKernel")],
        [...Array(12).fill("FractalSwarm"), ...Array(10).fill("VirusSwarm"), ...Array(8).fill("QuantumWraith"), ...Array(6).fill("SentinelSniper")],
        // Late: 36–45 spawns
        [...Array(14).fill("FractalSwarm"), ...Array(12).fill("QuantumWraith"), ...Array(8).fill("GhostKernel"), ...Array(4).fill("OverclockedBrute")],
        [...Array(16).fill("VirusSwarm"), ...Array(10).fill("GlitchCrawler"), ...Array(8).fill("SentinelSniper"), ...Array(6).fill("FirewallGolem")],
        [...Array(16).fill("QuantumWraith"), ...Array(10).fill("FractalSwarm"), ...Array(8).fill("GhostKernel"), ...Array(6).fill("OverclockedBrute")],
        [...Array(14).fill("FractalSwarm"), ...Array(10).fill("SentinelSniper"), ...Array(10).fill("GlitchCrawler"), ...Array(6).fill("FirewallGolem")],
        [...Array(18).fill("VirusSwarm"), ...Array(10).fill("OverclockedBrute"), ...Array(8).fill("SentinelSniper")],
        [...Array(12).fill("GhostKernel"), ...Array(10).fill("QuantumWraith"), ...Array(8).fill("OverclockedBrute"), ...Array(6).fill("FirewallGolem")],
        // Boss waves
        [...Array(22).fill("FractalSwarm"), "AIOverlord"],
        [...Array(22).fill("QuantumWraith"), "KernelTyrant"]
      ],
      upgrades: [
        { name: "Neural Overclock",   effect: {type: "speed", value: 0.6},     description: "Boost movement speed",      rarity: "rare" },
        { name: "Quantum Shield",     effect: {type: "maxhealth", value: 15},   description: "Increase max health",       rarity: "rare" },
        { name: "Data Surge",         effect: {type: "damage", value: 2},       description: "All weapons +2 damage",     rarity: "rare" },
        { name: "Rapid Fire Protocol",effect: {type: "firerate", value: 0.5},   description: "Increase fire rate",        rarity: "epic" },
        { name: "Velocity Matrix",    effect: {type: "bulletspeed", value: 1.5},description: "Faster projectiles",        rarity: "common" },
        { name: "Piercing Matrix",    effect: {type: "piercing", value: 1},     description: "Bullets pierce +1 enemy",   rarity: "rare" },
        { name: "Homing Algorithm",   effect: {type: "homing", value: 0.08},    description: "Slight bullet homing",      rarity: "epic" },
        { name: "Explosive Rounds",   effect: {type: "explosive", value: 25},   description: "Add explosion damage",      rarity: "epic" },
        { name: "Quantum Regeneration",effect:{type: "health", value: 20},      description: "Instant health restore",    rarity: "rare" },
        { name: "Overcharge Protocol",effect:{type: "damage", value: 3},        description: "All weapons +3 damage",     rarity: "legendary" },
        { name: "Time Dilation",      effect: {type: "firerate", value: 1},     description: "Major fire rate boost",     rarity: "legendary" },
        // Weapon grants
        { name: "Purchase: Shotgun",          effect: {type: "weapon", value: "Shotgun"},          description: "Close-range burst",    rarity: "epic" },
        { name: "Purchase: Rocket Launcher",  effect: {type: "weapon", value: "Rocket Launcher"},  description: "Explosive payload",     rarity: "epic" },
        { name: "Purchase: Railgun",          effect: {type: "weapon", value: "Railgun"},          description: "Piercing rail shot",    rarity: "rare" },
        { name: "Purchase: ChainLightning",   effect: {type: "weapon", value: "ChainLightning"},   description: "Jumps between targets", rarity: "epic" },
        { name: "Purchase: Cryo Ray",         effect: {type: "weapon", value: "Cryo Ray"},         description: "Freezes systems",       rarity: "rare" },
        { name: "Purchase: Plasma Repeater",  effect: {type: "weapon", value: "Plasma Repeater"},  description: "Fast, relentless fire", rarity: "rare" },
        { name: "Purchase: Homing Missiles",  effect: {type: "weapon", value: "Homing Missiles"},  description: "Seeks targets",         rarity: "epic" },
        { name: "Purchase: Quantum Bouncer",  effect: {type: "weapon", value: "Quantum Bouncer"},  description: "Ricocheting rounds",    rarity: "epic" },
        { name: "Purchase: Laser Storm",      effect: {type: "weapon", value: "Laser Storm"},      description: "Shredding light",       rarity: "rare" }
      ],
      background: "#0a0420"
    };
  }
}
