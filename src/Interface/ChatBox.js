import Model from 'Engine/Model.js';
import EVENTS from 'Enums/eventTypes.js';
import React, { Component } from "react";

export default class ChatBox extends Component {

    render(){

        const style = {

        };

        return (
            <div className="ui container" id="ChatBox" style={style}>
                <ChatDisplay />
                <ChatEntry />
            </div>
        );
    }
}

export class ChatDisplay extends Component {

    constructor(props){
        super(props);
        this.state = {
            messageList: []
        };
    }

    componentDidMount(){
        //var _this = this;
        // this.state = {
        //     messageList: []
        // };
        Model.addEventListener(EVENTS.AddMessage, (event) => {
            this.setState({
                messageList: [...this.state.messageList, event.content]
              })
        }, false);
    }
    
    render(){
        const style = {

        };

        const renderedMessageList = this.state.messageList.map((message) => {
            return (<div class="ChatMessage">
                <p>{message.content}</p>
            </div>)
        });

        return (
            <div id="ChatDisplay" style={style}>
                {renderedMessageList}
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageLocal">This is a message from the logged-in player</div>
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageLocal">This is a message from the logged-in player</div>
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageRemote">This is a message from another player</div>
                <div className="chatMessage chatMessageLocal">This is a message from the logged-in player</div>
            </div>
        )
    }

}

export class ChatEntry extends Component {

    constructor(props) {
        super(props);
        this.state = {
          value: 'chat stuff goes here'
        };
        this.handleChange = (event) => {
            this.setState({value: event.target.value});
        };
        this.handleSubmit = (event) => {
            //console.log(this.state.value);
            Model.addMessage(this.state.value);
            this.setState({value:""});
            event.preventDefault();
        };
    }

    render(){
        return (
            <form onSubmit={this.handleSubmit}>
                <label>
                    <input type="text" id="ChatEntryBox" value={this.state.value} onChange={this.handleChange} />
                </label>
            </form>
        );
    }
}