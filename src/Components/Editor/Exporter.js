import * as THREE from 'three';


function message(meshRef, matrix){

}

function neighbors(map, x, y){
    const x_limit = map.size - 1;
    const y_limit = map[0].size - 1;
    const north = x > 0 ? map[x - 1][y] : false;
    const south = x < x_limit ? map[x + 1][y] : false;
    const east = y > 0 ? map[x][y - 1] : false;
    const west = y < y_limit ? map[x][y + 1] : false;
    return [north, south, east, west];
}

function boundingBox(map){


    let min_x = -1;
    let min_y = -1;
    let max_x = map.size - 1;
    let max_y = map[0].size - 1;

    map.map((row, x) => {
        map.map((cell, y) => {
            if (cell){
                if (min_x < 0){
                    min_x = x;
                }
                if (min_y < 0){
                    min_y = y;
                }
                if (y > max_y){
                    max_y = y;
                }
                max_x = x;
            }
        });
    });
    return [min_x, min_y, max_x, max_y];
}



export default function Exporter(map, tag){
    // map is a 2d matrix
    // tag is some string that identifies a wall and floor set
    

    map.map((row, x) => {
        map.map((cell, y) => {

        })
    })

}