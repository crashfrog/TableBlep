import React, { Component } from "react";
import Model from "./Engine/Model.js";

export default class MenuBar extends Component {
    render() {

        const style = {
            //float:"left",
        };

        return (
            <div className="ui container" id="MenuBar">
                <div className="ui title">TableBleþ</div>
                <ThreadBox />
            </div>
        );
    }
}

export class ThreadBox extends Component {

    constructor(props) {
        super(props);
        this.state = {value: ''};

        // this.handleChange = (event) => {
        //     this.setState({value: event.target.value});
        // };
        // this.handleSubmit = (event) => {
        //     //console.log(this.state.value);
        //     Model.startClient(this.state.value);
        //     event.preventDefault();
        // };
    }

    async createNewScene(){
        let threadId = await Model.newMap();
        this.setState({value: threadId});
    }

    render() {
        const style = {

        };

        return (
            <div id="ThreadId" className="ui" style={style}>
                <form onSubmit={(event) => {
                    
                    Model.startClient(this.state.value);
                    event.preventDefault();

                }}>
                    <label>Scene ID: <input type="text" value={this.state.value}  onChange={(event) => {

                        this.setState({value: event.target.value});

                    }} /></label>
                    <input type="submit" value="Connect" />
                    <button type="button" onClick={async (event) => {
                        
                        let threadId = await Model.newMap();
                        this.setState({value: threadId});

                    }}>New Scene</button>
                </form>
            </div>
        )
    }
}