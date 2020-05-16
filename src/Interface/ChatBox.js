import Model from '../Engine/Model.js';
import EVENTS from '../Enums/eventTypes.js';
import React, { Component } from "react";

export default class ChatBox extends Component {

    componentDidMount(){
        Model.addEventListener(EVENTS.AddMessage, () => {

        }, false);
    }

    render(){
        return () => {

        }
    }
}