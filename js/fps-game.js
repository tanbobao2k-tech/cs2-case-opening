// ==========================================
// CS2 3D AIM ARENA — SOURCE ENGINE FPS ENGINE
// Multi-Weapon (1: Súng Dài, 2: Súng Ngắn, 3: Dao)
// Full-Auto Spray (Sấy AK 30 viên) & Sniper Scope (Chuột phải)
// Realistic 3D AK-47 Model with Gloved Arms & Wild Lotus Skin
// Powered by Three.js WebGL
// ==========================================

(() => {
  'use strict';

  // --- CONFIG & MULTI-SLOT STATE ---
  const STATE = {
    user: 'Khách',
    score: 0,
    hits: 0,
    shots: 0,
    accuracy: 0,
    health: 100,
    currentSlot: 1, // 1: Súng Dài, 2: Súng Ngắn, 3: Dao
    isMouseDown: false,
    isScoped: false,
    isSwitching: false,
    isReloading: false,
    isInspecting: false,
    sprayCount: 0,
    lastShotTime: 0,
    activeTab: 'all',
    slots: {
      1: {
        type: 'primary',
        slot: 1,
        weapon: 'AK-47',
        name: 'Wild Lotus',
        wear: 'Factory New',
        rarity: 'covert',
        rarityColor: '#eb4b4b',
        ammo: 30,
        maxAmmo: 30,
        reserveAmmo: 90,
        damageBody: 35,
        damageHead: 100,
        fireRate: 105, // ms (approx 600 RPM)
        price: 12500.00,
        img: 'assets/ak47_wild_lotus.png'
      },
      2: {
        type: 'secondary',
        slot: 2,
        weapon: 'Desert Eagle',
        name: 'Printstream',
        wear: 'Factory New',
        rarity: 'covert',
        rarityColor: '#eb4b4b',
        ammo: 7,
        maxAmmo: 7,
        reserveAmmo: 35,
        damageBody: 65,
        damageHead: 140,
        fireRate: 260,
        price: 120.00,
        img: 'assets/deagle_printstream.png'
      },
      3: {
        type: 'melee',
        slot: 3,
        weapon: 'Karambit',
        name: 'Doppler (Sapphire)',
        wear: 'Factory New',
        rarity: 'special',
        rarityColor: '#ffd700',
        ammo: 0,
        maxAmmo: 0,
        reserveAmmo: 0,
        damageBody: 65,
        damageHead: 120,
        fireRate: 400,
        price: 4500.00,
        img: 'assets/karambit_doppler.png'
      }
    },
    inventory: [],
    targets: []
  };

  // DEFAULT PRESET SKINS
  const DEFAULT_SKINS = [
    // Súng Dài (Slot 1)
    {
      id: 'ak-wildlotus',
      slot: 1,
      weapon: 'AK-47',
      name: 'Wild Lotus',
      wear: 'Factory New',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      price: 12500.00,
      img: 'assets/ak47_wild_lotus.png'
    },
    {
      id: 'ak-asiimov',
      slot: 1,
      weapon: 'AK-47',
      name: 'Asiimov',
      wear: 'Field-Tested',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      price: 185.00,
      img: 'assets/ak47_asiimov.png'
    },
    {
      id: 'awp-dragonlore',
      slot: 1,
      weapon: 'AWP',
      name: 'Dragon Lore',
      wear: 'Factory New',
      rarity: 'covert',
      rarityColor: '#ffd700',
      price: 8500.00,
      img: 'assets/awp_dragon_lore.png'
    },
    {
      id: 'm4a4-howl',
      slot: 1,
      weapon: 'M4A4',
      name: 'Howl',
      wear: 'Minimal Wear',
      rarity: 'contraband',
      rarityColor: '#e4ae39',
      price: 5200.00,
      img: 'assets/m4a4_howl.png'
    },

    // Súng Ngắn (Slot 2)
    {
      id: 'deagle-printstream',
      slot: 2,
      weapon: 'Desert Eagle',
      name: 'Printstream',
      wear: 'Factory New',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      price: 120.00,
      img: 'assets/deagle_printstream.png'
    },
    {
      id: 'deagle-blaze',
      slot: 2,
      weapon: 'Desert Eagle',
      name: 'Blaze',
      wear: 'Factory New',
      rarity: 'restricted',
      rarityColor: '#8847ff',
      price: 680.00,
      img: 'assets/deagle_printstream.png'
    },

    // Dao (Slot 3)
    {
      id: 'knife-karambit-sapphire',
      slot: 3,
      weapon: 'Karambit',
      name: 'Doppler (Sapphire)',
      wear: 'Factory New',
      rarity: 'special',
      rarityColor: '#ffd700',
      price: 4500.00,
      img: 'assets/karambit_doppler.png'
    },
    {
      id: 'knife-butterfly-fade',
      slot: 3,
      weapon: 'Butterfly Knife',
      name: 'Fade (100% Max)',
      wear: 'Factory New',
      rarity: 'special',
      rarityColor: '#ffd700',
      price: 3200.00,
      img: 'assets/karambit_doppler.png'
    }
  ];

  function detectSlot(item) {
    const name = ((item.weapon || '') + ' ' + (item.name || '')).toLowerCase();
    if (item.type === 'knife' || name.includes('knife') || name.includes('karambit') || name.includes('bayonet') || name.includes('daggers') || name.includes('dao')) {
      return 3;
    }
    if (name.includes('deagle') || name.includes('desert eagle') || name.includes('glock') || name.includes('usp') || name.includes('p250') || name.includes('five-seven') || name.includes('cz75') || name.includes('berettas') || name.includes('r8') || name.includes('revolver')) {
      return 2;
    }
    return 1;
  }

  // --- SOUND SYNTHESIS (Web Audio API) ---
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playRifleShotSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const bufferSize = audioCtx.sampleRate * 0.18;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.04));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.7, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

    noise.connect(filter);
    filter.connect(masterGain);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.2);
    osc.stop(now + 0.15);
  }

  function playPistolShotSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.16);

    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    const bufferSize = audioCtx.sampleRate * 0.12;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.025));
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const master = audioCtx.createGain();
    master.gain.setValueAtTime(0.7, now);
    master.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(oscGain);
    oscGain.connect(master);
    noise.connect(master);
    master.connect(audioCtx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.18);
    noise.stop(now + 0.15);
  }

  function playKnifeSlashSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const bufferSize = audioCtx.sampleRate * 0.14;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(400, now + 0.14);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + 0.14);
  }

  function playKnifeHitSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
    g.gain.setValueAtTime(0.6, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  function playScopeSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(1200, now + 0.03);
    g.gain.setValueAtTime(0.2, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  function playDeploySound(slot) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    if (slot === 3) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (slot === 2) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    }
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  function playHeadshotSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.08);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  function playBodyHitSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function playDryFireSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.setValueAtTime(300, now + 0.02);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playReloadSound() {
    if (!audioCtx) return;
    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, audioCtx.currentTime);
      g.gain.setValueAtTime(0.2, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    }, 400);

    setTimeout(() => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, audioCtx.currentTime);
      g.gain.setValueAtTime(0.3, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    }, 1100);
  }

  function playJumpSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  function playLandSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  function playFootstepSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // --- CS2 SOURCE ENGINE EXACT PHYSICS CONSTANTS ---
  const CS_PHYSICS = {
    GRAVITY: 24.0,
    MAX_SPEED: 7.2,
    WALK_SPEED: 3.8,
    CROUCH_SPEED: 2.5,
    ACCELERATION: 5.5,
    AIR_ACCELERATION: 12.0,
    FRICTION: 5.2,
    STOP_SPEED: 1.8,
    JUMP_IMPULSE: 8.0,
    STAND_HEIGHT: 1.7,
    CROUCH_HEIGHT: 1.15
  };

  const player = {
    pos: new THREE.Vector3(0, 1.7, 8),
    vel: new THREE.Vector3(0, 0, 0),
    pitch: 0,
    yaw: 0,
    eyeHeight: 1.7,
    targetEyeHeight: 1.7,
    isGrounded: true,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    isWalking: false,
    isCrouching: false,
    swayX: 0,
    swayY: 0,
    stepTimer: 0
  };

  function applyFriction(dt) {
    if (!player.isGrounded) return;
    const speed = Math.hypot(player.vel.x, player.vel.z);
    if (speed < 0.0001) {
      player.vel.x = 0;
      player.vel.z = 0;
      return;
    }
    const control = Math.max(speed, CS_PHYSICS.STOP_SPEED);
    const drop = control * CS_PHYSICS.FRICTION * dt;
    let newSpeed = Math.max(0, speed - drop);
    newSpeed /= speed;
    player.vel.x *= newSpeed;
    player.vel.z *= newSpeed;
  }

  function accelerate(wishDir, wishSpeed, accel, dt) {
    const currentSpeed = player.vel.x * wishDir.x + player.vel.z * wishDir.z;
    const addSpeed = wishSpeed - currentSpeed;
    if (addSpeed <= 0) return;
    const accelSpeed = Math.min(accel * dt * wishSpeed, addSpeed);
    player.vel.x += accelSpeed * wishDir.x;
    player.vel.z += accelSpeed * wishDir.z;
  }

  // --- THREE.JS SCENE SETUP ---
  let scene, camera, renderer;
  let viewmodelRig, weaponMesh;
  let rifleGroup, pistolGroup, knifeGroup;
  let rifleMaterials = [], pistolMaterials = [], knifeMaterials = [];
  let rifleSideDecalMat, pistolSideDecalMat, knifeSideDecalMat;
  let muzzleFlashLight, muzzleSprite;
  let targets = [];

  let recoilOffset = new THREE.Vector3();
  let recoilRot = new THREE.Vector3();
  let switchOffset = 0;
  let slashProgress = 0;
  let inspectProgress = 0;
  let inspectTarget = 0;
  let bobTimer = 0;

  function initThree() {
    const container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6eb7f0); // Mediterranean sky blue
    scene.fog = new THREE.FogExp2(0x94c8f5, 0.006);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.rotation.order = 'YXZ';

    // Dedicated crisp lighting attached to camera for weapon viewmodel & skin brilliance
    const vmDirLight = new THREE.DirectionalLight(0xffffff, 0.95);
    vmDirLight.position.set(1.5, 2.2, 1.2);
    camera.add(vmDirLight);

    const vmAmbientLight = new THREE.AmbientLight(0xffffff, 0.65);
    camera.add(vmAmbientLight);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xfff7e8, 0x8298a8, 0.85);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Warm Mediterranean Sun Light (Direct shadows matching CS2 Inferno)
    const dirLight = new THREE.DirectionalLight(0xfffaec, 1.45);
    dirLight.position.set(24, 44, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    buildArena();
    buildWeaponViewmodel();
    spawnTargets();

    window.addEventListener('resize', onWindowResize);
  }

  // --- REALISTIC INFERNO ENVIRONMENT TEXTURE GENERATORS ---
  function createCobblestoneTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext('2d');

    // Mortar base
    ctx.fillStyle = '#9e8c74';
    ctx.fillRect(0, 0, 1024, 1024);

    const stoneColors = ['#b8aa94', '#a6977e', '#8f8069', '#bfb39d', '#998a75', '#c7bcab', '#80725c'];
    const rows = 16, cols = 16;
    const w = 1024 / cols, h = 1024 / rows;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (w / 2);
      for (let col = -1; col < cols + 1; col++) {
        const x = col * w + offsetX + (Math.sin(r * 3 + col * 7) * 3);
        const y = r * h + (Math.cos(r * 5 + col * 4) * 3);
        const sw = w - 6;
        const sh = h - 6;

        ctx.fillStyle = stoneColors[(r * 7 + col * 13) % stoneColors.length];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, sw, sh, 6);
        else ctx.rect(x, y, sw, sh);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dry grass / weed tufts in crevices
        if ((r + col * 3) % 8 === 0) {
          ctx.fillStyle = '#4a5d23';
          ctx.beginPath();
          ctx.arc(x + sw - 2, y + sh - 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    return tex;
  }

  function createInfernoWallTexture() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const ctx = c.getContext('2d');

    // Upper warm terracotta stucco plaster
    const grad = ctx.createLinearGradient(0, 0, 0, 1024);
    grad.addColorStop(0, '#e59b58');
    grad.addColorStop(0.48, '#c97f3d');
    grad.addColorStop(0.52, '#a59784');
    grad.addColorStop(1, '#867b6d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Weathered plaster noise
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.fillRect(Math.random() * 1024, Math.random() * 500, 10, 10);
    }

    // Lower ancient stone brick layers
    const brickRows = 8;
    const bH = 500 / brickRows;
    const bColors = ['#cdc6b8', '#b5aca0', '#9e9587', '#dcd5c8', '#8f8577'];

    for (let r = 0; r < brickRows; r++) {
      const y = 524 + r * bH;
      const bW = 128;
      const off = (r % 2) * (bW / 2);
      for (let b = -1; b < 9; b++) {
        const x = b * bW + off;
        ctx.fillStyle = bColors[(r * 5 + b * 3) % bColors.length];
        ctx.fillRect(x + 3, y + 3, bW - 6, bH - 6);

        ctx.fillStyle = 'rgba(50, 40, 30, 0.35)';
        ctx.fillRect(x, y + bH - 2, bW, 2);
        ctx.fillRect(x + bW - 2, y, 2, bH);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 2);
    return tex;
  }

  function createWoodDoorTexture() {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#6d4c35';
    ctx.fillRect(0, 0, 512, 512);

    for (let p = 0; p < 8; p++) {
      const x = p * 64;
      ctx.fillStyle = p % 2 === 0 ? '#5e3f2a' : '#745138';
      ctx.fillRect(x + 2, 0, 60, 512);
      ctx.fillStyle = '#3a2416';
      ctx.fillRect(x, 0, 2, 512);
    }

    // Diagonal brace
    ctx.fillStyle = '#4e3321';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(80, 0); ctx.lineTo(512, 432); ctx.lineTo(512, 512); ctx.lineTo(432, 512); ctx.lineTo(0, 80); ctx.closePath();
    ctx.fill();

    // Iron studs
    ctx.fillStyle = '#1e1e1e';
    for (let s = 0; s < 12; s++) {
      ctx.beginPath();
      ctx.arc(40 + (s % 4) * 140, 40 + Math.floor(s / 4) * 200, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(c);
  }

  function buildArena() {
    // 1. Realistic Italian Cobblestone Floor (Inferno Courtyard)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      map: createCobblestoneTexture(),
      roughness: 0.85,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 2. Ancient Stone & Terracotta Plaster Walls
    const wallMat = new THREE.MeshStandardMaterial({
      map: createInfernoWallTexture(),
      roughness: 0.9,
      metalness: 0.02
    });

    const createWall = (w, h, d, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    };

    const arenaH = 7.5;
    createWall(50, arenaH, 1, 0, arenaH / 2, -25);
    createWall(50, arenaH, 1, 0, arenaH / 2, 25);
    createWall(1, arenaH, 50, -25, arenaH / 2, 0);
    createWall(1, arenaH, 50, 25, arenaH / 2, 0);

    // 3. Iconic Inferno Wooden Barn Doors (North Wall)
    const doorMat = new THREE.MeshStandardMaterial({
      map: createWoodDoorTexture(),
      roughness: 0.8
    });
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.2, 0.2), doorMat);
    doorL.position.set(-1.8, 2.6, -24.4);
    doorL.castShadow = true;
    scene.add(doorL);

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(3.5, 5.2, 0.2), doorMat);
    doorR.position.set(1.8, 2.6, -24.4);
    doorR.scale.x = -1;
    doorR.castShadow = true;
    scene.add(doorR);

    // Stone Archway Frame around Doors
    const archMat = new THREE.MeshStandardMaterial({ color: 0xb5aa99, roughness: 0.85 });
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.6, 0.4), archMat);
    archTop.position.set(0, 5.5, -24.3);
    archTop.castShadow = true;
    scene.add(archTop);

    // 4. Mediterranean Cypress Trees (Behind Walls)
    const createCypress = (x, z) => {
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2, 8), new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 }));
      trunk.position.y = 1;
      tree.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1f4222, roughness: 0.9 });
      const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 7, 8), foliageMat);
      foliage1.position.y = 5.5;
      tree.add(foliage1);

      const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5, 8), foliageMat);
      foliage2.position.y = 8;
      tree.add(foliage2);

      scene.add(tree);
    };

    createCypress(-12, -26);
    createCypress(-6, -26);
    createCypress(6, -26);
    createCypress(14, -26);
    createCypress(-26, -10);
    createCypress(-26, 8);

    // 5. Terracotta Flower Pots on Wall Steps (Matching Screenshot)
    const potMat = new THREE.MeshStandardMaterial({ color: 0xc86432, roughness: 0.75 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xe65100, roughness: 0.6 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.8 });

    const createFlowerPot = (x, y, z) => {
      const potGroup = new THREE.Group();
      potGroup.position.set(x, y, z);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.6, 12), potMat);
      pot.castShadow = true;
      potGroup.add(pot);

      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), leafMat);
      leaves.position.y = 0.35;
      potGroup.add(leaves);

      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), flowerMat);
      flower.position.y = 0.5;
      potGroup.add(flower);

      scene.add(potGroup);
    };

    createFlowerPot(7, 3.8, -24.3);
    createFlowerPot(-7, 3.8, -24.3);
    createFlowerPot(12, 1.8, -24.3);

    // 6. European "No Entry" Round Street Sign on Post (Inferno Signature)
    const signGroup = new THREE.Group();
    signGroup.position.set(-8, 0, -22);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.6 }));
    post.position.y = 1.3;
    post.castShadow = true;
    signGroup.add(post);

    const signBoard = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.3 }));
    signBoard.rotation.x = Math.PI / 2;
    signBoard.position.y = 2.4;
    signBoard.castShadow = true;
    signGroup.add(signBoard);

    const signBar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
    signBar.position.set(0, 2.4, 0.01);
    signGroup.add(signBar);

    scene.add(signGroup);

    // 7. Tactical Crates & Cover
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7c5332, roughness: 0.8 });
    const createCrate = (size, x, z) => {
      const geo = new THREE.BoxGeometry(size, size, size);
      const crate = new THREE.Mesh(geo, crateMat);
      crate.position.set(x, size / 2, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
    };

    createCrate(2.5, -8, -10);
    createCrate(2.5, 8, -10);
    createCrate(2, -8, -7.5);
    createCrate(3, 0, -16);
    createCrate(2, -14, 0);
    createCrate(2, 14, 0);
  }

  function spawnTargets() {
    targets.forEach(t => scene.remove(t.group));
    targets = [];

    const positions = [
      { x: -6, z: -14 },
      { x: -2, z: -18 },
      { x: 2, z: -18 },
      { x: 6, z: -14 },
      { x: -10, z: -12 },
      { x: 10, z: -12 },
      { x: 0, z: -22 }
    ];

    positions.forEach((pos, idx) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 0, pos.z);

      const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.2, 16), baseMat);
      base.position.y = 0.1;
      base.castShadow = true;
      group.add(base);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), baseMat);
      pole.position.y = 0.5;
      group.add(pole);

      const torsoMat = new THREE.MeshStandardMaterial({ color: 0x334455, roughness: 0.6 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.35), torsoMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      torso.userData = { isTarget: true, type: 'body', parentIndex: idx };
      group.add(torso);

      const headMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.4 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), headMat);
      head.position.y = 2.0;
      head.castShadow = true;
      head.userData = { isTarget: true, type: 'head', parentIndex: idx };
      group.add(head);

      scene.add(group);

      targets.push({
        group,
        head,
        torso,
        baseX: pos.x,
        strafeSpeed: 0.8 + Math.random() * 0.8,
        strafeRange: 1.5 + Math.random() * 1.5,
        health: 100,
        isDead: false,
        respawnTimer: 0
      });
    });
  }

  // --- TEXTURE ENGINE (HIGH-RES PROCEDURAL CS2 SKINS) ---
  // --- TEXTURE ENGINE (ULTRA-HD 1024 PROCEDURAL & STEAM DECAL COMPOSITOR) ---
  const skinCanvasCache = {};
  const texLoader = new THREE.TextureLoader();

  function generateSkinTexture(skin) {
    const key = (skin.id || (skin.weapon + '_' + skin.name)) + (skin.img ? '_img' : '');
    if (skinCanvasCache[key]) return skinCanvasCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const nameLower = ((skin.weapon || '') + ' ' + (skin.name || '')).toLowerCase();

    // Side Decal Texture (From local PNG or Steam CDN image)
    let decalTexture = null;
    if (skin.img) {
      decalTexture = texLoader.load(skin.img);
      decalTexture.generateMipmaps = true;
      decalTexture.minFilter = THREE.LinearMipmapLinearFilter;
      decalTexture.magFilter = THREE.LinearFilter;
    }

    const drawPattern = (imgElement) => {
      ctx.clearRect(0, 0, 1024, 1024);

      if (nameLower.includes('wild lotus') || nameLower.includes('lotus')) {
        // --- AK-47 WILD LOTUS (CS2 MASTERPIECE FLORAL ARTWORK) ---
        // 1. Deep Emerald Green & Forest Shading Gradient
        const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
        grad.addColorStop(0, '#0f3818');
        grad.addColorStop(0.35, '#1e7239');
        grad.addColorStop(0.7, '#2ba854');
        grad.addColorStop(1, '#0c2e14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        // 2. Teak Wood Accent Framing Borders (Top & Bottom Rails)
        ctx.fillStyle = '#d7b377';
        ctx.fillRect(0, 0, 1024, 52);
        ctx.fillRect(0, 972, 1024, 52);
        ctx.fillStyle = '#b88a50';
        ctx.fillRect(0, 52, 1024, 10);
        ctx.fillRect(0, 962, 1024, 10);

        // 3. Thick Swirling Vine Curves with Shading
        ctx.lineWidth = 16;
        ctx.strokeStyle = '#2e7d32';
        ctx.beginPath();
        ctx.moveTo(0, 320);
        ctx.bezierCurveTo(280, 180, 600, 480, 1024, 260);
        ctx.stroke();

        ctx.lineWidth = 9;
        ctx.strokeStyle = '#81c784';
        ctx.beginPath();
        ctx.moveTo(0, 318);
        ctx.bezierCurveTo(280, 178, 600, 478, 1024, 258);
        ctx.stroke();

        ctx.lineWidth = 14;
        ctx.strokeStyle = '#1b5e20';
        ctx.beginPath();
        ctx.moveTo(0, 680);
        ctx.bezierCurveTo(340, 850, 720, 520, 1024, 760);
        ctx.stroke();

        // 4. Detailed Leaves along Vines
        const drawLeaf = (lx, ly, rot, scale) => {
          ctx.save();
          ctx.translate(lx, ly);
          ctx.rotate(rot);
          ctx.scale(scale, scale);
          ctx.fillStyle = '#4caf50';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(30, -25, 60, 0);
          ctx.quadraticCurveTo(30, 25, 0, 0);
          ctx.fill();
          ctx.strokeStyle = '#2e7d32';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(55, 0);
          ctx.stroke();
          ctx.restore();
        };

        drawLeaf(200, 250, 0.4, 1.2);
        drawLeaf(380, 360, -0.6, 1.4);
        drawLeaf(580, 410, 0.8, 1.3);
        drawLeaf(750, 300, -0.3, 1.1);
        drawLeaf(280, 750, 0.5, 1.3);
        drawLeaf(520, 670, -0.7, 1.4);

        // 5. Large Blooming Wild Lotus Flower (Central Receiver)
        const drawLotusFlower = (cx, cy, radius, mainCol, innerCol, coreCol) => {
          ctx.fillStyle = 'rgba(10, 40, 15, 0.5)';
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 1.1, 0, Math.PI * 2);
          ctx.fill();

          const petals = 12;
          for (let p = 0; p < petals; p++) {
            const angle = (p / petals) * Math.PI * 2;
            const px = cx + Math.cos(angle) * (radius * 0.7);
            const py = cy + Math.sin(angle) * (radius * 0.7);
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.fillStyle = mainCol;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.35, radius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          for (let p = 0; p < 8; p++) {
            const angle = (p / 8) * Math.PI * 2 + 0.25;
            const px = cx + Math.cos(angle) * (radius * 0.45);
            const py = cy + Math.sin(angle) * (radius * 0.45);
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.fillStyle = innerCol;
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.28, radius * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          ctx.fillStyle = coreCol;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ff8f00';
          for (let s = 0; s < 16; s++) {
            const sang = (s / 16) * Math.PI * 2;
            const sx = cx + Math.cos(sang) * (radius * 0.24);
            const sy = cy + Math.sin(sang) * (radius * 0.24);
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        };

        // Center blooming lotus (Orange-Red)
        drawLotusFlower(560, 480, 140, '#d32f2f', '#ff5722', '#ffc107');
        // Pink / Magenta Lily on the stock
        drawLotusFlower(220, 360, 95, '#c2185b', '#e91e63', '#ffd54f');
        // Secondary buds
        drawLotusFlower(850, 680, 80, '#e64a19', '#ff7043', '#ffe082');
        drawLotusFlower(820, 280, 75, '#ad1457', '#d81b60', '#ffca28');

        // Gold Stamen Specks
        ctx.fillStyle = '#ffca28';
        for (let b = 0; b < 60; b++) {
          ctx.beginPath();
          ctx.arc((b * 137) % 1024, (b * 193) % 1024, 4 + (b % 4), 0, Math.PI * 2);
          ctx.fill();
        }

      } else if (nameLower.includes('asiimov')) {
        // --- ASIIMOV ---
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(0, 120); ctx.lineTo(520, 0); ctx.lineTo(680, 0); ctx.lineTo(160, 520); ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(240, 1024); ctx.lineTo(760, 504); ctx.lineTo(920, 504); ctx.lineTo(400, 1024); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#15171e';
        ctx.beginPath();
        ctx.moveTo(560, 0); ctx.lineTo(1024, 0); ctx.lineTo(1024, 360); ctx.lineTo(760, 360); ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, 720, 1024, 90);

        ctx.fillStyle = '#15171e';
        ctx.font = '900 76px monospace';
        ctx.fillText('ASIIMOV // 01', 80, 640);
        ctx.fillStyle = '#ff5500';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('HIGH VOLTAGE // SPEC-A', 80, 700);

      } else if (nameLower.includes('dragon lore') || nameLower.includes('lore')) {
        // --- DRAGON LORE ---
        const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
        grad.addColorStop(0, '#e5c158'); grad.addColorStop(0.5, '#bfa038'); grad.addColorStop(1, '#5c4813');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.strokeStyle = 'rgba(255, 240, 180, 0.45)';
        ctx.lineWidth = 8;
        for (let y = 80; y < 1024; y += 90) {
          ctx.beginPath(); ctx.arc(512, y, 130, 0, Math.PI); ctx.stroke();
        }

        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.moveTo(120, 800); ctx.bezierCurveTo(300, 360, 640, 440, 880, 240);
        ctx.bezierCurveTo(720, 520, 600, 760, 320, 880); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff9800';
        ctx.beginPath(); ctx.arc(880, 240, 64, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 64px Georgia, serif';
        ctx.fillText('DRAGON LORE', 120, 180);

      } else if (nameLower.includes('howl')) {
        // --- HOWL ---
        const grad = ctx.createRadialGradient(512, 512, 80, 512, 512, 720);
        grad.addColorStop(0, '#e53935'); grad.addColorStop(0.55, '#8e0000'); grad.addColorStop(1, '#110202');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.fillStyle = '#ff7961';
        ctx.beginPath();
        ctx.moveTo(512, 220); ctx.lineTo(700, 560); ctx.lineTo(512, 780); ctx.lineTo(324, 560); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '900 84px Impact, sans-serif';
        ctx.fillText('THE HOWL', 320, 940);

      } else if (nameLower.includes('printstream')) {
        // --- PRINTSTREAM ---
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 1024, 1024);

        const holo = ctx.createLinearGradient(0, 0, 1024, 1024);
        holo.addColorStop(0, 'rgba(0, 255, 230, 0.25)');
        holo.addColorStop(0.5, 'rgba(255, 0, 180, 0.25)');
        holo.addColorStop(1, 'rgba(255, 255, 0, 0.25)');
        ctx.fillStyle = holo;
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(80, 160, 864, 28);

        ctx.font = '900 136px sans-serif';
        ctx.fillText('X X', 160, 460);

        ctx.font = 'bold 48px monospace';
        ctx.fillText('PROJECT: PRINTSTREAM', 160, 580);
        ctx.fillText('STAT: VER 2.0.4 ACTIVE', 160, 648);

      } else if (nameLower.includes('doppler') || nameLower.includes('sapphire')) {
        // --- DOPPLER SAPPHIRE ---
        const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
        grad.addColorStop(0, '#0d47a1'); grad.addColorStop(0.5, '#2979ff'); grad.addColorStop(1, '#651fff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1024, 1024);

        for (let s = 0; s < 50; s++) {
          ctx.fillStyle = 'rgba(0, 229, 255, 0.75)';
          ctx.beginPath();
          ctx.arc((s * 197) % 1024, (s * 121) % 1024, 24 + (s * 5) % 56, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 72px sans-serif';
        ctx.fillText('DOPPLER SAPPHIRE', 120, 900);

      } else {
        // --- GENERAL CUSTOM SKIN ---
        const rarityCol = skin.rarityColor || '#de9b35';
        ctx.fillStyle = '#131720';
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.fillStyle = rarityCol;
        ctx.fillRect(0, 180, 1024, 52);
        ctx.fillRect(0, 740, 1024, 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 80px sans-serif';
        ctx.fillText((skin.weapon || 'CS2').toUpperCase(), 80, 420);

        ctx.fillStyle = rarityCol;
        ctx.font = 'bold 64px sans-serif';
        ctx.fillText((skin.name || 'CUSTOM SKIN').toUpperCase(), 80, 520);
      }

      // If Steam image element is provided, composite it
      if (imgElement) {
        try {
          ctx.save();
          ctx.globalAlpha = 0.95;
          ctx.drawImage(imgElement, 120, 240, 784, 544);
          ctx.restore();
        } catch (e) {}
      }
    };

    drawPattern(null);

    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.wrapS = THREE.RepeatWrapping;
    canvasTexture.wrapT = THREE.RepeatWrapping;

    if (skin.img) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        drawPattern(img);
        canvasTexture.needsUpdate = true;
      };
      img.src = skin.img;
    }

    const result = {
      canvasTex: canvasTexture,
      decalTex: decalTexture || canvasTexture
    };

    skinCanvasCache[key] = result;
    return result;
  }

  // --- 3D VIEWMODEL WITH DETAILED AK-47 & GLOVED ARMS ---
  function buildWeaponViewmodel() {
    viewmodelRig = new THREE.Group();
    camera.add(viewmodelRig);
    scene.add(camera);

    weaponMesh = new THREE.Group();
    weaponMesh.position.set(0.28, -0.28, -0.6);
    viewmodelRig.add(weaponMesh);

    muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 8);
    muzzleFlashLight.position.set(0, 0.02, -0.75);
    weaponMesh.add(muzzleFlashLight);

    const flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0 });
    muzzleSprite = new THREE.Mesh(flashGeo, flashMat);
    muzzleSprite.position.set(0, 0.02, -0.75);
    weaponMesh.add(muzzleSprite);

    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.45, metalness: 0.85 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xde9b35, roughness: 0.25, metalness: 0.9 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.8 }); // CS2 Tactical Gloves
    const leatherSleeveMat = new THREE.MeshStandardMaterial({ color: 0x543d2b, roughness: 0.75 }); // Brown Leather Jacket Sleeve

    // ==========================================
    // 1. SLOT 1: HIGH-POLYGON REALISTIC AK-47
    // ==========================================
    rifleGroup = new THREE.Group();
    weaponMesh.add(rifleGroup);

    const rifleSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.45, side: THREE.DoubleSide });
    rifleMaterials.push(rifleSkinMat);

    // Stamped Receiver Body
    const rReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.48), rifleSkinMat);
    rReceiver.position.set(0, 0, 0);
    rifleGroup.add(rReceiver);

    // Top Dust Cover Plate
    const rTopDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.072, 0.46), rifleSkinMat);
    rTopDecal.rotation.x = -Math.PI / 2;
    rTopDecal.position.set(0, 0.056, 0);
    rifleGroup.add(rTopDecal);

    // Upper Gas Tube & Handguard (Patterned with skin)
    const rUpperHandguard = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.24, 12), rifleSkinMat);
    rUpperHandguard.rotation.x = Math.PI / 2;
    rUpperHandguard.position.set(0, 0.038, -0.32);
    rifleGroup.add(rUpperHandguard);

    // Lower Wooden Handguard (Patterned with skin)
    const rLowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.07, 0.24), rifleSkinMat);
    rLowerHandguard.position.set(0, -0.015, -0.32);
    rifleGroup.add(rLowerHandguard);

    // Barrel (Gunmetal steel)
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 12), darkMetalMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.015, -0.48);
    rifleGroup.add(rBarrel);

    // Gas Block & Front Sight Tower
    const rGasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.05), darkMetalMat);
    rGasBlock.position.set(0, 0.045, -0.44);
    rifleGroup.add(rGasBlock);

    const rFrontSight = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 8), darkMetalMat);
    rFrontSight.position.set(0, 0.065, -0.66);
    rifleGroup.add(rFrontSight);

    // Slanted Muzzle Brake
    const rMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.08, 8), darkMetalMat);
    rMuzzle.rotation.x = Math.PI / 2;
    rMuzzle.position.set(0, 0.015, -0.74);
    rifleGroup.add(rMuzzle);

    // Cleaning Rod under the barrel
    const rRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.44, 8), darkMetalMat);
    rRod.rotation.x = Math.PI / 2;
    rRod.position.set(0, -0.018, -0.46);
    rifleGroup.add(rRod);

    // Authentic Curved AK Banana Magazine (3 segments with skin texture)
    const magSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.35, side: THREE.DoubleSide });
    rifleMaterials.push(magSkinMat);

    const magGroup = new THREE.Group();
    magGroup.position.set(0, -0.06, -0.06);
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.1, 0.09), magSkinMat);
    m1.rotation.x = -0.15;
    m1.position.set(0, -0.04, 0);
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.1, 0.085), magSkinMat);
    m2.rotation.x = -0.32;
    m2.position.set(0, -0.12, 0.02);
    const m3 = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.08, 0.08), magSkinMat);
    m3.rotation.x = -0.48;
    m3.position.set(0, -0.19, 0.055);
    magGroup.add(m1, m2, m3);
    rifleGroup.add(magGroup);

    // Ergonomic Wooden Pistol Grip
    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.16, 0.075), rifleSkinMat);
    rGrip.rotation.x = 0.38;
    rGrip.position.set(0, -0.12, 0.16);
    rifleGroup.add(rGrip);

    // Slanted Wooden Buttstock (With shoulder recoil pad)
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.13, 0.36), rifleSkinMat);
    rStock.rotation.x = -0.08;
    rStock.position.set(0, -0.03, 0.4);
    rifleGroup.add(rStock);

    const rButtpad = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.14, 0.03), darkMetalMat);
    rButtpad.position.set(0, -0.045, 0.58);
    rifleGroup.add(rButtpad);

    // Rear Tangent Sight Base & Adjustable Leaf
    const rSightBase = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.09), darkMetalMat);
    rSightBase.position.set(0, 0.055, -0.22);
    rifleGroup.add(rSightBase);

    const rSightLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.015, 0.08), darkMetalMat);
    rSightLeaf.rotation.x = -0.12;
    rSightLeaf.position.set(0, 0.075, -0.22);
    rifleGroup.add(rSightLeaf);

    // Steel Bolt Carrier & Curved Charging Handle (Right side)
    const rBolt = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.09), new THREE.MeshStandardMaterial({ color: 0x8a9299, metalness: 0.9, roughness: 0.2 }));
    rBolt.position.set(0.038, 0.015, -0.05);
    rifleGroup.add(rBolt);

    const rHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.045, 8), darkMetalMat);
    rHandle.rotation.z = Math.PI / 2;
    rHandle.position.set(0.062, 0.018, -0.04);
    rifleGroup.add(rHandle);

    // Steel Trigger Guard & Curved Trigger
    const rTriggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 12, Math.PI), darkMetalMat);
    rTriggerGuard.rotation.x = Math.PI;
    rTriggerGuard.position.set(0, -0.055, 0.08);
    rifleGroup.add(rTriggerGuard);

    const rTrigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.03, 0.01), darkMetalMat);
    rTrigger.rotation.x = -0.3;
    rTrigger.position.set(0, -0.045, 0.08);
    rifleGroup.add(rTrigger);

    // FULL-LENGTH HIGH-RES SIDE DECALS (FACING BOTH SIDES FOR INSPECT)
    rifleSideDecalMat = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.32,
      metalness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide
    });

    // Left Decal: Faces player camera in 1st person
    const rSideDecalLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.36), rifleSideDecalMat);
    rSideDecalLeft.rotation.y = -Math.PI / 2;
    rSideDecalLeft.position.set(-0.0388, -0.06, -0.08);
    rifleGroup.add(rSideDecalLeft);

    // Right Decal: Faces outward for inspect turnaround
    const rSideDecalRight = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.36), rifleSideDecalMat);
    rSideDecalRight.rotation.y = Math.PI / 2;
    rSideDecalRight.scale.x = -1;
    rSideDecalRight.position.set(0.0388, -0.06, -0.08);
    rifleGroup.add(rSideDecalRight);

    // ==========================================
    // 2. GLOVED ARMS & SLEEVES (CS2 AUTHENTIC)
    // ==========================================
    const armsGroup = new THREE.Group();
    rifleGroup.add(armsGroup);

    // Tactical Knuckle Protective Armor Plates on Gloves
    const rKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.5, metalness: 0.4 }));
    rKnuckles.position.set(0.04, -0.08, 0.16);
    rKnuckles.rotation.set(0.3, 0.1, -0.2);
    armsGroup.add(rKnuckles);

    // Right Hand (Holding Pistol Grip & Trigger)
    const rHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.12), gloveMat);
    rHand.rotation.set(0.3, 0.1, -0.2);
    rHand.position.set(0.04, -0.12, 0.16);
    armsGroup.add(rHand);

    const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.45, 12), leatherSleeveMat);
    rForearm.rotation.set(0.8, -0.2, 0.5);
    rForearm.position.set(0.18, -0.28, 0.35);
    armsGroup.add(rForearm);

    // Tactical Knuckle Plate Left Hand
    const lKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.087, 0.025, 0.04), new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.5, metalness: 0.4 }));
    lKnuckles.position.set(-0.06, -0.015, -0.3);
    lKnuckles.rotation.set(-0.1, -0.3, 0.4);
    armsGroup.add(lKnuckles);

    // Left Hand (Cradling Lower Wooden Handguard)
    const lHand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.08, 0.14), gloveMat);
    lHand.rotation.set(-0.1, -0.3, 0.4);
    lHand.position.set(-0.06, -0.04, -0.3);
    armsGroup.add(lHand);

    const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.5, 12), leatherSleeveMat);
    lForearm.rotation.set(0.4, 0.3, -0.6);
    lForearm.position.set(-0.25, -0.25, -0.1);
    armsGroup.add(lForearm);

    // ==========================================
    // 3. SLOT 2: PISTOL (DESERT EAGLE)
    // ==========================================
    pistolGroup = new THREE.Group();
    pistolGroup.position.set(0, 0.02, 0.1);
    pistolGroup.visible = false;
    weaponMesh.add(pistolGroup);

    const pistolSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.55, side: THREE.DoubleSide });
    pistolMaterials.push(pistolSkinMat);

    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.34), pistolSkinMat);
    pSlide.position.set(0, 0.04, -0.08);
    pistolGroup.add(pSlide);

    const pTopDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.32), pistolSkinMat);
    pTopDecal.rotation.x = -Math.PI / 2;
    pTopDecal.position.set(0, 0.078, -0.08);
    pistolGroup.add(pTopDecal);

    const pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12), darkMetalMat);
    pBarrel.rotation.x = Math.PI / 2;
    pBarrel.position.set(0, 0.04, -0.27);
    pistolGroup.add(pBarrel);

    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.28), darkMetalMat);
    pFrame.position.set(0, -0.01, -0.06);
    pistolGroup.add(pFrame);

    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), pistolSkinMat);
    pGrip.rotation.x = 0.28;
    pGrip.position.set(0, -0.09, 0.02);
    pistolGroup.add(pGrip);

    pistolSideDecalMat = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.28,
      metalness: 0.35,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide
    });
    const pSideDecalLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), pistolSideDecalMat);
    pSideDecalLeft.rotation.y = -Math.PI / 2;
    pSideDecalLeft.position.set(-0.034, 0.0, -0.06);
    pistolGroup.add(pSideDecalLeft);

    const pSideDecalRight = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), pistolSideDecalMat);
    pSideDecalRight.rotation.y = Math.PI / 2;
    pSideDecalRight.scale.x = -1;
    pSideDecalRight.position.set(0.034, 0.0, -0.06);
    pistolGroup.add(pSideDecalRight);

    // ==========================================
    // 4. SLOT 3: KNIFE (KARAMBIT)
    // ==========================================
    knifeGroup = new THREE.Group();
    knifeGroup.position.set(-0.04, -0.02, 0.12);
    knifeGroup.visible = false;
    weaponMesh.add(knifeGroup);

    const knifeSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.85, side: THREE.DoubleSide });
    knifeMaterials.push(knifeSkinMat);

    const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.24), knifeSkinMat);
    kBlade.rotation.x = 0.45;
    kBlade.rotation.z = -0.15;
    kBlade.position.set(0, 0.06, -0.16);
    knifeGroup.add(kBlade);

    knifeSideDecalMat = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.05,
      roughness: 0.15,
      metalness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      side: THREE.DoubleSide
    });
    const kSideDecalLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), knifeSideDecalMat);
    kSideDecalLeft.rotation.set(0.45, -Math.PI / 2, -0.15);
    kSideDecalLeft.position.set(-0.012, 0.06, -0.16);
    knifeGroup.add(kSideDecalLeft);

    const kHandle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.16), darkMetalMat);
    kHandle.rotation.x = -0.3;
    kHandle.position.set(0, -0.04, -0.02);
    knifeGroup.add(kHandle);

    const kRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 16), goldAccentMat);
    kRing.position.set(0, -0.1, 0.07);
    knifeGroup.add(kRing);
  }

  // --- APPLY SKIN TO SLOT ---
  function applySkinToSlot(slotNum, skin) {
    if (!skin) return;
    STATE.slots[slotNum].skin = skin;
    STATE.slots[slotNum].weapon = skin.weapon || STATE.slots[slotNum].weapon;
    STATE.slots[slotNum].name = skin.name || STATE.slots[slotNum].name;
    STATE.slots[slotNum].rarity = skin.rarity || 'covert';
    STATE.slots[slotNum].rarityColor = skin.rarityColor || '#de9b35';
    STATE.slots[slotNum].price = skin.price || STATE.slots[slotNum].price;
    STATE.slots[slotNum].img = skin.img || STATE.slots[slotNum].img;

    const res = generateSkinTexture(skin);

    if (slotNum === 1) {
      rifleMaterials.forEach(m => { m.map = res.canvasTex; m.color.setHex(0xffffff); m.needsUpdate = true; });
      if (rifleSideDecalMat) {
        rifleSideDecalMat.map = res.decalTex;
        rifleSideDecalMat.needsUpdate = true;
      }
    } else if (slotNum === 2) {
      pistolMaterials.forEach(m => { m.map = res.canvasTex; m.color.setHex(0xffffff); m.needsUpdate = true; });
      if (pistolSideDecalMat) {
        pistolSideDecalMat.map = res.decalTex;
        pistolSideDecalMat.needsUpdate = true;
      }
    } else if (slotNum === 3) {
      knifeMaterials.forEach(m => { m.map = res.canvasTex; m.color.setHex(0xffffff); m.needsUpdate = true; });
      if (knifeSideDecalMat) {
        knifeSideDecalMat.map = res.decalTex;
        knifeSideDecalMat.needsUpdate = true;
      }
    }

    if (STATE.currentSlot === slotNum) {
      updateWeaponHUD();
      updateInspectCard(STATE.slots[slotNum]);
    }
  }

  // --- SWITCH SLOTS (1, 2, 3) ---
  function switchSlot(slotNum) {
    if (slotNum < 1 || slotNum > 3) return;
    if (STATE.currentSlot === slotNum && !STATE.isSwitching) return;

    initAudio();
    if (STATE.isScoped) toggleScope(false);

    STATE.currentSlot = slotNum;
    STATE.isSwitching = true;
    STATE.isReloading = false;
    STATE.sprayCount = 0;
    switchOffset = 0.35;

    playDeploySound(slotNum);

    if (rifleGroup) rifleGroup.visible = (slotNum === 1);
    if (pistolGroup) pistolGroup.visible = (slotNum === 2);
    if (knifeGroup) knifeGroup.visible = (slotNum === 3);

    if (muzzleFlashLight && muzzleSprite) {
      if (slotNum === 1) {
        muzzleFlashLight.position.set(0, 0.02, -0.75);
        muzzleSprite.position.set(0, 0.02, -0.75);
      } else if (slotNum === 2) {
        muzzleFlashLight.position.set(0, 0.06, -0.28);
        muzzleSprite.position.set(0, 0.06, -0.28);
      }
    }

    [1, 2, 3].forEach(s => {
      const el = document.getElementById(`slot-item-${s}`);
      if (el) {
        if (s === slotNum) el.classList.add('active');
        else el.classList.remove('active');
      }
    });

    updateWeaponHUD();
    updateInspectCard(STATE.slots[slotNum]);

    setTimeout(() => {
      STATE.isSwitching = false;
    }, 280);
  }

  // --- TOGGLE SNIPER SCOPE (CHUỘT PHẢI) ---
  function toggleScope(forcedState) {
    initAudio();
    const targetState = (typeof forcedState === 'boolean') ? forcedState : !STATE.isScoped;
    STATE.isScoped = targetState;

    playScopeSound();

    const scopeOverlay = document.getElementById('sniper-scope');
    const crosshair = document.getElementById('crosshair');

    if (STATE.isScoped) {
      if (scopeOverlay) scopeOverlay.classList.remove('hidden');
      if (crosshair) crosshair.style.opacity = '0';
    } else {
      if (scopeOverlay) scopeOverlay.classList.add('hidden');
      if (crosshair) crosshair.style.opacity = '1';
    }
  }

  function updateWeaponHUD() {
    const curSlot = STATE.slots[STATE.currentSlot];
    const wpnEl = document.getElementById('hud-wpn-name');
    const skinEl = document.getElementById('hud-skin-name');
    const bannerEl = document.getElementById('hud-weapon-banner');
    const ammoBox = document.getElementById('hud-ammo-box');

    if (wpnEl) wpnEl.textContent = curSlot.weapon;
    if (skinEl) skinEl.textContent = curSlot.name;
    if (bannerEl) bannerEl.style.borderLeftColor = curSlot.rarityColor || '#de9b35';

    if (ammoBox) {
      if (STATE.currentSlot === 3) {
        ammoBox.innerHTML = '<span style="font-size:1.1rem;font-weight:800;color:#ffd700;">⚔ CẬN CHIẾN</span>';
      } else {
        ammoBox.innerHTML = `
          <span id="hud-ammo-cur" class="ammo-cur">${curSlot.ammo}</span>
          <span class="ammo-slash">/</span>
          <span id="hud-ammo-max" class="ammo-max">${curSlot.reserveAmmo}</span>
        `;
      }
    }
  }

  function updateInspectCard(item) {
    const insImg = document.getElementById('inspect-img');
    const insName = document.getElementById('inspect-name');
    const insWear = document.getElementById('inspect-wear');
    const insRarity = document.getElementById('inspect-rarity');
    const insPrice = document.getElementById('inspect-price');

    if (insImg && item.img) insImg.src = item.img;
    if (insName) insName.textContent = `${item.weapon || ''} | ${item.name || ''}`;
    if (insWear) insWear.textContent = `${item.wear || 'Factory New'} (Float: 0.0142)`;
    if (insRarity) {
      insRarity.textContent = (item.rarity || 'Covert').toUpperCase();
      insRarity.style.color = item.rarityColor || '#eb4b4b';
      insRarity.style.background = (item.rarityColor || '#eb4b4b') + '26';
    }
    if (insPrice) insPrice.textContent = item.price ? `$${Number(item.price).toLocaleString('en-US', {minimumFractionDigits:2})}` : '$12,500.00';
  }

  // --- FULL-AUTO SPRAY & SINGLE SHOT SYSTEM ---
  function fireSingleBullet() {
    if (STATE.isSwitching || STATE.isReloading) return;
    initAudio();

    const cur = STATE.slots[STATE.currentSlot];

    if (STATE.currentSlot === 3) {
      // KNIFE SLASH
      STATE.shots++;
      slashProgress = 1.0;
      playKnifeSlashSound();

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycaster.far = 2.8;

      const hitObjects = [];
      targets.forEach(t => { if (!t.isDead) hitObjects.push(t.head, t.torso); });

      const intersects = raycaster.intersectObjects(hitObjects);
      if (intersects.length > 0) {
        const hit = intersects[0];
        const target = targets[hit.object.userData.parentIndex];
        STATE.hits++;
        playKnifeHitSound();

        const isHead = hit.object.userData.type === 'head';
        const dmg = isHead ? cur.damageHead : cur.damageBody;
        showHitmarker(isHead, isHead ? `KNIFE CRIT! +${dmg}` : `KNIFE HIT +${dmg}`);
        STATE.score += dmg;
        target.health -= dmg;
        if (target.health <= 0 && !target.isDead) killTarget(target);
      }
      updateAccuracy();
      return;
    }

    // GUN FIRE
    if (cur.ammo <= 0) {
      playDryFireSound();
      return;
    }

    cur.ammo--;
    STATE.shots++;
    STATE.sprayCount++;
    updateWeaponHUD();

    if (STATE.currentSlot === 1) {
      playRifleShotSound();

      // CS2 AK Spray Recoil Progression
      const sprayY = Math.min(0.06, 0.02 + (STATE.sprayCount * 0.003));
      const sprayX = (Math.sin(STATE.sprayCount * 0.8) * 0.02);

      recoilOffset.z = 0.08;
      recoilOffset.y = sprayY;
      recoilRot.x = 0.1 + Math.min(0.08, STATE.sprayCount * 0.004);
      recoilRot.y = sprayX;

      // Subtle screen recoil
      player.pitch += 0.008;
    } else {
      playPistolShotSound();
      recoilOffset.z = 0.09;
      recoilOffset.y = 0.04;
      recoilRot.x = 0.18;
      recoilRot.y = (Math.random() - 0.5) * 0.03;
      player.pitch += 0.012;
    }

    // Muzzle Flash
    muzzleFlashLight.intensity = 3.8;
    muzzleSprite.material.opacity = 1;
    setTimeout(() => {
      muzzleFlashLight.intensity = 0;
      muzzleSprite.material.opacity = 0;
    }, 40);

    // Bullet Raycast Hit
    const raycaster = new THREE.Raycaster();
    // When scoped: laser precision; when spraying: slight spread
    const spreadFactor = STATE.isScoped ? 0.001 : (STATE.currentSlot === 1 ? Math.min(0.04, STATE.sprayCount * 0.003) : 0.008);
    const spreadX = (Math.random() - 0.5) * spreadFactor;
    const spreadY = (Math.random() - 0.5) * spreadFactor;

    raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

    const hitObjects = [];
    targets.forEach(t => { if (!t.isDead) hitObjects.push(t.head, t.torso); });

    const intersects = raycaster.intersectObjects(hitObjects);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const target = targets[hit.object.userData.parentIndex];
      STATE.hits++;

      if (hit.object.userData.type === 'head') {
        playHeadshotSound();
        showHitmarker(true, `HEADSHOT! +${cur.damageHead}`);
        STATE.score += cur.damageHead;
        target.health = 0;
      } else {
        playBodyHitSound();
        showHitmarker(false, `HIT +${cur.damageBody}`);
        STATE.score += cur.damageBody;
        target.health -= cur.damageBody;
      }

      if (target.health <= 0 && !target.isDead) {
        killTarget(target);
      }
    }

    updateAccuracy();
  }

  function killTarget(target) {
    target.isDead = true;
    target.respawnTimer = 1.2;
    target.group.rotation.x = -Math.PI / 2;
    target.group.position.y = 0.2;
  }

  function showHitmarker(isHeadshot, text) {
    const crosshair = document.getElementById('crosshair');
    const indicator = document.getElementById('hit-indicator');

    if (crosshair) {
      crosshair.classList.add('hit');
      setTimeout(() => crosshair.classList.remove('hit'), 80);
    }
    if (indicator) {
      indicator.textContent = text;
      indicator.style.color = isHeadshot ? '#ffdd00' : '#ff3333';
      indicator.classList.add('show');
      setTimeout(() => indicator.classList.remove('show'), 400);
    }
  }

  function reload() {
    if (STATE.currentSlot === 3) return;
    const cur = STATE.slots[STATE.currentSlot];
    if (STATE.isReloading || cur.ammo === cur.maxAmmo) return;

    initAudio();
    if (STATE.isScoped) toggleScope(false);

    STATE.isReloading = true;
    STATE.sprayCount = 0;
    playReloadSound();

    recoilOffset.y = -0.2;
    recoilRot.z = -0.3;

    setTimeout(() => {
      cur.ammo = cur.maxAmmo;
      STATE.isReloading = false;
      updateWeaponHUD();
    }, 1500);
  }

  // --- INSPECT ANIMATION (MATCHING CS2 PHOTO INSPECT POSE) ---
  function triggerInspect() {
    if (STATE.isInspecting) return;
    STATE.isInspecting = true;
    inspectTarget = 1.0;

    const insCard = document.getElementById('inspect-card');
    if (insCard) insCard.classList.remove('hidden');

    setTimeout(() => {
      inspectTarget = 0;
      setTimeout(() => {
        STATE.isInspecting = false;
        if (insCard) insCard.classList.add('hidden');
      }, 1000);
    }, 2400);
  }

  function updateAccuracy() {
    const accVal = document.getElementById('hud-acc-val');
    const scoreVal = document.getElementById('hud-score-val');
    if (STATE.shots > 0) {
      STATE.accuracy = Math.round((STATE.hits / STATE.shots) * 100);
    }
    if (accVal) accVal.textContent = `${STATE.accuracy}%`;
    if (scoreVal) scoreVal.textContent = STATE.score;
  }

  // --- INVENTORY & ACCOUNT INTEGRATION ---
  function loadUserInventory() {
    let currentAccount = localStorage.getItem('cs2-current') || 'Khách';
    STATE.user = currentAccount;

    const userChip = document.getElementById('hud-user-name');
    if (userChip) userChip.textContent = currentAccount;

    let inv = [];
    try {
      const stored = localStorage.getItem(`cs2-inv_${currentAccount}`) || localStorage.getItem('cs2-inv');
      if (stored) inv = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading inventory', e);
    }

    const userSkins = inv.map((item, i) => {
      const parts = (item.name || '').split('|').map(s => s.trim());
      const wpn = parts[0] || 'Vũ khí';
      const skinName = parts[1] || item.name;

      const rarityMap = {
        covert: '#eb4b4b',
        classified: '#d32ce6',
        restricted: '#8847ff',
        'mil-spec': '#4b69ff',
        special: '#ffd700'
      };

      return {
        id: `user-${i}`,
        slot: detectSlot({ weapon: wpn, name: skinName, type: item.type }),
        weapon: wpn,
        name: skinName,
        wear: item.wear || 'Factory New',
        rarity: item.rarity || 'covert',
        rarityColor: rarityMap[item.rarity] || '#de9b35',
        img: item.image || item.img,
        price: item.price || 0
      };
    }).filter(s => s.img);

    STATE.inventory = [...userSkins, ...DEFAULT_SKINS];

    applySkinToSlot(1, DEFAULT_SKINS[0]);
    applySkinToSlot(2, DEFAULT_SKINS.find(s => s.slot === 2));
    applySkinToSlot(3, DEFAULT_SKINS.find(s => s.slot === 3));

    initSkinDrawer();
  }

  function initSkinDrawer() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        STATE.activeTab = e.currentTarget.dataset.tab;
        renderSkinDrawerList();
      });
    });

    renderSkinDrawerList();
  }

  function renderSkinDrawerList() {
    const listEl = document.getElementById('skin-drawer-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const filtered = STATE.inventory.filter(skin => {
      if (STATE.activeTab === 'all') return true;
      return String(skin.slot) === String(STATE.activeTab);
    });

    filtered.forEach(skin => {
      const isEquipped = STATE.slots[skin.slot]?.name === skin.name && STATE.slots[skin.slot]?.weapon === skin.weapon;

      const item = document.createElement('div');
      item.className = 'skin-item' + (isEquipped ? ' equipped' : '');
      item.onclick = () => {
        applySkinToSlot(skin.slot, skin);
        switchSlot(skin.slot);
        renderSkinDrawerList();
        triggerInspect();
      };

      const slotLabel = skin.slot === 1 ? 'Súng dài' : (skin.slot === 2 ? 'Súng ngắn' : 'Dao');

      item.innerHTML = `
        <img class="skin-thumb" src="${skin.img}" alt="${skin.name}" />
        <div class="skin-details">
          <div class="skin-wpn">${skin.weapon} <span style="font-size:0.7rem;color:#8fa0b5;">[Phím ${skin.slot} - ${slotLabel}]</span></div>
          <div class="skin-lbl" style="color:${skin.rarityColor}">${skin.name}</div>
        </div>
        <span class="skin-badge">${isEquipped ? 'Đang dùng' : 'Trang bị'}</span>
      `;
      listEl.appendChild(item);
    });
  }

  // --- CONTROLS & POINTER LOCK ---
  let isPointerLocked = false;

  function initControls() {
    const startBtn = document.getElementById('btn-start-game');
    const resumeBtn = document.getElementById('btn-resume-game');
    const startOverlay = document.getElementById('start-screen');
    const pauseOverlay = document.getElementById('pause-screen');
    const drawer = document.getElementById('skin-drawer');
    const drawerOpenBtn = document.getElementById('btn-open-drawer');
    const drawerCloseBtn = document.getElementById('btn-close-drawer');

    const lockPointer = () => {
      initAudio();
      document.body.requestPointerLock();
    };

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        startOverlay.classList.add('hidden');
        lockPointer();
      });
    }

    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        pauseOverlay.classList.add('hidden');
        lockPointer();
      });
    }

    if (drawerOpenBtn) {
      drawerOpenBtn.addEventListener('click', () => {
        document.exitPointerLock();
        drawer.classList.add('open');
      });
    }

    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
        lockPointer();
      });
    }

    document.addEventListener('pointerlockchange', () => {
      isPointerLocked = document.pointerLockElement === document.body;
      if (!isPointerLocked) {
        if (startOverlay.classList.contains('hidden') && !drawer.classList.contains('open')) {
          pauseOverlay.classList.remove('hidden');
        }
      } else {
        pauseOverlay.classList.add('hidden');
        drawer.classList.remove('open');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!isPointerLocked) return;

      // If scoped in, reduce mouse sensitivity for accurate sniping
      const sensitivity = STATE.isScoped ? 0.0009 : 0.0022;
      player.yaw -= e.movementX * sensitivity;
      player.pitch -= e.movementY * sensitivity;
      player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));

      player.swayX = THREE.MathUtils.lerp(player.swayX, -e.movementX * 0.0008, 0.2);
      player.swayY = THREE.MathUtils.lerp(player.swayY, e.movementY * 0.0008, 0.2);
    });

    // MOUSE DOWN: Chuột trái (Bắn/Sấy) & Chuột phải (Scope)
    document.addEventListener('mousedown', (e) => {
      if (!isPointerLocked) return;
      if (e.button === 0) {
        STATE.isMouseDown = true;
        fireSingleBullet();
        STATE.lastShotTime = performance.now();
      } else if (e.button === 2) {
        // Chuột phải: Bật / Tắt Ngắm (Sniper Scope)
        toggleScope();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        STATE.isMouseDown = false;
        STATE.sprayCount = 0;
      }
    });

    // Chặn menu chuột phải mặc định
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel weapon cycle
    document.addEventListener('wheel', (e) => {
      if (!isPointerLocked) return;
      let nextSlot = STATE.currentSlot;
      if (e.deltaY > 0) {
        nextSlot = (nextSlot % 3) + 1;
      } else {
        nextSlot = nextSlot === 1 ? 3 : nextSlot - 1;
      }
      switchSlot(nextSlot);
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') player.moveForward = true;
      if (e.code === 'KeyS') player.moveBackward = true;
      if (e.code === 'KeyA') player.moveLeft = true;
      if (e.code === 'KeyD') player.moveRight = true;

      if (e.code === 'Digit1') switchSlot(1);
      if (e.code === 'Digit2') switchSlot(2);
      if (e.code === 'Digit3') switchSlot(3);

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        player.isWalking = true;
      }

      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
        player.isCrouching = true;
      }

      if (e.code === 'Space' && isPointerLocked) {
        if (player.isGrounded) {
          player.vel.y = CS_PHYSICS.JUMP_IMPULSE;
          player.isGrounded = false;
          playJumpSound();
        }
      }

      if (e.code === 'KeyR' && isPointerLocked) {
        reload();
      }

      if (e.code === 'KeyF' && isPointerLocked) {
        triggerInspect();
      }

      if (e.code === 'KeyB' || e.code === 'KeyE') {
        if (isPointerLocked) {
          document.exitPointerLock();
          drawer.classList.add('open');
        } else if (drawer.classList.contains('open')) {
          drawer.classList.remove('open');
          lockPointer();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW') player.moveForward = false;
      if (e.code === 'KeyS') player.moveBackward = false;
      if (e.code === 'KeyA') player.moveLeft = false;
      if (e.code === 'KeyD') player.moveRight = false;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        player.isWalking = false;
      }

      if (e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyC') {
        player.isCrouching = false;
      }
    });
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // --- GAME LOOP & SOURCE ENGINE PHYSICS ---
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // FULL-AUTO SPRAY LOOP (Sấy liên thanh AK 30 viên khi giữ chuột trái)
    if (isPointerLocked && STATE.isMouseDown && STATE.currentSlot === 1 && !STATE.isReloading && !STATE.isSwitching) {
      const curSlot = STATE.slots[1];
      if (now - STATE.lastShotTime >= curSlot.fireRate) {
        fireSingleBullet();
        STATE.lastShotTime = now;
      }
    }

    // Camera FOV Zoom for Sniper Scope
    const targetFOV = STATE.isScoped ? 22 : 75;
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, dt * 18);
      camera.updateProjectionMatrix();
    }

    // CS2 Player Movement
    if (isPointerLocked) {
      const wishDir = new THREE.Vector3();
      if (player.moveForward) wishDir.z -= 1;
      if (player.moveBackward) wishDir.z += 1;
      if (player.moveLeft) wishDir.x -= 1;
      if (player.moveRight) wishDir.x += 1;

      const hasMoveInput = wishDir.lengthSq() > 0;
      if (hasMoveInput) {
        wishDir.normalize();
        const cosYaw = Math.cos(player.yaw);
        const sinYaw = Math.sin(player.yaw);
        const wx = wishDir.x * cosYaw - wishDir.z * sinYaw;
        const wz = wishDir.x * sinYaw + wishDir.z * cosYaw;
        wishDir.set(wx, 0, wz);
      }

      let wishSpeed = CS_PHYSICS.MAX_SPEED;
      if (player.isCrouching) {
        wishSpeed = CS_PHYSICS.CROUCH_SPEED;
      } else if (player.isWalking || STATE.isScoped) {
        wishSpeed = CS_PHYSICS.WALK_SPEED;
      }
      if (!hasMoveInput) wishSpeed = 0;

      if (player.isGrounded) {
        applyFriction(dt);
        if (hasMoveInput) {
          accelerate(wishDir, wishSpeed, CS_PHYSICS.ACCELERATION, dt);
        }
      } else {
        accelerate(wishDir, wishSpeed, CS_PHYSICS.AIR_ACCELERATION, dt);
        player.vel.y -= CS_PHYSICS.GRAVITY * dt;
      }

      player.pos.x += player.vel.x * dt;
      player.pos.z += player.vel.z * dt;
      player.pos.y += player.vel.y * dt;

      player.targetEyeHeight = player.isCrouching ? CS_PHYSICS.CROUCH_HEIGHT : CS_PHYSICS.STAND_HEIGHT;
      player.eyeHeight = THREE.MathUtils.lerp(player.eyeHeight, player.targetEyeHeight, dt * 14);

      if (player.pos.y <= player.eyeHeight) {
        if (!player.isGrounded && player.vel.y < -3.0) {
          playLandSound();
        }
        player.pos.y = player.eyeHeight;
        player.vel.y = 0;
        player.isGrounded = true;
      }

      player.pos.x = Math.max(-23.5, Math.min(23.5, player.pos.x));
      player.pos.z = Math.max(-23.5, Math.min(23.5, player.pos.z));

      const horizontalSpeed = Math.hypot(player.vel.x, player.vel.z);
      if (player.isGrounded && horizontalSpeed > 1.2) {
        const bobRate = player.isWalking ? 7 : (player.isCrouching ? 5 : 12);
        bobTimer += dt * bobRate;

        if (!player.isWalking && !player.isCrouching) {
          player.stepTimer += dt * horizontalSpeed;
          if (player.stepTimer > 2.6) {
            player.stepTimer = 0;
            playFootstepSound();
          }
        }
      } else {
        bobTimer = THREE.MathUtils.lerp(bobTimer, 0, dt * 6);
      }
    }

    camera.position.set(
      player.pos.x,
      player.pos.y + Math.sin(bobTimer) * (player.isGrounded ? 0.035 : 0),
      player.pos.z
    );
    camera.rotation.set(player.pitch, player.yaw, 0);

    // Viewmodel Weapon Animation & Authentic CS2 Photo Inspect Pose
    recoilOffset.lerp(new THREE.Vector3(0, 0, 0), dt * 12);
    recoilRot.lerp(new THREE.Vector3(0, 0, 0), dt * 10);
    switchOffset = THREE.MathUtils.lerp(switchOffset, 0, dt * 14);
    slashProgress = THREE.MathUtils.lerp(slashProgress, 0, dt * 16);
    player.swayX = THREE.MathUtils.lerp(player.swayX, 0, dt * 8);
    player.swayY = THREE.MathUtils.lerp(player.swayY, 0, dt * 8);

    inspectProgress = THREE.MathUtils.lerp(inspectProgress, inspectTarget, dt * 4);

    if (weaponMesh) {
      const bobX = Math.cos(bobTimer * 0.5) * 0.015;
      const bobY = Math.sin(bobTimer) * 0.015;

      // Base stance with CS2 natural inward weapon canting
      // When inspectProgress > 0: Rifle brings up horizontally across chest matching the user's photo!
      let posX = 0.28 + recoilOffset.x + player.swayX + bobX - (inspectProgress * 0.32);
      let posY = -0.28 + recoilOffset.y + player.swayY + bobY + (inspectProgress * 0.18) - switchOffset - (STATE.isScoped ? 0.4 : 0);
      let posZ = -0.6 + recoilOffset.z + (inspectProgress * 0.12);

      let rotX = recoilRot.x + 0.03 - (inspectProgress * 0.15);
      let rotY = recoilRot.y - 0.14 + (inspectProgress * 0.95);
      let rotZ = recoilRot.z + 0.06 - (inspectProgress * 0.55);

      if (STATE.currentSlot === 3 && slashProgress > 0.01) {
        posX -= slashProgress * 0.25;
        posY += slashProgress * 0.12;
        rotX += slashProgress * 0.7;
        rotY -= slashProgress * 1.2;
        rotZ += slashProgress * 0.9;
      }

      weaponMesh.position.set(posX, posY, posZ);
      weaponMesh.rotation.set(rotX, rotY, rotZ);
    }

    // Update targets
    targets.forEach(t => {
      if (t.isDead) {
        t.respawnTimer -= dt;
        if (t.respawnTimer <= 0) {
          t.isDead = false;
          t.health = 100;
          t.group.rotation.x = 0;
          t.group.position.y = 0;
        }
      } else {
        const timeOffset = now * 0.001 * t.strafeSpeed;
        t.group.position.x = t.baseX + Math.sin(timeOffset) * t.strafeRange;
      }
    });

    renderer.render(scene, camera);
  }

  // --- BOOTSTRAP ---
  window.addEventListener('DOMContentLoaded', () => {
    initThree();
    initControls();
    loadUserInventory();
    updateWeaponHUD();
    animate();
  });
})();
