import * as THREE from "three";
import metaversefile from "metaversefile";

const {
  useApp,
  useFrame,
  useInternals,
  useLocalPlayer,
  useLoaders,
  usePhysics,
  useCleanup,
  useActivate,
  useCamera,
} = metaversefile;
const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, "$1");

export default () => {
  const app = useApp();
  app.name = "Asteroid Game";
  const { renderer, camera } = useInternals();
  const localPlayer = useLocalPlayer();
  const physics = usePhysics();
  let physicsIds = [];

  const localVector = new THREE.Vector3();
  const localVector2 = new THREE.Vector3();
  const localEuler = new THREE.Euler();
  const localQuaternion = new THREE.Quaternion();
  const localMatrix = new THREE.Matrix4();
  const downQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI * 0.5
  );
  const allAsteroids = [];
  let gltf;
  let soundBuffer;

  class Asteroid {
    constructor(app, group, localMatrix) {
      this.app = app;
      this.group = group.clone();
      this.group.applyMatrix4(localMatrix);
      this.app.add(this.group);
      this.group.updateMatrixWorld();
    }
    destroy() {
      this.app.remove(this.group);
      const mesh = this.group.children[0].children[0].children[0];
      mesh.material.map.dispose();
      mesh.material.dispose();
      mesh.geometry.dispose();
      if (this.sound) {
        this.sound.stop();
        this.sound = null;
      }
    }
  }

  class MovingAsteroid extends Asteroid {
    constructor(app, group, localMatrix, localEuler, movingAsteroids) {
      super(app, group, localMatrix);

      this.velocityX = 0.5;
      localEuler.set(
        Math.random() / 100,
        Math.random() / 100,
        Math.random() / 100,
        "XYZ"
      );
      this.rotation = new THREE.Quaternion().setFromEuler(localEuler);
      movingAsteroids.push(this);
    }
    move() {
      if (this.group.position.x > 300) {
        this.group.position.setX(-300);
      }
      this.group.position.setX(this.group.position.x + this.velocityX);
      this.group.quaternion.premultiply(this.rotation);
    }
  }

  class MovingSoundAsteroid extends Asteroid {
    constructor(
      app,
      group,
      localMatrix,
      localEuler,
      movingAsteroids,
      soundBuffer
    ) {
      super(app, group, localMatrix);

      this.sound = new THREE.PositionalAudio(audioListener);
      this.sound.setBuffer(soundBuffer);
      this.sound.setLoop(true);
      this.sound.setRefDistance(5);
      this.sound.setMaxDistance(5);
      this.sound.setDistanceModel("exponential");
      this.sound.play();
      this.group.children[0].children[0].children[0].add(this.sound);

      this.velocityX = Math.random() * 0.5 + 0.5;
      localEuler.set(
        Math.random() / 100,
        Math.random() / 100,
        Math.random() / 100,
        "XYZ"
      );
      this.rotation = new THREE.Quaternion().setFromEuler(localEuler);
      movingAsteroids.push(this);
    }
    move() {
      if (this.group.position.x > 600) {
        this.group.position.setX(-300);
      }
      this.group.position.setX(this.group.position.x + this.velocityX);
      this.group.quaternion.premultiply(this.rotation);
    }
  }

  const defaultSpawn = new THREE.Vector3(0, 5, 0);
  const movingAsteroids = [];

  let asteroids = [
    {
      position: new THREE.Vector3(0, 30, 0),
      quat: new THREE.Quaternion(0, 0, 0, 1),
      scale: new THREE.Vector3(0.04, 0.04, 0.04),
    },
  ];

  const audioListener = new THREE.AudioListener();
  localPlayer.add(audioListener);

  (async () => {
    gltf = await new Promise((accept, reject) => {
      const { gltfLoader } = useLoaders();
      const url =
        "https://SurajWijewickrama.github.io/WebaverseAssets/shooting-stars/assets/rock/scene.glft";
      gltfLoader.load(url, accept, function onprogress() {}, reject);
    });

    let group = gltf.scene;

    soundBuffer = await new Promise((accept, reject) => {
      const audioLoader = new THREE.AudioLoader();
      const url =
        "https://SurajWijewickrama.github.io/WebaverseAssets/shooting-stars/assets/audio/white-noise.mp3";
      audioLoader.load(url, accept, function onprogress() {}, reject);
    });

    createAsteroidField(group, soundBuffer);
    const pointLight = new THREE.PointLight(0x5c10e8, 50);
    pointLight.castShadows = true;
    app.add(pointLight);
    app.updateMatrixWorld();
  })();

  let lastFoundObj;
  useFrame(({ timeDiff, timestamp }) => {
    if (localPlayer.avatar) {
      moveAsteroids();

      const resultDown = physics.raycast(localPlayer.position, downQuat);
      if (
        resultDown &&
        localPlayer.characterPhysics.lastGroundedTime === timestamp
      ) {
        let foundObj = metaversefile.getPhysicsObjectByPhysicsId(
          resultDown.objectId
        );
        if (foundObj && !(lastFoundObj === foundObj)) {
          lastFoundObj = foundObj;
        }
      }

      // Resets character position to spawn position
      if (localPlayer.position.y < -70) {
        physics.setCharacterControllerPosition(
          localPlayer.characterController,
          defaultSpawn
        );
      }
    }
    app.updateMatrixWorld();
  });

  const moveAsteroids = () => {
    for (const asteroid of movingAsteroids) {
      asteroid.move();
    }
  };

  const createAsteroidField = (group, soundBuffer) => {
    for (let i = 0; i < 1; i++) {
      localMatrix.compose(
        localVector.randomDirection().multiplyScalar(1).addScalar(1),
        localQuaternion.random(),
        localVector2.random().divideScalar(1)
      );
      const newMovingAsteroid = new MovingAsteroid(
        app,
        group,
        localMatrix,
        localEuler,
        movingAsteroids
      );
      allAsteroids.push(newMovingAsteroid);
    }

    for (let i = 0; i < 1; i++) {
      localMatrix.compose(
        localVector.randomDirection().multiplyScalar(1).addScalar(1),
        localQuaternion.random(),
        localVector2.random().divideScalar(12)
      );
      const newSoundAsteroid = new MovingSoundAsteroid(
        app,
        group,
        localMatrix,
        localEuler,
        movingAsteroids,
        soundBuffer
      );
      allAsteroids.push(newSoundAsteroid);
    }
  };

  useCleanup(() => {
    const mesh = gltf.scene.children[0].children[0].children[0];
    mesh.material.map.dispose();
    mesh.material.dispose();
    mesh.geometry.dispose();
    for (const asteroid of allAsteroids) {
      asteroid.destroy();
    }
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    soundBuffer = null;
    localPlayer.remove(audioListener);
  });

  return app;
};
