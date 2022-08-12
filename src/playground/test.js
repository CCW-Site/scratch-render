const ScratchRender = require('../RenderWebGL');

var canvas = document.getElementById('myStage');
var debug = document.getElementById('myDebug');

// Instantiate the renderer
var renderer = new ScratchRender(canvas);

// Connect to debug canvas
renderer.setDebugCanvas(debug);

// Start drawing
function drawStep() {
    renderer.draw();
    requestAnimationFrame(drawStep);
}
drawStep();

// Connect to worker (see "playground" example)
// var worker = new Worker('worker.js');
// renderer.connectWorker(worker);