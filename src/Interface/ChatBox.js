import Model from '../Engine/Model.js';
import EVENTS from '../Enums/eventTypes.js';
import React, { Component } from "react";

export default class ChatBox extends Component {

    componentDidMount(){
        var _this = this;
        this.state = {
            messageList: []
        };
        Model.addEventListener(EVENTS.AddMessage, (event) => {
            _this.setState({
                messageList: [..._this.state.messageList, event.content]
              })
        }, false);
    }

    render(){

        const style = {

        };

        return (
            <div style={style}/>
        );
    }
}