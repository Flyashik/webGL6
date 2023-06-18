"use strict";
 
var vsSource = [
    "attribute vec2 a_position;",
    "attribute float a_alpha;",
    "attribute vec2 vertTexCoord;",
    "",
    "varying float v_alpha;",
    "varying vec2 fragTexCoord;",
    "varying vec2 globalPos;",
    "",
    "void main() {",
    "    globalPos = a_position;",
    "    fragTexCoord = vertTexCoord;",
    "    gl_Position = vec4(a_position, 1.0, 1.0);",
    "    v_alpha = a_alpha;",
    "}"
].join("\n");
 
 
var fsSource = [
    "precision highp float;",
    "",
    "varying float v_alpha;",
    "varying vec2 fragTexCoord;",
    "uniform sampler2D sampler;",
    "varying vec2 globalPos;",
    "",
    "void main() {",
    "    vec4 texture = texture2D(sampler, fragTexCoord);",
    "    gl_FragColor = vec4(texture.rgb, texture.a + v_alpha * 0.5);",
    "}"
].join("\n");
 
var Particle = function() {
    this.x_ = 0;
    this.y_ = 0;
 
    this.vx_ = 0;
    this.vy_ = 0;
 
    this.ax_ = 0;
    this.ay_ = 0;
 
    this.alpha_ = 0;
    this.vAlpha_ = 0;
 
    this.size_ = 0;
 
    this.active_ = false;
};
 
 
Particle.prototype = {
    constructor : Particle
}

 
var ParticleManager = function(numParticles, pps) {
    this.FLOATS_PER_PARTICLE = 30;
 
    this.pps_ = pps;
 
    this.particles_ = new Array(numParticles);
 
    for (var i = 0; i < numParticles; ++i) {
        this.particles_[i] = new Particle();
    }
 
    this.emitterX_ = 0;
    this.emitterY_ = 0;
 
    this.velInit_ = 0.35;
    this.velDisp_ = 0.05;
 
    this.accInit_ = 0.0;
    this.accDisp_ = 0.025;
 
    this.sizeInit_ = 0.4;
    this.sizeDisp_ = 0.05;
 
    this.gravity_ = 0;
 
    this.vertices_ = new Float32Array(numParticles * this.FLOATS_PER_PARTICLE);
    this.numActiveParticles_ = 0;
 
    this.vbo_ = null;
 
    this.shader_ = null;
    this.positionId_ = -1;
    this.alphaId_ = -1;
    this.texture_ = -1;
 
    this.realTime_ = 0;
}
 
 
ParticleManager.prototype = {
    constructor : ParticleManager,
 
 
    add : function(particle) {
        if (particle.active_) {
            return;
        }
 
        particle.x_ = this.emitterX_;
        particle.y_ = this.emitterY_;
 
        particle.ax_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;
        particle.ay_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;
 
        var angle = Math.random() * Math.PI * 2.0;
        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle)
 
        var vel = (Math.random() - 0.5) * this.velDisp_;
 
        particle.vx_ = (this.velInit_ + vel) * cosA;
        particle.vy_ = (this.velInit_ + vel) * sinA;
 
        particle.size_ = this.sizeInit_ + (Math.random() - 0.5) * this.sizeDisp_;
 
        particle.alpha_ = 0.0;
        particle.vAlpha_ = 0.25 + Math.random();
 
        particle.active_ = true;
    },
 
 
    update : function(dt) {
        this.realTime_ += dt;
 
        var newParticleCount = Math.floor(this.pps_ * this.realTime_);
 
        if (newParticleCount > 0) {
            this.realTime_ -= newParticleCount / this.pps_;
 
            for (var i = 0, count = this.particles_.length; i < count; ++i) {
                if (newParticleCount <= 0) {
                    break;
                }
 
                var particle = this.particles_[i];
 
                if (!particle.active_) {
                    this.add(particle);
                    newParticleCount--;
                }
            }
        }
 
        var numActiveParticles = 0;
        var vertices = this.vertices_;
 
        for (var i = 0, count = this.particles_.length; i < count; ++i) {
            var particle = this.particles_[i];
 
            if (!particle.active_) {
                continue;
            }
 
            particle.vx_ += particle.ax_ * dt;
            particle.vy_ += particle.ay_ * dt;
 
            particle.x_ += particle.vx_ * dt;
            particle.y_ += particle.vy_ * dt;
 
            particle.vy_ -= this.gravity_ * dt;
 
            particle.alpha_ -= particle.vAlpha_ * dt;
 
            if (particle.alpha_ < -2) {
                particle.active_ = false;
                continue;
            }
 
            if (particle.x_ < -2.0 || particle.x_ > 2.0) {
                particle.active_ = false;
                continue;
            }
 
            if (particle.y_ < -2.0) {
                particle.active_ = false;
                continue;
            }
 
            var l = particle.x_ - particle.size_;
            var t = particle.y_ + particle.size_;
            var r = particle.x_ + particle.size_;
            var b = particle.y_ - particle.size_;
            var a = particle.alpha_;
 
            var index = numActiveParticles * this.FLOATS_PER_PARTICLE;
 
            vertices[index++] = l;
            vertices[index++] = b;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 0.0;
 
            vertices[index++] = r;
            vertices[index++] = b;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 0.0;
 
            vertices[index++] = l;
            vertices[index++] = t;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 1.0;
 
            vertices[index++] = r;
            vertices[index++] = b;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 0.0;
 
            vertices[index++] = r;
            vertices[index++] = t;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 1.0;
 
            vertices[index++] = l;
            vertices[index++] = t;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 1.0;
 
            numActiveParticles++;
        }
 
        this.numActiveParticles_ = numActiveParticles;
    },
 
 
    render : function(gl) {
        if (0 == this.numActiveParticles_) {
            return;
        }
 
        if (!this.shader_) {
            this.initShader(gl);
        }
 
        if (!this.vbo_) {
            this.vbo_ = gl.createBuffer();
        }
 
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
 
        gl.useProgram(this.shader_);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo_);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertices_, gl.DYNAMIC_DRAW);
 
        gl.vertexAttribPointer(
            this.positionId_, 
            2, 
            gl.FLOAT, 
            false, 
            5 * Float32Array.BYTES_PER_ELEMENT, 
            0);
 
        gl.enableVertexAttribArray(this.positionId_);
 
        gl.vertexAttribPointer(
            this.alphaId_, 
            1, 
            gl.FLOAT, 
            false, 
            5 * Float32Array.BYTES_PER_ELEMENT, 
            2 * Float32Array.BYTES_PER_ELEMENT);
 
        gl.enableVertexAttribArray(this.alphaId_);

        gl.vertexAttribPointer(
            this.texture_, 
            2, 
            gl.FLOAT, 
            false, 
            5 * Float32Array.BYTES_PER_ELEMENT, 
            3 * Float32Array.BYTES_PER_ELEMENT);
 
        gl.enableVertexAttribArray(this.texture_);
 
        let sampler = gl.getUniformLocation(this.shader_, "sampler");
        gl.uniform1i(sampler, 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.numActiveParticles_ * 6);
 
        gl.disableVertexAttribArray(this.alphaId_);
        gl.disableVertexAttribArray(this.positionId_);
        gl.disableVertexAttribArray(this.texture_);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
    },
 
 
    initShader : function(gl) {  
        var vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);
 
        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);
 
        var shader = gl.createProgram();
        gl.attachShader(shader, vs);
        gl.attachShader(shader, fs);
        gl.linkProgram(shader);
 
        this.positionId_ = gl.getAttribLocation(shader, "a_position");
        this.alphaId_ = gl.getAttribLocation(shader, "a_alpha");
        this.texture_ = gl.getAttribLocation(shader, "vertTexCoord");
        this.shader_ = shader;
    },
 
    setPosition : function(x, y) {
        this.emitterX_ = x;
        this.emitterY_ = y;
    }
}