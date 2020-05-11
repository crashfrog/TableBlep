import * as THREE from 'three';
//import * as MODEL from 'model';
import C from 'cannon';
import EVENTS from './eventTypes.js';
//import { threeToCannon } from 'three-to-cannon';

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
//import { CinematicCamera } from 'three/examples/jsm/cameras/CinematicCamera.js';

const TAU = 2 * Math.PI;
//const loader = new STLLoader();

const materials = { 'map':new THREE.MeshPhongMaterial( { color: 0x666666, specular: 0x111111, shininess: 20 } ), 
                    'pieces':new THREE.MeshPhongMaterial( { color: 0x449944, specular: 0x111111, shininess: 300 } ) }

const loaders = {'stl':new STLLoader(), 'gltf': new GLTFLoader()};

// Quarternions
// w	x	y	z	Description
// 1	0	0	0	Identity quaternion, no rotation
// 0	1	0	0	180° turn around X axis
// 0	0	1	0	180° turn around Y axis
// 0	0	0	1	180° turn around Z axis
// sqrt(0.5)	sqrt(0.5)	0	0	90° rotation around X axis
// sqrt(0.5)	0	sqrt(0.5)	0	90° rotation around Y axis
// sqrt(0.5)	0	0	sqrt(0.5)	90° rotation around Z axis
// sqrt(0.5)	-sqrt(0.5)	0	0	-90° rotation around X axis
// sqrt(0.5)	0	-sqrt(0.5)	0	-90° rotation around Y axis
// sqrt(0.5)	0	0	-sqrt(0.5)	-90° rotation around Z axis

function oneInchGrid(){
    var grid = new THREE.GridHelper( 2500, 100, 0xFFFFFF, 0x5555FF );
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    return grid;
}

function loadMesh(scene, material, position, quaternion, mesh_callback){
    return (geometry) => {
        var mesh = new THREE.Mesh( geometry, material );
        var {x, y, z} = position;
        mesh.position.set(x, y, z);
        var {i, j, k, w} = quaternion;
        mesh.quaternion.set(i, j, k, w);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        scene.scene.add(mesh);
        mesh_callback(mesh);
    }
}

export default class Scene {

    constructor(model, world){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 3000 );
        //this.camera = new CinematicCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
        this.camera.setFocalLength(12);
        
        this.renderer = new THREE.WebGLRenderer();
        this.model = model;
        this.world = world;

        this.contents = [];

        // initalize scene
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.scene.add(this.camera)

        this.scene.background = new THREE.Color( 0x000000 );
        this.scene.fog = new THREE.Fog( 0xa0a0a0, 20, 1000 );
        
        this.camera.position.set( 0, 50, 75 );
        this.camera.rotateX(-.5);


        //initialize world
        var ground = new C.Body({
            mass: 0,
            shape: new C.Box(new C.Vec3(50, 0.1, 50)),
            position: new C.Vec3(0, 0, 0)
        })

        // this.world.addBody(ground);

        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
        hemiLight.position.set( 0, 200, 0 );
        this.scene.add( hemiLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 0, 200, -200 );
        directionalLight.castShadow = true;
        // directionalLight.shadow.camera.top = 180;
        // directionalLight.shadow.camera.bottom = - 100;
        // directionalLight.shadow.camera.left = - 120;
        // directionalLight.shadow.camera.right = 120;
        this.scene.add( directionalLight );

        var ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x0000000, depthWrite: false } ) );
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );

        
        this.scene.add( oneInchGrid() );

        //this.scene.add( cube );

        

        var renderer = this.renderer;
        var scene = this.scene;
        var camera = this.camera;
        var contents = this.contents;
        //var world = this.world;

        var controls = new OrbitControls(camera, renderer.domElement);
        controls.maxPolarAngle = (TAU / 4 ) - .1;
        controls.minPolarAngle = TAU / 16;
        controls.minDistance = 10;
        controls.maxDistance = 250;

        var animate = function() {

            world.step(2);

            contents.forEach((tuple) => {
                var [body, mesh] = tuple;
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
            });

            requestAnimationFrame( animate );
            //cube.rotation.x += 0.01;
            //cube.rotation.y += 0.01;

            renderer.render(scene, camera);
            //camera.renderCinematic(scene, renderer);
        }

        loaders['stl'].load('./sample_meshes/henfeather.stl', 
                            loadMesh(this, materials['pieces'], {x:-12, y:10, z:12}, {i:-Math.sqrt(0.5), j:0, k:0, w:Math.sqrt(0.5)}),
                            function(e) {console.info(e)},
                            function(e) {console.error(e)});
        loaders['stl'].load('./sample_meshes/stone_wall.stl',
                            loadMesh(this, materials['map'], {x:-25, y:0, z:25}, {i:-Math.sqrt(0.5), j:0, k:0, w:Math.sqrt(0.5)}),
                            function(e) {console.info(e)},
                            function(e) {console.error(e)});

        animate();

    }

    loadMesh(event){
        // loaders[event.mesh.mesh_format].load(event.mesh.ref,
        //                                      loadMesh(this, event.mesh.position, event.mesh.rotation),
        //                                      function(e) {console.info(e)},
        //                                      function(e) {console.error(e)}
        //                                      );
        this.model.getGeometry(
            loadMesh(this, 
                     materials[event.mesh.layer], 
                     event.mesh.position, 
                     event.mesh.rotation,
                     (mesh) => {
                         mesh.id = event.mesh.id;
                         mesh.layer = event.mesh.layer;
                     }),
            event
        );
    }

    async addEvent(event){
        switch(event.type) {

            case EVENTS.Initialize:

                break;

            case EVENTS.AddItem:
                // create a mesh object
                // put it in the scene
                //this.loadMesh(event);

                //make a body
                var body = new C.Body({
                    mass: 1
                });

                //add body to world
                break;
            
            case EVENTS.RemoveItem:

                break;

            case EVENTS.MoveItem:

                break;

            default:

        }
    }
}