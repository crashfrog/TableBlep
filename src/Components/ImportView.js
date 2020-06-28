import React, {Component} from 'react';
import {Switch, Route} from 'react-router-dom';
import Converter from './Import/Engine/Converter.js';

    export default class ImportView extends Component {

        constructor(props){
            super(props);
            this.state = {isLoaded: false,
                        file: '',
                        message: ''};
        }


        render() {

            const loadViaFileReader = (file) => {
                this.setState({message: "Loading..."});
                console.log(file);
                let reader = new FileReader();
                reader.onload = (event) => {
                    this.setState({isLoaded:true});
                    this.setState({file:reader.result});
                };
                //reader.onload = (event) => this.setState({isLoaded:true});
                //reader.onload = (event) => console.log(reader.result);
                reader.readAsDataURL(file);
            }

            const loadViaObjectURL = (file) => {
                this.setState({message: "Loading..."});
                console.log(file);
                this.setState({
                    isLoaded:true,
                    file:URL.createObjectURL(file)
                });
            }
            
            return (
                <div className="Import">
                    {this.state.isLoaded ? 
                        <Converter file={this.state.file}/> :
                        <FileSelector callback={loadViaObjectURL}/> 
                    } {this.state.message}
                </div>
            );
        }
    }

class FileSelector extends Component {
    render(){
        return (
            <form>
                <label>Model file:
                    <input type="file" onChange={(event) => {
                        this.props.callback(event.target.files[0]);
                    }}/>
                </label>
            </form>
        );
    }
}