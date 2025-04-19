/* eslint-disable @typescript-eslint/ban-ts-comment */
// app/ludo/page.tsx
'use client';

import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { cn } from '@/lib/utils';

const socket = io('http://localhost:4000');

const colors = ['red', 'blue', 'green', 'yellow'];

const BOARD_SIZE = 15;

const createInitialTokens = () => ({
  red: [-1, -1, -1, -1],
  blue: [-1, -1, -1, -1],
  green: [-1, -1, -1, -1],
  yellow: [-1, -1, -1, -1],
});

// Sample linear path (you'll need to create complete paths for each color)
const redPath = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 30, 45, 60, 75, 90,
  91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
];

const colorPaths: Record<string, number[]> = {
  red: redPath,
  blue: [...redPath],
  green: [...redPath],
  yellow: [...redPath],
};

const LudoPage = () => {
  const [roomId] = useState<string>('demo-room');
  const [playerId] = useState<string>(() => uuidv4());
  const [players, setPlayers] = useState<{ id: string; name: string; color: string }[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [tokens, setTokens] = useState(createInitialTokens);
  const [currentTurn, setCurrentTurn] = useState<number>(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);

  const handleJoinGame = () => {
    if (playerName.trim() === '') return;
    socket.emit('join-room', { roomId, playerName });
    setShowNameInput(false);
  };

  useEffect(() => {
    socket.on('player-joined', (playerList: { id: string; name: string; color: string }[]) => {
      setPlayers(playerList);
      if (playerList.length === 1) {
        setCurrentTurn(0);
      }
    });

    socket.on('dice-rolled', ({ player, value }) => {
      setDiceValue(value);
    });

    socket.on('token-moved', ({ color, index, newPos }) => {
      setTokens(prev => ({
        ...prev,
        [color]: prev[color].map((pos, i) => (i === index ? newPos : pos)),
      }));
      setCurrentTurn(prev => (prev + 1) % players.length);
      setDiceValue(null);
    });

    return () => {
      socket.off('player-joined');
      socket.off('dice-rolled');
      socket.off('token-moved');
    };
  }, [roomId]);

  const myPlayer = players.find(p => p.id === playerId);
  const myColor = myPlayer?.color ?? null;
  const isMyTurn = players[currentTurn]?.id === playerId;

  const rollDice = () => {
    if (!isMyTurn || !myColor) return;
    const value = Math.ceil(Math.random() * 6);
    socket.emit('dice-roll', { roomId, player: playerId, value });
  };

  const moveToken = (index: number) => {
    if (!isMyTurn || diceValue === null) return;
    const currentPath = colorPaths[myColor];
    const currentStep = tokens[myColor][index];
    if (currentStep + diceValue >= currentPath.length) return;
    const newPos = currentStep + diceValue;
    socket.emit('move-token', {
      roomId,
      moveData: {
        color: myColor,
        index,
        newPos,
      },
    });
  };

  const getCellColor = (i: number, j: number) => {
    // Center safe zone
    if (i >= 6 && i <= 8 && j >= 6 && j <= 8) return 'bg-gray-300';
    
    // Player home areas
    if (i < 6 && j < 6) return 'bg-red-200';
    if (i < 6 && j > 8) return 'bg-blue-200';
    if (i > 8 && j < 6) return 'bg-green-200';
    if (i > 8 && j > 8) return 'bg-yellow-200';
    
    // Path cells
    if (i === 6 || i === 8 || j === 6 || j === 8) return 'bg-gray-100';
    
    return 'bg-white';
  };

  const renderBoard = () => {
    const grid: JSX.Element[] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE; j++) {
        grid.push(
          <div
            key={`${i}-${j}`}
            className={cn(
              'w-8 h-8 border flex items-center justify-center text-xs',
              getCellColor(i, j)
            )}
          >
            {/* Render tokens here */}
          </div>
        );
      }
    }
    return <div className="grid grid-cols-15 gap-0">{grid}</div>;
  };

  if (showNameInput) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Join Ludo Game</h1>
        <input
          type="text"
          placeholder="Enter your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="border p-2 mr-2"
        />
        <button
          onClick={handleJoinGame}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Join Game
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Multiplayer Ludo</h1>
      <p>Room ID: {roomId}</p>
      <p>Your Color: {myColor}</p>
      <p>Current Turn: {players[currentTurn]?.name}</p>

      <button
        onClick={rollDice}
        disabled={!isMyTurn}
        className="px-4 py-2 bg-blue-500 text-white rounded my-4"
      >
        Roll Dice
      </button>

      {diceValue !== null && <p>Dice Rolled: {diceValue}</p>}

      <div className="mb-4">
        {tokens[myColor] ? tokens[myColor].map((pos, idx) => (
          <div
            key={idx}
            onClick={() => moveToken(idx)}
            className="p-2 bg-gray-100 text-center border rounded cursor-pointer"
          >
            Token {idx + 1}: {pos === -1 ? 'Home' : `Step ${pos}`}
          </div>
        )) : <p>Waiting for color assignment...</p>}
      </div>

      {renderBoard()}
    </div>
  );
};

export default LudoPage;
