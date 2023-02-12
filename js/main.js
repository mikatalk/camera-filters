// references:
// https://github.com/tensorflow/tfjs-models/blob/master/body-pix/README-v1.md
// https://github.com/vinooniv/video-bg-blur/
// https://blog.francium.tech/edit-live-video-background-with-webrtc-and-tensorflow-js-c67f92307ac5

const videoElement = document.createElement('video');
const canvasMask = document.createElement('canvas');
const canvasTexture = document.createElement('canvas');
const textureContext = canvasTexture.getContext('2d');

const width = 640;
const height = 480;

canvasTexture.width = canvasMask.width = videoElement.width = width;
canvasTexture.height = canvasMask.height = videoElement.height = height;

const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('click', e => {
  startBtn.parentElement.removeChild(startBtn);
  init();
})

init()

function init() {
  initVideoStream()
    .then(() => {
      // document.body.appendChild(videoElement);
      document.body.appendChild(canvasMask);
    })
    .then(loadBodyPix)
    .then(init3D)
    .then(animate)
}

function initVideoStream() {
  console.log('Initializing Video Strem...')
  return new Promise(ready => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        videoElement.addEventListener('playing', (event) => {
          ready();
        });

      })
      .catch(err => {
        startBtn.disabled = false;
        blurBtn.disabled = true;
        stopBtn.disabled = true;
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
      .then(net => { ready(); drawMask(net)})
      .catch(err => console.log(err))
  });
}

async function drawMask(net) {
  while (true) {
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
}




function init3D() {
  console.log('Initializing Three...')
  camera = new THREE.PerspectiveCamera(50, width / height, 1, 2000);
  camera.position.z = 250;

  scene = new THREE.Scene();

  material = new THREE.MeshBasicMaterial();

  mesh = new THREE.Mesh(new THREE.BoxGeometry(200, 200, 200), material);
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  window.addEventListener('resize', onWindowResize);

  // set canvas as material.map
  material.map = new THREE.CanvasTexture(canvasTexture);
}

function drawTexture3D() {
  const context = canvasTexture.getContext( '2d' );

  // need to flag the map as needing updating.
  material.map.needsUpdate = true;

}

function onWindowResize() {

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

}

function animate() {

  requestAnimationFrame(animate);

  mesh.rotation.x += 0.01;
  mesh.rotation.y += 0.01;

  renderer.render(scene, camera);

}
