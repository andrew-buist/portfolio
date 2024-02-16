import * as THREE from './scripts/three/build/three.module.js'
import { OrbitControls } from './scripts/three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from './scripts/three/examples/jsm/loaders/GLTFLoader.js'

//Scene
var scene = new THREE.Scene();

//Camera
var height = window.innerHeight;
var width = window.innerWidth;
var distance = 2000;
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
scene.fog = new THREE.Fog(0x222222, 10, 30);

//OrbitControls
var orbit = new OrbitControls(camera, renderer.domElement);
orbit.minPolarAngle = Math.PI / 3;
orbit.maxPolarAngle = Math.PI / 1.5;
orbit.maxDistance = 6;
orbit.target = new THREE.Vector3(0, 10, 0);

// Instantiate a loader
var loader = new GLTFLoader();

//asset loader to push an array on promise
async function loadAssets() {
    const [
        base_mesh,
        transparent_mesh,
        interactive_mesh1,
        interactive_mesh2,
        interactive_mesh3
    ] = await Promise.all([
        loader.loadAsync("./3d_scenery/museum_hall.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_plants_alpha.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting1.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting2.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting3.glb")
    ])

    transparent_mesh.scene.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.material.alphaHash = true;
            child.material.trasparent = true;
        }
    })

    return [base_mesh.scene, transparent_mesh.scene, interactive_mesh1.scene, interactive_mesh2.scene, interactive_mesh3.scene]
}

//result available once promise made
let result = await loadAssets();
for(const scn of result){
    scene.add(scn);
}

//Render loop
render();

var delta = 0;
var prevTime = Date.now();

function render() {
    //constrain movement to bbox
    orbit.target.clamp(new THREE.Vector3(-1.5, 5, -6), new THREE.Vector3(1.5, 5, 6))
    //exposure
    renderer.toneMappingExposure = Math.pow(0.7, 5.0);  // -> exposure: 0.168
    renderer.render(scene, camera);

    requestAnimationFrame(render);
}

// Window sizing
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

const cursor_delta = 6;
let startX;
let startY;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const links = {
    "link1" : "https://www.linkedin.com/in/andrew-buist1",
    "link2" : "https://github.com/andrew-buist/",
    "link3" : "https://twitter.com/drewbio"
}

window.addEventListener('mousedown', function (event) {
  startX = event.clientX;
  startY = event.clientY;
});

window.addEventListener('mouseup', function (event) {
  const diffX = Math.abs(event.clientX - startX);
  const diffY = Math.abs(event.clientY - startY);

  if (diffX < cursor_delta && diffY < cursor_delta) {
    //redirect to links
    pointer.x = ( event.clientX / window.innerWidth ) * 2 -1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children)
    const target_intersect = intersects.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
    const goto_address = links[target_intersect.object.name]
    if(goto_address != undefined){
        window.location.href = goto_address
    }
  }
});