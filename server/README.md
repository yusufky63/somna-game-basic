# Somna Game Backend

This folder contains the backend API for the Somna Space Impact game.

## Setup

1. Install required packages:
```
cd server
npm install
```

2. Create a `.env` file:
```
# Server port
PORT=3000

# Blockchain wallet private key (without 0x)
PRIVATE_KEY=your_private_key_here
```

**Important Note:** The PRIVATE_KEY value is the private key of the wallet used for blockchain operations. Keep this value secure and never share it!

**Security Note:** Your server wallet must have the `owner` or `signer` role. These roles can be checked and viewed via the `/api/status` endpoint.

## Running

To run in development mode:
```
npm run dev
```

To run in production mode:
```
npm start
```

## API Endpoints

### General Endpoints
- `GET /api/health` - Server health check
- `GET /api/leaderboard` - Returns leaderboard data
- `POST /api/submit-score` - Records a new score (requires signed message)

### Admin Endpoints
- `GET /api/status` - Shows detailed server and contract status
- `GET /api/check-roles` - Shows contract roles (returns owner and signer addresses)
- `POST /api/set-signer` - Sets a new signer address (only contract owner can call)

## Frontend Integration

This server exposes the same API endpoints as referenced in `blockchain.js` via the API_URL variable. The frontend code makes requests to the URL where this server is running.

## Authorization System

The contract uses the following roles:
- **Owner**: The address that deployed the contract, has full authority.
- **Signer**: A trusted address assigned by the owner, authorized to record scores.

If the server does not have one of these roles, it cannot record scores. Use the `/api/status` endpoint to check roles.

## Troubleshooting

1. **"Blockchain connection could not be established or signing authority missing" error:**
   - Make sure the PRIVATE_KEY value is set correctly in the `.env` file
   - Call the `/api/status` endpoint to check if the server has the required authority
   - The server address must have the owner or signer role on the contract

2. **"Contract operation failed" error:**
   - Make sure the server wallet has enough gas
   - Ensure the server address is set with the correct roles on the contract

3. **To set the signer role:**
   - As the contract owner, use MetaMask or
   - Call the `setSigner` function from the server using the owner's private key 

---

## How the Project Works

This project is a blockchain-based Space Impact game. Players can save their scores to the blockchain and compete on a global leaderboard. The system consists of three main components:

### 1. Frontend (index.html, game.js, blockchain.js)
- The player plays the game in the browser.
- Connects their wallet (e.g., MetaMask).
- At the end of the game, the player can save their score to the blockchain by clicking "Save Score" or "Share Score".
- The frontend communicates with the backend to get a signature or to submit the score directly.

### 2. Backend (server/server.js)
- Provides an Express.js API.
- Uses the PRIVATE_KEY from the .env file to sign blockchain transactions.
- Main API endpoints:
  - `/api/submit-score`: Saves the score to the contract (backend-signed).
  - `/api/get-signature`: Generates a signature for the user to submit their own transaction.
  - `/api/leaderboard`: Returns the leaderboard.
  - `/api/status`, `/api/check-roles`, `/api/set-signer`: Administrative endpoints for contract/server roles.

### 3. Smart Contract (spaceImpact.sol)
- Stores player scores and the leaderboard on-chain.
- Only the owner or signer addresses can record scores.
- Uses signature and nonce mechanisms to prevent fraud.

#### Flow Summary
1. The player plays and wants to save their score.
2. Connects their wallet and requests to save the score.
3. The backend verifies the request, generates a signature, or saves the score directly to the contract.
4. The score is stored on the blockchain.
5. The leaderboard can be fetched from the backend or directly from the contract.

---

## Keeping .env Secret

- The `.env` file is now included in `.gitignore` and will not be committed to git.
- If `.env` was ever committed, you should remove it from git history using tools like `git filter-branch` or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/).
- Never share your `.env` file or your private keys publicly.
- Always check your `.gitignore` before pushing to GitHub to ensure sensitive files are excluded. 