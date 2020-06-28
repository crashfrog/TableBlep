import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import React, { Component } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { CinematicCamera } from 'three/examples/jsm/cameras/CinematicCamera.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import SIZE from 'Enums/sizeTypes.js';
import TILE from 'Enums/tileTypes';
import SNAP from 'Enums/snapTypes.js';

/*
Module to import STL files and convert to GLTF, permitting resizing, reorienting, and setting the rotation centroid.

*/
const SCALE = 25; //25mm figurine scale
const TAU = 2 * Math.PI;
const HORIZON = 0x000000;
const GROUND = 0x222222;

function newGrid(squares){
    return new THREE.GridHelper(SCALE * squares,
                                squares,
                                0xAAAAFF, 
                                0xAAAAFF);
}

export default class Converter extends Component {

    constructor(props){

        super(props);
        this.state = {
            addBase: false,
            modelType: TILE.mini,
            modelScale: SIZE.medium,
            modelEyeline: 0,
            scaleFactor: 1.0,
            snapsTo: SNAP.Center,
        };

        const scene = new THREE.Scene();
        const group = new THREE.Group();

        scene.add( group );

        //setup 

        const grid = newGrid(3);
        scene.add( grid );

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;

        const camera = new CinematicCamera( 75, window.innerWidth / window.innerHeight, 0.1, 3000 );
        camera.setFocalLength(18);
        camera.position.setX(100);
        camera.position.setY(100);
        camera.position.setZ(100);
        scene.add(camera);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.maxPolarAngle = ((TAU / 4) - .001 );
        controls.minPolarAngle = ( 0.001 );
        controls.minDistance = 20;
        controls.maxDistance = 200;
        controls.target = new THREE.Vector3(0, 0, 0);
        controls.update();

        scene.background = new THREE.Color( HORIZON );
        scene.fog = new THREE.Fog( HORIZON, 100, 1000 );

        const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
        hemiLight.position.set( 0, 200, 0 );
        scene.add( hemiLight );

        const directionalLight = new THREE.DirectionalLight( 0xffffff );
        directionalLight.position.set( 200, 200, 200 );
        directionalLight.castShadow = true;
        scene.add( directionalLight );

        const ground = new THREE.Mesh( 
            new THREE.PlaneBufferGeometry( 3000, 3000 ), 
            new THREE.MeshPhongMaterial( { color: GROUND, depthWrite: true, flatShading: true } ) 
        );
        ground.rotation.x = - TAU / 4;
        ground.receiveShadow = true;
        scene.add( ground );

        // const axes = new THREE.AxesHelper( 5 );
        // scene.add( axes );

        const rotate = new TransformControls(camera, renderer.domElement);
        rotate.setRotationSnap(TAU / 16);
        rotate.setMode("rotate");
        rotate.setSpace("local");
        rotate.setSize(1.5);
        scene.add( rotate );

        const translate = new TransformControls(camera, renderer.domElement);
        // translate.showX = false;
        // translate.showZ = false;
        translate.setSize(2.3);
        translate.setMode("translate");
        translate.setSpace("world");
        scene.add( translate );



        this.scene = scene;
        this.renderer = renderer;
        // this.controls = controls;
        // this.camera = camera;
        this.grid = grid;

        //load model

        new STLLoader().load(
            this.props.file,
            (geo) => {
                console.info("loaded");
                let mesh = new THREE.Mesh(
                    geo,
                    new THREE.MeshStandardMaterial({
                        color:          0x7a4719, 
                        roughness:      0.6,
                        metalness:      0.8,
                        shadowSide:     THREE.FrontSide,
                        flatShading:    true,
                        fog:            false,
                        depthWrite:     true,
                        depthTest:      true,
                    })
                );
                mesh.position.set(0,0,0);
                this.mesh = mesh;
                group.add(mesh);
                rotate.attach(mesh);
                rotate.visible = true;
                translate.attach(mesh);
                translate.visible = true;
                mesh.originalTransformation = mesh.matrix.clone();
            },
            (e) => console.info(e),
            (e) => console.error(e),
        );

        //animate

        const renderPass = new RenderPass( scene, camera );
        const composer = new EffectComposer( renderer );
        composer.addPass( renderPass );

        const animate = () => {
            controls.update();
            requestAnimationFrame( animate );
            composer.render( scene, camera );
        }

        

        //event listeners

        rotate.addEventListener( 'dragging-changed', function ( event ) {

            controls.enabled = ! event.value;

        } );

        translate.addEventListener( 'dragging-changed', function ( event ) {

            controls.enabled = ! event.value;

        } );

        window.addEventListener( 'resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        }, false );

        this.eyelinePlane = ModelEyelineControls(scene, camera, renderer, controls, (h) => {
            console.log(h);
            this.setState({modelEyeline: h});
        });

        animate();

    }

    componentDidMount(){
        this.mount.appendChild( this.renderer.domElement );
    }

    changeGridSpacing(scale){
        //console.log(scale);
        this.scene.remove(this.grid);
        //this.grid.dispose();
        this.grid = newGrid(scale);
        this.scene.add( this.grid );
        this.setState({snapsTo: scale % 2 ? SNAP.Intersection : SNAP.Center });
    }

    exportToToybox(){
        
    }

    render(){
        //set grid scale and model offset

        //render
        return (
            <div className="App-main ui">
                {this.state.modelType === TILE.mini ?
                 <ModelScaleSelector onChange={(event) => {
                    switch (event.target.value){
                        case SIZE.small: //1
                            this.changeGridSpacing(3);
                            break;
                        case SIZE.medium: //1
                            this.changeGridSpacing(3);
                            break;
                        case SIZE.large: //2
                            this.changeGridSpacing(4);
                            break;
                        case SIZE.huge: //3
                            this.changeGridSpacing(5);
                            break;
                        case SIZE.gargantuan: //4
                            this.changeGridSpacing(6);
                            break;
                    }
                 }} state={this.state} /> :
                 <TileScaleSelector onChange={(event) => {
                    this.changeGridSpacing(event.target.value + 2);
                 }} state={this.state} /> 
                }
                {this.state.modelType === TILE.mini &&
                 <ModelBaseSelector onChange={(event) => {
                    this.setState({addBase: event.target.value === "on"});
                 }} state={this.state} /> }
                <ModelPurposeSelector onChange={(event) => {
                    if (event.target.value === TILE.mini){
                        this.eyelinePlane.material.visible = true;
                        this.eyelinePlane.controls.enabled = true;
                        this.setState({modelScale: SIZE.medium});
                    } else {
                        this.eyelinePlane.material.visible = false;
                        this.eyelinePlane.controls.enabled = false;
                        this.setState({modelScale: 2});
                    }
                    this.setState({modelType: event.target.value});
                }} state={this.state} />
                <SaveModelToToybox onClick={(event) => {
                    this.exportToToybox();
                }} state={this.state} />
                <ResetModelTransformations onClick={(event) => {

                }} state={this.state} />
                <ModelDecimateSelector onChange={(event) => {

                }} state={this.state} />
                <div id="Viewport" ref={ref => (this.mount = ref)} />
            </div>
        );
    }
}

function hover(color){
    return (event) => {
        event.object.material.emissive.set(color);
    };
}

function ModelEyelineControls(scene, camera, renderer, competingControls, callback){
    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 * SCALE, 1.5 * SCALE, 1),
        new THREE.MeshPhongMaterial({
            color:          0xce8821,
            emissive:       0x4c3030,
            transparent:    true,
            opacity:        0.25,
            depthTest:      true,
            depthWrite:     true,
            side:           THREE.DoubleSide,
            shininess:      0.0,
            specular:       0xce8821,

        })
    );

    plane.rotateX(- TAU / 4);
    plane.position.set(0, 20, 0);

    scene.add( plane );
    
    const controls = new DragControls([plane], camera, renderer.domElement);
    controls.addEventListener('hoveron', hover(0xFCF0F0));
    controls.addEventListener('hoveroff', hover(0x4c3030));
    controls.addEventListener('dragstart', (event) => {competingControls.enabled = false});
    controls.addEventListener('dragend', (event) => {
        competingControls.enabled = true;
        callback(event.object.position.y);
    })
    controls.addEventListener('drag', (event) => {
        event.object.position.x = event.object.position.z = 0;
        //console.log(event.object.position.y);
    });
    return {material: plane.material, controls: controls};
}

function ModelBaseSelector(props){
    return (
        <div id="ModelBaseSelector" className="ui">
            Add a base:
            <form>
                <label>
                    <input type="radio" name="base" value="on" selected={props.state.addBase} onChange={props.onChange}/>
                    On
                </label>
                <label>
                    <input type="radio" name="base" value="off" selected={!props.state.addBase} onChange={props.onChange} />
                    Off
                </label>
            </form>
        </div>
    )
}

function ModelScaleSelector(props){

    return (
        <div id="ModelScaleSelector" className="ui">
            Creature size:
            <form>
                <ul>
                {Object.values(SIZE).map((v, i) => {
                    return (
                        <li key={i}>
                            <label>
                                <input type="radio" name="size" value={v} onChange={props.onChange} selected={props.state.modelScale === v} />
                                {v}
                            </label>
                        </li>
                    ); 
                })}
                </ul>
            </form>
        </div>
    )

}

function TileScaleSelector(props){
    return (
        <div id="TileScaleSelector" className="ui">
            <form>
                <label>Scale: {props.state.modelScale} sq</label>
                <input type="range" name="tileScaleSelector" className="ui" id="tileScaleSelector" min="1" max="12" value={props.state.modelScale} onChange={props.onChange}/>
            </form>
        </div>
    );
}

function ModelPurposeSelector(props){

    //<input type="radio" name="type" value={TILE.mini} /><label htmlFor={TILE.mini}>Mini</label>
    const descriptions = {
        mini: "a figurine",
        floor: "tile, no walls",
        wall: "tile, one wall",
        corner: "tile, two walls meeting",
        hall: "tile, two walls opposite",
        nook: "tile, three walls"
    }

    return (
        <div id="ModelPurposeSelector" className="ui">
            <form>
                <ul>
                {Object.values(TILE).map((v, i) => {
                    return (
                        <li key={i}>
                            <label>
                                <input type="radio" name="type" value={v} onChange={props.onChange} selected={props.state.modelType === v} />
                                {v}: {descriptions[v]}
                            </label>
                        </li>
                    );
                })}
                </ul>
            </form>
        </div>
    );
}

function ModelDecimateSelector(props){
    return (
        <div id="ModelDecimateSelector" className="ui">
            <form>
                Decimate mesh (%):
                <input type="range" id="modelDecimateRangeSelector" name="modelDecimateRangeSelector" min="10" max="100" value="100" onChange={props.onChange} />
            </form>
        </div>
    );
}

function SaveModelToToybox(props){
    return (
        <div id="SaveModelToToybox" className="ui button">
            <a href="#" onClick={props.onClick}>
                Add to your toybox
            </a>
        </div>
    );
}

function ResetModelTransformations(props){
    return (
        <div id="ResetModelTransformations" className="ui button">
            <a href="#" onClick={props.onClick}>
                Reset model transformations
            </a>
        </div>
    );
}