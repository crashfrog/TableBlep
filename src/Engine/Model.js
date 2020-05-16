//import Engine from './Engine.js';

import {Client} from '@textile/threads-client';
import EVENTS from '../Enums/eventTypes.js';
import LAYERS from '../Enums/layerTypes.js';
import SPLATS from '../Enums/splatTypes.js';
import SNAPS_TO from '../Enums/snapTypes.js';

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import uuid from 'uuid/v4';

const loaders = {'stl':new STLLoader(), 'gltf': new GLTFLoader()};

class Model extends EventTarget {

    constructor(){
        super();
        // this.scene = scene; // the three.js scene and its physics
        // this.tx_thread = tx_thread;
        // this.view = view; // the react UI with the chat window

        // a series of maps to cache mesh data
        // this.obj_by_mesh = new Map();
        // this.mesh_by_id = new Map();
        // this.owner_by_obj = new Map();
        this.geometryCache = new Map();
        this.curr_event = {};
    }

    // owns(user_id, mesh_id){
    //     return this.owner_by_obj.get(mesh_id) === user_id;
    // }

    startClient(){
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
            whitelist: [],
        };
    }

    async getNewEvents(){
        return [];
    }

    getGeometry(geometry_callback, event){
        if (this.geometryCache.has(event.mesh.ref)){
            console.info("Found " + event.mesh.ref);
            var geometry = this.geometryCache.get(event.mesh.ref);
            return geometry_callback(geometry);
        } else {
            loaders[event.mesh.format].load(
                event.mesh.ref,
                (geometry) => {
                    console.info("Loaded " + event.mesh.ref);
                    this.geometryCache.set(event.mesh.ref, geometry);
                    //console.info(this.geometry_cache);
                    return geometry_callback(geometry);
                },
                function(e) {console.info(e)},
                function(e) {console.error(e)}
            );
        }
    }

    async checkForEvents(){
        for (const event of await this.getNewEvents()){
            // // we only need to update the model during add and remove mesh events
            // if (event.type === EVENTS.AddItem) { 
            //     //check if the mesh isn't already loaded
            //     if (!this.obj_by_mesh.has(event.mesh.id)){
            //         // get mesh data from IPFS via URI
            //         let mesh = await this.tx_thread.resolve(event.ref);
            //         // //add it to the maps
            //         // this.obj_by_mesh.set(event.mesh.mesh_id, new Set([event.obj_id]));
            //         // this.mesh_by_id.set(event.mesh.mesh_ref, mesh);
            //     } else {
            //         //we already have it, and three.js has optimizations for mesh re-use
            //         this.obj_by_mesh.get(event.mesh.id).add(event.id);
            //     }
            //     // if (event.owner){
            //     //     // meshes might be "owned" by one of the players,
            //     //     // we keep track of who owns what
            //     //     this.owner_by_obj.set(event.owner.id, event.mesh.id);
            //     // }
            // } else if (event.type === EVENTS.RemoveItem) {
            //     const objs = this.obj_by_mesh.get(event.mesh.id);
            //     objs.delete(event.obj_id);
            //     if (objs.size === 0){
            //         this.mesh_by_id.delete(event.mesh.ref)
            //     }
            // }
            // allow the scene and view to process the event
            // this.curr_event = event;
            // await this.scene.addEvent(event); // send event to 3D scene
            // await this.view.addEvent(event); // send event to react view
            this.dispatchEvent(new CustomEvent(event.type, event));
        }
    }

    injectEvent(event){
        console.info(event);
    }

    addMessage(message, metadata={}){
        this.injectEvent({
            type:EVENTS.AddMessage,
            content:message,
            sender:this.view.getOwnerInfo,
            metadata:metadata
        });
    }

    addMesh(mesh_id, mesh_ref, mesh_format, snap_offset, position, rotation, layer, metadata={}){
        
        this.injectEvent({
            type:EVENTS.AddItem,
            mesh:{
                id:mesh_id,
                ref:mesh_ref,
                format:mesh_format,
                snap_offset:snap_offset,
                position:{
                    x:position.x,
                    y:position.y,
                    z:position.z
                },
                rotation:{
                    i:rotation.x,
                    j:rotation.y,
                    k:rotation.z,
                    w:rotation.w
                },
                layer:layer
            },
            owner:this.view.getOwnerInfo(),
            metadata:metadata
        });
    }

    removeMesh(mesh, metadata={}){
        this.injectEvent({
            type:EVENTS.RemoveItem,
            id:mesh.id,
        });
    }

    moveMesh(mesh, metadata={}){
        this.injectEvent({
            type:EVENTS.MoveItem,
            mesh:{
                id:mesh.mesh_id,
                position:{
                    x:mesh.position.x,
                    y:mesh.position.y,
                    z:mesh.position.z
                },
                rotation:{
                    i:mesh.quaternion.x,
                    j:mesh.quaternion.y,
                    k:mesh.quaternion.z,
                    w:mesh.quaternion.w
                },
                layer:mesh.layer
            },
            //owner:this.view.getOwnerInfo(),
            metadata:metadata
        });
    }

    newMap(metadata={}){
        this.injectEvent({
            type:EVENTS.Initialize,
            metadata:metadata
        });
    }

    spray(sprite, color, position, quaternion){
        this.injectEvent({
            type:EVENTS.Spray,
            sprite:sprite,
            color:color,
            origin:{
                position:position,
                rotation:quaternion
            }
        })
    }
}

export default Model = new Model();

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

const quaternion_schema = {
    "description": "ijkw quaternion",
    "type": "object",
    "properties": {
        "i": {
            "type": "number"
        },
        "j": {
            "type": "number"
        },
        "k": {
            "type": "number"
        },
        "w": {
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
        "id": {
            "description": "Cryptosign for user",
            "type": "string"
        }
    }
};

const mesh_schema = {
    "description": "mesh data",
    "properties": {
        "id": {
            "description": "unique id for the mesh",
            "type": "string"
        },
        "ref": {
            "description": "content address for the bulk mesh data",
            "type": "string"
        },
        "format": {
            "description": "format of mesh",
            "type": "string",
            "enum": ["stl", "gltf"]
        },
        "snapsTo": {
            "description": "snap-to-grid behavior - square center or intersection",
            "type": "string",
            "enum":[SNAPS_TO.Center, SNAPS_TO.Intersection]
        },
        "snapOffset": {
            "description": "offset snap point from origin of mesh",
            "type": {"$ref":"#/definitions/triplet"}
        },
        "position": {
            "description": "XYZ location in space",
            "type": {"$ref":"#/definitions/triplet"}
        },
        "rotation": {
            "description": "Rotational quaternion as IJKW",
            "type": {"$ref":"#/definitions/quaternion"}
        },
        "layer": {
            "description": "layer mesh is added to",
            "type": "string",
            "enum": [LAYERS.Map, LAYERS.Pieces, LAYERS.Hologram, LAYERS.Toybox]
        },
        "headY": {
            "description": "elevation of eyepoint; used for camera and lighting",
            "type":"number"
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
    "required": ["type"]
};

const remove_item_schema = {
    "description": "Delete mesh from map",
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": [EVENTS.RemoveItem]
        },
        "id": {
            "description": "unique id for the mesh",
            "type": "string"
        }
    },
    "required": ["id"]
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
    "required": ["id", "mesh"]
};

const init_schema = {
    "description": "Initial map event",
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
            "enum": [SPLATS.Fluid, SPLATS.Gel]
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
                    "type": {"$ref": "#/definitions/quaternion"}
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
        "quarternion": quaternion_schema,
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