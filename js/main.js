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
let camera, renderer, scene, material, mesh, clock, counter, sliceCounter;
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
  camera = new THREE.OrthographicCamera( maxSide / - 2, maxSide / 2, maxSide / 2, maxSide / - 2, 1, 1000 );
  // camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, 1, 1000 );
  camera.position.z = 250;

  scene = new THREE.Scene();

  material = new THREE.MeshBasicMaterial({
    // wireframe: true,
    side: THREE.DoubleSide,
    transparent: true, 
    // opacity: 0, 
    alphaTest: 0.5,
    color: 0xffffff
  });
  // material.blending = THREE.CustomBlending
  // material.blendSrc = THREE.OneFactor
  // material.blendDst = THREE.DistAlpha

  mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.rotation.y += Math.PI;
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor( 0x000000, 0 );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  // set canvas as material.map
  material.map = new THREE.CanvasTexture(canvasTexture);
}

function animate() {

  requestAnimationFrame(animate);

  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.01;

  renderer.render(scene, camera);

  counter += clock.getDelta();
  if (counter > 0.1) {
    counter = 0;
    sliceOne()
  }
}

function sliceOne() {
  sliceCounter += 1;
  drawMask(videoElement, net);
  const {width, height} = canvasTexture;

  const x = ((sliceCounter+1) % 2) * (width / 2);
  const y = Math.floor((sliceCounter % 4)/2) * (height / 2);
  


  const imgData = contextMask.getImageData(0, 0, canvasMask.width, canvasMask.height);
  const data = imgData.data;
  for(let i = 0; i < data.length; i += 4) {
    const red = data[i];
    const green = data[i + 1];
    const blue = data[i + 2];
    const alpha = data[i + 3];
    if (!red && !green && !blue) {
      data[i + 3] = 0;
    }
  }
  contextMask.putImageData(imgData, 0, 0);

  textureContext.clearRect(x, y, width/2, height/2);
  textureContext.save();
  
  // Draw mask to buffer
  
  // textureContext.fillStyle = 'rgba(0,0,0,0)'
  // textureContext.fillRect(x, y, width/2, height/2);

  // textureContext.globalCompositeOperation = 'difference';
  // textureContext.globalCompositeOperation = 'source-in';
  // textureContext.globalCompositeOperation = 'source-over';
    // textureContext.globalCompositeOperation = 'copy';
    // textureContext.globalCompositeOperation = 'xor';
    textureContext.drawImage(canvasMask, x, y, width/2, height/2);
    // Draw the color only where the mask exists (using source-in)
    
    // textureContext.globalCompositeOperation = 'destination-out';
    textureContext.restore();
  /*

  // textureContext.globalAlpha = 0;
  // textureContext.fillRect(0, 0, width, height);
  // textureContext.globalAlpha = 1;


  // textureContext.globalAlpha = 1;
  // textureContext.beginPath();
  // textureContext.fillStyle = '#110000';
  // textureContext.fillRect(0, 0, width, height);
  
  // textureContext.globalAlpha = 1;
  const x = ((sliceCounter+1) % 2) * (width / 2);
  const y = Math.floor((sliceCounter % 4)/2) * (height / 2);
  // textureContext.rect(sliceCounter*10, 20, 150000, 100);
  // textureContext.rect(10 * sliceCounter, 20, 10, 100);

  // textureContext.globalCompositeOperation = 'source-over';
  // textureContext.fillStyle = "rgba(0,0,0,0)";
  // textureContext.fillStyle = "#FFFFFF00";
  textureContext.fillStyle = "#00ff0054";
  // textureContext.globalAlpha = 0
  textureContext.clearRect(0, 0, width, height);

  // textureContext.globalCompositeOperation = 'destination-out';
  // textureContext.globalCompositeOperation = 'lighter';
  textureContext.globalCompositeOperation = 'luminosity';
  // textureContext.fillRect(x, y, width/2, height/2);
  textureContext.drawImage(canvasMask, x, y, width/2, height/2);
  // textureContext.globalCompositeOperation = 'source-over';
  
  */
  // textureContext.fill();

  // textureContext.globalAlpha = 1;
  // const x = (sliceCounter % 2) * (width / 2);
  // const y = ((sliceCounter+1) % 2) * (width / 2);
  // textureContext.clearRect(0, 0, width, height);
  // textureContext.drawImage(canvasMask, 0,0);
  // need to flag the map as needing updating.
  material.map.needsUpdate = true;
  // material.transparent = true;


}