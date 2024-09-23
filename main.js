import * as THREE from './scripts/three/build/three.module.js'
import { OrbitControls } from './scripts/three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from './scripts/three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from './scripts/three/examples/jsm/loaders/DRACOLoader.js'
import { RGBELoader } from './scripts/three/examples/jsm/loaders/RGBELoader.js'
import * as SkeletonUtils from './scripts/three/examples/jsm/utils/SkeletonUtils.js'

//KEY VARIABLES//
//Document
var uiElement = document.querySelector('#loadingscreen')
var uiLoadingBar = document.querySelector('#loadingbar')
const USING_MOBILE = "ontouchstart" in document.documentElement

//Scenes
var activeScene = new THREE.Scene()
var scene1 = new THREE.Scene()

new RGBELoader()
    .setPath('./images/threejs_assets/')
    .load('cloudysky.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping

        scene1.background = texture
        scene1.environment = texture
    })

//Models
var models = {}
var clips = {}

//Animation mixer array
var mixerArr = []

//Lights
var focusLightInt = 400
var focusLightCol = 0xfff5b6
let focusLight

//Empties
let focusTarget

//Canvas
var myCanvas = document.getElementById('myCanvas')
var windowHeight = window.innerHeight
var windowWidth = window.innerWidth

//Clock 
var clock = new THREE.Clock()

//Renderer
var renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas: myCanvas,
    alpha: true
})

//renderer settings
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(windowWidth, windowHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.gammaInput = true
renderer.gammaOutput = true
renderer.antialias = true
renderer.toneMapping = THREE.LinearToneMapping

//Camera
var distance = 1750
var orbitDistance = 1
var fov = 50 //Field of View
var camera = new THREE.PerspectiveCamera(fov, windowWidth / windowHeight, 0.01, distance)
// orbitDistance should be +/-'d to chose coordinate to indicate positive or negative direction
camera.position.set(0, 5, 8+orbitDistance)
camera.zoom = 1
camera.updateProjectionMatrix()

//controlsControls
var controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0,5,8)
controls.enableZoom = false
controls.enablePan = false

function retargetControls(target, distance) {
    controls.target.copy(new THREE.Vector3().fromArray(target))

    const pos = new THREE.Vector3().fromArray(target)
    const dist = camera.position.distanceTo(pos)
    // if distance is less than minimum distance, set the camera position to minimum distance
    if (dist > distance) {
        const dir = camera.position.clone().sub(pos).normalize()
        const align = pos.clone().add(dir.multiplyScalar(distance))
        camera.position.set(align.x, align.y, align.z)
        }
}

//Raycasting
var cursorDelta = 6
var raycaster = new THREE.Raycaster()
var pointer = new THREE.Vector2()
let startX
let startY
let intersects
let targetIntersect
let targetName

//Painting Links
var links = {
    "link1": "https://cran.r-project.org/web/packages/smlmkalman/index.html",
    "link2": "https://www.linkedin.com/in/andrew-buist1",
    "link3": "https://github.com/andrew-buist/",
    "link4": "https://twitter.com/drewbio",
    "link5": "./pages/sections/3d_modelling.html"
}

//Locations
var locs = {}

// Instantiate a loading manager
var manager = new THREE.LoadingManager()

manager.onStart = function () {
    //Display loading screen background
    uiElement.style.display = ''
}

manager.onProgress = function (url, itemsLoaded, itemsTotal) {
    //console.log(url)
    const load_percent = ((itemsLoaded / itemsTotal) * 100).toFixed(2)
    uiLoadingBar.style.width = load_percent + "%"
}

manager.onLoad = function () {
    //Remove loading screen background
    activeScene = scene1
    uiElement.style.display = 'none'
    document.body.appendChild(renderer.domElement)
}

//Instantiate a loader
var loader = new GLTFLoader(manager)

//Include DRACO compression comprehension
var dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./scripts/three/examples/jsm/libs/draco/')
loader.setDRACOLoader(dracoLoader)

////

//Generic function to zip 2 arrays to named key:value obj
function zipArrays(keys, values) {
    const result = {}
    for (let i = 0; i < keys.length; i++) {
        result[keys[i]] = values[i]
    }
    return result
}

//Creates a blob of all 3d items under total promise, then assigns to named global lists
async function loadPush(gltfArr, nameArr) {
    const loadBlob = await Promise.all(gltfArr.map(x => loader.loadAsync(x)))

    models = zipArrays(nameArr, loadBlob.map(x => x.scene))
    clips = zipArrays(nameArr, loadBlob.map(x => x.animations))
}

function addToScene(sceneName, par = {}) {
    if (!par.position) { par.position = [0, 0, 0] }
    if (!par.rotation) { par.rotation = [0, 0, 0] }
    if (!par.scale) { par.scale = [1, 1, 1] }
    if (!par.rename) { par.rename = sceneName }

    const obj = SkeletonUtils.clone(models[sceneName])

    //transform block//
    obj.position.copy(new THREE.Vector3().fromArray(par.position))
    obj.rotation.copy(new THREE.Euler().fromArray(par.rotation))
    obj.scale.copy(new THREE.Vector3().fromArray(par.scale))
    ////

    if(par.nav){
        locs[par.rename] = par.position.map( function(n,i){return n + par.nav[i]}) //[par.position[0] + par.nav[0], par.position[1] + par.nav[1], par.position[2] + par.nav[2]]
    }

    //apply animations//
    //note: all instances will have an associated mixer in the mixerArr, even if no anims present//
    var mixer = new THREE.AnimationMixer(obj)
    clips[sceneName].forEach((clip) => {

        mixer.clipAction(clip).play()

    })
    mixerArr.push(mixer)
    ////

    //material overrides for transparency, envIntensity, and rename//
    obj.traverse(function (child) {
        if (child instanceof THREE.Mesh) {
            //assign name to each element of mesh for raycast name passback
            child.name = par.rename
            child.frustumCulled = false
            child.material.envMapIntensity = 0.3
        }
    })
    ////

    scene1.add(obj)
}

//Scene1 (main) .adds
async function init() {
    await loadPush(
        [
            "./3d_scenery/museum_hall.glb",
            "./3d_scenery/museum_hall_painting1.glb",
            "./3d_scenery/museum_hall_painting2.glb",
            "./3d_scenery/museum_hall_painting3.glb",
            "./3d_scenery/museum_hall_painting4.glb",
            "./3d_scenery/vase.glb",
            "./3d_scenery/businessman.glb",
            "./3d_scenery/arrow.glb"
        ],
        [
            "building",
            "link1",
            "link2",
            "link3",
            "link4",
            "link5",
            "businessman",
            "arrow"
        ])

    addToScene("building")
    addToScene("link1")
    addToScene("link2")
    addToScene("link3")
    addToScene("link4")
    addToScene("link5")
    addToScene("businessman", { position: [6.4203, -0.8, -3.1523], rotation: [0, -Math.PI / 2, 0], scale: [3, 3, 3] })
    addToScene("arrow", { position: [0, 0, 0], rename: "a1", nav: [0,5,0]})
    addToScene("arrow", { position: [0, 0, 8], rename: "a2", nav: [0,5,0] })
    addToScene("arrow", { position: [0, 0, -8], rename: "a3", nav: [0,5,0] })
    addToScene("arrow", { position: [6.4203, 2, -.3], rename: "a4", nav: [0,3,0] })

    //Lights and fog
    focusLight = new THREE.SpotLight(focusLightCol, focusLightInt, 0, Math.PI / 10, .3)
    focusLight.castShadow = true
    focusTarget = new THREE.Object3D()
    focusTarget.position.set(0, 20, 0)
    scene1.add(focusTarget)
    focusLight.target = focusTarget
    focusLight.position.set(0, 10, 0)
    scene1.add(focusLight)

    scene1.fog = new THREE.Fog(0xffffff, 15, 100)
}

//Footer Functions for Rendering and Window Listeners//

function render() {
    //constrain movement to bbox
    //controls.target.clamp(new THREE.Vector3(-1.5, 5, -6), new THREE.Vector3(1.5, 5, 6))
    //exposure
    var delta = clock.getDelta()
    //iterate through array and update to delta time
    if (mixerArr.length > 0) {
        mixerArr.forEach((element) => element.update(delta))
    }

    controls.update(delta)
    renderer.render(activeScene, camera)
    requestAnimationFrame(render)
}

// Window sizing
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('pointermove', function (event) {

    if (USING_MOBILE) {
        pointer.x = 0
        pointer.y = 0
    } else {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = - (event.clientY / window.innerHeight) * 2 + 1
    }
    raycaster.setFromCamera(pointer, camera)
    intersects = raycaster.intersectObjects(activeScene.children)
    if (intersects.length > 0) {
        targetIntersect = intersects.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)

        //multiple materials on one mesh are given the name "xxx", "xxx_1", ...
        targetName = targetIntersect.object.name.split("_")[0]
        //console.log(targetName)

        //get the link for any objects which have them
        if (Object.keys(links).indexOf(targetName) >= 0) {
            myCanvas.style.cursor = "pointer"
            focusLight.intensity = focusLightInt
            focusLight.position.z = targetIntersect.point.z
            focusLight.target.position.copy(targetIntersect.point)
        } else {
            myCanvas.style.cursor = "default"
            focusLight.intensity = 0
            focusLight.position.z = 0
            focusLight.position.y = 10
        }
    } else {
        //console.log("no hit!")
    }
})

window.addEventListener('pointerdown', function (event) {
    startX = event.clientX
    startY = event.clientY
    if (USING_MOBILE){
        //mobile requires we redo the intersect on tap
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1
        pointer.y = - (event.clientY / window.innerHeight) * 2 + 1

        raycaster.setFromCamera(pointer, camera)
        intersects = raycaster.intersectObjects(activeScene.children)

        targetIntersect = intersects.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
        targetName = targetIntersect.object.name.split("_")[0]
    }
})

window.addEventListener('pointerup', function (event) {
    var diffX = Math.abs(event.clientX - startX)
    var diffY = Math.abs(event.clientY - startY)

    if (diffX < cursorDelta && diffY < cursorDelta) {
        //redirect to links
        if (targetName in links) {
            const gotoAddress = links[targetName]
            if (gotoAddress != undefined) {
                gtag('event', 'link_out', {
                    'url': gotoAddress
                })
                window.location.href = gotoAddress
            }
        } else if (targetName in locs) {
            retargetControls(locs[targetName], orbitDistance)
        }
    }
})

//Main Loop//
{
    init()
    render()
}