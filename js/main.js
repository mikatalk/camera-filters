// references:
// https://github.com/tensorflow/tfjs-models/blob/master/body-pix/README-v1.md
// https://github.com/vinooniv/video-bg-blur/
// https://blog.francium.tech/edit-live-video-background-with-webrtc-and-tensorflow-js-c67f92307ac5

// const videoElement = document.createElement('video');
const container = document.querySelector('.container');
const canvasMask = document.createElement('canvas');
const canvasTexture = document.createElement('canvas');
const textureContext = canvasTexture.getContext('2d');
const contextMask = canvasMask.getContext('2d');

let videoElement, net;
let camera, renderer, scene, material, clock, counter, sliceCounter;
let pivot1, pivot2, pivot3, pivot4, mesh1, mesh2, mesh3, mesh4;
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', e => {
  startBtn.parentElement.removeChild(startBtn);
  init();
})

init()

async function init() {

  videoElement = await initVideoStream();

  container.appendChild(videoElement);
  // container.appendChild(canvasMask);
  document.body.appendChild(canvasTexture);
  canvasTexture.style.position = 'relative';
  canvasTexture.style.width = '100px';

  net = await loadBodyPix();
  // drawMask();
  init3D();
  animate();
}

function initVideoStream() {
  const videoElement = document.createElement('video');
  console.log('Initializing Video Strem...')
  return new Promise(ready => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        videoElement.addEventListener('playing', (event) => {
          canvasTexture.width = canvasMask.width = videoElement.width = videoElement.videoWidth;
          canvasTexture.height = canvasMask.height = videoElement.height = videoElement.videoHeight;

          ready(videoElement);
        });

      })
      .catch(err => {
        alert(`[Error occurred]: ${err}`);
      });
  })
}

// function stopVideoStream() {
//   const stream = videoElement.srcObject;
//   stream.getTracks().forEach(track => track.stop());
//   videoElement.srcObject = null;
// }

function loadBodyPix() {
  console.log('Initializing BodyPix Library...')
  return new Promise(ready => {
    const options = {
      multiplier: 0.5,
      stride: 32,
      quantBytes: 4,
    }
    return bodyPix.load(options)
      .then(net => ready(net))
      .catch(err => console.log(err))
  });
}

async function drawMask() {
  const segmentation = await net.segmentPerson(videoElement);
  const coloredPartImage = bodyPix.toMask(segmentation);
  const opacity = 1;
  const flipHorizontal = false;
  const maskBlurAmount = 0;
  bodyPix.drawMask(
    canvasMask, videoElement, coloredPartImage, opacity, maskBlurAmount,
    flipHorizontal
  );
}




function init3D() {
  console.log('Initializing Three...');

  clock = new THREE.Clock();
  counter = 0;
  sliceCounter = 0;
  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;
  const maxSide = Math.max(width, height);
  camera = new THREE.OrthographicCamera(maxSide / - 2, maxSide / 2, maxSide / 2, maxSide / - 2, 1, 1000);
  camera.position.z = 1000;

  scene = new THREE.Scene();

  material = new THREE.MeshBasicMaterial({
    // side: THREE.DoubleSide,
    side: THREE.BackSide,
    transparent: true,
  });
// // scale x2 horizontal
// texture.repeat.set(0.5, 1);
// // scale x2 vertical
// texture.repeat.set(1, 0.5);
// // scale x2 proportional
// texture.repeat.set(0.5, 0.5);

    /*
    Original UVs:
    0 1
    1 1
    0 0
    1 0
    */

  mesh1 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const uv1 = mesh1.geometry.attributes.uv;
  uv1.setXY(0, 0, 0.5)
  uv1.setXY(1, 0.5, 0.5)
  uv1.setXY(2, 0, 0)
  uv1.setXY(3, 0.5, 0)
  pivot1 = createPivot(mesh1, 0, -height/2);


  mesh2 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const uv2 = mesh2.geometry.attributes.uv;
  uv2.setXY(0, 0.5, 0.5)
  uv2.setXY(1, 1, 0.5)
  uv2.setXY(2, 0.5, 0)
  uv2.setXY(3, 1, 0)
  pivot2 = createPivot(mesh2, 0, -height/2);
  
  
  mesh3 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const uv3 = mesh3.geometry.attributes.uv;
  uv3.setXY(0, 0, 1)
  uv3.setXY(1, 0.5, 1)
  uv3.setXY(2, 0, 0.5)
  uv3.setXY(3, 0.5, 0.5)
  pivot3 = createPivot(mesh3, 0, -height/2);
  
  
  mesh4 = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  const uv4 = mesh4.geometry.attributes.uv;
  uv4.setXY(0, 0.5, 1)
  uv4.setXY(1, 1, 1)
  uv4.setXY(2, 0.5, 0.5)
  uv4.setXY(3, 1, 0.5)
  pivot4 = createPivot(mesh4, 0, -height/2);
  
 
 
  // mesh1.scale.set(0.5, 0.5, 0.5);
  // mesh1.position.setX(-width/4);
  // mesh1.position.setY(height/4);
  
  // mesh2.scale.set(0.5, 0.5, 0.5);
  // mesh2.position.setX(width/4);
  // mesh2.position.setY(height/4);
  
  // mesh3.scale.set(0.5, 0.5, 0.5);
  // mesh3.position.setX(-width/4);
  // mesh3.position.setY(-height/4);
  
  // mesh4.scale.set(0.5, 0.5, 0.5);
  // mesh4.position.setX(width/4);
  // mesh4.position.setY(-height/4);


  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // set canvas as material.map
  material.map = new THREE.CanvasTexture(canvasTexture);
}

function createPivot(mesh, x, y) {
  const pivot = new THREE.Group();
  pivot.rotation.y += Math.PI;
  mesh.position.set(-x, -y, 0);
  pivot.position.set(x, y, 0);
  pivot.add(mesh);
  scene.add(pivot);
  return pivot
}
  
function animate() {

  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  const speed = 0;
  pivot1.rotation.x = Math.min(Math.PI, pivot1.rotation.x + delta * speed);
  pivot2.rotation.x = Math.min(Math.PI, pivot2.rotation.x + delta * speed);
  pivot3.rotation.x = Math.min(Math.PI, pivot3.rotation.x + delta * speed);
  pivot4.rotation.x = Math.min(Math.PI, pivot4.rotation.x + delta * speed);

  renderer.render(scene, camera);

  counter += delta;
  if (counter > 0.5) {
    // counter = counter % 1;
    counter -= 0.5;
    sliceOne()
  }
}

function sliceOne() {
  sliceCounter += 1;
  drawMask(videoElement, net);
  const { width, height } = canvasTexture;

  const x = ((sliceCounter + 1) % 2) * (width / 2);
  const y = Math.floor(((sliceCounter) % 4) / 2) * (height / 2);
  const tile = ((sliceCounter+3) % 4) + 1;
  switch (tile) {
    case 1: pivot1.rotation.x = 0; break;
    case 2: pivot2.rotation.x = 0; break;
    case 3: pivot3.rotation.x = 0; break;
    case 4: pivot4.rotation.x = 0; break;
  }

  const imgData = contextMask.getImageData(0, 0, canvasMask.width, canvasMask.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const alpha = data[i + 3];
    if (!red && !green && !blue) {
      data[i + 3] = 0;
    }
  }
  contextMask.putImageData(imgData, 0, 0);

  textureContext.clearRect(x, y, width / 2, height / 2);
  textureContext.drawImage(canvasMask, x, y, width / 2, height / 2);

  material.map.needsUpdate = true;
}