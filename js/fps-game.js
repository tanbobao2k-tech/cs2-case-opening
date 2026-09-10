// ==========================================
// CS2 3D AIM ARENA — SOURCE ENGINE FPS ENGINE
// Multi-Weapon (1: Súng Dài, 2: Súng Ngắn, 3: Dao)
// Full Skins & Inspect System
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
    isSwitching: false,
    isReloading: false,
    isInspecting: false,
    isAttacking: false,
    activeTab: 'all',
    slots: {
      1: {
        type: 'primary',
        slot: 1,
        weapon: 'AK-47',
        name: 'Asiimov',
        wear: 'Field-Tested',
        rarity: 'covert',
        rarityColor: '#eb4b4b',
        ammo: 30,
        maxAmmo: 30,
        reserveAmmo: 90,
        damageBody: 35,
        damageHead: 100,
        price: 185.00,
        img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08y5nb-GkvP9Jrafw2lU6ccp07qWpdyj2wPl-Us4am-icYGLelc4Z1vV-FO3k-q-1p6878vOnXZhuyFwsHbewUvg1B9Eafsv26I41v2zLg/360fx360f'
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
        price: 120.00,
        img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PDdTjlH_86hkpiGkuP1PtfVk2lu5Mx2gv2PoNmk3w21qEA5N2-idteWcQBtNw7SqVG4lOa608S8upvAnXdjpGB8siu3Pz7E/360fx360f'
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
        price: 2450.00,
        img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf1f_BYQJD4eOxlY2GlsjwPKvBmm5D19V5i_rEpLP5gVO8v11rMTjyd9CTclU8N1_W-VG_w7y9gpO475zNwXti7yYntHvfzAv330_Z8D4P1A/360fx360f'
      }
    },
    inventory: [],
    targets: []
  };

  // DEFAULT PRESET SKINS
  const DEFAULT_SKINS = [
    // Súng Dài (Slot 1)
    {
      id: 'ak-asiimov',
      slot: 1,
      weapon: 'AK-47',
      name: 'Asiimov',
      wear: 'Field-Tested',
      rarity: 'covert',
      rarityColor: '#eb4b4b',
      price: 185.00,
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08y5nb-GkvP9Jrafw2lU6ccp07qWpdyj2wPl-Us4am-icYGLelc4Z1vV-FO3k-q-1p6878vOnXZhuyFwsHbewUvg1B9Eafsv26I41v2zLg/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot621FABz7PLfYQJS5NO0m5O0m_7zO6-fzj9V7Pp8j-3I4IG72ADk-xBsZ2v7LYfAdAU8NwvU_1W_wuvn15e-6ZnInCRr7nNw537UnAv330-d3G786A/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou-6kejhz2v_Nfz5H_uO1gb-Gw_alIITfn2xZ_Pp5i_vG8Inw3wDnqRFrMmzyd9SWdARrYFnQ_1bvwunmhpS_tJrPzHYy6CBwt3jcnAv330-JgLrh9A/360fx360f'
    },
    {
      id: 'ak-casehardened',
      slot: 1,
      weapon: 'AK-47',
      name: 'Case Hardened (Blue Gem)',
      wear: 'Factory New',
      rarity: 'classified',
      rarityColor: '#d32ce6',
      price: 350.00,
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-5lpKKqPrxN7LEmyVQ7MEpiLuSrYmnjQO3-UdsZGHyd4_Bd1RvNQ7T_FDrw-_ng5Pu75iY1zI97Sho9nfc/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PDdTjlH_86hkpiGkuP1PtfVk2lu5Mx2gv2PoNmk3w21qEA5N2-idteWcQBtNw7SqVG4lOa608S8upvAnXdjpGB8siu3Pz7E/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PDdTjlH_86hkpiGkuP1PtfVk2lu5Mx2gv2PoNmk3w21qEA5N2-idteWcQBtNw7SqVG4lOa608S8upvAnXdjpGB8siu3Pz7E/360fx360f'
    },
    {
      id: 'glock-fade',
      slot: 2,
      weapon: 'Glock-18',
      name: 'Fade',
      wear: 'Factory New',
      rarity: 'restricted',
      rarityColor: '#8847ff',
      price: 1400.00,
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKA5v7ODYzjbN_8-mq42Ok_7hNqzumX5Q8fp8teXI8oThxlKwqRE_YW77Io-dcVdrNwrRrFa_wOi7jMK47Z7Nz3cwunVxsivfngv3308kM-42-A/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf1f_BYQJD4eOxlY2GlsjwPKvBmm5D19V5i_rEpLP5gVO8v11rMTjyd9CTclU8N1_W-VG_w7y9gpO475zNwXti7yYntHvfzAv330_Z8D4P1A/360fx360f'
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
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJfxPrMfipP7dezhr-Kmsj1P7bUgm5W5ctOxL3H9NWt0Vfm8kVoa2vydoeQdFQ4N16F-VG-xey815C_up7NzyEy7yYq4nrbzAv330_6Z1vBmg/360fx360f'
    },
    {
      id: 'knife-karambit-casehardened',
      slot: 3,
      weapon: 'Karambit',
      name: 'Case Hardened (Blue Gem)',
      wear: 'Field-Tested',
      rarity: 'special',
      rarityColor: '#ffd700',
      price: 15000.00,
      img: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf3qr3czxb49KzgL-Djsj7Pb_UqWdY781lxL3D8d732gPn-0BsMG36cY_Ac1NtZVvZ_1G8we_mhsPv6p7PzSdr7HN0s3uMnAv3308D6Z9K8g/360fx360f'
    }
  ];

  // Helper to categorize weapon into slot 1, 2, or 3
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

  // Rifle gunshot (AK-47 style)
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

  // Pistol gunshot (Desert Eagle heavy snap)
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

  // Knife slash whoosh
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

  // Knife impact stab sound
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

  // Deploy / Switch weapon sound
  function playDeploySound(slot) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    if (slot === 3) {
      // Knife ring draw
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
      g.gain.setValueAtTime(0.3, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    } else if (slot === 2) {
      // Pistol rack slide
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
      g.gain.setValueAtTime(0.25, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    } else {
      // Rifle bolt cock
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

  // --- CS2 / SOURCE ENGINE EXACT PHYSICS CONSTANTS ---
  const CS_PHYSICS = {
    GRAVITY: 24.0,           // sv_gravity 800
    MAX_SPEED: 7.2,          // sv_maxspeed (250 units/s)
    WALK_SPEED: 3.8,         // Shift walk (130 units/s)
    CROUCH_SPEED: 2.5,       // Crouch walk (85 units/s)
    ACCELERATION: 5.5,       // sv_accelerate
    AIR_ACCELERATION: 12.0,  // sv_airaccelerate (Air strafe & Bunny hop)
    FRICTION: 5.2,           // sv_friction (Ground deceleration)
    STOP_SPEED: 1.8,         // sv_stopspeed (Counter-strafe instant stop)
    JUMP_IMPULSE: 8.0,       // Jump height
    STAND_HEIGHT: 1.7,       // Chiều cao đứng
    CROUCH_HEIGHT: 1.15      // Chiều cao ngồi
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
  let muzzleFlashLight, muzzleSprite;
  let targets = [];

  // Animation vectors
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

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xb0c0d0, 0.7);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 0.9);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    buildArena();
    buildWeaponViewmodel();
    spawnTargets();

    window.addEventListener('resize', onWindowResize);
  }

  // --- MAP BUILDER (DUST II AIM ARENA) ---
  function buildArena() {
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x9a8362, roughness: 0.85 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(50, 25, 0x5a4832, 0xb8a280);
    grid.position.y = 0.01;
    scene.add(grid);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0xc4b59d, roughness: 0.9 });
    const createWall = (w, h, d, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);
    };

    const arenaH = 7;
    createWall(50, arenaH, 1, 0, arenaH / 2, -25);
    createWall(50, arenaH, 1, 0, arenaH / 2, 25);
    createWall(1, arenaH, 50, -25, arenaH / 2, 0);
    createWall(1, arenaH, 50, 25, arenaH / 2, 0);

    const crateMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 });
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
  const skinCanvasCache = {};

  function generateSkinTexture(skin) {
    const key = (skin.id || (skin.weapon + '_' + skin.name)) + (skin.img ? '_img' : '');
    if (skinCanvasCache[key]) return skinCanvasCache[key];

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const nameLower = ((skin.weapon || '') + ' ' + (skin.name || '')).toLowerCase();

    const drawPattern = (imgElement) => {
      ctx.clearRect(0, 0, 512, 512);

      if (nameLower.includes('asiimov')) {
        // --- ASIIMOV ---
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(0, 60); ctx.lineTo(260, 0); ctx.lineTo(340, 0); ctx.lineTo(80, 260); ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(120, 512); ctx.lineTo(380, 252); ctx.lineTo(460, 252); ctx.lineTo(200, 512); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#15171e';
        ctx.beginPath();
        ctx.moveTo(280, 0); ctx.lineTo(512, 0); ctx.lineTo(512, 180); ctx.lineTo(380, 180); ctx.closePath();
        ctx.fill();
        ctx.fillRect(0, 360, 512, 45);

        ctx.fillStyle = '#15171e';
        ctx.font = '900 38px monospace';
        ctx.fillText('ASIIMOV // 01', 40, 320);
        ctx.fillStyle = '#ff5500';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('HIGH VOLTAGE // SPEC-A', 40, 350);

      } else if (nameLower.includes('dragon lore') || nameLower.includes('lore')) {
        // --- DRAGON LORE ---
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#d4af37'); grad.addColorStop(0.5, '#aa8c2c'); grad.addColorStop(1, '#5c4813');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.strokeStyle = 'rgba(255, 235, 170, 0.45)';
        ctx.lineWidth = 4;
        for (let y = 40; y < 512; y += 45) {
          ctx.beginPath(); ctx.arc(256, y, 65, 0, Math.PI); ctx.stroke();
        }

        ctx.fillStyle = '#b71c1c';
        ctx.beginPath();
        ctx.moveTo(60, 400); ctx.bezierCurveTo(150, 180, 320, 220, 440, 120);
        ctx.bezierCurveTo(360, 260, 300, 380, 160, 440); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff9800';
        ctx.beginPath(); ctx.arc(440, 120, 32, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText('DRAGON LORE', 60, 90);

      } else if (nameLower.includes('howl')) {
        // --- HOWL ---
        const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 360);
        grad.addColorStop(0, '#e53935'); grad.addColorStop(0.55, '#8e0000'); grad.addColorStop(1, '#110202');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#ff7961';
        ctx.beginPath();
        ctx.moveTo(256, 110); ctx.lineTo(350, 280); ctx.lineTo(256, 390); ctx.lineTo(162, 280); ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath(); ctx.arc(215, 230, 16, 0, Math.PI * 2); ctx.arc(297, 230, 16, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '900 42px Impact, sans-serif';
        ctx.fillText('THE HOWL', 160, 470);

      } else if (nameLower.includes('printstream')) {
        // --- PRINTSTREAM ---
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, 512, 512);

        const holo = ctx.createLinearGradient(0, 0, 512, 512);
        holo.addColorStop(0, 'rgba(0, 255, 230, 0.25)');
        holo.addColorStop(0.5, 'rgba(255, 0, 180, 0.25)');
        holo.addColorStop(1, 'rgba(255, 255, 0, 0.25)');
        ctx.fillStyle = holo;
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(40, 80, 432, 14);

        ctx.font = '900 68px sans-serif';
        ctx.fillText('X X', 80, 230);

        ctx.font = 'bold 24px monospace';
        ctx.fillText('PROJECT: PRINTSTREAM', 80, 290);
        ctx.fillText('STAT: VER 2.0.4 ACTIVE', 80, 324);

        for (let b = 80; b < 420; b += 14) {
          ctx.fillRect(b, 370, (b % 4 === 0 ? 6 : 2), 55);
        }

      } else if (nameLower.includes('case hardened') || nameLower.includes('blue gem')) {
        // --- CASE HARDENED BLUE GEM ---
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#0091ea'); grad.addColorStop(0.4, '#00b0ff');
        grad.addColorStop(0.7, '#aa00ff'); grad.addColorStop(0.88, '#ff6d00'); grad.addColorStop(1, '#ffd600');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        for (let p = 0; p < 35; p++) {
          ctx.fillStyle = p % 2 === 0 ? 'rgba(0, 230, 255, 0.75)' : 'rgba(213, 0, 249, 0.65)';
          ctx.beginPath();
          ctx.arc((p * 83) % 512, (p * 119) % 512, 35 + (p * 7) % 75, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.font = '900 32px monospace';
        ctx.fillText('TIER 1 BLUE GEM #661', 40, 460);

      } else if (nameLower.includes('doppler') || nameLower.includes('sapphire') || nameLower.includes('ruby')) {
        // --- DOPPLER SAPPHIRE / RUBY ---
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#0d47a1'); grad.addColorStop(0.5, '#2979ff'); grad.addColorStop(1, '#651fff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        for (let s = 0; s < 40; s++) {
          ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
          ctx.beginPath();
          ctx.arc((s * 97) % 512, (s * 61) % 512, 10 + (s * 3) % 30, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('DOPPLER SAPPHIRE', 60, 450);

      } else if (nameLower.includes('fade')) {
        // --- 100% MAX FADE ---
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#800080'); grad.addColorStop(0.5, '#e91e63');
        grad.addColorStop(0.85, '#ff9800'); grad.addColorStop(1, '#ffeb3b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#fff';
        ctx.font = '900 36px Impact, sans-serif';
        ctx.fillText('100% FULL FADE', 80, 460);

      } else if (nameLower.includes('blaze')) {
        // --- DEAGLE BLAZE ---
        ctx.fillStyle = '#111317';
        ctx.fillRect(0, 0, 512, 512);

        const flame = ctx.createLinearGradient(0, 512, 512, 0);
        flame.addColorStop(0, '#ff1744'); flame.addColorStop(0.4, '#ff9100'); flame.addColorStop(0.8, '#ffea00');
        ctx.fillStyle = flame;
        ctx.beginPath();
        ctx.moveTo(100, 512); ctx.lineTo(200, 300); ctx.lineTo(280, 512); ctx.lineTo(380, 200); ctx.lineTo(460, 512);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '900 38px Impact, sans-serif';
        ctx.fillText('BLAZE', 60, 160);

      } else {
        // --- GENERAL INVENTORY SKIN ---
        const rarityCol = skin.rarityColor || '#de9b35';
        ctx.fillStyle = '#131720';
        ctx.fillRect(0, 0, 512, 512);

        ctx.fillStyle = '#1c2230';
        for (let x = 0; x < 512; x += 16) {
          for (let y = 0; y < 512; y += 16) {
            if ((x + y) % 32 === 0) ctx.fillRect(x, y, 16, 16);
          }
        }

        ctx.fillStyle = rarityCol;
        ctx.fillRect(0, 90, 512, 26);
        ctx.fillRect(0, 370, 512, 14);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px sans-serif';
        ctx.fillText((skin.weapon || 'CS2').toUpperCase(), 40, 210);

        ctx.fillStyle = rarityCol;
        ctx.font = 'bold 32px sans-serif';
        ctx.fillText((skin.name || 'CUSTOM SKIN').toUpperCase(), 40, 260);

        ctx.fillStyle = '#ff9100';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('STATTRAK™  001337', 40, 320);
      }

      if (imgElement) {
        try {
          ctx.drawImage(imgElement, 180, 50, 320, 320);
        } catch (e) {}
      }
    };

    drawPattern(null);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    skinCanvasCache[key] = texture;

    if (skin.img) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        drawPattern(img);
        texture.needsUpdate = true;
      };
      img.src = skin.img;
    }

    return texture;
  }

  // --- 3D VIEWMODEL WITH 3 SLOTS (RIFLE, PISTOL, KNIFE) ---
  function buildWeaponViewmodel() {
    viewmodelRig = new THREE.Group();
    camera.add(viewmodelRig);
    scene.add(camera);

    weaponMesh = new THREE.Group();
    weaponMesh.position.set(0.28, -0.28, -0.6);
    viewmodelRig.add(weaponMesh);

    // Muzzle flash light & sprite
    muzzleFlashLight = new THREE.PointLight(0xffaa33, 0, 8);
    muzzleFlashLight.position.set(0, 0.02, -0.7);
    weaponMesh.add(muzzleFlashLight);

    const flashGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0 });
    muzzleSprite = new THREE.Mesh(flashGeo, flashMat);
    muzzleSprite.position.set(0, 0.02, -0.7);
    weaponMesh.add(muzzleSprite);

    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f232b, roughness: 0.45, metalness: 0.85 });
    const goldAccentMat = new THREE.MeshStandardMaterial({ color: 0xde9b35, roughness: 0.25, metalness: 0.9 });

    // ==========================================
    // 1. SLOT 1: RIFLE (SÚNG DÀI)
    // ==========================================
    rifleGroup = new THREE.Group();
    weaponMesh.add(rifleGroup);

    const rifleSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.5 });
    rifleMaterials.push(rifleSkinMat);

    // Body
    const rReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.48), rifleSkinMat);
    rifleGroup.add(rReceiver);

    // Side Decal Plate facing player
    const rDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), rifleSkinMat);
    rDecal.rotation.y = -Math.PI / 2;
    rDecal.position.set(-0.041, 0, 0);
    rifleGroup.add(rDecal);

    // Barrel
    const rBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.42, 12), darkMetalMat);
    rBarrel.rotation.x = Math.PI / 2;
    rBarrel.position.set(0, 0.02, -0.42);
    rifleGroup.add(rBarrel);

    // Handguard
    const rHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.28), rifleSkinMat);
    rHandguard.position.set(0, 0.015, -0.32);
    rifleGroup.add(rHandguard);

    // Muzzle Brake
    const rMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.08, 8), goldAccentMat);
    rMuzzle.rotation.x = Math.PI / 2;
    rMuzzle.position.set(0, 0.02, -0.65);
    rifleGroup.add(rMuzzle);

    // Banana Mag
    const rMag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.1), darkMetalMat);
    rMag.rotation.x = -0.25;
    rMag.position.set(0, -0.15, -0.05);
    rifleGroup.add(rMag);

    // Grip
    const rGrip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.08), darkMetalMat);
    rGrip.rotation.x = 0.35;
    rGrip.position.set(0, -0.12, 0.16);
    rifleGroup.add(rGrip);

    // Stock
    const rStock = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.12, 0.32), rifleSkinMat);
    rStock.position.set(0, 0, 0.36);
    rifleGroup.add(rStock);

    // Rail
    const rRail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.38), goldAccentMat);
    rRail.position.set(0, 0.07, -0.05);
    rifleGroup.add(rRail);

    // ==========================================
    // 2. SLOT 2: PISTOL (SÚNG NGẮN - DEAGLE)
    // ==========================================
    pistolGroup = new THREE.Group();
    pistolGroup.position.set(0, 0.02, 0.1);
    pistolGroup.visible = false;
    weaponMesh.add(pistolGroup);

    const pistolSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.55 });
    pistolMaterials.push(pistolSkinMat);

    // Deagle Slide (Top)
    const pSlide = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.34), pistolSkinMat);
    pSlide.position.set(0, 0.04, -0.08);
    pistolGroup.add(pSlide);

    // Slide Decal Plate
    const pDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.07), pistolSkinMat);
    pDecal.rotation.y = -Math.PI / 2;
    pDecal.position.set(-0.033, 0.04, -0.08);
    pistolGroup.add(pDecal);

    // Deagle Barrel tip
    const pBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12), darkMetalMat);
    pBarrel.rotation.x = Math.PI / 2;
    pBarrel.position.set(0, 0.04, -0.27);
    pistolGroup.add(pBarrel);

    // Lower Frame & Trigger guard
    const pFrame = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.05, 0.28), darkMetalMat);
    pFrame.position.set(0, -0.01, -0.06);
    pistolGroup.add(pFrame);

    // Grip
    const pGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.07), pistolSkinMat);
    pGrip.rotation.x = 0.28;
    pGrip.position.set(0, -0.09, 0.02);
    pistolGroup.add(pGrip);

    // ==========================================
    // 3. SLOT 3: KNIFE (DAO KARAMBIT)
    // ==========================================
    knifeGroup = new THREE.Group();
    knifeGroup.position.set(-0.04, -0.02, 0.12);
    knifeGroup.visible = false;
    weaponMesh.add(knifeGroup);

    const knifeSkinMat = new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.85 });
    knifeMaterials.push(knifeSkinMat);

    // Curved Blade (Karambit claw)
    const kBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.08, 0.24), knifeSkinMat);
    kBlade.rotation.x = 0.45;
    kBlade.rotation.z = -0.15;
    kBlade.position.set(0, 0.06, -0.16);
    knifeGroup.add(kBlade);

    // Blade Decal Plate
    const kDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.075), knifeSkinMat);
    kDecal.rotation.y = -Math.PI / 2;
    kDecal.position.set(-0.009, 0.06, -0.16);
    knifeGroup.add(kDecal);

    // Handle with finger grooves
    const kHandle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.07, 0.16), darkMetalMat);
    kHandle.rotation.x = -0.3;
    kHandle.position.set(0, -0.04, -0.02);
    knifeGroup.add(kHandle);

    // Safety Ring at the end
    const kRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 16), goldAccentMat);
    kRing.position.set(0, -0.1, 0.07);
    knifeGroup.add(kRing);
  }

  // --- APPLY SKIN TO SPECIFIC SLOT ---
  function applySkinToSlot(slotNum, skin) {
    if (!skin) return;
    STATE.slots[slotNum].skin = skin;
    STATE.slots[slotNum].weapon = skin.weapon || STATE.slots[slotNum].weapon;
    STATE.slots[slotNum].name = skin.name || STATE.slots[slotNum].name;
    STATE.slots[slotNum].rarity = skin.rarity || 'covert';
    STATE.slots[slotNum].rarityColor = skin.rarityColor || '#de9b35';
    STATE.slots[slotNum].price = skin.price || STATE.slots[slotNum].price;
    STATE.slots[slotNum].img = skin.img || STATE.slots[slotNum].img;

    const texture = generateSkinTexture(skin);

    if (slotNum === 1) {
      rifleMaterials.forEach(m => { m.map = texture; m.color.setHex(0xffffff); m.needsUpdate = true; });
    } else if (slotNum === 2) {
      pistolMaterials.forEach(m => { m.map = texture; m.color.setHex(0xffffff); m.needsUpdate = true; });
    } else if (slotNum === 3) {
      knifeMaterials.forEach(m => { m.map = texture; m.color.setHex(0xffffff); m.needsUpdate = true; });
    }

    if (STATE.currentSlot === slotNum) {
      updateWeaponHUD();
      updateInspectCard(STATE.slots[slotNum]);
    }
  }

  // --- SWITCH WEAPON SLOTS (1, 2, 3) ---
  function switchSlot(slotNum) {
    if (slotNum < 1 || slotNum > 3) return;
    if (STATE.currentSlot === slotNum && !STATE.isSwitching) return;

    initAudio();
    STATE.currentSlot = slotNum;
    STATE.isSwitching = true;
    STATE.isReloading = false;
    switchOffset = 0.35; // Drop weapon down for deploy animation

    playDeploySound(slotNum);

    // Swap 3D meshes visibility
    if (rifleGroup) rifleGroup.visible = (slotNum === 1);
    if (pistolGroup) pistolGroup.visible = (slotNum === 2);
    if (knifeGroup) knifeGroup.visible = (slotNum === 3);

    // Position muzzle point for pistols vs rifles
    if (muzzleFlashLight && muzzleSprite) {
      if (slotNum === 1) {
        muzzleFlashLight.position.set(0, 0.02, -0.7);
        muzzleSprite.position.set(0, 0.02, -0.7);
      } else if (slotNum === 2) {
        muzzleFlashLight.position.set(0, 0.06, -0.28);
        muzzleSprite.position.set(0, 0.06, -0.28);
      }
    }

    // Update HUD Slot indicators
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

  function updateWeaponHUD() {
    const curSlot = STATE.slots[STATE.currentSlot];
    const wpnEl = document.getElementById('hud-wpn-name');
    const skinEl = document.getElementById('hud-skin-name');
    const bannerEl = document.getElementById('hud-weapon-banner');
    const ammoBox = document.getElementById('hud-ammo-box');
    const ammoCur = document.getElementById('hud-ammo-cur');
    const ammoMax = document.getElementById('hud-ammo-max');

    if (wpnEl) wpnEl.textContent = curSlot.weapon;
    if (skinEl) skinEl.textContent = curSlot.name;
    if (bannerEl) bannerEl.style.borderLeftColor = curSlot.rarityColor || '#de9b35';

    if (ammoBox) {
      if (STATE.currentSlot === 3) {
        // Knife: no ammo counter
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
    if (insWear) insWear.textContent = `${item.wear || 'Factory New'} (Float: 0.0194)`;
    if (insRarity) {
      insRarity.textContent = (item.rarity || 'Covert').toUpperCase();
      insRarity.style.color = item.rarityColor || '#eb4b4b';
      insRarity.style.background = (item.rarityColor || '#eb4b4b') + '26';
    }
    if (insPrice) insPrice.textContent = item.price ? `$${Number(item.price).toFixed(2)}` : '$250.00';
  }

  // --- ATTACK (SHOOT / KNIFE SLASH) ---
  function attack() {
    if (STATE.isSwitching || STATE.isReloading) return;
    initAudio();

    const cur = STATE.slots[STATE.currentSlot];

    if (STATE.currentSlot === 3) {
      // KNIFE ATTACK
      STATE.shots++;
      slashProgress = 1.0;
      playKnifeSlashSound();

      // Knife melee raycast (short range 2.8 units)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      raycaster.far = 2.8;

      const hitObjects = [];
      targets.forEach(t => {
        if (!t.isDead) hitObjects.push(t.head, t.torso);
      });

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

    // GUN SHOOTING (Rifle or Pistol)
    if (cur.ammo <= 0) {
      playDryFireSound();
      return;
    }

    cur.ammo--;
    STATE.shots++;
    updateWeaponHUD();

    if (STATE.currentSlot === 1) {
      playRifleShotSound();
      recoilOffset.z = 0.08;
      recoilOffset.y = 0.028;
      recoilRot.x = 0.12;
      recoilRot.y = (Math.random() - 0.5) * 0.04;
    } else {
      playPistolShotSound();
      recoilOffset.z = 0.09;
      recoilOffset.y = 0.04;
      recoilRot.x = 0.18;
      recoilRot.y = (Math.random() - 0.5) * 0.03;
    }

    // Muzzle flash
    muzzleFlashLight.intensity = 3.5;
    muzzleSprite.material.opacity = 1;
    setTimeout(() => {
      muzzleFlashLight.intensity = 0;
      muzzleSprite.material.opacity = 0;
    }, 45);

    // Raycast bullet hit
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const hitObjects = [];
    targets.forEach(t => {
      if (!t.isDead) hitObjects.push(t.head, t.torso);
    });

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
    if (STATE.currentSlot === 3) return; // Knife cannot reload
    const cur = STATE.slots[STATE.currentSlot];
    if (STATE.isReloading || cur.ammo === cur.maxAmmo) return;

    initAudio();
    STATE.isReloading = true;
    playReloadSound();

    recoilOffset.y = -0.2;
    recoilRot.z = -0.3;

    setTimeout(() => {
      cur.ammo = cur.maxAmmo;
      STATE.isReloading = false;
      updateWeaponHUD();
    }, 1500);
  }

  function triggerInspect() {
    if (STATE.isInspecting) return;
    STATE.isInspecting = true;
    inspectTarget = 1;

    const insCard = document.getElementById('inspect-card');
    if (insCard) insCard.classList.remove('hidden');

    setTimeout(() => {
      inspectTarget = 0;
      setTimeout(() => {
        STATE.isInspecting = false;
        if (insCard) insCard.classList.add('hidden');
      }, 1000);
    }, 1800);
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

      const detectedSlot = detectSlot({ weapon: wpn, name: skinName, type: item.type });

      return {
        id: `user-${i}`,
        slot: detectedSlot,
        weapon: wpn,
        name: skinName,
        wear: item.wear || 'Field-Tested',
        rarity: item.rarity || 'covert',
        rarityColor: rarityMap[item.rarity] || '#de9b35',
        img: item.image || item.img,
        price: item.price || 0
      };
    }).filter(s => s.img);

    STATE.inventory = [...userSkins, ...DEFAULT_SKINS];

    // Setup initial skins for all 3 slots
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

      const sensitivity = 0.0022;
      player.yaw -= e.movementX * sensitivity;
      player.pitch -= e.movementY * sensitivity;
      player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));

      player.swayX = THREE.MathUtils.lerp(player.swayX, -e.movementX * 0.0008, 0.2);
      player.swayY = THREE.MathUtils.lerp(player.swayY, e.movementY * 0.0008, 0.2);
    });

    document.addEventListener('mousedown', (e) => {
      if (!isPointerLocked) return;
      if (e.button === 0) {
        attack();
      }
    });

    // Mouse wheel weapon cycle (Up = prev, Down = next)
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

      // Slot 1: Súng Dài
      if (e.code === 'Digit1') switchSlot(1);
      // Slot 2: Súng Ngắn
      if (e.code === 'Digit2') switchSlot(2);
      // Slot 3: Dao
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
      } else if (player.isWalking) {
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

    // Viewmodel Weapon Animation (Recoil, Inspect, Deploy, Knife Slash)
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

      // Base stance
      let posX = 0.28 + recoilOffset.x + player.swayX + bobX - (inspectProgress * 0.1);
      let posY = -0.28 + recoilOffset.y + player.swayY + bobY + (inspectProgress * 0.05) - switchOffset;
      let posZ = -0.6 + recoilOffset.z;

      let rotX = recoilRot.x - (inspectProgress * 0.2);
      let rotY = recoilRot.y + (inspectProgress * 0.85);
      let rotZ = recoilRot.z - (inspectProgress * 0.6);

      // Knife attack slash motion
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
