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
            <div class="ui" id="ChatBox" style={style}>
                <ChatDisplay />
                <ChatEntry />
            </div>
        );
    }
}

export class ChatDisplay extends Component {
    
    render(){
        const style = {

        };

        return (
            <div id="ChatDisplay" style={style}>
                <p>Lorem ipsum</p>
            </div>
        )
    }

}

export class ChatEntry extends Component {

    render(){

        const style = {

        };
        return (
            <div id="ChatEntry" style={style}>
                <p>Lorem ipsum</p>
            </div>
        );
    }
}