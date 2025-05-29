let mic;

function setup() {
  createCanvas(400, 200);
  mic = new p5.AudioIn();
  mic.start();
}

function draw() {
  background(0);
  let vol = mic.getLevel();
  fill(255);
  textSize(32);
  text("Mic Level: " + vol.toFixed(3), 10, 100);
}

function touchStarted() {
  getAudioContext().resume();
}
