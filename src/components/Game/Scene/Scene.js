import * as THREE from 'three';
//import * as MODEL from 'model';
import C from 'cannon'
import * as EVENTS from 'src/constants/eventTypes.js';

export default class Scene {

    constructor(model, world){
        this.scene = new THREE.scene();
        this.camera = new THREE.PerspectiveCamera( 45, width / height, 1, 1000 );
        this.renderer = new THREE.WebGLRenderer();
        this.model = model;
        this.world = world;

        this.meshes = [];
        this.bodies = [];

        // initalize scene
        this.scene.add(this.camera)


        //initialize world
        var ground = new C.Body({
            mass: 0,
            shape: new C.Box(new C.Vec3(50, 0.1, 50)),
            position: new C.Vec3(0, i * margin - this.offset, 0)
        })
    }

    addEvent(event){
        switch(event.type) {

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

        }
    }

    animate(){

        this.world.step(2);

        for (var tuple in this.meshes.map((k, i) => [k, this.bodies[i]])){
            var mesh = tuple[0];
            var body = tuple[1];
            mesh.position.copy(body.position);
            mesh.quarternion.copy(body.quarternion);
        }

        this.renderer.render(this.scene, this.camera);

    }

}