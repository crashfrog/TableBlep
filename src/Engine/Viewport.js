import React, { Component } from "react";
import { newPhysicsWorld}  from './Physics.js';
import Model from './Model.js';
import Scene from './Scene.js';



export default class ViewPort extends Component {
    componentDidMount(){
        const world = newPhysicsWorld();
        const model = new Model();
        const scene = new Scene(model, world);
        this.mount.appendChild( scene.renderer.domElement );
    }

    render() {
        return (
          <div ref={ref => (this.mount = ref)} />
        )
    }
}