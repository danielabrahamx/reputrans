/**
 * Verify REPUTRANS contracts on Basescan (Base Sepolia).
 *
 * Usage: node scripts/verify-contracts.mjs
 *
 * Note: Basescan may require a free API key from https://basescan.org/myapikey
 * Set BASESCAN_API_KEY env var if needed.
 */

const API = 'https://api.etherscan.io/v2/api?chainid=84532';
const API_KEY = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || '';

const CONTRACTS = [
  {
    name: 'U2SSORegistry',
    address: '0x543106c00aa1ae3cc2e98bc90034802c6a1198b7',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract U2SSORegistry {
    mapping(uint256 => bytes32) public anonymitySetRoots;
    uint256 public currentSetIndex;
    uint256 public constant SET_SIZE = 1024;
    mapping(uint256 => uint256) public setMemberCount;
    uint256 public registrationFee;
    mapping(bytes32 => bool) public isRegistered;

    event MasterIdentityRegistered(uint256 indexed setIndex, uint256 indexed leafIndex, bytes32 identityCommitment);
    event AnonymitySetRootUpdated(uint256 indexed setIndex, bytes32 newRoot);

    constructor(uint256 _registrationFee) {
        registrationFee = _registrationFee;
    }

    function registerMasterIdentity(bytes32 identityCommitment, bytes32 newRoot) external payable {
        require(msg.value >= registrationFee, "Insufficient fee");
        require(!isRegistered[identityCommitment], "Already registered");
        if (setMemberCount[currentSetIndex] >= SET_SIZE) {
            currentSetIndex++;
        }
        uint256 leafIndex = setMemberCount[currentSetIndex];
        setMemberCount[currentSetIndex]++;
        isRegistered[identityCommitment] = true;
        anonymitySetRoots[currentSetIndex] = newRoot;
        emit MasterIdentityRegistered(currentSetIndex, leafIndex, identityCommitment);
        emit AnonymitySetRootUpdated(currentSetIndex, newRoot);
    }

    function getAnonymitySetRoot(uint256 setIndex) external view returns (bytes32) {
        return anonymitySetRoots[setIndex];
    }
}`,
    constructorArgs: '0000000000000000000000000000000000000000000000000000000000000000',
  },
  {
    name: 'MockVerifier',
    address: '0x9b06995faa2221c3c0e59594efd18ae8b4a46687',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title MockVerifier
/// @notice Stand-in for UltraPlonk verifier during hackathon demo.
/// @dev In production, this would be the auto-generated plonk_vk.sol UltraVerifier.
/// Proof verification happens off-chain via noir_js + BarretenbergBackend.
/// This contract accepts pre-verified proofs and records them on-chain.
/// The ReputationVerifier still checks nullifiers and anonymity set roots.
contract MockVerifier {
    /// @notice Always returns true — proof was pre-verified off-chain via noir_js
    function verify(bytes calldata, bytes32[] calldata) external pure returns (bool) {
        return true;
    }
}`,
    constructorArgs: '',
  },
  {
    name: 'ReputationVerifier',
    address: '0x08e35d8dcced0759cadd4546be30d5cab6d18603',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IUltraVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

interface IU2SSORegistry {
    function currentSetIndex() external view returns (uint256);
    function getAnonymitySetRoot(uint256 setIndex) external view returns (bytes32);
}

contract ReputationVerifier {
    IUltraVerifier public immutable verifier;
    IU2SSORegistry public immutable registry;
    mapping(bytes32 => bool) public usedNullifiers;

    event ReputationVerified(address indexed requester, uint8 platformType, uint8 minRating, uint256 minTrips, bytes32 nullifier);

    constructor(address _verifier, address _registry) {
        verifier = IUltraVerifier(_verifier);
        registry = IU2SSORegistry(_registry);
    }

    function verifyReputation(bytes calldata proof, bytes32[] calldata publicInputs) external returns (bool) {
        require(publicInputs.length == 5, "Invalid public inputs");
        bytes32 nullifier = publicInputs[0];
        bytes32 anonymitySetRoot = publicInputs[1];
        require(!usedNullifiers[nullifier], "Nullifier already used");
        bool rootExists = false;
        for (uint256 i = 0; i <= registry.currentSetIndex(); i++) {
            if (registry.getAnonymitySetRoot(i) == anonymitySetRoot) {
                rootExists = true;
                break;
            }
        }
        require(rootExists, "Unknown anonymity set");
        require(verifier.verify(proof, publicInputs), "Invalid proof");
        usedNullifiers[nullifier] = true;
        emit ReputationVerified(msg.sender, uint8(uint256(publicInputs[2])), uint8(uint256(publicInputs[3])), uint256(publicInputs[4]), nullifier);
        return true;
    }
}`,
    constructorArgs: '0000000000000000000000009b06995faa2221c3c0e59594efd18ae8b4a46687000000000000000000000000543106c00aa1ae3cc2e98bc90034802c6a1198b7',
  },
];

async function verifyContract(contract) {
  const params = new URLSearchParams({
    apikey: API_KEY,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: contract.address,
    sourceCode: contract.source,
    codeformat: 'solidity-single-file',
    contractname: contract.name,
    compilerversion: 'v0.8.33+commit.64118f21',
    optimizationUsed: '1',
    runs: '10',
    evmversion: 'paris',
    constructorArguements: contract.constructorArgs, // Basescan typo is intentional
    licenseType: '3', // MIT
  });

  const res = await fetch(API, { method: 'POST', body: params });
  const data = await res.json();
  return data;
}

async function checkStatus(guid) {
  const url = `${API}&apikey=${API_KEY}&module=contract&action=checkverifystatus&guid=${guid}`;
  const res = await fetch(url);
  return res.json();
}

async function main() {
  for (const contract of CONTRACTS) {
    console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
    const result = await verifyContract(contract);
    console.log('  Submit:', result.message, result.result);

    if (result.status === '1') {
      // Poll for completion
      let attempts = 0;
      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 5000));
        const status = await checkStatus(result.result);
        console.log(`  Status: ${status.result}`);
        if (status.result === 'Pass - Verified' || status.result.includes('Already Verified')) {
          console.log(`  ✓ ${contract.name} verified on Basescan!`);
          console.log(`  https://sepolia.basescan.org/address/${contract.address}#code`);
          break;
        }
        if (status.result === 'Fail - Unable to verify') {
          console.log(`  ✗ Verification failed`);
          break;
        }
        attempts++;
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
