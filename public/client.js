const socket = io();
let role = "";

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
  socket.emit("reset_score");
}

function disableBtn() {
  const button = document.getElementById("confirmBtn");
  button.disabled = true;
}
function enableBtn() {
  const button = document.getElementById("confirmBtn");
  button.disabled = false;
}

function increaseScore() {
  score++;
  document.getElementById("score").textContent = score.toString();
}

// Send the player's guess to the server
function submitGuess() {
  const guess = document.getElementById("guess").value;

  // Update the guess display for the correct player
  if (role === "Player 1") {
    document.getElementById("player1Guess").textContent = guess;
  } else if (role === "Player 2") {
    document.getElementById("player2Guess").textContent = guess;
  }

  socket.emit("word_submit", guess);
}

// Request the next word manually
function requestNextWord() {
  socket.emit("next_word");
}
