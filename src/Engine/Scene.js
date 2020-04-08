import * as THREE from 'three';
//import * as MODEL from 'model';
import C from 'cannon';
import EVENTS from './eventTypes.js';
//import { threeToCannon } from 'three-to-cannon';

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

function oneInchGrid(){
    var grid = new THREE.GridHelper( 2500, 100, 0xFFFFFF, 0x5555FF );
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    return grid;
}

function loadMesh(scene, x, y, z){
    return (geometry) => {
        var material = new THREE.MeshPhongMaterial( { color: 0x449944, specular: 0x111111, shininess: 200 } );
        var mesh = new THREE.Mesh( geometry, material );
        mesh.position.set( x , y , z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.rotateX(-Math.PI / 2);
        mesh.rotateZ(Math.PI / 2);

        scene.scene.add( mesh );
        scene.contents.push( [ new C.Body({
            mass:10,
            //shape: threeToCannon(mesh),
            shape: new C.Box(new C.Vec3(25, 25, 45)),
            position: new C.Vec3(x, y, z),
            rotation: new C.Vec3(Math.PI / 2, 0, 0)
        }), mesh ] );
    }
}

export default class Scene {

    constructor(model, world){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
        this.renderer = new THREE.WebGLRenderer();
        this.model = model;
        this.world = world;

        this.contents = [];

        // initalize scene
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        //this.mount.appendChild( this.renderer.domElement );
        this.scene.add(this.camera)

        this.scene.background = new THREE.Color( 0x000000 );
        this.scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );

        // test cube
        var geometry = new THREE.BoxGeometry( 25, 25, 25 );
        var material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );
        var cube = new THREE.Mesh( geometry, material );
        cube.position.set(0,25,0);
        
        this.camera.position.set( 0, 50, 75 );
        this.camera.rotateX(-.5);
        //this.camera.position.z = 5;


        //initialize world
        // var ground = new C.Body({
        //     mass: 0,
        //     shape: new C.Box(new C.Vec3(50, 0.1, 50)),
        //     position: new C.Vec3(0, 0, 0)
        // })

        // this.world.addBody(ground);

        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
        hemiLight.position.set( 0, 200, 0 );
        this.scene.add( hemiLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 0, 200, 100 );
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.top = 180;
        directionalLight.shadow.camera.bottom = - 100;
        directionalLight.shadow.camera.left = - 120;
        directionalLight.shadow.camera.right = 120;
        this.scene.add( directionalLight );

        var ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x0000000, depthWrite: false } ) );
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );

        
        this.scene.add( oneInchGrid() );

        //this.scene.add( cube );

        var loader = new STLLoader();

        loader.load('./sample_meshes/henfeather.stl', 
                    loadMesh(this, 0,15,0),
                    function(e) {console.info(e)},
                    function(e) {console.error(e)});

        

        var renderer = this.renderer;
        var scene = this.scene;
        var camera = this.camera;
        var contents = this.contents;
        var world = this.world;

        var animate = function() {

            world.step(2);

            contents.forEach(function(tuple) {
                var [body, mesh] = tuple;
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
            });

            requestAnimationFrame( animate );
            //cube.rotation.x += 0.01;
            //cube.rotation.y += 0.01;

            renderer.render(scene, camera);
        }

        animate();

    }

    async addEvent(event){
        switch(event.type) {

            case EVENTS.Initialize:

                break;

            case EVENTS.AddItem:
                // create a mesh object

                // put it in the scene

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

    animate(){

        // this.world.step(2);

        // for (var tuple of this.meshes.map((k, i) => [k, this.bodies[i]])) {
        //     var mesh = tuple[0];
        //     var body = tuple[1];
        //     mesh.position.copy(body.position);
        //     mesh.quarternion.copy(body.quarternion);
        // }

        requestAnimationFrame( this.animate );
        this.cube.rotation.x += 0.01;
        this.cube.rotation.y += 0.01;

        this.renderer.render(this.scene, this.camera);

    }

}