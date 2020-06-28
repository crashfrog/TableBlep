import React from 'react';
import Viewport from './Table/Viewport.js';
import MenuBar from './Table/MenuBar.js';
import ChatBox from './Table/ChatBox.js';
import InfoBox from './Table/InfoBox.js';
import Tools from './Table/Tools.js';

function TableView(props) {
  return (
    <div className="App">
      <main className="App-main">
        <MenuBar />
        <Tools /><Viewport /><ChatBox />
        <InfoBox />
      </main>
    </div>
  );
}

export default TableView;
