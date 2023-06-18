"use strict";

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback, element) {
            window.setTimeout(callback, 1000.0/30.0);
        };
})();


var gl = null;
var lastTime = Date.now();
var particleManager = null;

function update(dt) {
    particleManager.update(dt);
}


function drawFrame() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    particleManager.render(gl);
}


function render() {
    window.requestAnimFrame(render);

    var time = Date.now();
    var dt = (time - lastTime) * 0.001;
    lastTime = time;

    update(dt);

    drawFrame();
}

function startRender() {
    var canvas = document.getElementById("webgl-canvas");
    gl = canvas.getContext("webgl2");
    gl.viewport(0, 0, canvas.width, canvas.height);

    loadTexture("src/res/fog.png");

    particleManager = new ParticleManager(500, 50);
    particleManager.setPosition(0.0, 0.0);

    render();
}

startRender();

function loadTexture(url) {
    const texture = gl.createTexture();

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    };
    image.src = url;

    return texture;
}