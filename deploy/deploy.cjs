/**
 * deploy.js — Hardhat deploy script for DevicePassport.sol.
 *
 * Run with:
 *   npm run deploy:testnet   (BOT Chain Testnet, chainId 968)
 *   npm run deploy:mainnet   (BOT Chain Mainnet, chainId 677)
 *
 * Requirements:
 *   - DEPLOYER_PRIVATE_KEY in .env (NEVER commit, NEVER a VITE_ var)
 *   - The deployer address must hold BOT for gas.
 *       Testnet faucet: https://faucet.botchain.ai/basic
 *
 * Prints the contract address + tx hash and explains where to put the
 * address in the frontend configuration.
 */
const { ethers } = require('hardhat');

async function main() {
  const network = hre.network.name;
  console.log(`\n=== Deploying DevicePassport to ${network} ===`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance : ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} BOT`);

  // Guard against an accidental default-network deploy. ethers v6 exposes
  // the chain id via getNetwork() (the sync `.network` getter is unreliable).
  const deployedNetwork = await deployer.provider.getNetwork();
  const expectedChainId = BigInt(hre.network.config.chainId);
  if (deployedNetwork.chainId !== expectedChainId) {
    throw new Error(
      `Refusing to deploy: wallet/provider reports chainId ${deployedNetwork.chainId}, ` +
      `expected ${expectedChainId} (${hre.network.name}). Check your --network flag.`
    );
  }

  const DevicePassport = await ethers.getContractFactory('DevicePassport');
  const contract = await DevicePassport.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const txHash = deployTx ? deployTx.hash : null;

  console.log('\n=== DEPLOYMENT COMPLETE ===');
  console.log(`Contract address : ${address}`);
  console.log(`Transaction hash : ${txHash}`);
  console.log(`Active network    : ${network} (chainId ${hre.network.config.chainId})`);

  const envVar = network === 'botChainTestnet' ? 'VITE_TESTNET_CONTRACT_ADDRESS' : 'VITE_MAINNET_CONTRACT_ADDRESS';
  console.log('\nNext steps:');
  console.log(`  1. Copy the contract address above into your .env as:`);
  console.log(`       ${envVar}=${address}`);
  console.log(`  2. Restart the dev server: npm run dev`);
  console.log(`  3. The active network is controlled by ACTIVE_NETWORK in src/config/chains.js.`);
  console.log('\nVerify on explorer:');
  const explorer =
    network === 'botChainTestnet' ? 'https://scan.bohr.life' : 'https://scan.botchain.ai';
  console.log(`  Contract: ${explorer}/address/${address}`);
  if (txHash) console.log(`  Tx      : ${explorer}/tx/${txHash}`);
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});