// File: app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

// Updated list of endpoints with your working one as primary
const ENDPOINTS = [
  'wss://pas-rpc.stakeworld.io',           // Your working endpoint as primary
  'wss://paseo-asset-hub-rpc.polkadot.io', // Original endpoints as fallbacks
  'wss://polkadot-asset-hub-rpc.polkadot.io',
  'wss://asset-hub-paseo-rpc.dwellir.com',
  'wss://paseo-asset-hub-rpc.dwellir.com'
];

export default function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [collectionId, setCollectionId] = useState<string>('1'); // Collection ID on Asset Hub
  const [itemId, setItemId] = useState<string>('1'); // Item ID to mint
  const [currentEndpoint, setCurrentEndpoint] = useState<string>(ENDPOINTS[0]);
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [balance, setBalance] = useState<string>(''); // Added to display PAS balance
  const [apiModules, setApiModules] = useState<string[]>([]); // Store available API modules
  const mintAmount = 1; // Number of NFTs to mint

  // Attempt to connect to an available endpoint
  const connectToApi = async () => {
    let connected = false;
    let apiInstance = null;
    let attemptedEndpoints = [];

    for (const endpoint of ENDPOINTS) {
      try {
        setMessage(`Trying to connect to ${endpoint}...`);
        const wsProvider = new WsProvider(endpoint);
        
        // Add event listeners for connection status
        wsProvider.on('connected', () => {
          setMessage(`Connected to ${endpoint}`);
        });
        
        wsProvider.on('error', (error) => {
          console.error(`Connection error with ${endpoint}:`, error);
        });

        apiInstance = await ApiPromise.create({ 
          provider: wsProvider,
          throwOnConnect: true
        });
        
        // Test the connection by making a simple call
        await apiInstance.rpc.system.chain();
        
        // Check available modules
        const modules = Object.keys(apiInstance.tx);
        setApiModules(modules);
        console.log("Available API modules:", modules);
        
        setCurrentEndpoint(endpoint);
        setApi(apiInstance);
        connected = true;
        setMessage(`Successfully connected to ${endpoint}. Available modules: ${modules.join(', ')}`);
        break;
      } catch (error) {
        console.error(`Failed to connect to ${endpoint}:`, error);
        attemptedEndpoints.push(endpoint);
        if (apiInstance) {
          try {
            await apiInstance.disconnect();
          } catch (e) {
            console.error("Error disconnecting from API:", e);
          }
        }
      }
    }

    if (!connected) {
      const failedEndpoints = attemptedEndpoints.join(', ');
      setMessage(`Failed to connect to any endpoint. Tried: ${failedEndpoints}`);
      return null;
    }
    
    return apiInstance;
  };

  // Get account balance
  const fetchBalance = async () => {
    if (!api || !selectedAccount) return;

    try {
      const { data: balance } = await api.query.system.account(selectedAccount);
      const formattedBalance = formatBalance(balance.free.toString());
      setBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  // Format balance with proper decimals
  const formatBalance = (balanceString) => {
    // Assuming 12 decimals for PAS
    const decimals = 12;
    if (!balanceString) return '0';
    
    const padded = balanceString.padStart(decimals + 1, '0');
    const integerPart = padded.slice(0, -decimals) || '0';
    const fractionalPart = padded.slice(-decimals);
    return `${integerPart}.${fractionalPart} PAS`;
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      setMessage('Connecting to wallet...');

      // Initialize the extension
      const extensions = await web3Enable('Polkadot NFT Minter');

      if (extensions.length === 0) {
        setMessage('No Polkadot extension found. Please install Polkadot.js extension.');
        setLoading(false);
        return;
      }

      // Get all accounts from the extension
      const allAccounts = await web3Accounts();
      setAccounts(allAccounts);

      if (allAccounts.length > 0) {
        setSelectedAccount(allAccounts[0].address);
        setConnected(true);
        setMessage('Wallet connected successfully.');
        
        // Try to connect to API after wallet is connected
        const apiInstance = await connectToApi();
        if (apiInstance) {
          // Fetch balance after connecting
          setTimeout(() => fetchBalance(), 500);
        }
      } else {
        setMessage('No accounts found. Please create an account in the Polkadot.js extension.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setMessage(`Error connecting wallet: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const createCollection = async () => {
    if (!selectedAccount) {
      setMessage('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      
      // Ensure we have an API connection
      let apiInstance = api;
      if (!apiInstance) {
        apiInstance = await connectToApi();
        if (!apiInstance) {
          setLoading(false);
          return;
        }
      }

      // Check if nfts module exists
      if (!apiInstance.tx.nfts) {
        // Check for uniques module (older name for NFTs on some networks)
        if (apiInstance.tx.uniques) {
          setMessage('This network uses the "uniques" module instead of "nfts". Attempting to create collection using uniques...');
          
          // Get the account that will sign the transaction
          const selectedAccountData = accounts.find(account => account.address === selectedAccount);
          if (!selectedAccountData) {
            setMessage('Selected account not found');
            setLoading(false);
            return;
          }

          // Get the signer from the extension
          const injector = await web3FromSource(selectedAccountData.meta.source);
          
          // Create collection using uniques module
          const createTx = apiInstance.tx.uniques.create(
            collectionId,  // class ID in uniques terminology
            selectedAccount // admin account
          );

          setMessage('Signing transaction to create collection using uniques module...');
          
          // Sign and send the transaction
          await createTx.signAndSend(selectedAccount, { signer: injector.signer }, (result) => {
            if (result.status.isInBlock) {
              setMessage(`Collection creation included in block: ${result.status.asInBlock.toHex()}`);
            } else if (result.status.isFinalized) {
              setMessage(`Collection creation finalized in block: ${result.status.asFinalized.toHex()}`);
              setLoading(false);
              // Update balance after transaction
              fetchBalance();
            }
          });
          return;
        } else {
          // Neither nfts nor uniques module exists
          setMessage(`NFT functionality not found on this network. Available modules: ${apiModules.join(', ')}`);
          setLoading(false);
          return;
        }
      }

      setMessage(`Connected to ${currentEndpoint}. Preparing to create collection...`);

      // Get the account that will sign the transaction
      const selectedAccountData = accounts.find(account => account.address === selectedAccount);
      if (!selectedAccountData) {
        setMessage('Selected account not found');
        setLoading(false);
        return;
      }

      // Get the signer from the extension
      const injector = await web3FromSource(selectedAccountData.meta.source);

      // Configuration for the collection - updated with more detailed settings
      const config = {
        settings: 0, // Basic settings (0 means default settings)
        maxSupply: 1000, // Max supply
        mintSettings: {
          mintType: 0, // 0 for Issuer, 1 for Public
          price: null, // No price
        }
      };

      // Create the collection transaction
      const createTx = apiInstance.tx.nfts.create(selectedAccount, config);

      setMessage('Signing transaction to create collection...');
      
      // Sign and send the transaction
      await createTx.signAndSend(selectedAccount, { signer: injector.signer }, (result) => {
        if (result.status.isInBlock) {
          setMessage(`Collection creation included in block: ${result.status.asInBlock.toHex()}`);
          
          // Try to extract collection ID from events
          result.events.forEach(({ event }) => {
            if (apiInstance && apiInstance.events.nfts && apiInstance.events.nfts.CollectionCreated && apiInstance.events.nfts.CollectionCreated.is(event)) {
              const [newCollectionId] = event.data;
              setCollectionId(newCollectionId.toString());
              setMessage(`Collection created with ID: ${newCollectionId.toString()}`);
            }
          });
        } else if (result.status.isFinalized) {
          setMessage(`Collection creation finalized in block: ${result.status.asFinalized.toHex()}`);
          setLoading(false);
          // Update balance after transaction
          fetchBalance();
        }
      });
    } catch (error) {
      console.error('Error creating collection:', error);
      setMessage(`Error creating collection: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  const mintNFT = async () => {
    if (!selectedAccount) {
      setMessage('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      
      // Ensure we have an API connection
      let apiInstance = api;
      if (!apiInstance) {
        apiInstance = await connectToApi();
        if (!apiInstance) {
          setLoading(false);
          return;
        }
      }

      setMessage(`Connected to ${currentEndpoint}. Preparing transaction...`);

      // Get the account that will sign the transaction
      const selectedAccountData = accounts.find(account => account.address === selectedAccount);
      if (!selectedAccountData) {
        setMessage('Selected account not found');
        setLoading(false);
        return;
      }

      // Get the signer from the extension
      const injector = await web3FromSource(selectedAccountData.meta.source);

      // Check if nfts module exists
      if (!apiInstance.tx.nfts) {
        // Check for uniques module (older name for NFTs on some networks)
        if (apiInstance.tx.uniques) {
          setMessage('This network uses the "uniques" module instead of "nfts". Attempting to mint using uniques...');
          
          // Mint using uniques module
          const mintTx = apiInstance.tx.uniques.mint(
            collectionId,  // class ID in uniques terminology
            itemId,        // instance ID
            selectedAccount // owner
          );

          setMessage('Signing transaction using uniques module...');

          // Sign and send the transaction
          await mintTx.signAndSend(selectedAccount, { signer: injector.signer }, (status) => {
            if (status.isInBlock) {
              setMessage(`Transaction included in block: ${status.asInBlock.toHex()}`);
            } else if (status.isFinalized) {
              setMessage(`Transaction finalized in block: ${status.asFinalized.toHex()}`);
              setLoading(false);
              // Increment item ID for next mint
              setItemId(prevId => (parseInt(prevId) + 1).toString());
              // Update balance after transaction
              fetchBalance();
            }
          });
          return;
        } else {
          // Neither nfts nor uniques module exists
          setMessage(`NFT functionality not found on this network. Available modules: ${apiModules.join(', ')}`);
          setLoading(false);
          return;
        }
      }

      // Create the mint transaction with nfts module
      const mintTx = apiInstance.tx.nfts.mint(
        collectionId,
        itemId,
        selectedAccount,
        mintAmount
      );

      setMessage('Signing transaction...');

      // Sign and send the transaction
      await mintTx.signAndSend(selectedAccount, { signer: injector.signer }, (status) => {
        if (status.isInBlock) {
          setMessage(`Transaction included in block: ${status.asInBlock.toHex()}`);
        } else if (status.isFinalized) {
          setMessage(`Transaction finalized in block: ${status.asFinalized.toHex()}`);
          setLoading(false);
          // Increment item ID for next mint
          setItemId(prevId => (parseInt(prevId) + 1).toString());
          // Update balance after transaction
          fetchBalance();
        }
      });
    } catch (error) {
      console.error('Error minting NFT:', error);
      setMessage(`Error minting NFT: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  const setMetadata = async () => {
    if (!selectedAccount) {
      setMessage('Please connect wallet first');
      return;
    }

    try {
      setLoading(true);
      
      // Ensure we have an API connection
      let apiInstance = api;
      if (!apiInstance) {
        apiInstance = await connectToApi();
        if (!apiInstance) {
          setLoading(false);
          return;
        }
      }

      setMessage(`Connected to ${currentEndpoint}. Preparing to set metadata...`);

      // Get the account that will sign the transaction
      const selectedAccountData = accounts.find(account => account.address === selectedAccount);
      if (!selectedAccountData) {
        setMessage('Selected account not found');
        setLoading(false);
        return;
      }

      // Get the signer from the extension
      const injector = await web3FromSource(selectedAccountData.meta.source);

      // Example metadata - enhanced with more details
      const metadata = JSON.stringify({
        name: `Paseo NFT #${itemId}`,
        description: "A custom NFT on Paseo Asset Hub",
        image: "ipfs://example-placeholder-uri",
        attributes: [
          {
            trait_type: "Rarity",
            value: "Common"
          },
          {
            trait_type: "Collection",
            value: `Paseo #${collectionId}`
          },
          {
            trait_type: "Creator",
            value: selectedAccount.slice(0, 8) + '...'
          }
        ]
      });

      // Check if nfts module exists
      if (!apiInstance.tx.nfts) {
        // Check for uniques module (older name for NFTs on some networks)
        if (apiInstance.tx.uniques) {
          setMessage('This network uses the "uniques" module instead of "nfts". Attempting to set metadata using uniques...');
          
          // Set metadata using uniques module
          const metadataTx = apiInstance.tx.uniques.setMetadata(
            collectionId,  // class ID in uniques terminology
            itemId,        // instance ID
            metadata,      // metadata
            false          // is frozen
          );

          setMessage('Signing transaction to set metadata using uniques module...');

          // Sign and send the transaction
          await metadataTx.signAndSend(selectedAccount, { signer: injector.signer }, (status) => {
            if (status.isInBlock) {
              setMessage(`Metadata transaction included in block: ${status.asInBlock.toHex()}`);
            } else if (status.isFinalized) {
              setMessage(`Metadata transaction finalized in block: ${status.asFinalized.toHex()}`);
              setLoading(false);
              // Update balance after transaction
              fetchBalance();
            }
          });
          return;
        } else {
          // Neither nfts nor uniques module exists
          setMessage(`NFT functionality not found on this network. Available modules: ${apiModules.join(', ')}`);
          setLoading(false);
          return;
        }
      }

      // Set metadata for the NFT using nfts module
      const metadataTx = apiInstance.tx.nfts.setMetadata(
        collectionId,
        itemId,
        metadata
      );

      setMessage('Signing transaction to set metadata...');

      // Sign and send the transaction
      await metadataTx.signAndSend(selectedAccount, { signer: injector.signer }, (status) => {
        if (status.isInBlock) {
          setMessage(`Metadata transaction included in block: ${status.asInBlock.toHex()}`);
        } else if (status.isFinalized) {
          setMessage(`Metadata transaction finalized in block: ${status.asFinalized.toHex()}`);
          setLoading(false);
          // Update balance after transaction
          fetchBalance();
        }
      });
    } catch (error) {
      console.error('Error setting metadata:', error);
      setMessage(`Error setting metadata: ${error instanceof Error ? error.message : String(error)}`);
      setLoading(false);
    }
  };

  // Update balance when selected account changes
  useEffect(() => {
    if (api && selectedAccount) {
      fetchBalance();
    }
  }, [selectedAccount, api]);

  // Clean up API connection when component unmounts
  useEffect(() => {
    return () => {
      if (api) {
        api.disconnect().catch(console.error);
      }
    };
  }, [api]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">Paseo NFT Minter</h1>

      {!connected ? (
        <button
          onClick={connectWallet}
          disabled={loading}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="w-full max-w-md">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Connected Node
            </label>
            <div className="shadow border rounded w-full py-2 px-3 text-gray-700 bg-gray-100">
              {currentEndpoint || "Not connected"}
            </div>
          </div>
        
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
              }}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {accounts.map((account) => (
                <option key={account.address} value={account.address}>
                  {account.meta.name || 'Unnamed'} ({account.address.slice(0, 6)}...{account.address.slice(-6)})
                </option>
              ))}
            </select>
          </div>
          
          {balance && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <label className="block text-gray-700 text-sm font-bold mb-1">
                Your Balance
              </label>
              <div className="text-lg font-medium text-green-700">
                {balance}
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Collection ID
            </label>
            <input
              type="text"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={loading}
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Item ID
            </label>
            <input
              type="text" 
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={() => connectToApi()}
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Reconnect to Network'}
            </button>
            
            <button
              onClick={createCollection}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Create Collection'}
            </button>
            
            <button
              onClick={mintNFT}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Mint NFT'}
            </button>
            
            <button
              onClick={setMetadata}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Set Metadata'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 p-4 border rounded bg-gray-100 w-full max-w-md">
          <p className="text-gray-800">{message}</p>
        </div>
      )}
    </main>
  );
}