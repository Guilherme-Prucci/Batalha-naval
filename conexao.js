const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'Aguardando.html'));
});

app.get('/batalha-naval.html', (req, res) => {
  res.sendFile(join(__dirname, 'batalha-naval.html'));
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  socket.on('joinQueue', () => {
    // Encontrar uma sala disponível ou criar uma nova
    let roomFound = null;
    
    // Procurar por salas com apenas 1 jogador
    for (const [roomId, players] of Object.entries(rooms)) {
      if (players.length === 1) {
        roomFound = roomId;
        break;
      }
    }

    if (roomFound) {
      // Entrar na sala existente
      socket.join(roomFound);
      rooms[roomFound].push(socket.id);
      
      // Notificar ambos os jogadores que o jogo pode começar
      io.to(roomFound).emit('startGame', roomFound);
      console.log(`Jogo iniciado na sala ${roomFound} entre ${rooms[roomFound][0]} e ${rooms[roomFound][1]}`);
    } else {
      // Criar nova sala
      const newRoom = `room-${Date.now()}`;
      socket.join(newRoom);
      rooms[newRoom] = [socket.id];
      console.log(`Jogador ${socket.id} aguardando na sala ${newRoom}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    
    // Remover jogador de todas as salas
    for (const [roomId, players] of Object.entries(rooms)) {
      const index = players.indexOf(socket.id);
      if (index !== -1) {
        players.splice(index, 1);
        
        // Se a sala ficar vazia, removê-la
        if (players.length === 0) {
          delete rooms[roomId];
        } else {
          // Notificar o jogador restante que o oponente saiu
          io.to(roomId).emit('opponentDisconnected');
        }
        break;
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});