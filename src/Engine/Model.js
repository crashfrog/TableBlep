import {Client} from '@textile/threads-client';
import EVENTS from './eventTypes.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import uuid from 'uuid/v4';

export default class Model {

    constructor(view, scene, tx_thread){
        this.scene = scene; // the three.js scene and its physics
        this.tx_thread = tx_thread;
        this.view = view; // the react UI with the chat window

        // a series of maps to cache mesh data
        this.obj_by_mesh = new Map();
        this.mesh_by_id = new Map();
        this.owner_by_obj = new Map();

        //init the client
        const key_prefix = "blep"
        const name = "Some name";
        const key = `${key_prefix}-${uuid()}`;
        const config = {
            key,
            name,
            //type: Thread.Type.OPEN,
            //sharing: Thread.Sharing.SHARED,
            schema: { id: '', json: JSON.stringify(event_schema)},
            force: false,
            whitelist: []
        };


    }

    owns(user_id, mesh_id){
        return this.owner_by_obj.get(mesh_id) == user_id;
    }

    async getNewEvents(){

    }

    async checkForEvents(){
        for (const event of this.getNewEvents()){
            // we only need to update the model during add and remove mesh events
            if (event.type == EVENTS.AddItem) { 
                //check if the mesh isn't already loaded
                if (!this.obj_by_mesh.has(event.mesh.mesh_id)){
                    // get mesh data from IPFS via URI
                    let mesh = await this.tx_thread.resolve(event.mesh_ref);
                    //add it to the maps
                    this.obj_by_mesh.set(event.mesh.mesh_id, new Set([event.obj_id]));
                    this.mesh_by_id.set(event.mesh.mesh_ref, mesh);
                } else {
                    //we already have it, and three.js has optimizations for mesh re-use
                    this.obj_by_mesh.get(event.mesh.mesh_id).add(event.obj_id);
                }
                if (event.owner){
                    // meshes might be "owned" by one of the players,
                    // we keep track of who owns what
                    this.owner_by_obj.set(event.owner.user_id, event.mesh.mesh_id);
                }
            } else if (event.type == EVENTS.RemoveItem) {
                const objs = this.obj_by_mesh.get(event.mesh.mesh_id);
                objs.delete(event.obj_id);
                if (objs.size == 0){
                    this.mesh_by_id.delete(event.mesh.mesh_ref)
                }
            }
            // allow the scene and view to process the event
            await this.scene.addEvent(event);
            await this.view.addEvent(event);
        }
    }
}

const point_schema = {
    "description": "xyz triplet",
    "type": "object",
    "properties": {
        "x": {
            "type": "number"
        },
        "y": {
            "type": "number"
        },
        "z": {
            "type": "number"
        }
    }
};

const user_schema = {
    "description": "User identity data",
    "properties": {
        "display_name": {
            "description": "Name to display in chat",
            "type": "string"
        },
        "user_id": {
            "description": "Cryptosign for user",
            "type": "string"
        }
    }
};

const mesh_schema = {
    "description": "mesh data",
    "properties": {
        "mesh_id": {
            "description": "unique id for the mesh",
            "type": "string"
        },
        "mesh_ref": {
            "description": "content address for the bulk mesh data",
            "type": "string"
        },
        "snap_offset": {
            "description": "snap-to-grid offset point",
            "type": {"$ref":"#/definitions/triplet"}
        },
        "position": {
            "type": {"$ref":"#/definitions/triplet"}
        },
        "rotation": {
            "description": "Rotational quaternion",
            "type": {"$ref":"#/definitions/triplet"}
        },
        "layer": {
            "description": "layer mesh is added to",
            "type": "string",
            "enum": ["map", "pieces", "noclip", "toybox"]
        }
    },
    "required": ['mesh_id']
}

const add_message_schema = {
    "description": "Text chat message",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.AddMessage]
        },
        "content": {
            "description": "Body of the message",
            "type": "string"
        },
        "sender": {
            "description": "Identity of sender",
            "type":{"$ref": "#/definitions/user"},
        },
        "metadata": {
            "description": "Arbitrary key-value data"
        }
    },
    "required": ["type", "content", "sender"]
};

const add_item_schema = {
    "description": "Add new mesh to map",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.AddItem]
        },
        "mesh": {
            "description": "Properties of new object",
            "type": {"$ref": "#/definitions/mesh"},
        },
        "owner": {
            "description": "who can move this mesh",
            "type": {"$ref": "#/definitions/user"}
        },
        "metadata":{
            "description": "Arbitrary key-value data"
        }
    },
    "required": ["type", "mesh_id", "mesh_ref"]
};

const remove_item_schema = {
    "description": "Delete mesh from map",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.RemoveItem]
        },
        "mesh_id": {
            "description": "unique id for the mesh",
            "type": "string"
        },
        "requester": {
            "description": "who can move this mesh",
            "type": {"$ref": "#/definitions/user"}
        }
    },
    "required": ["mesh_id", "requester"]
};

const move_item_schema = {
    "description": "Move mesh in map",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.MoveItem]
        },
        "mesh": {
            "description": "Mesh information for move",
            "type": {"$ref": "#/definitions/mesh"}
        },
        "owner": {
            "description": "who can move this mesh",
            "type": {"$ref": "#/definitions/user"}
        },
        "metadata":{
            "description": "Arbitrary key-value data"
        }
    },
    "required": ["mesh_id"]
};

const init_schema = {
    "description": "Move mesh in map",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.Initalize]
        },
        "metadata":{
            "description": "Arbitrary key-value data"
        }
    }
};

const spray_schema = {
    "description": "Add a spray to the playfield",
    "type": "object",
    "properties": {
        "sprite": {
            "type": "string",
            "enum": ["fluid", "gel"]
        },
        "color": {
            "type": "string",
            "description": "Color in hex code"
        },
        "origin": {
            "type": "object",
            "description": "position and quaternion for origin of spray",
            "properties": {
                "position": {
                    "type": {"$ref": "#/definitions/triplet"}
                },
                "rotation": {
                    "type": {"$ref": "#/definitions/triplet"}
                }
            }
        }
    }
}

const event_schema = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://tableblep.com/event.schema.json",
    "description": "Events",
    "definitions":{
        "triplet": point_schema,
        "user": user_schema,
        "mesh": mesh_schema,
        "add_message": add_message_schema,
        "add_item": add_item_schema,
        "remove_item": remove_item_schema,
        "move_item": move_item_schema,
        "initialize": init_schema,
        "spray": spray_schema
    },
    "type": "object",
    "properties": {
        "event": {
            "type": [{"$ref": "#/definitions/add_message"},
                     {"$ref": "#/definitions/add_item"},
                     {"$ref": "#/definitions/remove_item"},
                     {"$ref": "#/definitions/move_item"},
                     {"$ref": "#/definitions/initialize"},
                     {"$ref": "#/definitions/spray"}]
        }
    }
}