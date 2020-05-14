import * as THREE from 'three';
//import * as MODEL from 'model';
import C from 'cannon';
import EVENTS from './eventTypes.js';
import LAYERS from './layerTypes.js';
import SPLATS from './splatTypes.js';
//import { threeToCannon } from 'three-to-cannon';

// import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
//import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { CinematicCamera } from 'three/examples/jsm/cameras/CinematicCamera.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const HORIZON = 0x000000;
const GROUND = 0x222222;

const TAU = 2 * Math.PI;
//const loader = new STLLoader();

const MATERIALS = new Map([
                    [LAYERS.Map, new THREE.MeshPhongMaterial( {
                        color:          0x666666, 
                        specular:       0x111111, 
                        shininess:      20, 
                        shadowSide:     THREE.FrontSide,
                        flatShading:    true, 
                        } )], 
                    [LAYERS.Pieces, new THREE.MeshPhongMaterial({
                        color:          0x449944, 
                        specular:       0x111111, 
                        shininess:      10,
                        shadowSide:     THREE.FrontSide,
                        flatShading:    true,
                        } )]
                    ]);

const EFFECTS = {

                        focus:      90,
                        aperture:	0.00003,
                        maxblur:	90,
                        fstop:      2.6,
    
                    };

const DECALS = new Map([
    [SPLATS.Fluid, new THREE.MeshPhongMaterial( {specular: 0x111111, shininess: 100} )],
    [SPLATS.Gel, new THREE.MeshPhongMaterial( {specular: 0x111111, shininess: 300} )],
]);

//const LOADERS = {'stl':new STLLoader(), 'gltf': new GLTFLoader()};

const SCALE = 25; // mm to in

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

const NORTH = {i:-Math.sqrt(0.5), j:0, k:0, w:Math.sqrt(0.5)};
const EAST = {i:-0.5, j:-0.5, k:-0.5, w:0.5};
const SOUTH = {i:0, j:Math.sqrt(0.5), k:Math.sqrt(0.5), w:0};
const WEST = {i:-0.5, j:0.5, k:0.5, w:0.5};

function oneInchGrid(){
    var grid = new THREE.GridHelper( SCALE * 100, 100, 0xAAAAFF, 0xAAAAFF );
    grid.material.opacity = 1;
    grid.material.transparent = true;
    return grid;
}

function snapToGrid(position){
    var {x, y, z} = position;
    x = x - (x % SCALE) + (SCALE / 2);
    z = z - (z % SCALE) + (SCALE / 2);
    return {x:x, y:y, z:z};
}

function sum(pos1, pos2){
    // var {x1, y1, z1} = pos1;
    // var {x2, y2, z2} = pos2;
    // return {x:x1+x2, y:y1+y2, z:z1+z2};
    var x = pos1.x + pos2.x;
    var y = pos1.y + pos2.y;
    var z = pos1.z + pos2.z;
    return {x:x, y:y, z:z};
}


export default class Scene {

    constructor(model, world){

        var _this = this;
        
        this.model = model;
        this.world = world;

        //this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 3000 );
        this.camera = new CinematicCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
        this.camera.setFocalLength(18);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;

        //orbit controls

        var controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true;
        controls.maxPolarAngle = (TAU / 4 );
        controls.minPolarAngle = (TAU / 32);
        controls.minDistance = 75;
        controls.maxDistance = 350;
        controls.target = new THREE.Vector3(0, 20, 0);

        

        this.newScene();

        //drag controls

        var dcontrols = new DragControls( this.pieces, this.camera, this.renderer.domElement );
        dcontrols.enabled = true;
        dcontrols.addEventListener( 'hoveron', function ( event ) {

            event.object.material.emissive.set( 0x333333 );
        
        } );
        dcontrols.addEventListener( 'hoveroff', function ( event ) {

            event.object.material.emissive.set( 0x000000 );
        
        } );
        dcontrols.addEventListener('dragstart', (event) => {
            controls.enabled = false;
            _this.grid.visible = true;
        });
        dcontrols.addEventListener('drag', (event) => {
            event.object.position.y = 15;
        });
        dcontrols.addEventListener('dragend', (event) => {
            var pos = snapToGrid({
                x:event.object.position.x,
                y:event.object.position.y,
                z:event.object.position.z
            });
            event.object.position.x = pos.x;
            event.object.position.y = 5;
            event.object.position.z = pos.z;
            controls.enabled = true;
            _this.grid.visible = false;
        });
        
        

        
        this.loadMesh({
            mesh:{
                layer:LAYERS.Pieces,
                id:2,
                ref:'./sample_meshes/henfeather.stl',
                format:'stl',
                snap_offset:{x:0, y:5, z:0},
                position:{x:0, y:0, z:0},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Pieces,
                id:2,
                ref:'./sample_meshes/kork.stl',
                format:'stl',
                snap_offset:{x:0, y:5, z:0},
                position:{x:-25, y:0, z:-50},
                rotation:EAST,
            }
        })
        this.loadMesh({
            mesh:{
                layer:LAYERS.Pieces,
                id:2,
                ref:'./sample_meshes/carrion_crawler.stl',
                format:'stl',
                snap_offset:{x:25, y:5, z:25},
                position:{x:-175, y:0, z:-75},
                rotation:WEST,
            }
        })
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-30, y:0, z:0},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-75, y:0, z:0},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-125, y:0, z:0},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-195, y:0, z:-50},
                rotation:EAST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-195, y:0, z:-120},
                rotation:EAST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-145, y:0, z:-170},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-95, y:0, z:-170},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-45, y:0, z:-170},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:26, y:0, z:-120},
                rotation:WEST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:26, y:0, z:-55},
                rotation:WEST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_floor.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-75, y:0, z:-55},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_floor.stl',
                format:'stl',
                snap_offset:{x:-12.5, y:-6, z:12.5},
                position:{x:-125, y:0, z:-55},
                rotation:NORTH,
            }
        });

        var renderPass = new RenderPass( this.scene, this.camera );

        var bokehPass = new BokehPass( this.scene, this.camera, EFFECTS);
        bokehPass.setSize(window.innerWidth, window.innerHeight);

        var composer = new EffectComposer( this.renderer );

        composer.addPass( renderPass );
        composer.addPass( bokehPass );

        window.addEventListener( 'resize', () => this.onWindowResize(), false );
        // window.addEventListener( 'scoll', () => {
        //     bokehPass.setFocalLength = controls.object.position.distanceTo(controls.target);
        // }, false)

        

        var animate = function() {

            

            _this.world.step(2);

            // _this.contents.forEach((tuple) => {
            //     var [body, mesh] = tuple;
            //     mesh.position.copy(body.position);
            //     mesh.quaternion.copy(body.quaternion);
            // });

            bokehPass.uniforms['focus'].value = controls.object.position.distanceTo(controls.target);
            //bokehPass.uniforms['focus'] = 350;
            //bokehPass.uniforms['focus'] += 1;

            

            controls.update();


            requestAnimationFrame( animate );
            composer.render(_this.scene, _this.camera);
            


        }

        animate();

    }

    newScene(){

        if (this.scene){
            this.scene.dispose();
        }

        this.scene = new THREE.Scene();

        this.contents = [];
        this.pieces = [];

        // initalize scene
        
        this.scene.add(this.camera)

        this.scene.background = new THREE.Color( HORIZON );
        this.scene.fog = new THREE.Fog( HORIZON, 100, 1000 );
        
        this.camera.position.set( -50, 50, -15 );
        this.camera.rotateX(-.5);


        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
        hemiLight.position.set( 0, 200, 0 );
        this.scene.add( hemiLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 0, 200, -200 );
        directionalLight.castShadow = true;
        this.scene.add( directionalLight );

        var ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 3000, 3000 ), new THREE.MeshPhongMaterial( { color: GROUND, depthWrite: false } ) );
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );

        
        this.scene.add( oneInchGrid() ); //regular ground grid

        this.grid = oneInchGrid();
        this.grid.material.color.set(0x00ff00);
        this.grid.position.y = 14;
        this.grid.visible = false;
        this.scene.add(this.grid);

    }

    loadMesh(event){
        this.model.getGeometry(
            (geometry) => {
                var mesh = new THREE.Mesh(geometry, MATERIALS.get(event.mesh.layer).clone());
                mesh.layer = event.mesh.layer;
                //mesh.model_id = event.mesh.id;
                var pos = sum(event.mesh.snap_offset, snapToGrid(event.mesh.position));
                var {x, y, z} = pos;
                mesh.position.set(x, y, z);
                var {i, j, k, w} = event.mesh.rotation;
                mesh.quaternion.set(i, j, k, w);
                switch(mesh.layer){
                    case LAYERS.Map:
                        // Map layer stuff
                        break;

                    case LAYERS.Pieces:
                        // Pieces stuff
                        this.pieces.push(mesh);
                        break;

                    case LAYERS.Hologram:
                        // meshes that noclip
                        break;

                    case LAYERS.Toybox:
                        // meshes that load but don't get added to the main scene
                        break;

                    default:

                        break;
                }
                this.scene.add(mesh);
            },
            event
        );
    }

    addEvent(event){
        switch(event.type) {

            case EVENTS.Initialize:
                this.newScene();
                break;

            case EVENTS.AddItem:
                // create a mesh object
                // put it in the scene
                this.loadMesh(event);

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

    // onScroll(){
    //     this.bokehPass.uniforms["focus"] = this.camera.uniforms['zoom'];
    // }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );

    }

}