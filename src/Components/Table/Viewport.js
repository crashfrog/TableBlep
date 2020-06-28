import React, { Component } from "react";
import Model from './Engine/Model.js';
import Engine from './Engine/Engine.js';



export default class ViewPort extends Component {
    componentDidMount(){
        // const world = newPhysicsWorld();
        // const model = new Model();
        // const scene = new Scene(model, world);
        const engine = new Engine();
        this.mount.appendChild( engine.renderer.domElement );
    }

    render() {
        return (
          <div id="Viewport" ref={ref => (this.mount = ref)} />
        )
    }
}