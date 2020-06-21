import './TableBlep.css';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import TableView from './Components/TableView.js';
import EditorView from './Components/EditorView.js';
import ImportView from './Components/ImportView.js';
import {Switch, Route} from 'react-router-dom';


class App extends Component {

    render(){
        return (
            <div className="Routes">
                <Switch>
                    <Route exact path="/" component={Home} />
                    <Route path="/editor" component={EditorView} />
                    <Route path="/table" component={TableView} />
                    <Route path="/import" component={ImportView} />
                </Switch>
            </div>
        );
    }
}

function Home() {
    return (
        <div className="Home">
            <header><h1 className="TitleCard">₍⸍⸌̣ʷ̣̫⸍̣⸌₎  TableBleþ  ₍⸍⸌̣ʷ̣̫⸍̣⸌₎</h1></header>
            <LandingMenu />
            <footer><h6>TableBlep © Justin Payne</h6></footer>
        </div>
    );
}

class LandingMenu extends Component {

    render(){
        return (
            <nav className="body">
                <ul className="Modes">
                    <li className="Option" id="DungeonEditor">
                        <Link to="/editor">
                            <h2 className="Title">Scene Editor</h2>
                            <span className="Description">Set the scene with tiles and pieces.</span>
                        </Link>
                    </li>
                    <li className="Option" id="Play">
                        <Link to="/table">
                            <h2 className="Title">Join a Table</h2>
                            <span className="Description">Connect to a scene and play.</span>
                        </Link>
                    </li>
                    <li className="Option" id="PieceEditor">
                        <Link to="/import">
                            <h2 className="Title">Import Models</h2>
                            <span className="Description">Load STL files to fill your toybox.</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        )
    }
}


export default App;