import * as THREE from './scripts/three/build/three.module.js'
import { OrbitControls } from './scripts/three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from './scripts/three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from './scripts/three/examples/jsm/loaders/DRACOLoader.js'

//KEY VARIABLES//

//Scenes
var active_scene = new THREE.Scene();
var scene1 = new THREE.Scene();
var scene2 = new THREE.Scene();

//Canvas
var myCanvas = document.getElementById('myCanvas');

//Clock 
var clock = new THREE.Clock();

//Bezier Paths
var speed = 10000
var subdivisions = 5000
var fraction = 0;
var tangent = new THREE.Vector3();
var axis = new THREE.Vector3();
var up = new THREE.Vector3(-1,0,0);
var bezier_path = new THREE.CatmullRomCurve3(
    [
    new THREE.Vector3(-20,0,10),
    new THREE.Vector3(0,0,10),
    new THREE.Vector3(0,0,-10),
    new THREE.Vector3(20,0,-10)
    ]
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
document.body.appendChild(renderer.domElement);

//Camera
var height = window.innerHeight;
var width = window.innerWidth;
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
    "link4": "https://twitter.com/drewbio"
}

// Instantiate a loading manager
var manager = new THREE.LoadingManager();

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    console.log(itemsLoaded / itemsTotal)
}

manager.onLoad = function () {
    active_scene = scene1
};

//Instantiate a loader
var loader = new GLTFLoader(manager);

//Include DRACO compression comprehension
var dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./scripts/three/examples/jsm/libs/draco/');
loader.setDRACOLoader(dracoLoader);

////

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

    transparent_mesh.scene.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            child.material.alphaHash = true;
            child.material.trasparent = true;
        }
    })

    //Coffee guy is really big by default
    coffee_guy.scene.scale.set(0.2, 0.2, 0.2)
    coffee_guy.scene.rotation.set(0, Math.PI, 0)

    var mixer = new THREE.AnimationMixer(coffee_guy.scene);

    coffee_guy.animations.forEach((clip) => {

        mixer.clipAction(clip).play();

    });


    var result = [
        base_mesh.scene,
        transparent_mesh.scene,
        interactive_mesh1.scene,
        interactive_mesh2.scene,
        interactive_mesh3.scene,
        interactive_mesh4.scene,
        coffee_guy.scene
    ]

    for (const scn of result) {
        scene1.add(scn);
    }

    //Lights and fog
    for (const element of [-10, -5, 0, 5, 10]) {
        var light = new THREE.SpotLight(0xffd0bb, 100, 0, Math.PI / 3, .3);
        const targetObject = new THREE.Object3D();
        targetObject.position.set(0, 0, element);
        scene1.add(targetObject);
        light.target = targetObject;
        light.position.set(0, 10, element);
        scene1.add(light);
    }

    var ambient_light = new THREE.AmbientLight(0xffd0bb, .5);

    var focus_light = new THREE.SpotLight(0xffd0bb, 200, 0, Math.PI / 6, .3);
    var focus_target = new THREE.Object3D();
    focus_target.position.set(0, 20, 0);
    scene1.add(focus_target);
    focus_light.target = focus_target;
    focus_light.position.set(0, 10, 0);
    scene1.add(focus_light)

    scene1.add(ambient_light);
    scene1.fog = new THREE.Fog(0x222222, 10, 30);
}

//Render loop
if (active_scene == scene1) {
    render();
    animate();
}

//Footer Functions for Rendering and Window Listeners//

function render() {
    //constrain movement to bbox
    orbit.target.clamp(new THREE.Vector3(-1.5, 5, -6), new THREE.Vector3(1.5, 5, 6))
    //exposure
    renderer.toneMappingExposure = Math.pow(0.7, 5.0);  // -> exposure: 0.168
    renderer.render(active_scene, camera);

    requestAnimationFrame(render);
}

function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    fraction += speed/subdivisions;
	
	if ( fraction > subdivisions ) {
		fraction = 0;
	}

    coffee_guy.scene.position.x = bezier_points[fraction].x;
    coffee_guy.scene.position.z = bezier_points[fraction].z;

    tangent = bezier_path.getTangent( fraction/subdivisions ).normalize();
    axis = axis.crossVectors( up, tangent ).normalize();
    var radians = Math.acos( up.dot( tangent ) );
	
	coffee_guy.scene.quaternion.setFromAxisAngle( axis, radians );

    renderer.render(scene1, camera);

}

// Window sizing
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('mousemove', function (event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    intersects = raycaster.intersectObjects(active_scene.children);
    if (intersects.length > 0) {
        target_intersect = intersects.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr);

        //multiple materials on one mesh are given the name "xxx", "xxx_1", ...
        target_name = target_intersect.object.name.split("_")[0]
        //console.log(target_intersect.point);

        if (Object.keys(links).indexOf(target_name) >= 0) {
            myCanvas.style.cursor = "pointer"
            focus_light.position.z = target_intersect.point.z
            focus_light.position.y = target_intersect.point.y
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
    } else {
        //console.log("no hit!")
    }
})

window.addEventListener('mousedown', function (event) {
    startX = event.clientX;
    startY = event.clientY;
});

window.addEventListener('mouseup', function (event) {
    var diffX = Math.abs(event.clientX - startX);
    var diffY = Math.abs(event.clientY - startY);

    if (diffX < cursor_delta && diffY < cursor_delta) {
        //redirect to links
        var goto_address = links[target_name];
        if (goto_address != undefined) {
            window.location.href = goto_address;
        }
    }
});
////