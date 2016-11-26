/*

TAKE ME HOME
Digital loneliness

Lauri-Matti Parppei 2016

This is a messy sor

*/


// Umm... stuff. Birds thing stolen directly from Three.js examples. Thank you!

var container, camera, scene, renderer, clock, postProcess;
var player, planet, pivot, helper, light, action, lakeMirror;

var curtain; // Darkness

var birds = [];
var boids = [];
var boid, boids, birdPivot, birdTarget;
var trees = [];
var beings = [];
clouds = [];


// Player properties
var walkSpeed = .001;
var walkSpeed = .0018;
var playerStart = 0;
var walked = 0;

// Camera tracking start and end
var cameraStart = 130;
var cameraEnd = 30;
var approachVelocity = .5;


var mouse = {
    x: 0,
    y: 0,
    down: true
}

// SOUND STUFF
// Please note: I have omitted the music from this version as it was not
// under MIT. You can include music on parts of the planet using the music 
// array and include Name.ogg/Name.mp3 files in the sfx/ folder.

// It would work this way:
// var soundFiles = ['Music_1', 'Music_2'];
// var music = ['Music_1', 'Music_2'];

var soundFiles = ['Crow', 'Wind'];
var music = [];

var musicSpots = [];
var soundPath = 'sfx/';
var sounds = {};


// BASIC UI
var info = document.getElementById('info');
info.style.opacity = 0;


// MESSY MATRIX STUFF
var rotation_matrix;
var mouse = new THREE.Vector2();


// ANIMATION MIXER
var animations = []; 
var mixer = {};


// LOADING MANAGER
var manager = new THREE.LoadingManager();
manager.loadItems = 7;
manager.initComplete = function() {
    manager.init = true;
}
manager.onProgress = function (item, loaded, total) {
    if (loaded == total) {
        animate();
    }
};

// SIMPLE EASING FUNCTIONS
var ease = {
  easeOut: function (t) { return (--t)*t*t+1 },
  easeInOut: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
};


// Let's go
init();


// UI stuff
document.getElementById('volume').onclick = function () {
    var button = document.getElementById('volume');
    
    if (Howler.volume() == 1) {

        Howler.volume(0);
        button.className = 'muted';
    } else {
        Howler.volume(1);
        button.className = '';
    }
};

function initSounds () {
    for (s in soundFiles) {
        var file = soundFiles[s];
        var fullName = path + soundPath + file;
        sounds[file] = new Howl({
            src: [fullName + '.ogg', fullName + '.mp3'],
            loop: true,
            volume: 0,
            onload: function () { this.play(); }
        });
    }

    // No idea.
    sounds['Crow'].stop();
    sounds['Crow'].loop = false;

    for (var i=0; i < music.length; i++) {
        var pos = i * ((Math.PI * 2) / music.length);
        console.log(pos);
        
        var sound = sounds[music[i]];

        if (sound) {
            var soundItem = new THREE.Object3D();
            soundItem.pivot = new THREE.Object3D();
            
            soundItem.pivot.add(soundItem);
            scene.add(soundItem.pivot);
            
            soundItem.position.set(0,52,0);
            soundItem.pivot.rotation.z = pos;
            soundItem.sound = sound;
            soundItem.worldPosition = new THREE.Vector3();
            scene.updateMatrixWorld();
            soundItem.worldPosition.setFromMatrixPosition(soundItem.matrixWorld);

            musicSpots.push(soundItem);
        }
    }

}


function init() {

    clock = new THREE.Clock();

    var loader = new THREE.TextureLoader(manager);

    container = document.createElement( 'div' );
    document.body.appendChild( container );

    // SCENE
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0x000000, 500, 10000 );

    // CAMERA
    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 10, 10000 );
    camera.rotation.x = -1.57;

    // RENDERER
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( scene.fog.color );
    renderer.shadowMap.enabled = true;

    container.appendChild( renderer.domElement );

    // "CURTAIN"
    curtain = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1 })
    );
    camera.add(curtain);
    curtain.position.set (0,0,-30);

    // LIGHT
    light = new THREE.PointLight(0xffffff, 5, 150);
    light.position.set( 90, 80, -30 );
    light.castShadow = true;
    light.shadow.mapSize.width = 1024; light.shadow.mapSize.height = 1024;
    scene.add(light);

    // Ambient light
    var ambient = new THREE.AmbientLight(0xeeeeee, 1);
    scene.add(ambient);

    // WORLD ELEMENTS START HERE
    
    // Moon
    var moon = new THREE.Mesh(
        new THREE.SphereGeometry(1,12,12),
        new THREE.MeshBasicMaterial({color:0xffffff})
    );
    moon.position.set(40,40,-50);
    scene.add(moon);          

    // Sky
    var skyTexture = loader.load(path + 'textures/bg.jpg');
    var plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1500,1500),
        new THREE.MeshBasicMaterial({ map: skyTexture })
    );
    plane.position.z = -1000;
    scene.add(plane);

    // Atmosphere
    var atmoTexture = loader.load(path + 'textures/atmo.jpg');
    var atmosphere = new THREE.Mesh(
        new THREE.PlaneGeometry(190,190),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: .5, map: atmoTexture, blending: THREE.AdditiveBlending })
    );
    atmosphere.position.set(0,0,0);
    scene.add(atmosphere);

    // Planet halo
    var haloTexture = loader.load(path + 'textures/halo.jpg');
    var halo = new THREE.Mesh(
        new THREE.PlaneGeometry(150,150),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: .6, map: haloTexture, blending: THREE.AdditiveBlending })
    );
    halo.position.set(0,0,-30);
    scene.add(halo);

    // Planet. We'll make the sphere out of a box and then roughen its
    // geometry up a bit.
    var geometry = new THREE.BoxGeometry(50, 50, 50, 20, 20, 20);
    for (var i in geometry.vertices) {
        var vertex = geometry.vertices[i];
        vertex.normalize().multiplyScalar(50);
        vertex.x += Math.random() * .4 - .2;
        vertex.y += Math.random() * .4 - .2;
        vertex.z += Math.random() * .4 - .2;
    }
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    var planetMaterial = new THREE.MeshPhongMaterial({
            color: 0x050505,
            shading: THREE.FlatShading,
            shininess: 0,
            emissive: 0x010101
    });

    // Now we will do a hole on the planet
    var sphere = new THREE.Mesh(
        geometry,      
        planetMaterial
    );

    // Lake (will be substracted from planet using BSP)
    var lakeEdges = [];
    var geo = new THREE.CylinderGeometry(8,1.5,4, 8, 1, true);
    for (v in geo.vertices) {
        if (geo.vertices[v].y > 0) {
            geo.vertices[v].x += Math.random() * 5 - 2;
            geo.vertices[v].z += Math.random() * 5 - 2;
        }
    }
    var lake = new THREE.Mesh(
        geo,
        new THREE.MeshPhongMaterial({ shading: THREE.FlatShading, side: THREE.DoubleSide })
    );
    lake.position.set(0,48.5,0);
    
    var planetBSP = new ThreeBSP(sphere);
    var lakeBSP = new ThreeBSP(lake);
    var planetResult = planetBSP.subtract(lakeBSP);

    planet = planetResult.toMesh( planetMaterial );
    planet.geometry.computeVertexNormals();

    lakeMirror = new THREE.Mirror( renderer, camera, { clipBias: 0.003, textureWidth: 512, textureHeight: 512, color: 0x888888 } );

    var planeGeo = new THREE.PlaneBufferGeometry( 12, 12 );
    var mirrorMesh = new THREE.Mesh( planeGeo, lakeMirror.material );
    mirrorMesh.add( lakeMirror );
    mirrorMesh.rotation.set(-1.575, 0, 0);
    mirrorMesh.position.set(0,49.1,0);
    planet.add( mirrorMesh );

    // Some stones around lake
    var stoneMaterial = new THREE.MeshPhongMaterial({ color: 0x121212, shading: THREE.FlatShading });
    var stoneGeo = new THREE.CylinderGeometry(.5, 1.4, 1.2, 5, 1, false);

    for (var s=0; s<5; s++) {
        var newStone = stoneGeo.clone();
        for (var v in newStone.vertices) {
            var vertex = newStone.vertices[v];
            if (vertex.y > 0) {
                vertex.x += Math.random() * .2 - .1;
                vertex.y += Math.random() * .6 - .3;
                vertex.z += Math.random() * .2 - .1;
            }
        }
        var stone = new THREE.Mesh(newStone, stoneMaterial);
        var stonePivot = new THREE.Object3D();
        stonePivot.position.set(0, 49.5, 0);
        
        stonePivot.add(stone);
        stone.position.set(5, 0, 0);
        stonePivot.rotation.y = Math.random() * 6;
        stone.scale.set(Math.random() * .8 + .4, Math.random() * .8 + .4, Math.random() * .8 + .4);
        planet.add(stonePivot);
    }
    
    planet.rotation.z = 3;
    planet.rotation.x = Math.random() * -.05 - .12;

    scene.add(planet);
    planet.receiveShadow = true;
    
    light.target = planet;
    
    // Player
    var objectLoader = new THREE.JSONLoader(manager);
    objectLoader.load(path + 'models/astronautti6.json', function (geometry) {
        materials = [
            new THREE.MeshPhongMaterial({color: 0x222222, shininess: 5, skinning: true, side: THREE.DoubleSide, shading: THREE.FlatShading }),
            new THREE.MeshPhongMaterial({color: 0x080808, shininess: 100, specular: 0xffffff, skinning: true, side: THREE.DoubleSide, shading: THREE.SmoothShading })
        ];

        var mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(materials));
        mesh.geometry.computeFaceNormals();
        mesh.geometry.computeVertexNormals();

        mesh.castShadow = true;

        player.mixer = new THREE.AnimationMixer(mesh); 
        animations.push(player.mixer);

        action = {};
        action.idle = player.mixer.clipAction ( geometry.animations[0] );
        action.run = player.mixer.clipAction ( geometry.animations[1] );

        action.idle.play();
        
        mesh.position.set(0,0,4.3);
        mesh.rotation.set(-1.575,3.14,0);

        player.mesh = mesh;
        player.add(player.mesh);

        player.fadeAction = function () {
            var activeActionName = 'idle';

            return function ( name ) {
                var from = action[ activeActionName ].play();
                var to   = action[ name ].play();

                from.enabled = true;
                to.enabled = true;

                from.crossFadeTo( to, .3 );
                activeActionName = name;
            }
        }();

        player.update = function () {
            if (player.walk == 'right' && player.mesh.rotation.y < 3.14) {
                player.mesh.rotation.y += .1;
            }
            if (player.walk == 'left' && player.mesh.rotation.y > 0) {
                player.mesh.rotation.y -= .1;
            }

            if (player.walk) {
                if (player.laterna.swingModifier < 1) {
                    player.laterna.swingModifier += 0.5;
                }
            } else {
                player.laterna.swingModifier = player.laterna.swingModifier / 1.005;
            }
            player.laterna.pivot.rotation.y = player.laterna.baseRotation + (Math.sin(clock.getElapsedTime() * 5) * player.laterna.swingModifier) / 3;

            scene.updateMatrixWorld();
            player.worldPosition.setFromMatrixPosition(player.mesh.matrixWorld);
        }

        var laterna = new THREE.Mesh(
            new THREE.CylinderGeometry(.2,.2,.8,8),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        laterna.top = new THREE.Mesh(
            new THREE.CylinderGeometry(.22,.22,.1,8),
            new THREE.MeshBasicMaterial({ color: 0x111111 })
        );
        laterna.bottom = laterna.top.clone();
        laterna.top.position.set(0, .4, 0);
        laterna.bottom.position.set(0, -.4, 0);
        laterna.add(laterna.bottom);
        laterna.add(laterna.top);

        laterna.baseRotation = .25;
        laterna.rotation.set(0,0,1.575);

        laterna.pivot = new THREE.Object3D();
        laterna.pivot.add (laterna);
        laterna.pivot.rotation.set(0,laterna.baseRotation,0);
        player.mesh.skeleton.bones[7].add(laterna.pivot);
        
        laterna.pivot.position.set(0,0,-.9)
        laterna.position.set(.65,0,0);

        player.laterna = laterna;
        player.laterna.swingModifier = 0;

        player.light = new THREE.PointLight(0xffffff, 6, 80);
        player.light.castShadow = true; 

        player.laterna.add(player.light);
    });

    player = new THREE.Mesh(
        new THREE.BoxGeometry(2,2,2),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    player.position.set(0,55,0);
    pivot = new THREE.Object3D();
    pivot.position.set(0,0,0);

    pivot.rotation.z = playerStart;

    pivot.add(player);
    scene.add(pivot);

    player.worldPosition = new THREE.Vector3();
    player.worldPosition.setFromMatrixPosition(player.matrixWorld);

    player.name = 'Protagonist';

    player.add(camera);
    camera.position.set(0, cameraStart, 1);
    

    function loadModel(url, callback, customMaterials) {
        var objectLoader = new THREE.JSONLoader();
        objectLoader.callback = callback;

        objectLoader.load(url, function (geometry) {           
            var mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshFaceMaterial(customMaterials));
            mesh.geometry.computeFaceNormals();
            mesh.geometry.computeVertexNormals();

            mesh.mixer = new THREE.AnimationMixer(mesh);
            mesh.action = [];
            animations.push(mesh.mixer);

            for (a in mesh.geometry.animations) {
                mesh.action[a] = mesh.mixer.clipAction ( geometry.animations[a] );
            }

            mesh.fadeAction = function () {
                var activeActionName = 0

                return function ( name ) {
                    var from = mesh.action[ activeActionName ].play();
                    var to   = mesh.action[ name ].play();

                    from.enabled = true;
                    to.enabled = true;

                    from.crossFadeTo( to, .8 );
                    activeActionName = name;
                }
            }();

            callback(mesh);
        });
    }

    // SOME ANIMALS
    loadModel(path + 'models/fox.json', function (mesh) {
        mesh.pivot = new THREE.Object3D();
        mesh.pivot.add(mesh);

        mesh.scale.set(.5,.5,.5);
        mesh.position.set(0,50.6,0);
        mesh.action[0].play();
        mesh.distance = new THREE.Vector3();

        scene.add(mesh.pivot);
        mesh.pivot.rotation.z = Math.random() * .3;
        mesh.pivot.rotation.x = .15 + Math.random() * .05;

        mesh.castShadow = true;

        mesh.looking = false;
        mesh.worldPosition = new THREE.Vector3();

        mesh.update = function () {
            mesh.worldPosition.setFromMatrixPosition(mesh.matrixWorld);

            if (mesh.worldPosition.distanceTo(player.worldPosition) < 10 && !mesh.looking) {
                mesh.fadeAction(1);
                mesh.looking = true;
            }
            if (mesh.worldPosition.distanceTo(player.worldPosition) > 10 && mesh.looking) {
                mesh.looking = false;
                mesh.fadeAction(0);
            }
        }

        beings.push(mesh);
    },
    [ new THREE.MeshPhongMaterial({ shading: THREE.FlatShading, skinning: true, color: 0x202020 })]
    );

    loadModel(path + 'models/deer3.json', function (mesh) {
        mesh.pivot = new THREE.Object3D();
        mesh.pivot.add(mesh);


        mesh.scale.set(1.5,1.5,1.5);
        mesh.position.set(0,49.8,0);
        mesh.action[0].play();
        mesh.distance = new THREE.Vector3();

        scene.add(mesh.pivot);
        mesh.rotation.y = -1.57;
        mesh.pivot.rotation.x = -.3;
        mesh.pivot.rotation.z = Math.random() * -.5 - 2.2;
        mesh.castShadow = true;

        mesh.looking = false;
        mesh.worldPosition = new THREE.Vector3();

        mesh.update = function () {
            mesh.worldPosition.setFromMatrixPosition(mesh.matrixWorld);

            if (mesh.worldPosition.distanceTo(player.worldPosition) < 11 && !mesh.looking) {
                mesh.fadeAction(1);
                mesh.looking = true;
            }
            if (mesh.worldPosition.distanceTo(player.worldPosition) > 11 && mesh.looking) {
                mesh.looking = false;
                mesh.fadeAction(0);
            }
        }

        beings.push(mesh);
    },
    [ new THREE.MeshPhongMaterial({ color: 0x101010, shininess: 0, skinning: true, shading: THREE.FlatShading }), new THREE.MeshBasicMaterial({ color: 0xffffff, skinning: true }) ]);


    // TREES, THOSE USELESS TRESS
    var treeMaterial = new THREE.MeshPhongMaterial({
        shading: THREE.FlatShading,
        shininess: 0,
        side: THREE.DoubleSide,
        color: 0x050505,
        map: loader.load(path + 'textures/watercolor.jpg')
    });
    var trunkMaterial =  new THREE.MeshPhongMaterial( {
            shading: THREE.FlatShading,
            shininess: .5,
            color: 0x111111
    });

    // GRASS
    
    
    var grassTexture = loader.load(path + 'textures/grass.png');
    var grassMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, map: grassTexture, transparent: true, side: THREE.DoubleSide, shininess: 0 });
    var grassGeo = new THREE.PlaneBufferGeometry(7,7);

    for (var i=0; i<70; i++) {
        var mesh = new THREE.Mesh(
            grassGeo,
            grassMaterial
        );

        mesh.pivot = new THREE.Object3D();
        mesh.pivot.add(mesh);
        //mesh.castShadow = true;

        var scale = Math.random() * .6 + .4;
        mesh.scale.x = scale;
        mesh.scale.y = scale;

        mesh.position.set(0,51 - (1 - scale), 0);
        mesh.pivot.rotation.x = Math.random() * -.6 + .2;
        mesh.pivot.rotation.z = Math.random() * -.7 - 2.2;


        scene.add( mesh.pivot );
    }


    // Recursive silliness and bad math ahead, tread lightly.
    function createTree (treeMaterial) {
        var height = Math.random() * 6 + 4;
        var tree = new Tree (Math.random() * .1 +.3, height, [trunkMaterial, treeMaterial]);
        var treePivot = new THREE.Object3D();

        treePivot.position.set(0,0,0);
        treePivot.add(tree);
        tree.position.set(1,49 + height / 2,0);
        treePivot.rotation.set(Math.random() * -1+.3, Math.random() * -.5, Math.random() * 3.14 - 2);

        // If on the walking radius
        if (treePivot.rotation.x < 0 && treePivot.rotation.x > -.05) {
            treePivot.rotation.x -= .05; 
        }
        if (treePivot.rotation.x > 0 && treePivot.rotation.x < .05) {
            treePivot.rotation.x += .05;
        }

        // If on the way of the player on start
        if (treePivot.rotation.z > -.2 && treePivot.rotation.z < .2) {
            treePivot.rotation.x = Math.random() * -.4 - .15;
        }

        treePivot.updateMatrixWorld();

        var worldPos = new THREE.Vector3();
        worldPos.setFromMatrixPosition(tree.matrixWorld);

        if (worldPos.distanceTo(player.worldPosition) - 50 < 2) {
            createTree(treeMaterial);
        } else {
            scene.add(treePivot);
            trees.push(tree);
            tree.name = 'Tree';
            return treePivot;
        }
    }

    // Recursive silliness again. Dead tree generator.
    function deadTree (size, material, children) {

        // Recursive branch function
        function createBranch (size, material, children, isChild) {
            var branchPivot = new THREE.Object3D();
            var branchEnd = new THREE.Object3D();

            var length = Math.random() * (size * 10) + size * 5;
            var endSize = size * .75;

            if (children == 0) { endSize = 0; }

            var branch = new THREE.Mesh(
                new THREE.CylinderGeometry(endSize, size, length, 5, 1, true),
                material
            );

            branchPivot.add(branch);
            branch.add(branchEnd);

            branch.position.y = length / 2;
            branchEnd.position.y = length / 2;
            
            if (isChild) {
                branchPivot.rotation.z += Math.random() * 1.5 - .75;
                branchPivot.rotation.x += Math.random() * 1.5 - .75;
            } else {
                branch.castShadow = true;
                branch.receiveShadow = true;

                branchPivot.rotation.z += Math.random() * .2 - .1;
                branchPivot.rotation.x += Math.random() * .2 - .1;  
            }

            if (children > 0) {
                for (var c=0; c<children; c++) {
                    var child = createBranch(size * .75, material, children - 1, true);
                    branchEnd.add(child);
                }
            }

            return branchPivot;
        }
        
        var tree = createBranch(size, material, children, false)
        return tree;
    }

    // Let's do some trees
    for (var i=0; i<40; i++) {
        var tree = createTree(treeMaterial);
    }

    // Let's create some dead trees
    for (var i=0; i<20; i++){
        var tree = deadTree(Math.random() * .2 + .4, treeMaterial, Math.floor(Math.random() * 2) + 3);
        var treePivot = new THREE.Object3D();
        treePivot.add(tree);
        tree.position.set(0,48.5,0);

        scene.add(treePivot);               
        treePivot.rotation.z = Math.random() * -2 - 3.14;
        
        tree.position.z = Math.random() * 12 + 4;
    }

    // Clouds on the sky
    var cloudTexture = loader.load(path + 'textures/cloud.png');

    var cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        polygonOffset: true,
        polygonOffsetFactor: -0.1,
        color: 0x353535,
        //side: THREE.DoubleSide,
        map: cloudTexture,
        opacity: .7,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });

    for (var i=0; i<100; i++) {
        var geometry = new THREE.Geometry();
        geometry.vertices.push(
            new THREE.Vector3(0,0,0),
            new THREE.Vector3(8 + Math.random() * 5, 0,0),
            new THREE.Vector3(3 + Math.random() * 3,1 + Math.random(),0)
        );
        geometry.faces.push(new THREE.Face3(0,1,2,1));
        geometry.faceVertexUvs[0].push([new THREE.Vector2(0, 0),new THREE.Vector2(0, 1),new THREE.Vector2(1, 1)]);

        geometry.computeFaceNormals();
        geometry.computeVertexNormals();
        geometry.verticesNeedUpdate = true;

        var cloud = new THREE.Mesh( geometry, cloudMaterial );
        
        var z = Math.random() * -40;
        var y = (59 + Math.random() * 10) + (z / 3);

        cloud.position.set(0,y,z);
        
        cloud.matrixAutoUpdate = true;
        cloud.updateMatrix();
        
        cloud.pivot = new THREE.Object3D();
        cloud.pivot.add(cloud);
        scene.add( cloud.pivot );
        cloud.pivot.rotation.z = Math.random() * 6.15;
        
        cloud.velocity = Math.random() * 0.001;

        clouds.push(cloud);
    }

    // Birds
    for (var i = 0; i < 60; i++ ) {
        boid = boids [i] = new Boid();
        
        boid.position.x = Math.random() * 200 - 100;
        boid.position.y = Math.random() * 200 - 100;
        boid.position.z = Math.random() * 200 - 100;
        boid.velocity.x = Math.random() * .1;
        boid.velocity.y = Math.random() * .1;
        boid.velocity.z = Math.random() * .1;
        
        boid.setAvoidWalls( false );
        boid.setWorldSize( 50, 50, 50 );

        bird = birds[ i ] = new THREE.Mesh( new Bird(), new THREE.MeshBasicMaterial( { color:0x252525, side: THREE.DoubleSide } ) );
        bird.phase = Math.floor( Math.random() * 62.83 );
        
        bird.scale.set(0.05,0.05,0.05);
        scene.add( bird );
    
    }
    birdPivot = new THREE.Object3D();
    birdTarget = new THREE.Object3D();
    birdTarget.worldPosition = new THREE.Vector3();
    birdPivot.add(birdTarget);
    birdTarget.position.set(0,65,0);
    scene.add(birdPivot);


    // Mountains
    var mountainTexture = loader.load(path + 'textures/mountain2.jpg');
    var mountainMaterial = new THREE.MeshPhongMaterial({ 
        shading: THREE.FlatShading, color: 0x080808, shininess: 0 ,
        map: mountainTexture
    });
    for (i=0; i<20; i++) {
        var geo = new THREE.CylinderGeometry(2,4,Math.random() * 4 + 10,8,1, false);

        for (var v in geo.vertices) {
            var vertex = geo.vertices[v];
            if (vertex.y > 0) {
                vertex.y += Math.random() * 10 - 5;
            }
        }

        var mountain = new THREE.Mesh(
            geo,
            mountainMaterial
        );
        mountain._name = 'Mountain';

        mountain.castShadow = true;
        mountain.scale.set(1 + Math.random() * 3, 1, 1);
        
        var mountainPivot = new THREE.Object3D();
        mountainPivot.add(mountain);

        mountain.position.set(0,50,-10 - Math.random() * 6);
        mountain.rotation.x = -.4;

        scene.add(mountainPivot);

        mountainPivot.rotation.z = Math.random() * 4.28 + 1;
    }

    // #### POSTPROCESSING
    composer = new THREE.EffectComposer( renderer );
    composer.addPass( new THREE.RenderPass( scene, camera ) );

    postProcess = {};

    postProcess.fxaa = new THREE.ShaderPass( THREE.FXAAShader );
    postProcess.fxaa.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
    composer.addPass(postProcess.fxaa);

    postProcess.hblur = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader);
    postProcess.vblur = new THREE.ShaderPass(THREE.VerticalTiltShiftShader);
    postProcess.bluriness = 3.5;

    postProcess.hblur.uniforms['h'].value = postProcess.bluriness / window.innerWidth;
    postProcess.vblur.uniforms['v'].value = postProcess.bluriness / window.innerHeight;
    postProcess.hblur.uniforms['r'].value = postProcess.vblur.uniforms['r'].value = 0.5;

    composer.addPass(postProcess.hblur);
    composer.addPass(postProcess.vblur);

    var effectFilm = new THREE.FilmPass(0.2,0,0,false);
    effectFilm.renderToScreen = true;
    composer.addPass(effectFilm);

    window.addEventListener( 'resize', onWindowResize, false );
    

    // Basic interaction stuff
    container.addEventListener( 'mousedown', onMouseDown, false );
    container.addEventListener( 'mouseup', onMouseUp, false );
    container.addEventListener( 'mousemove', onMouseMove, false );

    container.addEventListener("touchstart", touchHandler, true);
    container.addEventListener("touchmove", touchHandler, true);
    container.addEventListener("touchend", touchHandler, true);
    container.addEventListener("touchcancel", touchHandler, true); 

    container.addEventListener('keydown', onKey, false);
    container.addEventListener('keyup', onKeyUp, false);

    initSounds();

    // Good to go
    manager.initComplete();
}

function Tree (width, height, material) {

    var parts = [];
    var trunkGeometry = new THREE.CylinderGeometry( width * 0.8, width, height, 8, 12);

    for (v in trunkGeometry.vertices) {
        trunkGeometry.vertices[v].x += Math.random() * .1 - .05;
    }

    this.trunk = new THREE.Mesh(
        trunkGeometry,
        material[0]
    );

    parts.push(this.trunk);

    var foliageMaterial = material[1];
    var foliageGeometry = new THREE.CylinderGeometry(0, height * 0.22, height / 2, 6, 2, false);

    for (var i in foliageGeometry.vertices) {
        var vertex = foliageGeometry.vertices[i];
        
        vertex.x += Math.random() * .1 - .004;
        vertex.y += Math.random() * .1 - .004;
        vertex.z += Math.random() * .1 - .004;
    }

    foliageGeometry.computeFaceNormals();
    foliageGeometry.computeVertexNormals();

    var foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.castShadow = true;

    for (var i=0; i<3; i++) {
        var fol = foliage.clone();
        var scale = 1.5 - i / 3;
        fol.scale.set (scale,scale,scale);

        fol.position.y += (height / 4) + i * (height / 4);
        fol.rotation.y = Math.random() * 0.8;
        this.trunk.add(fol);
    }

    this.trunk.castShadow = true;

    return this.trunk;
}


// I used to have keyboard controls, apparently.
function onKeyUp (e) {
    if (player && (e.keyCode == 37 || e.keyCode == 39)) {
        player.walk = false;
        
        player.fadeAction('idle');
        player.running = false;
    }
    
}

function onKey (e) {
    if (player) {
        if (e.keyCode == 37) player.walk = 'left';
        if (e.keyCode == 39) player.walk = 'right';

        if (player.walk) {
            if (!player.running) { player.fadeAction('run'); player.running = true; }
        }
    }
}


// Mouse controls
function onMouseDown (e) {
    if (e.clientX < window.innerWidth / 2) {
        player.walk = 'left';
    } else {
        player.walk = 'right';
    }

    if (!player.running) { player.fadeAction('run'); player.running = true; }
}
function onMouseUp (e) {
    player.walk = false;
    player.fadeAction('idle');
    player.running = false;
}
function onMouseMove (e) {
    mouse.x = e.clientX;
    if (player.walk) {
        if (e.clientX < window.innerWidth / 2) {
            player.walk = 'left';
        } else {
            player.walk = 'right';
        }
    }
}


// Touch handler, thanks to some kind spirit on stackoverflow!
function touchHandler(event)
{
    var touches = event.changedTouches,
        first = touches[0],
        type = "";
    switch(event.type)
    {
        case "touchstart": type = "mousedown"; break;
        case "touchmove":  type = "mousemove"; break;        
        case "touchend":   type = "mouseup";   break;
        default:           return;
    }

    var simulatedEvent = document.createEvent("MouseEvent");
    simulatedEvent.initMouseEvent(type, true, true, window, 1, 
                                  first.screenX, first.screenY, 
                                  first.clientX, first.clientY, false, 
                                  false, false, false, 0, null);

    first.target.dispatchEvent(simulatedEvent);
    event.preventDefault();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    postProcess.hblur.uniforms['h'].value = postProcess.bluriness / window.innerWidth;
    postProcess.vblur.uniforms['v'].value = postProcess.bluriness / window.innerHeight;
    
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


function animate() {
    requestAnimationFrame( animate );

    var delta = clock.getDelta();

    if (player && player.walk) {
        if (player.walk == 'left') {
            pivot.rotation.z += walkSpeed;
        }
        if (player.walk == 'right') {
            pivot.rotation.z -= walkSpeed;               
        }
        if (walked < 150) { walked += 1; }
    }

    if (!camera.step) { camera.step = 0; }
    camera.trip = cameraStart - cameraEnd;
    camera.step += .25;

    var progress = camera.step / camera.trip;
    var there = false;

    if (camera.step < camera.trip -.1) {
        camera.position.y = (camera.trip + cameraEnd) - ease.easeOut(progress) * camera.trip;
    }

    birdPivot.updateMatrixWorld();
    var birdVector = new THREE.Vector3();
    birdVector.setFromMatrixPosition( birdTarget.matrixWorld );
    birdTarget.worldPosition = birdVector;

    for ( var i = 0, il = birds.length; i < il; i++ ) {
        boid = boids[ i ];
        boid.run( boids );

        bird = birds[ i ];
        bird.position.copy( boids[ i ].position );

        color = bird.material.color;

        bird.rotation.y = Math.atan2( - boid.velocity.z, boid.velocity.x );
        bird.rotation.z = Math.asin( boid.velocity.y / boid.velocity.length() );

        bird.phase = ( bird.phase + ( Math.max( 0, bird.rotation.z ) + 0.1 )  ) % 62.83;
        bird.geometry.vertices[ 5 ].y = bird.geometry.vertices[ 4 ].y = Math.sin( bird.phase ) * 5;

        if (player) { boid.repulse(player.position, 10); }
        boid.repulse(planet.position, 52);

        boid.setGoal(birdVector);
    }
    birdPivot.rotation.z += 0.0009;

    for (c in clouds) {
        clouds[c].pivot.rotation.z -= clouds[c].velocity;
    }

    if (player) { 
        player.lookAt(scene.position); 
    }

    if (animations) {
        for (a in animations) {
            animations[a].update(delta);
        }
    }
    if (beings) {
        for (b in beings) {
            beings[b].update();
        }
    }
    if (player.update) {
        player.update();
    }

    lakeMirror.render();

    var io = parseFloat(info.style.opacity);
    if (walked < 40 && camera.position.y < 65) {  
        io += .009;
        info.style.opacity = io;
    }

    if (walked > 40 && !info.hidden) {
        io -= .05;
        info.style.opacity = io;
        
        if (info.style.opacity <= 0) {
            info.hidden = true;
            info.parentNode.removeChild(info);
        }
    }
    if (curtain.material.opacity > 0) {
        curtain.material.opacity -= .008;
    }

    handleSound();
    render();
}

function handleSound() {
    if (sounds['Wind'].state() == 'loaded' && sounds['Wind'].volume() < .45) {
        var vol = sounds['Wind'].volume();
        sounds['Wind'].volume(vol + 0.005);
    }

    var vol = (Math.abs(birdPivot.rotation.z) - Math.abs(pivot.rotation.z) * 2) / Math.PI * 2;
    var pos = Math.abs(pivot.rotation.z % (Math.PI * 2));

    for (m in musicSpots) {
        var music = musicSpots[m];
        var rot = music.pivot.rotation.z;
        var dist = Math.abs(pos - rot) / Math.PI ;
        var vol = music.sound.volume();

        if (player.worldPosition.distanceTo(music.worldPosition) < 50) {
            if (vol < .7 && music.sound.state() == 'loaded') {
                music.sound.volume(vol + .005);
            } 
        } else {
            if (vol > 0) {
                music.sound.volume(vol - .005);
            }
        }
    }

    var crowDist = player.worldPosition.distanceTo(birdTarget.worldPosition);

    if (crowDist < 30) {
        sounds['Crow'].volume((1 - crowDist / 30) * .2);
    }
}

function render() {
    scene.updateMatrixWorld();
    composer.render(0.01);
}


/*

The end.

*/