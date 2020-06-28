import Model from './Model.js';
import * as THREE from 'three';
import C from 'cannon';
import EVENTS from '../../../Enums/eventTypes.js';
import LAYERS from '../../../Enums/layerTypes.js';
import SPLATS from '../../../Enums/splatTypes.js';
import SNAPSTO from '../../../Enums/snapTypes.js';

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
                        fog:            true,
                        depthWrite:     true, 
                        } )], 
                    [LAYERS.Pieces, new THREE.MeshStandardMaterial({
                        color:          0x7a4719, 
                        roughness:      0.6,
                        metalness:      0.8,
                        shadowSide:     THREE.FrontSide,
                        flatShading:    true,
                        fog:            true,
                        depthWrite:     true,
                        } )]
                    ]);

const GHOST_MATERIAL = new THREE.MeshPhongMaterial( {
                        color:          0x6d7d7f,
                        emissive:       0xafa4ff,
                        shininess:      0,
                        flatShading:    true,
                        transparent:    true,
                        opacity:        0.50,
                        visible:        false,
                        fog:            true,

} );

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
    grid.material.transparent = false;
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


export default class Engine {

    constructor(){

        let _this = this;
        
        this.camera = new CinematicCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
        this.camera.setFocalLength(18);
        this.camera.position.set(200, 100, 200);
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
                obj.of.material.emissive.set(0x000000);
            });
            event.object.of.material.emissive.set( 0x333333 );
        
        } );
        dcontrols.addEventListener( 'hoveroff', function ( event ) {

            _this.pieces.forEach((obj) => {
                obj.of.material.emissive.set(0x000000);
            });
        
        } );
        dcontrols.addEventListener('dragstart', (event) => {

            let ghost = event.object;

            ghost.material.visible.set( true );

            controls.enabled = false;
            _this.movement_grid.visible = true;
            _this.static_grid.visible = false;
            _this.lastCameraAngle = _this.camera.rotation.clone();
            _this.lastCameraPos = _this.camera.position.clone();
            switchCameraToOverheadView(_this.camera, ghost.position);

        });
        dcontrols.addEventListener('drag', (event) => {

            let ghost = event.object;
            ghost.position.y = 15;

        });
        dcontrols.addEventListener('dragend', (event) => {

            let ghost = event.object;
            let mesh = ghost.of;

            ghost.position.copy(
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
            _this.camera.position.copy(_this.lastCameraPos.add(ghost.position));
            controls.target.copy(ghost.position);
            controls.update();
            controls.enabled = true;

            Model.moveMesh(mesh.id, mesh.layer, ghost.position, ghost.quaternion, {});

            ghost.material.visible.set( false );

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
            this.newScene();
        }, false );

        Model.addEventListener( EVENTS.AddItem, (event) => {
            this.loadMesh(event);
        }, false );

        Model.addEventListener( EVENTS.MoveItem, (event) => {
            let mesh = this.meshesById.get(event.mesh.id);
            let {x, y, z} = event.mesh.position;
            let {i, j, k, w} = event.mesh.quaternion;
            mesh.position.set(x, y, z);
            mesh.quaternion.set(i, j, k, w);
            mesh.ghost.position.copy(mesh.position);
            mesh.ghost.quaternion.copy(mesh.quaternion);
        }, false );

        Model.addEventListener( EVENTS.RemoveItem, (event) => {
            let mesh = this.meshesById.get(event.mesh.id);
            if (mesh) {
                mesh.material.visible = false;
                mesh.material.dispose();
                mesh.dispose();
            }
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
            this.meshesById.forEach((mesh, key, map) => {
                mesh.material.dispose();
                mesh.dispose();
            });
            for (const ghost of this.pieces){
                ghost.material.dispose();
                ghost.dispose();
            }
            this.scene.dispose();
        }

        this.scene = new THREE.Scene();

        this.pieces = [];
        this.meshesById = new Map();

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
            new THREE.MeshPhongMaterial( { color: GROUND, depthWrite: true, flatShading: true } ) 
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

    initializeMesh(geometry, event){

        let mesh = new THREE.Mesh(geometry, MATERIALS.get(event.mesh.layer).clone());

        let m = event.mesh;

        this.meshesById.set(m.id, mesh);

        mesh.layer = m.layer;
        mesh.mesh_id = m.id;
        mesh.snapOffset = m.snapOffset;
        mesh.snapTo = m.snapTo;
        mesh.position.copy(snapToGrid(m.position, m.snapOffset, m.snapTo, m.layer));
        let {i, j, k, w} = m.rotation;
        mesh.quaternion.set(i, j, k, w);
        switch(mesh.layer){
            case LAYERS.Map:
                // Map layer stuff
                break;

            case LAYERS.Pieces:
                // Pieces stuff
                // create a ghost mesh for piece movement
                let ghost_mesh = new THREE.Mesh(geometry, GHOST_MATERIAL.clone());
                ghost_mesh.position.copy(mesh.position);
                ghost_mesh.quaternion.copy(mesh.quaternion);
                ghost_mesh.of = mesh;
                mesh.ghost = ghost_mesh;
                this.pieces.push(ghost_mesh);
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
                this.initializeMesh(geometry, event);
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

//export default Engine = new Engine();