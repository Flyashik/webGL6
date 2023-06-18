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
    "uniform vec3 uColor;",
    "",
    "void main() {",
    "    vec4 texture = texture2D(sampler, fragTexCoord);",
    "    gl_FragColor = vec4(uColor, 1.0) * vec4(texture.rgb, texture.a + v_alpha);",
    "}"
].join("\n");

var Particle = function() {
    // Позиция частицы
    this.x_ = 0;
    this.y_ = 0;

    // Скорость движения частицы по x, y
    this.vx_ = 0;
    this.vy_ = 0;

    // Ускорение частицы по x, y
    this.ax_ = 0;
    this.ay_ = 0;

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
    this.FLOATS_PER_PARTICLE = 30;

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

    // Начальная скорость частицы
    this.velInit_ = 0.35;
    // Разброс (+-) начальной скорости частицы
    this.velDisp_ = 0.35;

    // Начальное ускорение частицы
    this.accInit_ = 0.0;
    // Разброс (+-) начального ускорения частицы
    this.accDisp_ = 0.025;

    // Начальный размер частицы
    this.sizeInit_ = 0.05;
    // Разброс (+-) начального размера частицы
    this.sizeDisp_ = 0.01;

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

    this.texture_ = -1;

    this.angle_ = 0.0;

    this.spinDir_ = 1;

    this.color_ = [1.0, 1.0, 1.0];
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

        // Вычисляем начальное ускорение частицы
        particle.ax_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;
        particle.ay_ = this.accInit_ + (Math.random() - 0.5) * this.accDisp_;

        // Направление движения частицы
        var angle = this.angle_;

        var cosA = Math.cos(angle);
        var sinA = Math.sin(angle);

        // Скорость движения
        var vel = (Math.random() - 0.5) * this.velDisp_;

        // Скорость и направление движения частицы
        particle.vx_ = (this.velInit_ + vel) * cosA;
        particle.vy_ = (this.velInit_ + vel) * sinA;

        // Размер частицы
        particle.size_ = this.sizeInit_ + (Math.random() - 0.5) * this.sizeDisp_;

        // Начальная прозрачность
        particle.alpha_ = 0;
        // Уменьшение прозрачности в секунду
        particle.vAlpha_ = 0.8 + Math.random();

        // Активируем частицу
        particle.active_ = true;
    },


    update : function(dt) {
        this.realTime_ += dt;

        // Вычисляем количество новых частиц
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

            // Обновление позиции частицы
            particle.x_ += particle.vx_ * dt;
            particle.y_ += particle.vy_ * dt;

            // Применение гравитации
            particle.vy_ -= this.gravity_ * dt;

            // Изменение прозрачности
            particle.alpha_ -= particle.vAlpha_ * dt;

            if (particle.alpha_ < -1) {
                particle.active_ = false;
                continue;
            }

            if (particle.x_ < -1.0 || particle.x_ > 1.0) {
                particle.active_ = false;
                continue;
            }

            if (particle.y_ < -1.0) {
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

        let uSampler = gl.getUniformLocation(this.shader_, "uSampler");
        gl.uniform1i(uSampler, 0);

        let uColor = gl.getUniformLocation(this.shader_, "uColor");
        gl.uniform3fv(uColor, this.color_);

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

    setPosition : function(x, y) {
        this.emitterX_ = x;
        this.emitterY_ = y;
    },

    setSpinDirection: function(dir) {
        this.spinDir_ *= dir;
    },

    setRandomColor: function (timeout) {
        setInterval(() => {
            this.color_ = this.getColorAtAngle(Math.abs(this.angle_));
            }, timeout);
    },


    getColorAtAngle: function (angle) {
        var colors = [
            { angle: 0, color: [1, 0, 0] },
            { angle: Math.PI / 2, color: [0, 1, 0] },
            { angle: Math.PI, color: [0, 0, 1] },
            { angle: Math.PI * 1.5, color: [1, 1, 0] }
        ];

        var colorIndex = 0;
        for (var i = 0; i < colors.length; i++) {
            if (angle >= colors[i].angle) {
                colorIndex = i;
            }
        }

        var prevColor = colors[colorIndex];
        var nextColor = colors[(colorIndex + 1) % colors.length];


        var t = (angle - prevColor.angle) / (nextColor.angle - prevColor.angle);
        var interpolatedColor = [];
        for (var j = 0; j < prevColor.color.length; j++) {
            interpolatedColor[j] = prevColor.color[j] + (nextColor.color[j] - prevColor.color[j]) * t;
        }

        return interpolatedColor;
    }
}