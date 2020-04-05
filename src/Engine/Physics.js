import C from 'cannon';


export function newPhysicsWorld() {


    let world = new C.World();
    world.broadphase = new C.NaiveBroadphase();
    world.gravity.set(0,-9.82,0);
    world.solver.iterations = 20;

    return world;

}