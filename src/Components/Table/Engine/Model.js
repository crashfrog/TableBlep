//import Engine from './Engine.js';

import { Database, Identity, UserAuth, ThreadID } from '@textile/threads';
import { collect } from 'streaming-iterables'
//import { ThreadID } from '@textile/threads-id';
import EVENTS from '../../../Enums/eventTypes.js';
import LAYERS from '../../../Enums/layerTypes.js';
import SPLATS from '../../../Enums/splatTypes.js';
import SNAPS_TO from '../../../Enums/snapTypes.js';

import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import uuid from 'uuid/v4';

const loaders = {'stl':new STLLoader(), 'gltf': new GLTFLoader()};

class Model extends EventTarget {

    constructor(){
        super();
        this.geometryCache = new Map();
    }

    initDD(auth, identity){
        this.db = new Database.withUserAuth(auth, 'scene');
        this.currentThreadId = this.newMap(identity);
    }

    dumpCache(){
        this.geometryCache = new Map();
    }

    async connect_to(identity, thread_id){
        let threadId = ThreadID.fromString(thread_id);
        this.dumpCache();
        await this.db.start(identity, {threadId});
        let events = this.db.collections.get('Event');
        if (!events) throw new Error(`${thread_id} could not be connected to.`);
        await this.attach_to(events);
    }
    

    async attach_to(events){
        for (const event of await collect(events.find({}))){
            this.dispatchEvent(event);
        }
        this.db.emitter.on('Event.*.0', (update) => {
            this.dispatchEvent(update);
        })
    }

    async newMap(identity, metadata={}){

        let threadId = ThreadID.fromRandom();

        await this.db.start(identity, { threadId });
        
        let collection = await this.db.newCollection('Event', event_schema);

        this.attach_to(collection);

        await this.injectEvent({
            type:EVENTS.Initialize,
            metadata:metadata
        });

        return threadId.toString();
    }

    getGeometry(geometry_callback, ref, format){
        if (this.geometryCache.has(ref)){
            console.info("Found " + ref);
            var geometry = this.geometryCache.get(ref);
            return geometry_callback(geometry);
        } else {
            loaders[format].load(
                ref,
                (geometry) => {
                    console.info("Loaded " + ref);
                    this.geometryCache.set(ref, geometry);
                    //console.info(this.geometry_cache);
                    return geometry_callback(geometry);
                },
                function(e) {console.info(e)},
                function(e) {console.error(e)}
            );
        }
    }

    async injectEvent(event){
        console.info(event);
        //this.eventList.add(event);
        let newEvent = this.db.collections.get('Event')(event);
        await newEvent.save();
    }

    async addMessage(message, metadata={}){
        await this.injectEvent({
            type:EVENTS.AddMessage,
            content:message,
            //sender:this.view.getOwnerInfo,
            metadata:metadata
        });
    }

    async addMesh(mesh_id, mesh_ref, mesh_format, snap_offset, position, rotation, layer, metadata={}){
        
        await this.injectEvent({
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

    async removeMesh(mesh, metadata={}){
        await this.injectEvent({
            type:EVENTS.RemoveItem,
            id:mesh.id,
        });
    }

    async moveMesh(mesh_id, layer, position, quaternion, metadata={}){
        await this.injectEvent({
            type:EVENTS.MoveItem,
            mesh:{
                id:mesh_id,
                position:{
                    x:position.x,
                    y:position.y,
                    z:position.z
                },
                rotation:{
                    i:quaternion.x,
                    j:quaternion.y,
                    k:quaternion.z,
                    w:quaternion.w
                },
                layer:layer
            },
            metadata:metadata
        });
    }

    async spray(sprite, color, position, quaternion){
        await this.injectEvent({
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

const box_schema = {
    "description": "dimension and location of a box",
    "type": "object",
    "properties": {
        "dimension":{
            "description": "dimension triplet",
            "type": {"$ref":"#/definitions/triplet"}
        },
        "position":{
            "description": "offset triplet",
            "type": {"$ref":"#/definitions/triplet"}
        }
    }
}

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
        },
        "physicsBoxes":{
            "description": "array of physics bounding boxes",
            "type":"array",
            "items":{

            }
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
};

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
        "spray": spray_schema,
        "box": box_schema,
    },
    "type": "object",
    "properties": {
        "_id": { type: 'string' },
        "event": {
            "type": [{"$ref": "#/definitions/add_message"},
                     {"$ref": "#/definitions/add_item"},
                     {"$ref": "#/definitions/remove_item"},
                     {"$ref": "#/definitions/move_item"},
                     {"$ref": "#/definitions/initialize"},
                     {"$ref": "#/definitions/spray"}]
        }
    }
};

const event_collection_schema = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://tableblep.com/collection.schema.json",
    "title": "EventList",
    "description": "Collection",
    "definitions": {
        "event": event_schema
    },
    "type": "array",
    "properties":{
        "_id": { type: 'string' },
    },
    "items": {
        "type": {"$ref": "#/definitions/event"}
    }
};


// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Pieces,
//         id:2,
//         ref:'./sample_meshes/henfeather.stl',
//         format:'stl',
//         snapOffset:{x:0, y:5, z:0},
//         snapTo:SNAPSTO.Center,
//         position:{x:-25, y:0, z:-25},
//         rotation:NORTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Pieces,
//         id:2,
//         ref:'./sample_meshes/kork.stl',
//         format:'stl',
//         snapOffset:{x:0, y:5, z:0},
//         snapTo:SNAPSTO.Center,
//         position:{x:-25, y:0, z:-50},
//         rotation:EAST,
//     }
// })
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Pieces,
//         id:2,
//         ref:'./sample_meshes/carrion_crawler.stl',
//         format:'stl',
//         snapOffset:{x:25, y:5, z:25},
//         position:{x:-175, y:0, z:-75},
//         rotation:WEST,
//     }
// })
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_corner.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-30, y:0, z:0},
//         rotation:NORTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-75, y:0, z:0},
//         rotation:NORTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-125, y:0, z:0},
//         rotation:NORTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_corner.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-175, y:0, z:-50},
//         rotation:EAST,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-175, y:0, z:-100},
//         rotation:EAST,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_corner.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-125, y:0, z:-150},
//         rotation:SOUTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-75, y:0, z:-150},
//         rotation:SOUTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-25, y:0, z:-150},
//         rotation:SOUTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_corner.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:25, y:0, z:-100},
//         rotation:WEST,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_wall.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:26, y:0, z:-55},
//         rotation:WEST,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_floor.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-75, y:0, z:-55},
//         rotation:NORTH,
//     }
// });
// this.loadMesh({
//     mesh:{
//         layer:LAYERS.Map,
//         id:1,
//         ref:'./sample_meshes/stone_floor.stl',
//         format:'stl',
//         snapOffset:{x:0, y:0, z:0},
//         position:{x:-125, y:0, z:-55},
//         rotation:NORTH,
//     }
// // });
// > Selected threadDB Create new
// > Your bucket links:
// > https://hub.textile.io/thread/bafkztpkuq4lcuwzq5jv4osegcbfh4bk3leyceu4scmsas3zo7pdv5na/buckets/bafzbeihpowhhcchuwmz3diwwaonp7kj2y7fcawyhkjpehc4egzrqyfigkq Thread link
// > https://hub.textile.io/ipns/bafzbeihpowhhcchuwmz3diwwaonp7kj2y7fcawyhkjpehc4egzrqyfigkq IPNS link (propagation can be slow)
// > https://bafzbeihpowhhcchuwmz3diwwaonp7kj2y7fcawyhkjpehc4egzrqyfigkq.textile.space Bucket website
// > Success! Initialized an empty bucket in /Users/justin/tableblep/public/sample_meshes
// ➜  sample_meshes git:(master) ✗ hub bucket push
// > new file:  brick_wall.stl
// > new file:  carrion_crawler.stl
// > new file:  henfeather.stl
// > new file:  kork.stl
// > new file:  stone_corner.stl
// > new file:  stone_floor.stl
// > new file:  stone_passage.stl
// > new file:  stone_wall.stl
// > new file:  stone_wall_end.stl
// Push 9 changes: y█
// + brick_wall.stl: bafybeiemubq44w5zqtuw5y2tveiq4l6pptzyvcgmtmff3ihsmozov2n4vq
// + carrion_crawler.stl: bafybeicbt2yks3n5wenmqhipluddv5kiaz5a7vv5gwe7ch53ptmrz7fccm
// + henfeather.stl: bafybeibcearuxt7ho2zbtqgwcjno66lnrxls5xlwpqnoemvouu2s4w2aty
// + kork.stl: bafybeihhfoheuxo4j65qtwjgippizmfwiwqmkrzmhr4zl5jzt5dbv2r5x4
// + stone_corner.stl: bafybeia4cxewfcvehnhnsxysxak47f7seafgwkvt4eoywowj65u7xfnmlq
// + stone_floor.stl: bafybeibpbh4jfch6xfguyeed5blqvirwqbkdngjjnkyjbsq7lbc64zwryq
// + stone_passage.stl: bafybeicygt7nwbropng5ivktahdoqlz2zg72iqy3smudn5rarh3g7fftx4
// + stone_wall.stl: bafybeicf5zm2qnd2ksbl2y3tyv3y3l57bgwovlwumskdwckuvemnghhk2i
// + stone_wall_end.stl: bafybeiffzwjfqmqbghvthd3n6nm2zfvdhzt3u2v4vycjqlxcdv47kmissy
// > bafybeibyjyp2yvpoeq6dbrf3mwcna57gwnthqzxr72frmjulq2loibr6fy
