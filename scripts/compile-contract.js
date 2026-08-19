/**
 * compile-contract.js
 *
 * Compiles DevicePassport.sol with Hardhat and regenerates
 * src/blockchain/artifact.js (ABI + bytecode) from the resulting artifact so
 * the frontend always matches the contract.
 *
 * Run with:  npm run compile
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

console.log('[compile] Running hardhat compile…');
try {
  execSync('npx hardhat compile', { cwd: root, stdio: 'inherit' });
} catch (error) {
  console.error('[compile] Hardhat compile failed. Check the Solidity errors above.');
  process.exit(1);
}

const artifactPath = join(root, 'artifacts', 'contracts', 'DevicePassport.sol', 'DevicePassport.json');
let artifact;
try {
  artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
} catch (error) {
  console.error(`[compile] Could not read artifact at ${artifactPath}. Is the contract compiling?`);
  process.exit(1);
}

// Extract the pieces the frontend needs.
const abi = artifact.abi;
const bytecode = artifact.bytecode;

const banner = `/**
 * RICIPT contract ABI + bytecode.
 *
 * GENERATED FILE — do not edit by hand. Run \`npm run compile\` after changing
 * contracts/DevicePassport.sol to regenerate this module from the Hardhat
 * artifact. Committed so the frontend works before any deploy step.
 */
`;

const output = `${banner}
export const DevicePassportABI = ${JSON.stringify(abi, null, 2)};

export const DevicePassportBytecode = '${bytecode}';
`;

const targetDir = join(root, 'src', 'blockchain');
mkdirSync(targetDir, { recursive: true });
writeFileSync(join(targetDir, 'artifact.js'), output);

console.log('[compile] ✓ src/blockchain/artifact.js regenerated.');
console.log(`[compile]   ABI items: ${abi.length}`);
console.log(`[compile]   Bytecode length: ${bytecode.length} chars`);