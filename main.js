import * as THREE from './scripts/three/build/three.module.js'
import { OrbitControls } from './scripts/three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from './scripts/three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from './scripts/three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from './scripts/three/examples/jsm/loaders/RGBELoader.js';


//KEY VARIABLES//
//Document
var init_title = document.title
var uiElement = document.querySelector('#loadingscreen');
var uiLoadingBar = document.querySelector('#loadingbar')

//Scenes
var active_scene = new THREE.Scene();
var scene1 = new THREE.Scene();

new RGBELoader()
    .setPath('./images/threejs_assets/')
    .load('cloudysky.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;

        scene1.background = texture;
        scene1.environment = texture;
    });

//Animation mixer array
var mixer_arr = [];

//Canvas
var myCanvas = document.getElementById('myCanvas');
var height = window.innerHeight;
var width = window.innerWidth;

//Clock 
var clock = new THREE.Clock();

//Bezier Paths
var speed = 10;
var subdivisions = 5000
var fraction = 0;
var tangent = new THREE.Vector3();
var axis = new THREE.Vector3();
var up = new THREE.Vector3(-1, 0, 0);
var bezier_path = new THREE.CatmullRomCurve3(
    [
        new THREE.Vector3(7.25, 2, 6),
        new THREE.Vector3(6.5, 2, 7),
        new THREE.Vector3(5.75, 2, 6),
        new THREE.Vector3(6.5, 2, 5)
    ],
    true
);
var bezier_points = bezier_path.getSpacedPoints(subdivisions)

//Renderer
var renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: myCanvas,
    alpha: true
});

//renderer settings
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.gammaInput = true;
renderer.gammaOutput = true;
renderer.antialias = true;
renderer.toneMapping = THREE.LinearToneMapping;

//Camera
var distance = 2500;
var diag = Math.sqrt((height * height) + (width * width))
var fov = 2 * Math.atan((diag) / (2 * distance)) * (180 / Math.PI); //Field of View
var camera = new THREE.PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, distance);
camera.position.set(6, 5, 0);
camera.zoom = 1;
camera.updateProjectionMatrix();

//OrbitControls
var orbit = new OrbitControls(camera, renderer.domElement);
orbit.minPolarAngle = Math.PI / 3;
orbit.maxPolarAngle = Math.PI / 1.5;
orbit.maxDistance = 6;
orbit.target = new THREE.Vector3(-1, 5, 0)
orbit.reversed = false;
orbit.update()

//Raycasting
var cursor_delta = 6;
let startX;
let startY;
var raycaster = new THREE.Raycaster();
var pointer = new THREE.Vector2();
let intersects;
let target_intersect;
let target_name;

//Painting Links
var links = {
    "link1": "https://cran.r-project.org/web/packages/smlmkalman/index.html",
    "link2": "https://www.linkedin.com/in/andrew-buist1",
    "link3": "https://github.com/andrew-buist/",
    "link4": "https://twitter.com/drewbio",
    "coffeeguy": "./pages/sections/3d_modelling.html"
}

// Instantiate a loading manager
var manager = new THREE.LoadingManager();

manager.onStart = function () {
    uiElement.style.display = '';
}

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    var load_percent = ((itemsLoaded / itemsTotal) * 100).toFixed(2)
    uiLoadingBar.style.width = load_percent + "%"
    console.log(load_percent)
}

manager.onLoad = function () {
    active_scene = scene1;
    uiElement.style.display = 'none';
    document.body.appendChild(renderer.domElement);
}

//Instantiate a loader
var loader = new GLTFLoader(manager);

//Include DRACO compression comprehension
var dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./scripts/three/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

////

function addScene(gltf, transparent = false, rename) {
    gltf.scene.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            //child.material.alphaHash = true;
            if (transparent) {
                child.material.trasparent = true;
            }
            if (rename) {
                child.name = rename;
            }

            child.material.envMapIntensity = 0.1;
        }
    })
    scene1.add(gltf.scene)
}

function addAnimatedScene(gltf, scale) {
    gltf.scene.scale.set(scale, scale, scale)
    gltf.scene.rotation.set(0, Math.PI, 0)

    scene1.add(gltf.scene);
    var mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach((clip) => {

        mixer.clipAction(clip).play();

    })
    mixer_arr.push(mixer)
}


//Scene1 (main) .adds
{
    //asset loader to push an array on promise
    var [
        base_mesh,
        transparent_mesh,
        interactive_mesh1,
        interactive_mesh2,
        interactive_mesh3,
        interactive_mesh4,
        coffee_guy
    ] = await Promise.all([
        loader.loadAsync("./3d_scenery/museum_hall.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_plants_alpha.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting1.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting2.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting3.glb"),
        loader.loadAsync("./3d_scenery/museum_hall_painting4.glb"),
        loader.loadAsync("./3d_scenery/coffee_guy.glb")
    ])

    addScene(base_mesh)
    addScene(transparent_mesh, true)
    addScene(interactive_mesh1, false, "link1")
    addScene(interactive_mesh2, false, "link2")
    addScene(interactive_mesh3, false, "link3")
    addScene(interactive_mesh4, false, "link4")
    addAnimatedScene(coffee_guy, 0.2)

    //Lights and fog
    var focus_light = new THREE.SpotLight(0xffd0bb, 400, 0, Math.PI / 6, .3);
    focus_light.castShadow = true;
    var focus_target = new THREE.Object3D();
    focus_target.position.set(0, 20, 0);
    scene1.add(focus_target);
    focus_light.target = focus_target;
    focus_light.position.set(0, 10, 0);
    scene1.add(focus_light)

    scene1.fog = new THREE.Fog(0xffffff, 15, 50);
}

//Footer Functions for Rendering and Window Listeners//

function render() {
    //constrain movement to bbox
    //orbit.target.clamp(new THREE.Vector3(-1.5, 5, -6), new THREE.Vector3(1.5, 5, 6))
    //exposure
    renderer.render(active_scene, camera);

    requestAnimationFrame(render);
}

function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();

    //iterate through array and update to delta time
    if (mixer_arr.length > 0) {
        mixer_arr.forEach((element) => element.update(delta));
    }

    fraction += delta
    var fraction_partition = Math.floor(fraction / speed * subdivisions)

    if (fraction_partition >= subdivisions) {
        fraction = 0;
    }

    coffee_guy.scene.position.x = bezier_points[fraction_partition].x;
    coffee_guy.scene.position.z = bezier_points[fraction_partition].z;
    coffee_guy.scene.position.y = bezier_points[fraction_partition].y;

    tangent = bezier_path.getTangent(fraction / speed).normalize();
    axis = axis.crossVectors(up, tangent).normalize();
    var radians = Math.acos(up.dot(tangent));

    coffee_guy.scene.quaternion.setFromAxisAngle(axis, radians);

    renderer.render(scene1, camera);

}

// Window sizing
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('pointermove', function (event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    intersects = raycaster.intersectObjects(active_scene.children);
    if (intersects.length > 0) {
        target_intersect = intersects.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr);

        //multiple materials on one mesh are given the name "xxx", "xxx_1", ...
        target_name = target_intersect.object.name.split("_")[0]
        //console.log(target_name)

        if (Object.keys(links).indexOf(target_name) >= 0) {
            myCanvas.style.cursor = "pointer"
            focus_light.position.z = target_intersect.point.z
            focus_light.target.position.x = target_intersect.point.x;
            focus_light.target.position.y = target_intersect.point.y;
            focus_light.target.position.z = target_intersect.point.z;
        } else {
            myCanvas.style.cursor = "default"
            focus_light.position.z = 0
            focus_light.position.y = 10
            focus_light.target.position.x = 0;
            focus_light.target.position.y = 20;
            focus_light.target.position.z = 0;
        }

        if (target_name == "coffeeguy") {
            //console.log("that's coffeeguy!")
            focus_light.angle = Math.PI / 12
            focus_light.intensity = 400;
        } else {
            focus_light.angle = Math.PI / 6
            focus_light.intensity = 200;
        }
    } else {
        //console.log("no hit!")
    }
})

window.addEventListener('pointerdown', function (event) {
    startX = event.clientX;
    startY = event.clientY;
});

window.addEventListener('pointerup', function (event) {
    var diffX = Math.abs(event.clientX - startX);
    var diffY = Math.abs(event.clientY - startY);

    if (diffX < cursor_delta && diffY < cursor_delta) {
        //redirect to links
        var goto_address = links[target_name];
        if (goto_address != undefined) {
            gtag('event', 'link_out', {
                'url': goto_address
            });
            window.location.href = goto_address;
        }
    }
});

//Main Loop//
{
    render();
    animate();
}

