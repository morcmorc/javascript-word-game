const germanCategories = require("./germanCategories.js");

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const { log } = require("console");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

// Store the lobbies and their state
let lobbies = {};

// Function to generate a unique lobby code
function generateLobbyCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Function to select a random word from the German categories
function selectRandomWord() {
  return germanCategories[Math.floor(Math.random() * germanCategories.length)];
}

io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  // Handle lobby creation
  socket.on("create_lobby", () => {
    const lobbyCode = generateLobbyCode();
    lobbies[lobbyCode] = {
      players: [socket.id],
      word: "",
      playerGuesses: {},
      sharedScore: 0,
      highscore: 0,
    };

    socket.join(lobbyCode);
    socket.emit("lobby_created", { lobbyCode });
    const lobby = lobbies[lobbyCode];
    const cnt = lobby.players.length;
    socket.emit("player_count", cnt);
    console.log(`Lobby ${lobbyCode} created by player ${socket.id}`);
    socket.emit("assign_role", cnt);
    io.to(lobbyCode).emit("score_update", {
      sharedScore: lobby.sharedScore,
      highscore: lobby.highscore,
    });
  });

  // Handle lobby joining
  socket.on("join_lobby", (lobbyCode) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) {
      return;
    }
    if (lobby.players.length < 2) {
      lobby.players.push(socket.id);
      socket.join(lobbyCode);
      socket.emit("lobby_joined", { lobbyCode });
      const cnt = lobby.players.length;
      io.to(lobbyCode).emit("player_count", cnt);
      socket.emit("assign_role", cnt);
      // socket.emit("player_count", cnt);

      // Notify players the game can start
      io.to(lobbyCode).emit("start_game", { message: "Game starting!" });

      // Select a random word for the lobby
      lobby.word = selectRandomWord();
      io.to(lobbyCode).emit("new_word", lobby.word);
      io.to(lobbyCode).emit("score_update", {
        sharedScore: lobby.sharedScore,
        highscore: lobby.highscore,
      });
    } else {
      console.log(lobby);
      console.log(lobby.players.length);
      socket.emit("lobby_error", { message: "Lobby full or doesn't exist." });
      // console.log("join_lobby_server_else");
    }
  });

  // Handle guess submissions
  socket.on("word_submit", ({ lobbyCode, guess }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return;

    // Store the player's guess
    lobby.playerGuesses[socket.id] = guess;

    // Check if both players have submitted their guesses
    if (Object.keys(lobby.playerGuesses).length === 2) {
      const [player1Id, player2Id] = lobby.players;
      const guess1 = lobby.playerGuesses[player1Id];
      const guess2 = lobby.playerGuesses[player2Id];

      // Send both guesses to both players
      io.to(lobbyCode).emit("guesses", {
        player1Guess: guess1,
        player2Guess: guess2,
      });

      // Determine if the guesses are the same
      if (guess1.toLowerCase() === guess2.toLowerCase()) {
        io.to(lobbyCode).emit("result", { success: true });

        // If guesses match, increase score
        lobby.sharedScore += 1;

        // Update highscore if necessary
        if (lobby.sharedScore > lobby.highscore) {
          lobby.highscore = lobby.sharedScore;
        }
        io.to(lobbyCode).emit("score_update", {
          sharedScore: lobby.sharedScore,
          highscore: lobby.highscore,
        });
      } else {
        io.to(lobbyCode).emit("result", { success: false });
        lobby.sharedScore = 0; // Reset score if guesses don't match
        io.to(lobbyCode).emit("score_update", {
          sharedScore: lobby.sharedScore,
          highscore: lobby.highscore,
        });
      }

      // Clear guesses for the next round
      lobby.playerGuesses = {};
    }
  });

  // Handle "Next Word" request
  socket.on("next_word", (lobbyCode) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return;

    // Select a new word for the lobby
    lobby.word = selectRandomWord();
    lobby.playerGuesses = {}; // Clear guesses
    io.to(lobbyCode).emit("new_word", lobby.word);
  });

  // Handle disconnections
  socket.on("disconnect", () => {
    console.log("A player disconnected:", socket.id);

    // Clean up the player's lobby state
    for (const lobbyCode in lobbies) {
      const lobby = lobbies[lobbyCode];
      if (lobby.players.includes(socket.id)) {
        // Remove the player from the lobby
        lobby.players = lobby.players.filter((id) => id !== socket.id);

        // If lobby is now empty, remove it
        if (lobby.players.length === 0) {
          delete lobbies[lobbyCode];
        } else {
          // Notify the remaining player
          io.to(lobbyCode).emit("player_disconnected", {
            message: "Your opponent disconnected.",
          });
          const cnt = lobby.players.length;
          io.to(lobbyCode).emit("player_count", cnt);
          io.to(lobbyCode).emit("assign_role", cnt);
        }
        break;
      }
    }
  });

  // Handle score reset request
  socket.on("reset_score", (lobbyCode) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby) return;

    lobby.sharedScore = 0;
    lobby.highscore = 0;
    io.to(lobbyCode).emit("score_update", {
      sharedScore: lobby.sharedScore,
      highscore: lobby.highscore,
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
