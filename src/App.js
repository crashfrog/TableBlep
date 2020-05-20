import React from 'react';
//import logo from './logo.svg';
//import './App.css';
import Viewport from './Interface/Viewport.js';
import MenuBar from './Interface/MenuBar.js';
import ChatBox from './Interface/ChatBox.js';
import InfoBox from './Interface/InfoBox.js';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <MenuBar />
        <Viewport /><ChatBox />
        <InfoBox />
      </header>
    </div>
  );
}

export default App;
