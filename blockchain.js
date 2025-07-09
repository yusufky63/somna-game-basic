// Blockchain integration
let provider, signer, contract;
let tokenBalance = 0;
window.playerNickname = localStorage.getItem('playerNickname') || "";

// Backend API URL
const API_URL = "http://localhost:3000/api";

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

// Contract address
const contractAddress = "0xb6CC9256E6Fe6C9cfC3A2d93f0358ff43558bFeE";

// Save nickname
async function setPlayerNickname(nickname) {
  try {
    if (!nickname || nickname.trim() === "") {
      console.error("No valid nickname entered");
      return false;
    }
    
    console.log("Saving nickname:", nickname);
    window.playerNickname = nickname;
    
    // Save to localStorage for persistence
    localStorage.setItem('playerNickname', nickname);
    
    // Save nickname - if contract is connected
    if (contract && signer) {
      try {
        // We can save the nickname to the contract,
        // but depending on the contract structure, different methods can be used
        // An example approach:
        // const tx = await contract.updatePlayerNickname(nickname);
        // await tx.wait();
        console.log("Nickname saved to contract:", nickname);
        return true;
      } catch (error) {
        console.error("Error saving nickname to contract:", error);
        // If there's an error, save only to localStorage
        return false;
      }
    } else {
      // If no contract connection, save locally
      console.log("No contract connection, nickname saved locally only");
      return true;
    }
  } catch (error) {
    console.error("Error saving nickname:", error);
    return false;
  }
}

// Check and prompt nickname
function checkAndPromptNickname() {
  // If we already have a nickname from localStorage, use it
  const savedNickname = localStorage.getItem('playerNickname');
  if (savedNickname && savedNickname.trim() !== "") {
    window.playerNickname = savedNickname;
    console.log("Found saved nickname:", savedNickname);
    
    // Update nickname input field if it exists
    const nicknameInput = document.getElementById("nickname-input");
    if (nicknameInput) {
      nicknameInput.value = savedNickname;
    }
    
    // Enable start button
    const startButton = document.getElementById("start-button");
    if (startButton) {
      startButton.style.background = "#0066ff";
      startButton.disabled = false;
    }
    
    return true;
  }
  
  // If no nickname exists, we'll let game.js handle the popup
  return false;
}

// Check network and switch network
async function checkNetwork() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log("Current chain ID:", chainId);
    
    // Somnia Testnet Chain ID values
    const SOMNIA_CHAIN_ID_HEX = "0xc4a8";
    const SOMNIA_CHAIN_ID_DECIMAL = "50312";
    
    // Check ChainID - check both hex and decimal format
    const isSomniaNetwork = (
      chainId.toLowerCase() === SOMNIA_CHAIN_ID_HEX ||          // Hex format
      parseInt(chainId, 16).toString() === SOMNIA_CHAIN_ID_DECIMAL  // Decimal format
    );
    
    console.log("ChainID hex:", chainId.toLowerCase());
    console.log("ChainID decimal:", parseInt(chainId, 16).toString());
    console.log("Is on Somnia network?", isSomniaNetwork);
    
    // Safely get DOM elements
    const switchNetworkBtn = document.getElementById("switch-network");
    const networkStatusText = document.getElementById("network-status");
    const startButton = document.getElementById("start-button");
    
    if (!isSomniaNetwork) {
      console.log("Network check: Wrong network!");
      // Show button and alert if on wrong network
      if (switchNetworkBtn) switchNetworkBtn.style.display = "block";
      if (networkStatusText) {
        networkStatusText.textContent = "Wrong Network! Please switch to Somnia Testnet.";
        networkStatusText.style.color = "red";
      }
      
      // Disable start button
      if (startButton) {
        startButton.style.background = "#666666";
        startButton.disabled = true;
      }
      
      return false;
    } else {
      console.log("Network check: Correct network (Somnia)");
      // Hide button if on correct network
      if (switchNetworkBtn) switchNetworkBtn.style.display = "none";
      if (networkStatusText) {
        networkStatusText.textContent = "Connected to Somnia Testnet";
        networkStatusText.style.color = "green";
      }
      
      // Check nickname
      checkAndPromptNickname();
      
      return true;
    }
  } catch (error) {
    console.error("Network check error:", error);
    return false;
  }
}

// Connect to Ethereum network
async function connectWallet() {
  try {
    if (window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      provider = new ethers.providers.Web3Provider(window.ethereum);
      signer = provider.getSigner();

      // Safely get DOM elements
      const walletEl = document.getElementById("wallet");
      const connectWalletBtn = document.getElementById("connect-wallet");
      const shareScoreBtn = document.getElementById("share-score");

      // Show user address
      const address = await signer.getAddress();
      if (walletEl) {
        walletEl.textContent = `${address.substring(
          0,
          6
        )}...${address.substring(address.length - 4)}`;
      }
      
      // Update button text based on connection status
      if (connectWalletBtn) {
        connectWalletBtn.textContent = "Wallet Connected";
        connectWalletBtn.disabled = true;
      }

      // Check network (network check will also check nickname)
      const networkOk = await checkNetwork();
      
      // Connect contract
      contract = new ethers.Contract(contractAddress, contractABI, signer);
      
      // Enable "Share Score" button
      if (shareScoreBtn) {
        shareScoreBtn.disabled = false;
      }
      
      // Update leaderboard
      fetchLeaderboard();
      
      return true;
    } else {
      alert(
        "MetaMask not installed! Please install MetaMask and try again."
      );
      return false;
    }
  } catch (error) {
    console.error("Wallet connection error:", error);
    alert("Wallet connection failed: " + error.message);
    return false;
  }
}

// Switch to Somnia network
async function switchToSomniaNetwork() {
  try {
    // Safely get DOM elements
    const networkStatusEl = document.getElementById("network-status");
    const switchNetworkBtn = document.getElementById("switch-network");

    // Get user's current network info
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    console.log("Attempting to switch network, current chain ID:", chainId);
    
    // Somnia Testnet Chain ID values
    const SOMNIA_CHAIN_ID_HEX = "0xc4a8";
    const SOMNIA_CHAIN_ID_DECIMAL = "50312";
    
    // Check ChainID - check both hex and decimal format
    const isSomniaNetwork = (
      chainId.toLowerCase() === SOMNIA_CHAIN_ID_HEX ||          // Hex format
      parseInt(chainId, 16).toString() === SOMNIA_CHAIN_ID_DECIMAL  // Decimal format
    );
    
    // If already on the correct network, do nothing
    if (isSomniaNetwork) {
      console.log("Already on Somnia network, no change needed");
      if (networkStatusEl) networkStatusEl.textContent = "Already connected to Somnia Testnet!";
      if (switchNetworkBtn) switchNetworkBtn.style.display = "none";
      
      // Check nickname on Somnia network
      checkAndPromptNickname();
      
      return true;
    }
    
    // Update switch button text
    if (switchNetworkBtn) switchNetworkBtn.textContent = "Switch to Somnia";
    
    // Somnia Testnet info - specifying chainId in hexadecimal is more secure
    const somniaTestnet = {
      chainId: SOMNIA_CHAIN_ID_HEX, // Hex format is more secure
      chainName: "Somnia Testnet",
      nativeCurrency: {
        name: "Somnia",
        symbol: "STT",
        decimals: 18,
      },
      rpcUrls: ["https://dream-rpc.somnia.network"],
      blockExplorerUrls: ["https://somnia-poc.w3us.site/"],
    };
    
    console.log("Attempting network switch...");
    
    // First try switching with wallet_switchEthereumChain
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: somniaTestnet.chainId }],
      });
      
      console.log("Network switch successful");
      
      // If successful, refresh the page
      if (networkStatusEl) {
        networkStatusEl.textContent = "Network switched! Refreshing...";
        networkStatusEl.style.color = "green";
      }
      setTimeout(() => location.reload(), 1500);
      return true;
    } catch (switchError) {
      console.error("Switch error:", switchError);
      
      // If chain is not added (4902 error), add it
      if (switchError.code === 4902) {
        console.log("Chain not found, adding...");
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [somniaTestnet],
          });
          
          console.log("Chain added successfully");
          
          // If successful, refresh the page
          if (networkStatusEl) {
            networkStatusEl.textContent = "Chain added! Refreshing...";
            networkStatusEl.style.color = "green";
          }
          setTimeout(() => location.reload(), 1500);
          return true;
        } catch (addError) {
          console.error("Chain add error:", addError);
          if (addError.code === 4001) {
            // User rejected
            if (networkStatusEl) {
              networkStatusEl.textContent = "Switch request rejected.";
              networkStatusEl.style.color = "orange";
            }
          } else {
            if (networkStatusEl) {
              networkStatusEl.textContent = "Error adding chain: " + (addError.message || "Unknown error");
              networkStatusEl.style.color = "red";
            }
          }
          return false;
        }
      } else if (switchError.code === 4001) {
        // User rejected
        if (networkStatusEl) {
          networkStatusEl.textContent = "Switch request rejected.";
          networkStatusEl.style.color = "orange";
        }
        return false;
      } else {
        if (networkStatusEl) {
          networkStatusEl.textContent = "Network switch failed: " + (switchError.message || "Unknown error");
          networkStatusEl.style.color = "red";
        }
        return false;
      }
    }
  } catch (error) {
    console.error("Network switch error:", error);
    const networkStatusEl = document.getElementById("network-status");
    if (networkStatusEl) {
      networkStatusEl.textContent = "Network switch failed: " + (error.message || "Unknown error");
      networkStatusEl.style.color = "red";
    }
    return false;
  }
}

// Share score to blockchain
async function shareScore() {
  try {
    console.log("ShareScore function started");
    
    // Use score value from game.js as a global variable
    if (typeof score === 'undefined' || score === null) {
      console.error("Score value not found!");
      alert("Score value not found. Please restart the game.");
      return;
    }
    
    // Check Ethereum connection
    if (!provider || !signer || !contract) {
      console.log("Provider/signer/contract missing, connecting...");
      const connected = await connectWallet();
      if (!connected) {
        console.error("Could not connect wallet!");
        return;
      }
    }

    // Check network
    const networkOk = await checkNetwork();
    if (!networkOk) {
      console.error("Network validation failed - you're on the wrong network!");
      alert("Please switch to the Somnia network!");
      return;
    }

    // Check nickname
    const nickname =
      window.playerNickname || document.getElementById("nickname-input").value;
    console.log("Using nickname:", nickname);
    
    if (!nickname || nickname.trim() === "") {
      console.error("Nickname empty!");
      alert("Please enter a nickname!");
      return;
    }

    console.log("Attempting to send score: Score =", score, "Nickname =", nickname);
    
    // Get signer address
    const playerAddress = await signer.getAddress();
    console.log("Address sending the transaction:", playerAddress);
    
    try {
      // First get signature from backend
      console.log("Getting signature from backend API...");
      
      // Generate random nonce
      const nonce = Math.floor(Math.random() * 1000000000);
      
      const response = await fetch(`${API_URL}/get-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: playerAddress,
          score: score,
          nickname: nickname,
          nonce: nonce
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "API error");
      }
      
      console.log("Signature received from backend:", data);
      
      if (!data.signature) {
        throw new Error("Could not get a valid signature");
      }
      
      // User is submitting their own transaction - call submitScoreWithSignature function
      console.log("Score being sent by user to blockchain...");
      const tx = await contract.submitScoreWithSignature(
        nickname, 
        score, 
        nonce, 
        data.signature
      );
      
      console.log("Transaction sent, waiting for confirmation:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Score successfully submitted! Transaction:", receipt.transactionHash);
      
      alert("Your score has been successfully submitted!");
      
      // Update leaderboard
      fetchLeaderboard();
    } catch (error) {
      console.error("Score submission error:", error);
      
      // Detailed error message
      let errorMessage = "Score submission failed: ";
      
      if (error.code === 'ACTION_REJECTED') {
        errorMessage += "Transaction rejected.";
      } else {
        errorMessage += error.message || "Unknown error";
      }
      
      alert(errorMessage);
    }
  } catch (error) {
    console.error("Score submission error:", error);
    alert("Score submission failed: " + error.message);
  }
}

// Fetch leaderboard
async function fetchLeaderboard() {
  try {
    console.log("Getting leaderboard...");
    
    // First try to get from backend API
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      const data = await response.json();
      
      if (response.ok && data.leaderboard && data.leaderboard.length > 0) {
        console.log("Leaderboard received from backend:", data.leaderboard);
        // If updateLeaderboardUI exists in game.js, use it
        if (typeof updateLeaderboardUI === 'function') {
          updateLeaderboardUI(data.leaderboard);
        } else {
          // Otherwise use the local version for backward compatibility
          updateLocalLeaderboardUI(data.leaderboard);
        }
        return;
      }
    } catch (apiError) {
      console.warn("Could not get leaderboard from backend API, trying with contract:", apiError);
    }
    
    // If backend fails, try directly with contract
    if (!contract) {
      // If contract is not connected, connect with a read-only provider
      const readProvider = new ethers.providers.JsonRpcProvider(
        "https://dream-rpc.somnia.network"
      );
      contract = new ethers.Contract(
        contractAddress,
        contractABI,
        readProvider
      );
    }

    // Get leaderboard
    const leaderboardData = await contract.getLeaderboard();
    console.log("Leaderboard data from contract:", leaderboardData);
    
    // Update UI
    if (typeof updateLeaderboardUI === 'function') {
      updateLeaderboardUI(leaderboardData);
    } else {
      updateLocalLeaderboardUI(leaderboardData);
    }
  } catch (error) {
    console.error("Leaderboard error:", error);
  }
}

// Update leaderboard UI (backward compatibility)
function updateLocalLeaderboardUI(leaderboardData) {
  // Clear leaderboard
  const leaderboardList = document.getElementById("leaderboard-list");
  if (!leaderboardList) {
    console.error("Leaderboard list element not found!");
    return;
  }
  
  leaderboardList.innerHTML = "";

  // Populate leaderboard
  leaderboardData.forEach((entry, index) => {
    const listItem = document.createElement("li");
    
    // Check address field based on entry format
    const address = entry.player ? 
      (entry.player.substring(0, 6) + "..." + entry.player.substring(entry.player.length - 4)) : 
      "Unknown";
    
    listItem.textContent = `#${index + 1} ${entry.nickname} - ${entry.score} points (${address})`;
    leaderboardList.appendChild(listItem);
  });

  // Show leaderboard
  leaderboardList.parentElement.style.display = "block";
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded, blockchain.js running");
  
  document
    .getElementById("connect-wallet")
    .addEventListener("click", connectWallet);
  
  // Set up switch network button
  const switchButton = document.getElementById("switch-network");
  switchButton.textContent = "Switch to Somnia";
  switchButton.addEventListener("click", switchToSomniaNetwork);
  
  // Add event listener to Share Score button
  document.getElementById("share-score").addEventListener("click", shareScore);
  
  // Add event listener to Save Score button (calls shareScore)
  document.getElementById("save-score").addEventListener("click", shareScore);
  
  // Initially hide switch network button
  switchButton.style.display = "none";
  
  // Automatic connection check
  if (window.ethereum) {
    console.log("Ethereum object found, checking wallet");
    
    // Listen for network changes
    window.ethereum.on('chainChanged', (newChainId) => {
      console.log('Network changed, new chain ID:', newChainId);
      location.reload();
    });
    
    // Listen for account changes
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('Account changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected
        document.getElementById("wallet").textContent = "Wallet: Not Connected";
        document.getElementById("connect-wallet").textContent = "Connect Wallet";
        document.getElementById("connect-wallet").disabled = false;
      } else {
        // New account
        connectWallet();
      }
    });
    
    window.ethereum
      .request({ method: "eth_accounts" })
      .then(accounts => {
        console.log("Current accounts:", accounts);
        if (accounts.length > 0) {
          connectWallet();
        }
      })
      .catch(err => console.error("Automatic connection check error:", err));
  } else {
    console.warn("Ethereum object not found, MetaMask might not be installed");
  }
});
