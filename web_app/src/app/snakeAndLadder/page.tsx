/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { web3Accounts, web3Enable } from '@polkadot/extension-dapp'
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types'

const BOARD_SIZE = 100;

const SNAKE_LADDERS = {
    ladders: {
        4: 14,
        9: 31,
        20: 38,
        28: 84,
        40: 59,
        51: 67,
        63: 81,
        71: 91
    },
    snakes: {
        17: 7,
        54: 34,
        62: 19,
        64: 60,
        87: 24,
        93: 73,
        95: 75,
        99: 78
    }
};

export default function Page() {
    const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
    const [players, setPlayers] = useState([{ position: 1 }, { position: 1 }]);
    const [currentPlayer, setCurrentPlayer] = useState(0);
    const [diceValue, setDiceValue] = useState(0);
    const [gameMessage, setGameMessage] = useState('');
    const [connected, setConnected] = useState<boolean>(false);

    const connectWallet = async () => {
        try {
            await web3Enable('SnakeAndLadder');
            const allAccounts = await web3Accounts();
            setAccounts(allAccounts);
            if (allAccounts.length > 0) {
                setSelectedAccount(allAccounts[0]);
                setConnected(true);
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
        }
    };

    const handleAccountChange = (account: InjectedAccountWithMeta) => {
        setSelectedAccount(account);
    };

    const rollDice = () => {
        const value = Math.floor(Math.random() * 6) + 1;
        setDiceValue(value);
        movePlayer(value);
    };

    const movePlayer = (steps: number) => {
        const newPlayers = [...players];
        let newPosition = newPlayers[currentPlayer].position + steps;

        // @ts-ignore
        if (SNAKE_LADDERS.ladders[newPosition]) {
            // @ts-ignore
            newPosition = SNAKE_LADDERS.ladders[newPosition];
            setGameMessage(`Player ${currentPlayer + 1} climbed a ladder to ${newPosition}!`);
        }

        // @ts-ignore
        else if (SNAKE_LADDERS.snakes[newPosition]) {
            // @ts-ignore
            newPosition = SNAKE_LADDERS.snakes[newPosition];
            setGameMessage(`Oh no! Player ${currentPlayer + 1} slid down a snake to ${newPosition}!`);
        } else {
            setGameMessage('');
        }

        if (newPosition >= BOARD_SIZE) {
            newPosition = BOARD_SIZE;
            setGameMessage(`Player ${currentPlayer + 1} wins!`);
            newPlayers[currentPlayer].position = newPosition;
            setPlayers(newPlayers);
            return;
        }

        newPlayers[currentPlayer].position = newPosition;
        setPlayers(newPlayers);
        setCurrentPlayer((currentPlayer + 1) % 2);
    };

    const renderBoard = () => {
        const board = [];
        for (let row = 0; row < 10; row++) {
            const rowCells = [];
            const start = BOARD_SIZE - row * 10;
            const end = start - 9;

            if (row % 2 === 0) {
                for (let i = start; i >= end; i--) {
                    rowCells.push(renderCell(i));
                }
            } else {
                for (let i = end; i <= start; i++) {
                    rowCells.push(renderCell(i));
                }
            }

            board.push(
                <div key={row} className='flex'>
                    {rowCells}
                </div>
            );
        }
        return (
            <div className=''>
                {board}
            </div>
        );
    };

    const renderCell = (cellNumber: number) => {
        // @ts-ignore
        const isLadder = SNAKE_LADDERS.ladders[cellNumber];
        // @ts-ignore
        const isSnake = SNAKE_LADDERS.snakes[cellNumber];
        const playersHere = players.filter(p => p.position === cellNumber);

        return (
            <div key={cellNumber} className={`cell ${isLadder ? 'ladder' : ''} ${isSnake ? 'snake' : ''}`}>
                <div className='cell-number'>{cellNumber}</div>
                <div className='players-container'>
                    {playersHere.map((_, idx) => (
                        <div key={idx} className={`player player-${players.indexOf(playersHere[idx]) + 1}`}>
                            P{players.indexOf(playersHere[idx]) + 1}
                        </div>
                    ))}
                </div>
                {isLadder && <div className='ladder-icon'>🪜</div>}
                {isSnake && <div className='snake-icon'>🐍</div>}
            </div>
        );
    };

    return (
        <div className='px-16 py-4 min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100'>

            {!connected ? (
                <div className='flex items-center justify-center min-h-[80vh]'>
                <Button onClick={connectWallet}>
                    Connect Wallet
                </Button>
                </div>
            ) : (
                <div className='flex flex-col items-center space-y-4'>

                    <div className='wallet-info'>
                        {/* <p>Connected Account: {selectedAccount?.meta.name}</p> */}
                        <select
                            onChange={(e) => {
                                const account = accounts.find(acc => acc.address === e.target.value);
                                if (account) handleAccountChange(account);
                            }}
                            value={selectedAccount?.address}
                            className='account-select'
                        >
                            {accounts.map((account) => (
                                <option key={account.address} value={account.address}>
                                    {account.meta.name} ({account.address.slice(0, 6)}...)
                                </option>
                            ))}
                        </select>
                    </div>

                    <h1 className='font-semibold text-2xl'>Snake and Ladder Game</h1>
                    <div className='game-info'>
                        <p>Current Player: Player {currentPlayer + 1}</p>
                        <p>Dice Value: {diceValue}</p>
                        <p>{gameMessage}</p>
                    </div>
                    <div className='board'>
                        {renderBoard()}
                    </div>
                    <button
                        onClick={rollDice}
                        disabled={players.some(p => p.position >= BOARD_SIZE)}
                        className='roll-button'
                    >
                        Roll Dice
                    </button>
                </div>
            )}
        </div>
    )
}
