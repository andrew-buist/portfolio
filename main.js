import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
//Scene
var scene = new THREE.Scene();

//Camera
var height = window.innerHeight;
var width = window.innerWidth;
var distance = 1500;
var diag = Math.sqrt((height * height) + (width * width))
var fov = 2 * Math.atan((diag) / (2 * distance)) * (180 / Math.PI); //Field of View
var camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, distance);
camera.position.set(5, 5, -5);

//Canvas
var myCanvas = document.getElementById('myCanvas');

//Renderer
var renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: myCanvas,
    alpha: true
});


//renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.gammaInput = true;
renderer.gammaOutput = true;
renderer.antialias = true;
document.body.appendChild(renderer.domElement);

//LIGHTS
for (const element of [-10, -5, 0, 5, 10]) {
    var light = new THREE.SpotLight(0xffd0bb, 100, 0, Math.PI / 3, .3);
    const targetObject = new THREE.Object3D();
    targetObject.position.set(0, 0, element);
    scene.add(targetObject);
    light.target = targetObject;
    light.position.set(0, 10, element);
    scene.add(light);
}

var ambient_light = new THREE.AmbientLight(0xffd0bb, .5);
scene.add(ambient_light);
scene.fog = new THREE.Fog(0x444444, 10, 30);

//OrbitControls
var orbit = new OrbitControls(camera, renderer.domElement);
orbit.minPolarAngle = Math.PI / 3;
orbit.maxPolarAngle = Math.PI / 1.5;
orbit.maxDistance = 6;
orbit.target = new THREE.Vector3(0, 10, 0);

// Instantiate a loader
var loader = new GLTFLoader();

async function loadAssets() {
    const [base_mesh, transparent_mesh, interactive_mesh1] = await Promise.all([
        loader.loadAsync("./3d_scenery/museum_hall.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_plant_alpha.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting1.glb")
    ])

    transparent_mesh.scene.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.material.alphaHash = true;
            child.material.trasparent = true;
        }
    })

    scene.add(base_mesh.scene);
    scene.add(transparent_mesh.scene);
    scene.add(interactive_mesh1.scene);
}

loadAssets();

//Render loop
render();

var delta = 0;
var prevTime = Date.now();

function render() {
    //constrain movement to bbox
    orbit.target.clamp(new THREE.Vector3(-1.5,5,-6), new THREE.Vector3(1.5,5,6))
    //exposure
    renderer.toneMappingExposure = Math.pow(0.7, 5.0);  // -> exposure: 0.168
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}