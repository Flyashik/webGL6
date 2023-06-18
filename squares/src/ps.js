"use strict";

var vsSource = [
    "attribute vec3 a_position;",
    "attribute float a_alpha;",
    "attribute vec2 vertTexCoord;",
    "",
    "varying float v_alpha;",
    "varying vec2 fragTexCoord;",
    "varying vec2 globalPos;",
    "",
    "uniform mat4 mWorld;",
    "uniform mat4 mView;",
    "uniform mat4 mProj;",
    "",
    "void main() {",
    "    globalPos = vec2(a_position);",
    "    fragTexCoord = vertTexCoord;",
    "    gl_Position = mProj * mView * mWorld * vec4(a_position, 1.0);",
    "    v_alpha = a_alpha;",
    "}"
].join("\n");


var fsSource = [
    "precision highp float;",
    "",
    "varying float v_alpha;",
    "varying vec2 fragTexCoord;",
    "uniform sampler2D uSampler;",
    "uniform vec3 uColor;",
    "varying vec2 globalPos;",
    "",
    "void main() {",
    "    vec4 texture = texture2D(uSampler, fragTexCoord);",
    "    gl_FragColor = vec4(uColor, 1.0) * texture2D(uSampler, fragTexCoord);",
    "}"
].join("\n");

var Particle = function() {
    // Позиция частицы
    this.x_ = 0;
    this.y_ = 0;
    this.z_ = 0;

    // Скорость движения частицы по x, y
    this.vx_ = 0;
    this.vy_ = 0;
    this.vz_ = 0;

    // Ускорение частицы по x, y
    this.ax_ = 0;
    this.ay_ = 0;
    this.az_ = 0;

    // Прозрачность частицы
    this.alpha_ = 0;
    // Изменение прозрачности в секунду
    this.vAlpha_ = 0;

    // Размер частицы
    this.size_ = 0;

    // Флаг, что частица активна
    this.active_ = false;
};


Particle.prototype = {
    constructor : Particle
}


var ParticleManager = function(numParticles, pps) {
    // Всего float на частицу
    this.FLOATS_PER_PARTICLE = 36;

    // Количество новых частиц в секунду
    this.pps_ = pps;

    // Инициализируем массив частиц
    this.particles_ = new Array(numParticles);

    for (var i = 0; i < numParticles; ++i) {
        this.particles_[i] = new Particle();
    }

    // Позиция эмиттера
    this.emitterX_ = 0;
    this.emitterY_ = 0;
    this.emitterZ_ = 0;

    // Начальная скорость частицы
    this.velInit_ = 0.35;
    // Разброс (+-) начальной скорости частицы
    this.velDisp_ = 0.35;

    // Начальное ускорение частицы
    this.accInit_ = 0.0;
    // Разброс (+-) начального ускорения частицы
    this.accDisp_ = 0.025;

    // Начальный размер частицы
    this.sizeInit_ = 0.005;
    // Разброс (+-) начального размера частицы
    this.sizeDisp_ = 0.001;

    // Сила гравитации, направлена вниз
    this.gravity_ = 0.0;

    // Массив вершин
    this.vertices_ = new Float32Array(numParticles * this.FLOATS_PER_PARTICLE);
    // Количество активных частиц
    this.numActiveParticles_ = 0;

    // Вершинный буфер
    this.vbo_ = null;

    // Шейдер, позиция в шейдере и прозрачность
    this.shader_ = null;
    this.positionId_ = -1;
    this.alphaId_ = -1;

    // Время для вычисления количества новых частиц
    this.realTime_ = 0;

    this.angle_ = 0.0;

    this.spinDir_ = 1;

    this.texture_ = -1;

    this.color_ = new Float32Array([1.0, 1.0, 1.0]);
}


ParticleManager.prototype = {
    constructor : ParticleManager,


    // Активирование частицы
    add : function(particle) {
        if (particle.active_) {
            return;
        }

        // Начальная позиция частицы совпадает с позицием эмиттера
        particle.x_ = this.emitterX_;
        particle.y_ = this.emitterY_;
        particle.z_ = this.emitterZ_;

        // Вычисляем начальное ускорение частицы
        particle.ax_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;
        particle.ay_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;
        particle.az_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;

        // Направление движения частицы
        var angle = this.angle_;

        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        // Скорость движения
        var vel = (Math.random() - 0.5) * this.velDisp_;

        // Скорость и направление движения частицы
        particle.vx_ = (this.velInit_ + vel) * cosA;
        particle.vy_ = (this.velInit_ + vel) * sinA;
        particle.vz_ = (this.velInit_ + vel) * Math.random() * Math.PI * 2;

        // Размер частицы
        particle.size_ = this.sizeInit_ + (Math.random() - 0.5) * this.sizeDisp_;

        // Начальная прозрачность
        particle.alpha_ = 1.0;
        // Уменьшение прозрачности в секунду
        particle.vAlpha_ = 0.8 + Math.random();

        // Активируем частицу
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

            // Обновление скорости частицы
            particle.vx_ += particle.ax_ * dt;
            particle.vy_ += particle.ay_ * dt;
            particle.vz_ += particle.az_ * dt;

            // Обновление позиции частицы
            particle.x_ += particle.vx_ * dt;
            particle.y_ += particle.vy_ * dt;
            particle.z_ += particle.vz_ * dt;

            // Применение гравитации
            particle.vy_ -= this.gravity_ * dt;

            // Изменение прозрачности
            particle.alpha_ -= particle.vAlpha_ * dt;

            if (particle.alpha_ < -1) {
                particle.active_ = false;
                continue;
            }

            var l = particle.x_ - particle.size_;
            var t = particle.y_ + particle.size_;
            var r = particle.x_ + particle.size_;
            var b = particle.y_ - particle.size_;
            var zb = particle.z_ + particle.size_;
            var zf = particle.z_ - particle.size_;
            var a = particle.alpha_;

            var index = numActiveParticles * this.FLOATS_PER_PARTICLE;

            vertices[index++] = l;
            vertices[index++] = b;
            vertices[index++] = zb;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 0.0;

            vertices[index++] = r;
            vertices[index++] = b;
            vertices[index++] = zb;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 0.0;

            vertices[index++] = l;
            vertices[index++] = t;
            vertices[index++] = zb;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 1.0;

            vertices[index++] = r;
            vertices[index++] = b;
            vertices[index++] = zf;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 0.0;

            vertices[index++] = r;
            vertices[index++] = t;
            vertices[index++] = zf;
            vertices[index++] = a;
            vertices[index++] = 1.0;
            vertices[index++] = 1.0;

            vertices[index++] = l;
            vertices[index++] = t;
            vertices[index++] = zf;
            vertices[index++] = a;
            vertices[index++] = 0.0;
            vertices[index++] = 1.0;

            numActiveParticles++;
        }

        if (this.spinDir_ > 0) {
            this.angle_ += 0.1;
        } else {
            this.angle_ -= 0.1;
        }

        if (Math.abs(this.angle_) >= 2 * Math.PI) {
            this.angle_ = 0.0;
        }

        this.numActiveParticles_ = numActiveParticles;
    },


    render : function(gl) {
        if (0 === this.numActiveParticles_) {
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
            3,
            gl.FLOAT,
            false,
            6 * Float32Array.BYTES_PER_ELEMENT,
            0);

        gl.enableVertexAttribArray(this.positionId_);

        gl.vertexAttribPointer(
            this.alphaId_,
            1,
            gl.FLOAT,
            false,
            6 * Float32Array.BYTES_PER_ELEMENT,
            3 * Float32Array.BYTES_PER_ELEMENT);

        gl.enableVertexAttribArray(this.alphaId_);

        gl.vertexAttribPointer(
            this.texture_,
            2,
            gl.FLOAT,
            false,
            6 * Float32Array.BYTES_PER_ELEMENT,
            4 * Float32Array.BYTES_PER_ELEMENT);

        gl.enableVertexAttribArray(this.texture_);

        let uSampler = gl.getUniformLocation(this.shader_, "uSampler");
        gl.uniform1i(uSampler, 0);

        let uColor = gl.getUniformLocation(this.shader_, "uColor");
        gl.uniform3fv(uColor, this.color_);

        //проекция
        let matWorldLocation = gl.getUniformLocation(this.shader_, "mWorld");
        let matViewLocation = gl.getUniformLocation(this.shader_, "mView");
        let matProjLocation = gl.getUniformLocation(this.shader_, "mProj");

        gl.uniformMatrix4fv(matWorldLocation, false, worldMatrix);
        gl.uniformMatrix4fv(matViewLocation, false, viewMatrix);
        gl.uniformMatrix4fv(matProjLocation, false, projMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, this.numActiveParticles_ * 6);

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

    setPosition : function(x, y, z) {
        this.emitterX_ = x;
        this.emitterY_ = y;
        this.emitterZ_ = z;
    },

    setRandomColor : function() {
        setInterval(() => {
            this.color_ = new Float32Array([Math.random(), Math.random(), Math.random()]);
        }, 3200);
    },

    setSpinDirection: function(dir) {
        this.spinDir_ *= dir;
    },
}

let worldMatrix = new Float32Array(16);
let viewMatrix = new Float32Array(16);
let projMatrix = new Float32Array(16);

glMatrix.mat4.identity(worldMatrix)
glMatrix.mat4.lookAt(viewMatrix, [0, 0, -10], [0, 0, 0], [0, 1, 0]);
glMatrix.mat4.perspective(projMatrix, Math.PI / 12, document.getElementById("webgl-canvas").width / document.getElementById("webgl-canvas").height, 0.1, 1000.0);