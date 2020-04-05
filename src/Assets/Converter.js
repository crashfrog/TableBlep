import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

/*
Module to import STL files and convert to GLTF, permitting resizing, reorienting, and setting the rotation centroid.

*/

var group;

export function convert(fileStream){
    const scene = new THREE.Scene();
    group = new THREE.Group();


    var ground = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add( ground );

    var grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add( grid );

}