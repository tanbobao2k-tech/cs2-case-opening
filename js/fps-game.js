// ==========================================
// CS2 3D AIM ARENA — FPS ENGINE & SKIN VIEWER
// Powered by Three.js WebGL
// ==========================================

(() => {
  'use strict';

  // --- CONFIG & STATE ---
  const STATE = {
    user: 'Khách',
    score: 0,
    hits: 0,
    shots: 0,
    accuracy: 0,
    health: 100,
    ammo: 30,
    maxAmmo: 30,
    reserveAmmo: 90,
    isReloading: false,
    isInspecting: false,
    isFiring: false,
    isAiming: false,
    currentSkin: null,
    inventory: [],
    targets: []
  };

  // DEFAULT PRESETS IF INVENTORY IS EMPTY
  const DEFAULT_SKINS = [
    {
      id: 'ak-asiimov',
      weapon: 'AK-47',
      name: 'Asiimov',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08y5nb-GkvP9Jrafw2lU6ccp07qWpdyj2wPl-Us4am-icYGLelc4Z1vV-FO3k-q-1p6878vOnXZhuyFwsHbewUvg1B9Eafsv26I41v2zLg/360fx360f'
    },
    {
      id: 'awp-dragonlore',
      weapon: 'AWP',
      name: 'Dragon Lore',
      rarity: 'covert',
      rarityColor: '#ffd700',
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FABz7PLfYQJS5NO0m5O0m_7zO6-fzj9V7Pp8j-3I4IG72ADk-xBsZ2v7LYfAdAU8NwvU_1W_wuvn15e-6ZnInCRr7nNw537UnAv330-d3G786A/360fx360f'
    },
    {
      id: 'm4a4-howl',
      weapon: 'M4A4',
      name: 'Howl',
      rarity: 'contraband',
      rarityColor: '#e4ae39',
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITfn2xZ_Pp5i_vG8Inw3wDnqRFrMmzyd9SWdARrYFnQ_1bvwunmhpS_tJrPzHYy6CBwt3jcnAv330-JgLrh9A/360fx360f'
    },
    {
      id: 'ak-casehardened',
      weapon: 'AK-47',
      name: 'Case Hardened (Blue Gem)',
      rarity: 'classified',
      rarityColor: '#d32ce6',
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97Sho9nfc/360fx360f'
    },
    {
      id: 'deagle-printstream',
      weapon: 'Desert Eagle',
      name: 'Printstream',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PDdTjlH_86hkpiGkuP1PtfVk2lu5Mx2gv2PoNmk3w21qEA5N2-idteWcQBtNw7SqVG4lOa608S8upvAnXdjpGB8siu3Pz7E/360fx360f'
    }
  ];

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

  function playGunshotSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;

    // Noise burst for gunshot crack
    const bufferSize = audioCtx.sampleRate * 0.18;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioCtx.sampleRate * 0.04));
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    // Filter for beefy body
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);

    // Punch oscillator
    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);

    const oscGain = audioCtx.createGain();
    oscGain.gain.setValueAtTime(0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.65, now);
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
    const now = audioCtx.currentTime;
    // Click 1 (mag out)
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

    // Click 2 (mag in)
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

  // --- THREE.JS SCENE SETUP ---
  let scene, camera, renderer;
  let viewmodelRig, weaponMesh, skinMaterials = [], muzzleFlashLight, muzzleSprite;
  let targets = [];
  const textureLoader = new THREE.TextureLoader();

  // Player movement
  const player = {
    pos: new THREE.Vector3(0, 1.7, 8),
    vel: new THREE.Vector3(),
    pitch: 0,
    yaw: 0,
    speed: 7.5,
    isGrounded: true,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    swayX: 0,
    swayY: 0
  };

  // Recoil / viewmodel animation state
  let recoilOffset = new THREE.Vector3();
  let recoilRot = new THREE.Vector3();
  let inspectProgress = 0;
  let inspectTarget = 0;
  let bobTimer = 0;

  function initThree() {
    const container = document.getElementById('canvas-container');
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce7f3);
    scene.fog = new THREE.FogExp2(0xdce7f3, 0.015);

    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 100);
    camera.rotation.order = 'YXZ';

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Ambient & Directional Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb0c0d0, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    scene.add(dirLight);

    buildArena();
    buildWeaponViewmodel();
    spawnTargets();

    window.addEventListener('resize', onWindowResize);
  }

  // --- MAP BUILDER (CS2 AIM ARENA) ---
  function buildArena() {
    // Floor (Desert Dust 2 style tiles)
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x9a8362,
      roughness: 0.85,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Floor lines / CS cross-grid
    const grid = new THREE.GridHelper(50, 25, 0x5a4832, 0xb8a280);
    grid.position.y = 0.01;
    scene.add(grid);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xc4b59d,
      roughness: 0.9
    });

    const createWall = (w, h, d, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    };

    const arenaH = 7;
    createWall(50, arenaH, 1, 0, arenaH / 2, -25); // Back
    createWall(50, arenaH, 1, 0, arenaH / 2, 25);  // Front
    createWall(1, arenaH, 50, -25, arenaH / 2, 0); // Left
    createWall(1, arenaH, 50, 25, arenaH / 2, 0);  // Right

    // Wooden Crates / CS2 Boxes
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7
    });

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

  // --- TARGET DUMMIES (AIM BOTZ) ---
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

      // Stand Base
      const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.2, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.1;
      base.castShadow = true;
      group.add(base);

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
      const pole = new THREE.Mesh(poleGeo, baseMat);
      pole.position.y = 0.5;
      group.add(pole);

      // Body / Torso (Damage = 35)
      const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.35);
      const torsoMat = new THREE.MeshStandardMaterial({
        color: 0x334455,
        roughness: 0.6
      });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      torso.userData = { isTarget: true, type: 'body', parentIndex: idx };
      group.add(torso);

      // Head (Headshot = 100)
      const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xff4444,
        roughness: 0.4
      });
      const head = new THREE.Mesh(headGeo, headMat);
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

  // --- 3D VIEWMODEL (WEAPON & INSPECT RIG) ---
  function buildWeaponViewmodel() {
    viewmodelRig = new THREE.Group();
    camera.add(viewmodelRig);
    scene.add(camera);

    weaponMesh = new THREE.Group();
    // Position weapon in lower-right first person view
    weaponMesh.position.set(0.28, -0.28, -0.6);
    viewmodelRig.add(weaponMesh);

    // Primary weapon body material (will receive skin textures)
    const primarySkinMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.45
    });
    skinMaterials.push(primarySkinMat);

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      roughness: 0.5,
      metalness: 0.8
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xde9b35,
      roughness: 0.3,
      metalness: 0.85
    });

    // 1. Receiver / Gun Body
    const receiverGeo = new THREE.BoxGeometry(0.08, 0.12, 0.48);
    const receiver = new THREE.Mesh(receiverGeo, primarySkinMat);
    receiver.position.set(0, 0, 0);
    weaponMesh.add(receiver);

    // 2. Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12);
    const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.42);
    weaponMesh.add(barrel);

    // 3. Handguard (Skin coated)
    const handguardGeo = new THREE.BoxGeometry(0.07, 0.09, 0.28);
    const handguard = new THREE.Mesh(handguardGeo, primarySkinMat);
    handguard.position.set(0, 0.015, -0.32);
    weaponMesh.add(handguard);

    // 4. Muzzle Brake
    const muzzleGeo = new THREE.CylinderGeometry(0.028, 0.026, 0.08, 8);
    const muzzle = new THREE.Mesh(muzzleGeo, goldAccentMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0.02, -0.65);
    weaponMesh.add(muzzle);

    // 5. Curved Magazine
    const magGeo = new THREE.BoxGeometry(0.05, 0.24, 0.1);
    const mag = new THREE.Mesh(magGeo, darkMetalMat);
    mag.rotation.x = -0.25;
    mag.position.set(0, -0.15, -0.05);
    weaponMesh.add(mag);

    // 6. Pistol Grip
    const gripGeo = new THREE.BoxGeometry(0.055, 0.16, 0.08);
    const grip = new THREE.Mesh(gripGeo, darkMetalMat);
    grip.rotation.x = 0.35;
    grip.position.set(0, -0.12, 0.16);
    weaponMesh.add(grip);

    // 7. Tactical Stock (Skin coated)
    const stockGeo = new THREE.BoxGeometry(0.065, 0.12, 0.32);
    const stock = new THREE.Mesh(stockGeo, primarySkinMat);
    stock.position.set(0, 0, 0.36);
    weaponMesh.add(stock);

    // 8. Iron Sights / Rail
    const railGeo = new THREE.BoxGeometry(0.03, 0.03, 0.38);
    const rail = new THREE.Mesh(railGeo, goldAccentMat);
    rail.position.set(0, 0.07, -0.05);
    weaponMesh.add(rail);

    // Muzzle flash light & sprite
    muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 8);
    muzzleFlashLight.position.set(0, 0.02, -0.7);
    weaponMesh.add(muzzleFlashLight);

    const flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0 });
    muzzleSprite = new THREE.Mesh(flashGeo, flashMat);
    muzzleSprite.position.set(0, 0.02, -0.7);
    weaponMesh.add(muzzleSprite);
  }

  // --- SKIN APPLICATION ---
  function applySkin(skin) {
    if (!skin) return;
    STATE.currentSkin = skin;

    // Update HUD banner
    const wpnEl = document.getElementById('hud-wpn-name');
    const skinEl = document.getElementById('hud-skin-name');
    const bannerEl = document.getElementById('hud-weapon-banner');

    if (wpnEl) wpnEl.textContent = skin.weapon || 'Vũ khí';
    if (skinEl) skinEl.textContent = skin.name || 'Mặc định';
    if (bannerEl) {
      bannerEl.style.borderLeftColor = skin.rarityColor || '#de9b35';
    }

    // Load texture from Steam CDN onto 3D weapon
    if (skin.img) {
      textureLoader.load(
        skin.img,
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1.5, 1.5);
          skinMaterials.forEach(mat => {
            mat.map = texture;
            mat.needsUpdate = true;
          });
        },
        undefined,
        () => {
          // Fallback if texture fails: use vibrant color
          skinMaterials.forEach(mat => {
            mat.map = null;
            mat.color.setStyle(skin.rarityColor || '#de9b35');
            mat.needsUpdate = true;
          });
        }
      );
    }
  }

  // --- INVENTORY & ACCOUNT INTEGRATION ---
  function loadUserInventory() {
    let currentAccount = localStorage.getItem('cs2-current') || 'Khách';
    STATE.user = currentAccount;

    const userChip = document.getElementById('hud-user-name');
    if (userChip) userChip.textContent = currentAccount;

    // Retrieve user inventory from localStorage
    let inv = [];
    try {
      const stored = localStorage.getItem(`cs2-inv_${currentAccount}`) || localStorage.getItem('cs2-inv');
      if (stored) {
        inv = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading inventory', e);
    }

    // Map user inventory items
    const userSkins = inv.map((item, i) => {
      // Split name e.g. "AK-47 | Asiimov"
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
        weapon: wpn,
        name: skinName,
        wear: item.wear || 'Field-Tested',
        rarity: item.rarity || 'covert',
        rarityColor: rarityMap[item.rarity] || '#de9b35',
        img: item.image || item.img,
        price: item.price || 0
      };
    }).filter(s => s.img);

    // Merge with defaults
    STATE.inventory = [...userSkins, ...DEFAULT_SKINS];

    renderSkinDrawer();

    // Default equip the first skin or top tier
    if (STATE.inventory.length > 0) {
      applySkin(STATE.inventory[0]);
    }
  }

  function renderSkinDrawer() {
    const listEl = document.getElementById('skin-drawer-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    STATE.inventory.forEach(skin => {
      const item = document.createElement('div');
      item.className = 'skin-item' + (STATE.currentSkin?.id === skin.id ? ' equipped' : '');
      item.onclick = () => {
        applySkin(skin);
        renderSkinDrawer();
        triggerInspect();
      };

      item.innerHTML = `
        <img class="skin-thumb" src="${skin.img}" alt="${skin.name}" />
        <div class="skin-details">
          <div class="skin-wpn">${skin.weapon}</div>
          <div class="skin-lbl" style="color:${skin.rarityColor}">${skin.name}</div>
        </div>
        <span class="skin-badge">${STATE.currentSkin?.id === skin.id ? 'Đang cầm' : 'Trang bị'}</span>
      `;
      listEl.appendChild(item);
    });
  }

  // --- WEAPON SHOOTING & RECOIL ---
  function shoot() {
    if (STATE.isReloading) return;

    if (STATE.ammo <= 0) {
      playDryFireSound();
      return;
    }

    initAudio();
    STATE.ammo--;
    STATE.shots++;
    updateHUD();

    playGunshotSound();

    // Muzzle flash
    muzzleFlashLight.intensity = 3.5;
    muzzleSprite.material.opacity = 1;
    setTimeout(() => {
      muzzleFlashLight.intensity = 0;
      muzzleSprite.material.opacity = 0;
    }, 45);

    // Recoil kickback
    recoilOffset.z = 0.08;
    recoilOffset.y = 0.03;
    recoilRot.x = 0.12;
    recoilRot.y = (Math.random() - 0.5) * 0.04;

    // Raycast hit check from center of screen
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const hitObjects = [];
    targets.forEach(t => {
      if (!t.isDead) {
        hitObjects.push(t.head, t.torso);
      }
    });

    const intersects = raycaster.intersectObjects(hitObjects);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const targetObj = hit.object;
      const targetIndex = targetObj.userData.parentIndex;
      const target = targets[targetIndex];

      STATE.hits++;

      if (targetObj.userData.type === 'head') {
        // HEADSHOT
        playHeadshotSound();
        showHitmarker(true, 'HEADSHOT! +100');
        STATE.score += 100;
        target.health = 0;
      } else {
        // BODY HIT
        playBodyHitSound();
        showHitmarker(false, 'HIT +35');
        STATE.score += 35;
        target.health -= 35;
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
    // Fall animation
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
    if (STATE.isReloading || STATE.ammo === STATE.maxAmmo) return;
    initAudio();
    STATE.isReloading = true;
    playReloadSound();

    // Reload animation: drop weapon
    recoilOffset.y = -0.2;
    recoilRot.z = -0.3;

    setTimeout(() => {
      STATE.ammo = STATE.maxAmmo;
      STATE.isReloading = false;
      updateHUD();
    }, 1500);
  }

  function triggerInspect() {
    if (STATE.isInspecting) return;
    STATE.isInspecting = true;
    inspectTarget = 1;

    setTimeout(() => {
      inspectTarget = 0;
      setTimeout(() => {
        STATE.isInspecting = false;
      }, 1000);
    }, 1500);
  }

  function updateHUD() {
    const ammoCur = document.getElementById('hud-ammo-cur');
    const ammoMax = document.getElementById('hud-ammo-max');
    const scoreVal = document.getElementById('hud-score-val');
    const healthVal = document.getElementById('hud-health-val');

    if (ammoCur) ammoCur.textContent = STATE.ammo;
    if (ammoMax) ammoMax.textContent = STATE.reserveAmmo;
    if (scoreVal) scoreVal.textContent = STATE.score;
    if (healthVal) healthVal.textContent = STATE.health;
  }

  function updateAccuracy() {
    const accVal = document.getElementById('hud-acc-val');
    if (STATE.shots > 0) {
      STATE.accuracy = Math.round((STATE.hits / STATE.shots) * 100);
    }
    if (accVal) accVal.textContent = `${STATE.accuracy}%`;
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

      const sensitivity = 0.0022;
      player.yaw -= e.movementX * sensitivity;
      player.pitch -= e.movementY * sensitivity;

      // Clamp vertical look angle
      player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));

      // Viewmodel mouse lag sway
      player.swayX = THREE.MathUtils.lerp(player.swayX, -e.movementX * 0.0008, 0.2);
      player.swayY = THREE.MathUtils.lerp(player.swayY, e.movementY * 0.0008, 0.2);
    });

    document.addEventListener('mousedown', (e) => {
      if (!isPointerLocked) return;
      if (e.button === 0) {
        shoot();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW') player.moveForward = true;
      if (e.code === 'KeyS') player.moveBackward = true;
      if (e.code === 'KeyA') player.moveLeft = true;
      if (e.code === 'KeyD') player.moveRight = true;

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

  // --- GAME LOOP & PHYSICS ---
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // Player position & movement
    if (isPointerLocked) {
      const moveDir = new THREE.Vector3();
      if (player.moveForward) moveDir.z -= 1;
      if (player.moveBackward) moveDir.z += 1;
      if (player.moveLeft) moveDir.x -= 1;
      if (player.moveRight) moveDir.x += 1;
      moveDir.normalize();

      const cosYaw = Math.cos(player.yaw);
      const sinYaw = Math.sin(player.yaw);

      const worldX = moveDir.x * cosYaw - moveDir.z * sinYaw;
      const worldZ = moveDir.x * sinYaw + moveDir.z * cosYaw;

      player.vel.x = THREE.MathUtils.lerp(player.vel.x, worldX * player.speed, dt * 10);
      player.vel.z = THREE.MathUtils.lerp(player.vel.z, worldZ * player.speed, dt * 10);

      player.pos.x += player.vel.x * dt;
      player.pos.z += player.vel.z * dt;

      // Arena boundary limits
      player.pos.x = Math.max(-23, Math.min(23, player.pos.x));
      player.pos.z = Math.max(-23, Math.min(23, player.pos.z));

      // Head bobbing when walking
      const speedMag = Math.hypot(player.vel.x, player.vel.z);
      if (speedMag > 0.5) {
        bobTimer += dt * 12;
      } else {
        bobTimer = THREE.MathUtils.lerp(bobTimer, 0, dt * 5);
      }
    }

    // Camera transform
    camera.position.copy(player.pos);
    camera.position.y = 1.7 + Math.sin(bobTimer) * 0.04;
    camera.rotation.set(player.pitch, player.yaw, 0);

    // Viewmodel Recoil & Inspect Animation
    recoilOffset.lerp(new THREE.Vector3(0, 0, 0), dt * 12);
    recoilRot.lerp(new THREE.Vector3(0, 0, 0), dt * 10);
    player.swayX = THREE.MathUtils.lerp(player.swayX, 0, dt * 8);
    player.swayY = THREE.MathUtils.lerp(player.swayY, 0, dt * 8);

    inspectProgress = THREE.MathUtils.lerp(inspectProgress, inspectTarget, dt * 4);

    if (weaponMesh) {
      // Base stance + recoil + sway + walk bob
      const bobX = Math.cos(bobTimer * 0.5) * 0.015;
      const bobY = Math.sin(bobTimer) * 0.015;

      weaponMesh.position.set(
        0.28 + recoilOffset.x + player.swayX + bobX - (inspectProgress * 0.1),
        -0.28 + recoilOffset.y + player.swayY + bobY + (inspectProgress * 0.05),
        -0.6 + recoilOffset.z
      );

      // Weapon Rotation (Recoil + Inspect side tilt)
      weaponMesh.rotation.set(
        recoilRot.x - (inspectProgress * 0.2),
        recoilRot.y + (inspectProgress * 0.85),
        recoilRot.z - (inspectProgress * 0.6)
      );
    }

    // Update targets (strafe and respawn)
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
        // Subtle strafe movement
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
    updateHUD();
    animate();
  });
})();
