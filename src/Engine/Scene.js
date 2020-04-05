import * as THREE from 'three';
//import * as MODEL from 'model';
import C from 'cannon';
import EVENTS from './eventTypes.js';

export default class Scene {

    constructor(model, world){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
        this.renderer = new THREE.WebGLRenderer();
        this.model = model;
        this.world = world;

        this.meshes = [];
        this.bodies = [];

        // initalize scene
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        //this.mount.appendChild( this.renderer.domElement );
        this.scene.add(this.camera)

        this.scene.background = new THREE.Color( 0xa0a0a0 );
        this.scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );

        // test cube
        var geometry = new THREE.BoxGeometry( 1, 1, 1 );
        var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
        var cube = new THREE.Mesh( geometry, material );
        this.scene.add( cube );
        this.camera.position.set( 0, 5, 10 );
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

        var ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );

        var grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add( grid );

        

        var renderer = this.renderer;
        var scene = this.scene;
        var camera = this.camera;

        var animate = function() {

            requestAnimationFrame( animate );
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

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