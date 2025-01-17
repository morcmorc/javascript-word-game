const socket = io();
let role = "";
let currentLobbyCode = "";

// Handle lobby creation
function createLobby() {
  socket.emit("create_lobby");
}

// Handle lobby joining
function joinLobby() {
  const lobbyCode = document.getElementById("lobbyCodeInput").value;
  if (lobbyCode) {
    socket.emit("join_lobby", lobbyCode);
    // console.log(lobbyCode);
    currentLobbyCode = lobbyCode; // Set current lobby code
  }
}

// Listen for lobby creation confirmation
socket.on("lobby_created", (data) => {
  currentLobbyCode = data.lobbyCode;
  document.getElementById("lobbyCodeDisplay").textContent = `${data.lobbyCode}`;
  showGamePage(); // Switch to the game page
});

// Listen for lobby join confirmation
socket.on("lobby_joined", (data) => {
  currentLobbyCode = data.lobbyCode;
  document.getElementById("lobbyCodeDisplay").textContent = `${data.lobbyCode}`;
  showGamePage(); // Switch to the game page
});

// Function to show the game page and hide the landing page
function showGamePage() {
  document.getElementById("landingPage").style.display = "none"; // Hide landing page
  document.getElementById("gamePage").style.display = "block"; // Show game page
}

// Listen for the game to start after both players have joined
socket.on("start_game", (data) => {
  document.getElementById("result").textContent = data.message;
});

// Listen for the word from the server
socket.on("new_word", (word) => {
  document.getElementById("word").textContent = word;
  document.getElementById("result").textContent = ""; // Clear previous result
  document.getElementById("guess").value = ""; // Clear input field
  document.getElementById("player1Guess").textContent = "Waiting...";
  document.getElementById("player2Guess").textContent = "Waiting...";
  document.getElementById("nextWordBtn").style.display = "none"; // Hide button
  enableBtn();
});

// Listen for the player's assigned role (Player 1 or Player 2)
socket.on("assign_role", (playerRole) => {
  document.getElementById("playerRole").textContent = playerRole;
  role = playerRole;
});

// Listen for the result
socket.on("result", (data) => {
  if (data.success) {
    document.getElementById("result").textContent = "You both guessed right!";
    disableBtn();
  } else {
    document.getElementById("result").textContent =
      "Game Over! Guesses did not match.";
    disableBtn();
  }
  document.getElementById("nextWordBtn").style.display = "inline-block"; // Show "Next Word" button
});

// Listen for player count updates
socket.on("player_count", (count) => {
  //   console.log(count);
  document.getElementById(
    "playerCount"
  ).textContent = `Connected players: ${count}`;
});

// Listen for both guesses
socket.on("guesses", (data) => {
  document.getElementById("player1Guess").textContent = data.player1Guess;
  document.getElementById("player2Guess").textContent = data.player2Guess;
});

// Listen for score updates
socket.on("score_update", (data) => {
  document.getElementById(
    "playerScore"
  ).textContent = `Score: ${data.sharedScore}`;
  document.getElementById(
    "highscore"
  ).textContent = `Highscore: ${data.highscore}`;
});

function resetScores() {
  socket.emit("reset_score", currentLobbyCode); // Pass the current lobby code
}

function disableBtn() {
  const button = document.getElementById("confirmBtn");
  button.disabled = true;
}
function enableBtn() {
  const button = document.getElementById("confirmBtn");
  button.disabled = false;
}

// Send the player's guess to the server with the lobby code
function submitGuess() {
  const guess = document.getElementById("guess").value;
  if (!currentLobbyCode) return; // Ensure the player is in a lobby

  // Update the guess display for the correct player
  if (role === 1) {
    document.getElementById("player1Guess").textContent = guess;
  } else if (role === 2) {
    document.getElementById("player2Guess").textContent = guess;
  }

  socket.emit("word_submit", { lobbyCode: currentLobbyCode, guess });
}

// Request the next word manually
function requestNextWord() {
  socket.emit("next_word", currentLobbyCode); // Send current lobby code to the server
}
