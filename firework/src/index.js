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
var particleManager2 = null;
var particleManager3 = null;


function update(dt) {
    particleManager.update(dt);
    particleManager2.update(dt);
    particleManager3.update(dt);
}


function drawFrame() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    particleManager.render(gl);
    particleManager2.render(gl);
    particleManager3.render(gl);
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

    loadTexture("src/res/spark.png")

    particleManager = new ParticleManager(1000, 5000);
    particleManager.setPosition(-0.5, 0.5);
    particleManager.setRandomColor();

    particleManager2 = new ParticleManager(500, 6000);
    particleManager2.setPosition(0.5, 0.7);
    particleManager2.setRandomColor();

    particleManager3 = new ParticleManager(200, 8000);
    particleManager3.setPosition(-0.1, 0.0);
    particleManager3.setRandomColor();

    render();
}

startRender();

function loadTexture(url) {
    const texture = gl.createTexture();

    const image = new Image();
    image.onload = function () {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    };
    image.src = url;

    return texture;
}