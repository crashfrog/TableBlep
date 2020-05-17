import Model from './Model.js';
import * as THREE from 'three';
import C from 'cannon';
import EVENTS from '../Enums/eventTypes.js';
import LAYERS from '../Enums/layerTypes.js';
import SPLATS from '../Enums/splatTypes.js';
import SNAPSTO from '../Enums/snapTypes.js';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
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
                    [LAYERS.Pieces, new THREE.MeshStandardMaterial({
                        color:          0x7a4719, 
                        specular:       0x333333, 
                        shininess:      300,
                        roughness:      0.6,
                        metalness:      0.8,
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

const SCALE = 25; // mm to in
const PIECE_LAYER_Y = 5;
const MAP_LAYER_Y = -6;
const HOLOGRAM_LAYER_Y = 14;

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

function snapToGrid(position, snapOffset, snapTo, layer){
    var {x, y, z} = position;
    if (snapTo === SNAPSTO.Center){
        x -= SCALE / 2;
        z -= SCALE / 2;
    }
    x = Math.round(x / SCALE) * SCALE;
    z = Math.round(z / SCALE) * SCALE;
    if (snapTo === SNAPSTO.Center){
        x += SCALE / 2;
        z += SCALE / 2;
    }
    x += snapOffset.x;
    z += snapOffset.z;
    if (layer === LAYERS.Pieces){
        y = PIECE_LAYER_Y;
    } else if (layer === LAYERS.Map){
        y = MAP_LAYER_Y;
    } else if (layer === LAYERS.Hologram){
        y = HOLOGRAM_LAYER_Y;
    }
    return new THREE.Vector3(x, y, z);
}

function sum(pos1, pos2){
    var x = pos1.x + pos2.x;
    var y = pos1.y + pos2.y;
    var z = pos1.z + pos2.z;
    return {x:x, y:y, z:z};
}

function switchCameraToOverheadView(camera, position){
    camera.quaternion.set(0, Math.sqrt(0.5), Math.sqrt(0.5), 0);
    camera.position.set(position.x, 400, position.z);
}


class Engine {

    constructor(){

        var _this = this;
        
        this.camera = new CinematicCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
        this.camera.setFocalLength(18);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFShadowMap;

        //orbit controls

        var controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.maxPolarAngle = (TAU / 4 );
        controls.minPolarAngle = (TAU / 32);
        controls.minDistance = 75;
        controls.maxDistance = 350;
        controls.target = new THREE.Vector3(0, -20, 0);
        controls.update();

        

        this.newScene();

        //drag controls

        var dcontrols = new DragControls( this.pieces, this.camera, this.renderer.domElement );
        dcontrols.enabled = true;
        dcontrols.addEventListener( 'hoveron', function ( event ) {
            _this.pieces.forEach((obj) => {
                obj.material.emissive.set(0x000000);
            });
            event.object.material.emissive.set( 0x333333 );
        
        } );
        dcontrols.addEventListener( 'hoveroff', function ( event ) {

            _this.pieces.forEach((obj) => {
                obj.material.emissive.set(0x000000);
            });
        
        } );
        dcontrols.addEventListener('dragstart', (event) => {

            controls.enabled = false;
            _this.movement_grid.visible = true;
            _this.static_grid.visible = false;
            _this.lastCameraAngle = _this.camera.rotation.clone();
            _this.lastCameraPos = _this.camera.position.clone();
            switchCameraToOverheadView(_this.camera, event.object.position);

        });
        dcontrols.addEventListener('drag', (event) => {

            event.object.position.y = 15;

        });
        dcontrols.addEventListener('dragend', (event) => {

            event.object.material.emissive.set( 0x000000 );

            event.object.position.copy(
                snapToGrid(
                    event.object.position, 
                    event.object.snapOffset, 
                    event.object.snapTo, 
                    event.object.layer
                )
            );

            _this.movement_grid.visible = false;
            _this.static_grid.visible = true;
            
            _this.camera.rotation.copy(_this.lastCameraAngle);
            _this.camera.position.copy(_this.lastCameraPos.add(event.object.position));
            controls.target.copy(event.object.position);
            controls.enabled = true;

            Model.moveMesh(event.object, {});

        });
        
        // sample map and pieces

        
        this.loadMesh({
            mesh:{
                layer:LAYERS.Pieces,
                id:2,
                ref:'./sample_meshes/henfeather.stl',
                format:'stl',
                snapOffset:{x:0, y:5, z:0},
                snapTo:SNAPSTO.Center,
                position:{x:-25, y:0, z:-25},
                rotation:NORTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Pieces,
                id:2,
                ref:'./sample_meshes/kork.stl',
                format:'stl',
                snapOffset:{x:0, y:5, z:0},
                snapTo:SNAPSTO.Center,
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
                snapOffset:{x:25, y:5, z:25},
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
                snapOffset:{x:0, y:0, z:0},
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
                snapOffset:{x:0, y:0, z:0},
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
                snapOffset:{x:0, y:0, z:0},
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
                snapOffset:{x:0, y:0, z:0},
                position:{x:-175, y:0, z:-50},
                rotation:EAST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
                position:{x:-175, y:0, z:-100},
                rotation:EAST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
                position:{x:-125, y:0, z:-150},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
                position:{x:-75, y:0, z:-150},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
                position:{x:-25, y:0, z:-150},
                rotation:SOUTH,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_corner.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
                position:{x:25, y:0, z:-100},
                rotation:WEST,
            }
        });
        this.loadMesh({
            mesh:{
                layer:LAYERS.Map,
                id:1,
                ref:'./sample_meshes/stone_wall.stl',
                format:'stl',
                snapOffset:{x:0, y:0, z:0},
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
                snapOffset:{x:0, y:0, z:0},
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
                snapOffset:{x:0, y:0, z:0},
                position:{x:-125, y:0, z:-55},
                rotation:NORTH,
            }
        });

        // FOD/Bokeh effect

        var renderPass = new RenderPass( this.scene, this.camera );

        var bokehPass = new BokehPass( this.scene, this.camera, EFFECTS);
        bokehPass.setSize(window.innerWidth, window.innerHeight);

        var composer = new EffectComposer( this.renderer );

        composer.addPass( renderPass );
        composer.addPass( bokehPass );

        // Window resize handler

        window.addEventListener( 'resize', () => this.onWindowResize(), false );

        // Register to receive model events

        Model.addEventListener( EVENTS.Initalize, (event) => {
            _this.newScene();
        }, false );

        Model.addEventListener( EVENTS.AddItem, (event) => {
            _this.loadMesh(event);
        }, false );

        Model.addEventListener( EVENTS.MoveItem, (event) => {

        }, false );

        Model.addEventListener( EVENTS.RemoveItem, (event) => {

        }, false);


        // animate and render scene

        var animate = () => {
            bokehPass.uniforms['focus'].value = controls.object.position.distanceTo(controls.target);
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

        this.pieces = [];

        // initalize scene
        
        this.scene.add(this.camera)

        this.scene.background = new THREE.Color( HORIZON );
        this.scene.fog = new THREE.Fog( HORIZON, 100, 1000 );
        
        this.camera.position.set( -80, 60, -80 );
        this.camera.rotateX(-.5);


        var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
        hemiLight.position.set( 0, 200, 0 );
        this.scene.add( hemiLight );

        var directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 0, 200, -200 );
        directionalLight.castShadow = true;
        this.scene.add( directionalLight );

        var ground = new THREE.Mesh( 
            new THREE.PlaneBufferGeometry( 3000, 3000 ), 
            new THREE.MeshPhongMaterial( { color: GROUND, depthWrite: false, flatShading: true } ) 
        );
        ground.rotation.x = - Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add( ground );

        this.static_grid = oneInchGrid()
        this.scene.add( this.static_grid ); //regular ground grid

        this.movement_grid = oneInchGrid(); //movement guide grid
        this.movement_grid.material.color.set(0x00ff00);
        this.movement_grid.position.y = HOLOGRAM_LAYER_Y;
        this.movement_grid.visible = false;
        this.scene.add(this.movement_grid);

    }

    initializeMesh(mesh, event){
        var m = event.mesh;

        mesh.layer = m.layer;
        mesh.mesh_id = m.id;
        mesh.snapOffset = m.snapOffset;
        mesh.snapTo = m.snapTo;
        mesh.position.copy(snapToGrid(m.position, m.snapOffset, m.snapTo, m.layer));
        var {i, j, k, w} = m.rotation;
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
    }

    loadMesh(event){
        Model.getGeometry(
            (geometry) => {
                var mesh = new THREE.Mesh(geometry, MATERIALS.get(event.mesh.layer).clone());
                this.initializeMesh(mesh, event);
            },
            event.mesh.ref,
            event.mesh.format
        );
    }

    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );

    }

}

export default Engine = new Engine();