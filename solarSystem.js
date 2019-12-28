/*******************************************************************************************************************
* things that have to be done:                                                                          |done?|    *
*   Multiple spheres rotating around one big sphere                                                     |  Y  |    *
*   Sizes and rotation speeds should be proportionally similar to original values                       |  Y  |    *
*   Planet textures                                                                                     |  Y  |    *
*   Navigation using keyboard buttons                                                                   |  Y  |    *
*        (W-forward, S-backward, A-left, D-right, Z-up, X-down,                                         |     |    *
*            mouse-similar to trackball (i did with clicking))                                          |     |    *
* from extras:                                                                                          |     |    *
*   Add moon and Saturn should have a belt around it (2 points)                                         |  N  |    *
*   Applying bump maps to available planets (4 points)                                                  |  N  |    *
*   Additional light source from camera when zoomed into some planet (Earth or The Moon) (2 points)     |  N  |    *
*   Trackball rotation of a planet when zoomed in (2 points)                                            |  N  |    *
********************************************************************************************************************/

var canvas;
var gl;
var camera;
var light;
var m_x =0.0, m_y=0.0;
var flag = false;
function mult_v(m, v) {
    if (!m.matrix) {
        return "trying to multiply by non matrix";
    }

    var result;
    if (v.length == 2) result = vec2();
    else if (v.length == 3) result = vec3();
    else if (v.length == 4) result = vec4();
    
    for (var i = 0; i < m.length; i++) {
        if (m[i].length != v.length) 
            return "dimensions do not match";
        
        result[i] = 0;
        for (var j = 0; j < m[i].length; j++)
            result[i] += m[i][j] * v[j];
    }
    return result;
}

class _3DObject {
    constructor(program, position = vec3(0, 0, 0), imageName="") {
        this.program = program;
        this.bufVertex = 0;
        this.bufIndex = 0;
        this.bufNormal = 0;
        this.tBuffer = 0;
        this.texture = 0;
        this.imageName=imageName;
        this.image;
        this.vertices = [];
        this.indices = [];
        this.normals = [];
        this.textures = [];
        this.position = position;
        this.matModel = mat4();
        this.material = {
            ambient: vec3(0.2, 0.3, 0.4),
            diffuse: vec3(0.3, 0.6, 0.5),
            specular: vec3(0.0, 0.0, 0.0),
            shininess: 250.0,
            emission:vec3(0,0,0) //for sun light source
        }
    }

    confTexture(){
        this.texture = gl.createTexture();
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    };

    loadData() {
        // do nothing
    }

    init() {
        this.matModel = translate(this.position[0], this.position[1], this.position[2]);
        this.loadData();

        this.bufVertex = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVertex);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.vertices), gl.STATIC_DRAW);

        this.bufNormal = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNormal);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.normals), gl.STATIC_DRAW);

        this.bufIndex = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIndex);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
    
        this.tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(this.textures), gl.STATIC_DRAW);

        var vTexCoord = gl.getAttribLocation(this.program, "vTexCoord");
        gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(vTexCoord);

        this.image = document.getElementById(this.imageName);
        this.confTexture();


    }

    render() {
        var ambient = gl.getUniformLocation(this.program, "col_Ambient");
        gl.uniform3fv(ambient, flatten(this.material.ambient));

        var diffuse = gl.getUniformLocation(this.program, "col_Diffuse");
        gl.uniform3fv(diffuse, flatten(this.material.diffuse));

        var specular = gl.getUniformLocation(this.program, "col_Specular");
        gl.uniform3fv(specular, flatten(this.material.specular));

        var shininess = gl.getUniformLocation(this.program, "col_Shininess");
        gl.uniform1f(shininess, this.material.shininess);

        var emission = gl.getUniformLocation(this.program, "col_Emission");
        gl.uniform3fv(emission, this.material.emission);

        var model = gl.getUniformLocation(this.program, "m_Model");
        gl.uniformMatrix4fv(model, false, flatten(this.matModel));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufVertex);

        var pos = gl.getAttribLocation(this.program, "v_Pos");
        gl.vertexAttribPointer(pos, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(pos);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNormal);

        var norm = gl.getAttribLocation(this.program, "v_Norm");
        gl.vertexAttribPointer(norm, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(norm);
    
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.uniform1i(gl.getUniformLocation(this.program, "texture"), 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIndex);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0) 
    }

    translate(aim) {
        this.matModel = mult(translate(aim), this.matModel);
    }

    rotate(angle) {
        this.matModel = mult(rotate(angle, vec3(0, 1, 0)), this.matModel);
    }

}


class Camera {
    constructor(program, position, up) {
        this.program = program;
        this.position = position;
        this.direction = negate(vec3(position[0]*666, position[1]*666, position[2]*666));
        this.up = up;
        this.matView;
    }

    render() {
        var pos = gl.getUniformLocation(this.program, "v_Camera");
        gl.uniform4fv(pos, flatten(vec4(this.position, 1.0)));

        var view = gl.getUniformLocation(this.program, "m_View");
        this.matView = lookAt(this.position, add(this.position, this.direction), this.up);
        gl.uniformMatrix4fv(view, false, flatten(this.matView));

        var proj = gl.getUniformLocation(this.program, "m_Proj");
        var matProj = perspective(66, 1350/640, 1, 1000);
        gl.uniformMatrix4fv(proj, false, flatten(matProj));
    }

    rotate(angle, axis) {
        this.direction = vec3(mult_v(rotate(angle, axis), vec4(this.direction, 1.0)));
    }

    translate(dx, dy, dz) {
        this.position = vec3(mult_v(translate(dx, dy, dz), vec4(this.position, 1.0)));
    }

    getPosition(){
        return this.position;
}}


class Light {
    constructor(program, position) {
        this.program = program;
        this.position = position;
        this.intensity = {
            ambient: vec3(0.25,0.25,0.25),
            diffuse: vec3(1,1,1),
            specular: vec3(0, 0, 0)
        }
    }

    render() {
        var pos = gl.getUniformLocation(this.program, "v_Light");
        gl.uniform4fv(pos, flatten(this.position));

        // sending light properties
        var ambient = gl.getUniformLocation(this.program, "light_Ambient");
        gl.uniform3fv(ambient, flatten(this.intensity.ambient));

        var diffuse = gl.getUniformLocation(this.program, "light_Diffuse");
        gl.uniform3fv(diffuse, flatten(this.intensity.diffuse));

        var specular = gl.getUniformLocation(this.program, "light_Specular");
        gl.uniform3fv(specular, flatten(this.intensity.specular));
    }

    rotate(angle) {
        this.position = mult_v(rotate(angle, vec3(0, 1, 0)), this.position);
    }

    }


class Sphere extends _3DObject {
    constructor(program, position, imageName, radius = 1, N = 45, M = 45) {
        super(program, position, imageName);
        this.position = position;
        this.radius = radius;
        this.N = N;
        this.M = M;
    }

    loadData() {
        var self = this;

        var generateVertices = function (N, M) {
            for (var i = 0; i < N; i++) {
                var alfa = i * Math.PI / (N - 1) - Math.PI / 2;

                for (var j = 0; j <= M; j++) {
                    var beta = j * 2 * Math.PI / M;

                    var x = self.radius * Math.cos(alfa) * Math.cos(beta);
                    var y = self.radius * Math.sin(alfa);
                    var z = self.radius * Math.cos(alfa) * Math.sin(beta);
                    var u = (j / M);
                    var v = (i / N);
                    self.vertices.push(vec4(x, y, z, 1.0));
                    self.textures.push(vec2(u, v));
                }
            }
        };

        var generateNormals = function (N, M) {
            for (var i in self.vertices) {
                self.normals.push(vec4(normalize(vec3(self.vertices[i])), 0.0));
            }
        };

        var generateIndices = function (N, M) {
            var index = function (i, j) {
                return i * (M+1) + j;
            }

            for (var i = 0; i < N - 1; i++)
                for (var j = 0; j < M; j++) {
                    self.indices.push(index(i, j));
                    self.indices.push(index(i, (j + 1) ));
                    self.indices.push(index(i + 1, j));
                    self.indices.push(index(i, (j + 1)));
                    self.indices.push(index(i + 1, (j + 1)));
                    self.indices.push(index(i + 1, j));
                }
        };

 
        generateVertices(this.N, this.M);
        generateNormals(this.N, this.M);
        generateIndices(this.N, this.M);
        
    }
}



function disposition(aim){
    var target =  normalize(subtract(camera.getPosition(), camera.direction));
    var step_left =  normalize(cross(target, vec3(0, 1, 0))); 
    var step_up   =  normalize(cross(step_left, target));

    if     (aim == "BW")    camera.translate( 2*target[0],       2*target[1],        2*target[2]);           //backward
    else if(aim == "FW")    camera.translate(-2*target[0],      -2*target[1],       -2*target[2]);           //forward
    else if(aim == "U")     camera.translate( step_up[0]*2,      step_up[1]*2,       step_up[2]*2);          //up
    else if(aim == "D")     camera.translate(-step_up[0]*2,     -step_up[1]*2,      -step_up[2]*2);          //down
    else if(aim == "R")     camera.translate(-step_left[0]*2,   -step_left[1]*2,    -step_left[2]*2);        //right
    else if(aim == "L")     camera.translate( step_left[0]*2,    step_left[1]*2,     step_left[2]*2);        //left

}

function mouseView(x, y){
    var dir_of_axis = cross(camera.direction, vec3(0,1,0));
    camera.rotate(-x, vec3(0,1,0));
    camera.rotate(y, dir_of_axis);
}



window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);


    
    /*scale 
    for radius 1:10000
    for distance 1:10000000
    for speed 1:10 of earth speed (365.26days)
    */

    camera = new Camera(program, vec3(0, 0, 50), vec3(0, 1, 0));
    light = new Light(program, vec4(1, 1, 1, 1));
    
    Sun = new Sphere(program,  vec4(0,0,0,1),  "sun",  9.5);  //sun's size reduced for better looks 69.5
    Sun.material.emission = vec3(1,1,1);
    Sun.init();

    Mercury = new Sphere(program, vec4(15.29, 0.0, 0.0, 1.0), "mercury", 0.2439);
    Mercury.init();

    Venus = new Sphere(program, vec4(0.0, 0.0, 20.32, 1.0), "venus", 0.6052);
    Venus.init();

    Earth = new Sphere(program, vec4(-24.46, 0.0, 0.0, 1.0), "earth", 0.6378);
    Earth.init();

    Mars = new Sphere(program, vec4(0.0, 0.0, -32.29, 1.0), "mars", 0.394);
    Mars.init();

    Jupiter = new Sphere(program, vec4(87.33, 0.0, 0.0, 1.0), "jupiter", 7.1398);
    Jupiter.init();

    Saturn = new Sphere(program, vec4(0.0, 0.0, -152.2, 1.0),"saturn", 6.033);
    Saturn.init();
    
    Uranus = new Sphere(program, vec4(-296.6, 0.0, 0.0, 1.0), "uranus", 2.5559);
    Uranus.init();

    Neptune = new Sphere(program, vec4(0.0, 0.0, -459.21, 1.0), "neptune", 2.43);
    Neptune.init();

    document.addEventListener('keydown', function(event){
        var keypress = event.key.toLowerCase();

        switch(keypress){
            case "w":
                disposition("FW");
                break;
            case "s":
                disposition("BW");
                break;
            case "a":
                disposition("L");
                break;
            case "d":
                disposition("R");
                break; 
            case "x":
                disposition("D");
                break;
            case "z":
                disposition("U");
                break;
        }
    
    });

    window.addEventListener('mousedown', function(event) { 
        flag = true;
    });

    window.addEventListener("mousemove", function(event){
       if(flag){
        m_x = event.movementX*3/50; //average sensitivity
        m_y = -event.movementY*3/50;}
    }
    );

    addEventListener('mouseup', function(event) { 
    flag = false;
    });

    render();
}



function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    mouseView(m_x, m_y);
    camera.render();
    light.render();

    Sun.render();
    Sun.rotate(.3)

    Mercury.rotate(0.024); 
    Mercury.render();

    Venus.rotate(0.062);
    Venus.render();

    Earth.rotate(0.1);
    Earth.render();
    
    Mars.rotate(0.188);
    Mars.render();

    Jupiter.rotate(0.084);
    Jupiter.render();

    Saturn.rotate(0.034); 
    Saturn.render();

    Uranus.rotate(0.012);  
    Uranus.render();
    
    Neptune.rotate(0.006);  
    Neptune.render();

    requestAnimFrame(render);
}





