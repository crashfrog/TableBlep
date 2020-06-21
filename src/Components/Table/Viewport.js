import React, { Component } from "react";
import Model from './Engine/Model.js';
import Engine from './Engine/Engine.js';



export default class ViewPort extends Component {
    componentDidMount(){
        // const world = newPhysicsWorld();
        // const model = new Model();
        // const scene = new Scene(model, world);
        this.mount.appendChild( Engine.renderer.domElement );
    }

    render() {
        return (
          <div id="Viewport" ref={ref => (this.mount = ref)} />
        )
    }
}