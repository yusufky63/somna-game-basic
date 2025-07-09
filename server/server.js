// server.js - Somna Game API
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const ethers = require('ethers');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Blockchain configuration
const PROVIDER_URL = process.env.PROVIDER_URL || "https://dream-rpc.somnia.network";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0xb6CC9256E6Fe6C9cfC3A2d93f0358ff43558bFeE";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// SpaceImpact contract ABI
const contractABI = [
	{
		"inputs": [],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "getLeaderboard",
		"outputs": [
			{
				"components": [
					{
						"internalType": "string",
						"name": "nickname",
						"type": "string"
					},
					{
						"internalType": "uint256",
						"name": "score",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "player",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "timestamp",
						"type": "uint256"
					}
				],
				"internalType": "struct SpaceImpact.ScoreEntry[]",
				"name": "",
				"type": "tuple[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "leaderboard",
		"outputs": [
			{
				"internalType": "string",
				"name": "nickname",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "minScoreThreshold",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "playerScores",
		"outputs": [
			{
				"internalType": "string",
				"name": "nickname",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "player",
				"type": "address"
			},
			{
				"internalType": "string",
				"name": "nickname",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			}
		],
		"name": "recordScore",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newSigner",
				"type": "address"
			}
		],
		"name": "setSigner",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "signer",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "nickname",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "score",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "nonce",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "signature",
				"type": "bytes"
			}
		],
		"name": "submitScoreWithSignature",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "newThreshold",
				"type": "uint256"
			}
		],
		"name": "updateMinScoreThreshold",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]

// Leaderboard cache
let leaderboardCache = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Blockchain connection setup
let provider, wallet, contract;
let isOwner = false;
let isSigner = false;

// Function to safely get signer address
async function getSignerAddressSafely() {
  try {
    // Try different methods
    try {
      // 1. Direct contract call
      return await contract.signer();
    } catch (e) {
      console.log("Direct contract.signer() call failed:", e.message);
      
      try {
        // 2. Call as a function
        // Sometimes capitalization differences can cause issues
        const methodsToTry = ["signer", "Signer", "SIGNER"];
        
        for (const method of methodsToTry) {
          try {
            if (typeof contract[method] === 'function') {
              console.log(`Trying ${method} method...`);
              return await contract[method]();
            }
          } catch (innerError) {
            console.log(`Error calling ${method}:`, innerError.message);
          }
        }
        
        // 3. List contract methods
        console.log("Contract properties:", Object.keys(contract).filter(k => typeof contract[k] !== 'function'));
        console.log("Contract functions:", Object.keys(contract).filter(k => typeof contract[k] === 'function'));
        
        console.log("Performing low-level call to get signer address...");
        
        // 4. Use specific method from current ABI
        try {
          // Check if contract has a provider
          if (contract.provider) {
            // Try Ethereum call
            const result = await contract.provider.call({
              to: CONTRACT_ADDRESS,
              data: "0x238ac933" // signer() function's "signature hash"
            });
            
            // Decode result
            if (result && result.length >= 66) {
              // Convert to address format
              return ethers.utils.getAddress("0x" + result.slice(26));
            } else {
              console.log("Result not as expected:", result);
            }
          }
        } catch (callError) {
          console.error("Low-level call error:", callError);
        }
        
        // Return zero address if all attempts fail
        console.warn("No signer address could be obtained, returning zero address");
        return "0x0000000000000000000000000000000000000000";
      } catch (e2) {
        console.error("All signer address methods failed:", e2);
        return "0x0000000000000000000000000000000000000000";
      }
    }
  } catch (error) {
    console.error("Error getting signer address:", error);
    return "0x0000000000000000000000000000000000000000";
  }
}

// Important contract roles
async function checkRoles() {
  try {
    if (!contract || !wallet) return { isOwner: false, isSigner: false };
    
    const serverAddress = await wallet.getAddress();
    const ownerAddress = await contract.owner();
    
    // Use safe function
    const signerAddress = await getSignerAddressSafely();
    
    isOwner = serverAddress.toLowerCase() === ownerAddress.toLowerCase();
    isSigner = signerAddress && serverAddress.toLowerCase() === signerAddress.toLowerCase();
    
    console.log(`Role check: Owner=${isOwner}, Signer=${isSigner}`);
    console.log(`Server: ${serverAddress}`);
    console.log(`Owner: ${ownerAddress}`);
    console.log(`Signer: ${signerAddress}`);
    
    return { isOwner, isSigner };
  } catch (error) {
    console.error("Role check error:", error);
    return { isOwner: false, isSigner: false };
  }
}

function setupBlockchainConnection() {
  try {
    provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
    
    // If PRIVATE_KEY exists, create wallet for signing
    if (PRIVATE_KEY) {
      wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);
      console.log("Contract connection established (with signing capability)");
      
      // Check roles
      checkRoles().then(({isOwner: owner, isSigner: signer}) => {
        console.log(`Wallet permissions: Owner=${owner}, Signer=${signer}`);
        if (!owner && !signer) {
          console.warn("Warning: This wallet is neither owner nor signer. Score submission may fail.");
        }
      });
    } else {
      // Proceed with read-only access
      contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);
      console.log("Contract connection established (read-only)");
    }
    
    return true;
  } catch (error) {
    console.error("Blockchain connection error:", error);
    return false;
  }
}

// Signature verification
function verifySignature(message, signature, address) {
  try {
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Score submission endpoint
app.post('/api/submit-score', async (req, res) => {
  try {
    const { address, score, nickname, signature, message } = req.body;
    
    // Input validation
    if (!address || !score || !nickname || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Signature verification
    const isValid = verifySignature(message, signature, address);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log(`Score submitted: ${score} - ${nickname} (${address})`);
    
    // Check blockchain connection
    if (!contract || !wallet) {
      if (!setupBlockchainConnection() || !wallet) {
        return res.status(500).json({ error: 'Blockchain connection could not be established or signing capability is missing' });
      }
    }
    
    // Activate role checks - Add more debug info
    try {
      const serverAddress = await wallet.getAddress();
      const ownerAddress = await contract.owner();
      
      // Use safe function
      const signerAddress = await getSignerAddressSafely();
      
      console.log("Server address:", serverAddress);
      console.log("Owner address:", ownerAddress);
      console.log("Signer address:", signerAddress);
      
      const isOwner = serverAddress.toLowerCase() === ownerAddress.toLowerCase();
      const isSigner = signerAddress && serverAddress.toLowerCase() === signerAddress.toLowerCase();
      
      console.log(`Checking server roles: Owner=${isOwner}, Signer=${isSigner}`);
      
      if (!isOwner && !isSigner) {
        console.error("Permission error: Server does not have signer or owner role");
        
        return res.status(403).json({ 
          error: 'Permission error', 
          details: 'This server does not have permission to record scores on the contract. The server owner or signer needs to be set in the contract.',
          serverAddress: serverAddress,
          ownerAddress: ownerAddress,
          signerAddress: signerAddress
        });
      }
    } catch (roleCheckError) {
      console.error("Role check error:", roleCheckError);
      return res.status(500).json({
        error: 'Role check error',
        details: roleCheckError.message
      });
    }
    
    // Record score
    try {
      // Log score data
      console.log(`Data sent to contract: Address=${address}, Nickname=${nickname}, Score=${score}`);
      
      // Use new recordScore function
      console.log(`Calling recordScore function: (${address}, ${nickname}, ${score})`);
      const tx = await contract.recordScore(address, nickname, score);
      console.log("Transaction sent, waiting for confirmation:", tx.hash);
      
      const receipt = await tx.wait();
      console.log(`Score successfully submitted. Transaction: ${receipt.transactionHash}`);
      
      // Clear cache
      lastCacheUpdate = 0;
      
      return res.status(200).json({
        success: true,
        transaction: receipt.transactionHash
      });
    } catch (contractError) {
      console.error("Contract call error:", contractError);
      
      // Log more detailed error
      console.log("Full error details:", JSON.stringify(contractError, null, 2));
      
      // User-friendly error message
      let errorMessage = "Contract transaction failed: ";
      if (contractError.code === 'CALL_EXCEPTION') {
        errorMessage += "Contract call rejected - permission issue or gas limit too low.";
      } else if (contractError.code === 'INSUFFICIENT_FUNDS') {
        errorMessage += "Insufficient funds for the transaction.";
      } else if (contractError.code === 'UNPREDICTABLE_GAS_LIMIT') {
        errorMessage += "Could not calculate gas limit, contract call failed.";
      } else {
        errorMessage += contractError.message || "Unknown error";
      }
      
      return res.status(500).json({
        error: 'Contract transaction failed',
        details: errorMessage,
        reason: contractError.reason || "Unknown cause"
      });
    }
  } catch (error) {
    console.error("Score submission error:", error);
    return res.status(500).json({
      error: 'Score submission failed',
      details: error.message
    });
  }
});

// Set signer endpoint (only owner can call)
app.post('/api/set-signer', async (req, res) => {
  try {
    const { signerAddress } = req.body;
    
    if (!signerAddress) {
      return res.status(400).json({ error: 'Signer address not provided' });
    }
    
    // Check blockchain connection
    if (!contract || !wallet) {
      if (!setupBlockchainConnection() || !wallet) {
        return res.status(500).json({ error: 'Blockchain connection could not be established or signing capability is missing' });
      }
    }
    
    // Owner check
    const roles = await checkRoles();
    if (!roles.isOwner) {
      return res.status(403).json({ 
        error: 'Permission error', 
        details: 'Only the contract owner can change the signer address.' 
      });
    }
    
    // Set signer address
    const tx = await contract.setSigner(signerAddress);
    const receipt = await tx.wait();
    
    console.log(`Signer address successfully changed. Transaction: ${receipt.transactionHash}`);
    
    return res.status(200).json({
      success: true,
      transaction: receipt.transactionHash,
      signer: signerAddress
    });
  } catch (error) {
    console.error("Set signer error:", error);
    return res.status(500).json({
      error: 'Set signer failed',
      details: error.message
    });
  }
});

// Check contract roles endpoint
app.get('/api/check-roles', async (req, res) => {
  try {
    // Check blockchain connection
    if (!contract) {
      if (!setupBlockchainConnection()) {
        return res.status(500).json({ error: 'Blockchain connection could not be established' });
      }
    }
    
    const ownerAddress = await contract.owner();
    const signerAddress = await contract.signer();
    
    // Server wallet address
    let serverAddress = "";
    let serverRoles = { isOwner: false, isSigner: false };
    
    if (wallet) {
      serverAddress = await wallet.getAddress();
      serverRoles = await checkRoles();
    }
    
    return res.status(200).json({
      roles: {
        owner: ownerAddress,
        signer: signerAddress,
        server: serverAddress,
        serverIsOwner: serverRoles.isOwner,
        serverIsSigner: serverRoles.isSigner
      }
    });
  } catch (error) {
    console.error("Role check error:", error);
    return res.status(500).json({
      error: 'Role check failed',
      details: error.message
    });
  }
});

// Leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
  try {
    // Cache check
    const now = Date.now();
    if (now - lastCacheUpdate < CACHE_DURATION && leaderboardCache.length > 0) {
      console.log("Returning leaderboard from cache");
      return res.status(200).json({ leaderboard: leaderboardCache });
    }
    
    // Check blockchain connection
    if (!contract) {
      if (!setupBlockchainConnection()) {
        return res.status(500).json({ error: 'Blockchain connection could not be established' });
      }
    }
    
    // Fetch fresh data from blockchain
    console.log("Fetching leaderboard from blockchain");
    const leaderboardData = await contract.getLeaderboard();
    
    // Format data
    const formattedData = leaderboardData.map(entry => ({
      player: entry.player,
      score: entry.score.toString(),
      nickname: entry.nickname,
      timestamp: entry.timestamp?.toString() || '0'
    }));
    
    // Update cache
    leaderboardCache = formattedData;
    lastCacheUpdate = now;
    
    return res.status(200).json({ leaderboard: formattedData });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return res.status(500).json({
      error: 'Leaderboard could not be fetched',
      details: error.message
    });
  }
});

// Get contract info and server roles endpoint
app.get('/api/status', async (req, res) => {
  try {
    // Check blockchain connection
    if (!contract) {
      if (!setupBlockchainConnection()) {
        return res.status(500).json({ 
          status: 'error',
          error: 'Blockchain connection could not be established'
        });
      }
    }
    
    const data = {
      status: 'ok',
      contract: {
        address: CONTRACT_ADDRESS,
        network: PROVIDER_URL
      },
      server: {}
    };
    
    // Check contract roles
    try {
      const ownerAddress = await contract.owner();
      data.contract.owner = ownerAddress;
      
      // Use safe function
      const signerAddress = await getSignerAddressSafely();
      data.contract.signer = signerAddress || 'Not set';
      
      // Server wallet info
      if (wallet) {
        const serverAddress = await wallet.getAddress();
        const isOwner = serverAddress.toLowerCase() === ownerAddress.toLowerCase();
        const isSigner = signerAddress && serverAddress.toLowerCase() === signerAddress.toLowerCase();
        
        data.server = {
          address: serverAddress,
          isOwner,
          isSigner,
          hasPermission: isOwner || isSigner
        };
      } else {
        data.server = {
          address: 'Wallet not configured (private key missing)',
          isOwner: false,
          isSigner: false,
          hasPermission: false
        };
      }
    } catch (error) {
      console.error("Error getting contract info:", error);
      data.error = error.message;
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.error("Status check error:", error);
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Signature generation endpoint - for users to submit their own score
app.post('/api/get-signature', async (req, res) => {
  try {
    const { address, score, nickname, nonce } = req.body;
    
    // Input validation
    if (!address || !score || !nickname || !nonce) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`Signature requested: ${score} points - ${nickname} (${address}) for nonce: ${nonce}`);
    
    // Check blockchain connection
    if (!contract || !wallet) {
      if (!setupBlockchainConnection() || !wallet) {
        return res.status(500).json({ error: 'Blockchain connection could not be established or signing capability is missing' });
      }
    }
    
    // Check if server has signer role
    const roles = await checkRoles();
    if (!roles.isSigner) {
      return res.status(403).json({ 
        error: 'Permission error', 
        details: 'This server does not have the signer role.' 
      });
    }
    
    try {
      // Generate message hash - as expected by the contract
      // keccak256(abi.encodePacked(address, score, nickname, nonce))
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'string', 'uint256'],
        [address, score, nickname, nonce]
      );
      
      console.log("Generated message hash:", messageHash);
      
      // Add Ethereum Signed Message prefix - equivalent to getEthSignedMessageHash
      const ethSignedMessageHash = ethers.utils.hashMessage(ethers.utils.arrayify(messageHash));
      console.log("Ethereum signed message hash:", ethSignedMessageHash);
      
      // Sign with private key - in the format expected by the contract
      const signature = await wallet.signMessage(ethers.utils.arrayify(messageHash));
      
      console.log("Signature generated:", signature);
      
      return res.status(200).json({
        success: true,
        signature: signature,
        nonce: nonce
      });
    } catch (signError) {
      console.error("Error generating signature:", signError);
      throw new Error(`Signature generation failed: ${signError.message}`);
    }
  } catch (error) {
    console.error("Signature generation error:", error);
    return res.status(500).json({
      error: 'Signature generation failed',
      details: error.message
    });
  }
});

// Route for the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// This part will be skipped when running in Vercel as a serverless function,
// but will run in a normal Node.js environment
if (process.env.NODE_ENV !== 'production') {
  // Start the server
  app.listen(PORT, () => {
    // Establish blockchain connection on startup
    setupBlockchainConnection();
    console.log(`Server running on port ${PORT} - http://localhost:${PORT}`);
  });
}

// Add module.exports for Vercel
module.exports = app; 