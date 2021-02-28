import React, {useState, useEffect} from 'react';
import Exporter from './Editor/Exporter.js';
import Randomizer from './Editor/Randomizer.js';

// class EditorView extends Component {


//     render() {
//         return (
//             <div className="Editor"></div>
//         );
//     }
// }

// export default EditorView;

export default function EditorView(props){

    const width = 30; //squares
    const height = 30;

    const [mapState, setMapState] = useState(() => new Array(height).fill(0).map(() => new Array(width).fill(false)) );

    return (
        <div className="ui body container" id="Editor">
            Map scale: 2x2
            {mapState.map((row, x) => {
                return (
                    <div id="row" key={x}>
                    {row.map((cell, y) => {
                        return (
                            <button id="cell" className={mapState[x][y] ? "enabled" : "disabled"} key={[x,y]} onClick={() => {
                                setMapState( [...mapState.slice(0, x),
                                            [
                                                ...row.slice(0, y),
                                                !row[y],
                                                ...row.slice(y + 1)
                                            ],
                                        ...mapState.slice(x + 1)
                                    ] )
                            }}></button>
                        );
                    })}
                    </div>
                );
            })}
            <nav>
                <button id="generate" className="" onClick={() => {
                    Exporter(mapState);
                }}>Save map</button>
                <button id="randomize" className="" onClick={() => {
                    setMapState(Randomizer(mapState));
                }}>Randomize...</button>
            </nav>
        </div>
    )
}