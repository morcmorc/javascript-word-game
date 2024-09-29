const germanCategories = require("./germanCategories.js");

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));

// const words = ["apple", "banana", "cherry", "grape", "orange"];
let currentWord = "";
let players = {};
let playerCount = 0;
let highscore = 0; // Tracks the highest score
let sharedScore = 0; // Score shared by both players

function selectRandomWord() {
  currentWord =
    germanCategories[Math.floor(Math.random() * germanCategories.length)];
}

io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  playerCount++;
  let playerRole = playerCount === 1 ? "Player 1" : "Player 2";

  // Send the player their role (Player 1 or Player 2)
  socket.emit("assign_role", playerRole);

  // Notify all clients about the number of connected players
  io.emit("player_count", playerCount);

  // Wait until two players are connected before starting the game
  if (playerCount === 2) {
    selectRandomWord();
    io.emit("new_word", currentWord); // Send the word to both players
  }

  socket.on("word_submit", (guess) => {
    players[socket.id] = guess;

    // Check if both players have submitted their guesses
    if (Object.keys(players).length === 2) {
      const [player1Id, player2Id] = Object.keys(players);
      const guess1 = players[player1Id];
      const guess2 = players[player2Id];

      // Send both guesses to both players
      io.emit("guesses", {
        player1Guess: guess1,
        player2Guess: guess2,
      });

      // Determine if the guesses are the same
      if (guess1 === guess2) {
        io.emit("result", { success: true });
        // If guesses match, award a point
        sharedScore += 1;

        if (sharedScore > highscore) {
          highscore = sharedScore;
        }
        io.emit("score_update", { sharedScore, highscore });
      } else {
        io.emit("result", { success: false });
        sharedScore = 0;
        io.emit("score_update", { sharedScore, highscore });
      }

      // Don't reset the game automatically. Wait for "Next Word" request.
    }
  });

  // Handle the "Next Word" button press
  socket.on("next_word", () => {
    players = {}; // Clear previous guesses
    selectRandomWord(); // Get a new word
    io.emit("new_word", currentWord); // Send the new word to both players
  });

  socket.on("disconnect", () => {
    console.log("A player disconnected:", socket.id);
    playerCount--;
    delete players[socket.id];

    io.emit("player_count", playerCount);
  });

  // Reset highscore and score when requested by the client
  socket.on("reset_score", () => {
    sharedScore = 0;
    highscore = 0;
    io.emit("score_update", { sharedScore, highscore });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
