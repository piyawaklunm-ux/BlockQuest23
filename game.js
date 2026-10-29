
import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

// ======================================
// 1. ตั้งค่าพื้นฐาน
// ======================================
const container = document.getElementById("game");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#8bd8ff");
scene.fog = new THREE.Fog("#8bd8ff", 65, 150);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  250
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

scene.add(new THREE.HemisphereLight(0xffffff, 0x65754b, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2.1);
sun.position.set(25, 45, 20);
scene.add(sun);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
raycaster.far = 6;

const keys = {};
const interactables = [];
const collisionBoxes = [];
const movableObjects = [];
const pets = [];

let currentMap = "village";
let score = 0;
let completedVillage = new Set();
let completedCity = new Set();
let currentQuestion = null;
let currentHouse = null;
let currentCityObject = null;
let isThirdPerson = false;
let jumpVelocity = 0;
let isGrounded = true;
let noticeTimer = null;
let petUnlocked = false;

const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.35;
const WALK_SPEED = 7;
const JUMP_SPEED = 7.5;

const characterStyles = [
  { name: "นักผจญภัย", shirt: "#2878d0", pants: "#26364b", skin: "#f0c39b" },
  { name: "นักเรียน", shirt: "#ffffff", pants: "#263b80", skin: "#edbd92" },
  { name: "นักสำรวจ", shirt: "#e3a33d", pants: "#5e6d3d", skin: "#dca578" },
  { name: "นักเวท", shirt: "#925bd0", pants: "#30254e", skin: "#f1c5a3" }
];

let selectedCharacter = 0;
let avatar = null;
let pet = null;
let thirdPersonCameraOffset = new THREE.Vector3(0, 2.2, 5);
let ownedItems = [];
let equippedItems = [];
let cityPortal = null;

const villageQuestions = [
  { house: 1, object: "เตียง", q: "แท็ก HTML ใดใช้สร้างหัวข้อระดับใหญ่ที่สุด?", a: ["<h1>", "<p>", "<img>", "<table>"], correct: 0 },
  { house: 2, object: "เก้าอี้", q: "CSS มีหน้าที่หลักอะไร?", a: ["จัดรูปแบบหน้าเว็บ", "เก็บข้อมูลฐานข้อมูล", "เปิดเครื่องคอมพิวเตอร์", "ส่งอีเมล"], correct: 0 },
  { house: 3, object: "โคมไฟ", q: "แท็กใดใช้แสดงรูปภาพใน HTML?", a: ["<picture-text>", "<image>", "<img>", "<photo>"], correct: 2 },
  { house: 4, object: "หีบ", q: "JavaScript ใช้ทำอะไรบนเว็บไซต์ได้?", a: ["เพิ่มการโต้ตอบ", "ทำให้จอใหญ่ขึ้น", "เพิ่มไฟฟ้า", "เปลี่ยนเมาส์เป็นคีย์บอร์ด"], correct: 0 },
  { house: 5, object: "โต๊ะ", q: "แท็กใดใช้สร้างย่อหน้า?", a: ["<h1>", "<p>", "<br>", "<head>"], correct: 1 },
  { house: 6, object: "เตียง", q: "ไฟล์ CSS มักใช้นามสกุลใด?", a: [".html", ".css", ".jpg", ".mp3"], correct: 1 },
  { house: 7, object: "เก้าอี้", q: "คำสั่งใดใช้แสดงข้อความใน Console ของ JavaScript?", a: ["print.page()", "console.log()", "show.html()", "write.css()"], correct: 1 },
  { house: 8, object: "โคมไฟ", q: "แท็ก <body> ใช้สำหรับอะไร?", a: ["เนื้อหาที่แสดงบนหน้าเว็บ", "ชื่อไฟล์รูปภาพ", "ตั้งค่าสีของเมาส์", "ปิดอินเทอร์เน็ต"], correct: 0 },
  { house: 9, object: "หีบ", q: "HTML มีหน้าที่หลักอะไร?", a: ["กำหนดโครงสร้างเว็บ", "ปรับเสียงลำโพง", "สแกนไวรัส", "เพิ่ม RAM"], correct: 0 },
  { house: 10, object: "โต๊ะ", q: "แท็กใดใช้สร้างลิงก์ใน HTML?", a: ["<a>", "<link-text>", "<url>", "<go>"], correct: 0 }
];

const cityLocations = [
  {
    id: "school",
    name: "โรงเรียน",
    x: -18,
    z: -5,
    color: "#f1c96c",
    objects: [
      ["กระดาน", "กระดานในห้องเรียนมีไว้ทำอะไร?", ["เขียนบทเรียน", "เก็บอาหาร", "ซักเสื้อ", "นอน"], 0],
      ["โต๊ะเรียน", "โต๊ะเรียนใช้ทำอะไร?", ["นั่งทำงานและเรียน", "ดับไฟ", "รักษาคนไข้", "ขายสินค้า"], 0],
      ["หนังสือ", "หนังสือช่วยเราอย่างไร?", ["เรียนรู้ข้อมูล", "ทำอาหาร", "วัดอุณหภูมิ", "ฉีดยา"], 0],
      ["คอมพิวเตอร์", "ข้อใดเป็นการใช้คอมพิวเตอร์อย่างปลอดภัย?", ["ไม่เปิดเผยรหัสผ่าน", "บอกรหัสผ่านทุกคน", "คลิกลิงก์แปลก ๆ", "ให้คนอื่นใช้บัญชีเรา"], 0],
      ["ระฆังโรงเรียน", "เมื่อได้ยินสัญญาณเข้าเรียนควรทำอย่างไร?", ["เตรียมตัวเข้าเรียน", "วิ่งออกจากโรงเรียน", "ทิ้งกระเป๋า", "ปิดไฟทุกห้อง"], 0]
    ]
  },
  {
    id: "hospital",
    name: "โรงพยาบาล",
    x: 0,
    z: -5,
    color: "#e9f3fa",
    objects: [
      ["เตียงผู้ป่วย", "เตียงผู้ป่วยมีไว้ทำอะไร?", ["ให้ผู้ป่วยพักรักษาตัว", "ขายยา", "ทำอาหาร", "เก็บรองเท้า"], 0],
      ["รถเข็น", "รถเข็นผู้ป่วยช่วยอะไร?", ["เคลื่อนย้ายผู้ป่วย", "วัดส่วนสูงอาคาร", "เปิดประตูอัตโนมัติ", "ทำความสะอาดถนน"], 0],
      ["ตู้ยา", "การใช้ยาควรทำอย่างไร?", ["ใช้ตามคำแนะนำของแพทย์หรือเภสัชกร", "กินทุกชนิดพร้อมกัน", "แบ่งยาให้ทุกคน", "กินยาไม่ทราบชนิด"], 0],
      ["เครื่องวัดไข้", "เครื่องวัดไข้ใช้ตรวจอะไร?", ["อุณหภูมิร่างกาย", "ความเร็วรถ", "น้ำหนักกระเป๋า", "ความดังเสียง"], 0],
      ["อ่างล้างมือ", "การล้างมือช่วยอะไร?", ["ลดเชื้อโรค", "เพิ่มฝุ่น", "ทำให้มือสกปรก", "ทำให้เกิดเสียงดัง"], 0]
    ]
  },
  {
    id: "shop",
    name: "ร้านสะดวกซื้อ",
    x: 18,
    z: -5,
    color: "#e4b5d4",
    objects: [
      ["ชั้นสินค้า", "ชั้นสินค้าในร้านมีไว้ทำอะไร?", ["จัดวางสินค้า", "รักษาผู้ป่วย", "สอนหนังสือ", "จอดรถ"], 0],
      ["ตู้เย็น", "ตู้เย็นช่วยอะไร?", ["รักษาความเย็นของอาหาร", "ทำให้เสื้อแห้ง", "พิมพ์เอกสาร", "วัดไข้"], 0],
      ["เครื่องคิดเงิน", "เครื่องคิดเงินใช้ทำอะไร?", ["คิดยอดซื้อสินค้า", "ล้างจาน", "ปลูกต้นไม้", "ตรวจสายตา"], 0],
      ["ตะกร้าสินค้า", "ตะกร้าสินค้าใช้ทำอะไร?", ["ใส่สินค้าที่เลือกซื้อ", "ใส่น้ำมันรถ", "เป็นเตียงผู้ป่วย", "ใช้เขียนกระดาน"], 0],
      ["ถังขยะ", "ขยะควรทิ้งที่ไหน?", ["ถังขยะที่เหมาะสม", "พื้นร้าน", "ชั้นสินค้า", "ตู้เย็น"], 0]
    ]
  }
];

const shopCatalog = [
  { id: "goldSuit", name: "🟨 ชุดทอง", price: 30 },
  { id: "diamondSuit", name: "💎 ชุดเพชร", price: 60 },
  { id: "goldSword", name: "⚔️ ดาบทอง", price: 40 },
  { id: "diamondSword", name: "🗡️ ดาบเพชร", price: 80 }
];

// ======================================
// 2. เครื่องมือสร้างวัตถุ
// ======================================
function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.88,
    metalness: 0.02,
    ...extra
  });
}

function box(name, x, y, z, w, h, d, color, parent = scene) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material(color)
  );
  mesh.name = name;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function addGround(color = "#b8d89a") {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    material(color)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);
}

function addLabel(text, x, y, z, color = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(25,35,48,0.82)";
  ctx.fillRect(0, 0, 512, 128);
  ctx.font = "bold 42px Tahoma";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 64, 490);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true })
  );
  sprite.position.set(x, y, z);
  sprite.scale.set(5, 1.25, 1);
  scene.add(sprite);
  return sprite;
}

function addMountain(x, z, size, color) {
  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(size, size * 1.5, 5),
    material(color)
  );
  mesh.position.set(x, size * 0.65, z);
  mesh.rotation.y = Math.random() * 1.5;
  scene.add(mesh);
}

function addTree(x, z) {
  box("ลำต้น", x, 1, z, 0.6, 2, 0.6, "#80512e");
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.8, 3.6, 6),
    material("#398b4a")
  );
  leaves.position.set(x, 3.3, z);
  scene.add(leaves);
}

function addFence(x, z, length, horizontal = true) {
  const count = Math.floor(length / 2);
  for (let i = 0; i <= count; i++) {
    const px = horizontal ? x + i * 2 : x;
    const pz = horizontal ? z : z + i * 2;
    box("รั้ว", px, 0.55, pz, 0.15, 1.1, 0.15, "#f1e4c5");
  }

  box(
    "คานรั้ว",
    horizontal ? x + length / 2 : x,
    0.8,
    horizontal ? z : z + length / 2,
    horizontal ? length : 0.14,
    0.12,
    horizontal ? 0.14 : length,
    "#8b6240"
  );
}

function addInteractive(mesh, data) {
  mesh.userData.interaction = data;
  interactables.push(mesh);
  return mesh;
}

function makeFurniture(type, x, z, house, color) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  if (type === "เตียง") {
    box("ที่นอน", 0, 0.6, 0, 1.8, 0.45, 2.5, "#e5e9f8", group);
    box("หัวเตียง", 0, 1, -1.1, 1.9, 0.8, 0.2, color, group);
    box("หมอน", 0, 0.9, -0.7, 0.8, 0.15, 0.45, "#ffffff", group);
  } else if (type === "เก้าอี้") {
    box("เบาะเก้าอี้", 0, 0.65, 0, 1, 0.2, 1, color, group);
    box("พนักพิง", 0, 1.2, -0.4, 1, 1, 0.18, color, group);
    for (const dx of [-0.4, 0.4]) {
      for (const dz of [-0.4, 0.4]) {
        box("ขาเก้าอี้", dx, 0.3, dz, 0.12, 0.6, 0.12, "#71472e", group);
      }
    }
  } else if (type === "โคมไฟ") {
    box("ฐานโคม", 0, 0.12, 0, 0.7, 0.2, 0.7, "#60452d", group);
    box("เสาโคม", 0, 0.85, 0, 0.12, 1.3, 0.12, "#8b8b8b", group);
    box("โป๊ะโคม", 0, 1.6, 0, 0.8, 0.45, 0.8, "#ffe69a", group);
  } else if (type === "หีบ") {
    box("หีบ", 0, 0.5, 0, 1.3, 0.9, 1, "#9a642f", group);
    box("แถบหีบ", 0, 0.5, 0.52, 0.18, 0.9, 0.05, "#f1d36b", group);
    box("ฝาหีบ", 0, 0.98, 0, 1.35, 0.12, 1.05, "#70441f", group);
  } else {
    box("หน้าโต๊ะ", 0, 1, 0, 1.8, 0.18, 1.3, color, group);
    for (const dx of [-0.7, 0.7]) {
      for (const dz of [-0.45, 0.45]) {
        box("ขาโต๊ะ", dx, 0.5, dz, 0.15, 1, 0.15, "#71472e", group);
      }
    }
  }

  // Hitbox ใสที่ช่วยให้คลิกเฟอร์นิเจอร์ได้ง่ายขึ้น
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 2.2, 2.2),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.set(x, 1, z);
  scene.add(hitbox);

  addInteractive(hitbox, {
    type: "villageObject",
    house,
    furnitureType: type
  });

  return group;
}

function makeHouse(index, x, z, missionType) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);

  const wall = ["#d7c7f0", "#c6e5d6", "#f4d3a6", "#d6dce9"][index % 4];
  const roof = ["#9e6dcc", "#d28b42", "#b75c50", "#578f6b"][index % 4];

  box("พื้นบ้าน", 0, 0.12, 0, 9, 0.24, 9, "#c6b49a", group);
  box("ผนังหลัง", 0, 2.1, -4.2, 9, 4, 0.45, wall, group);
  box("ผนังซ้าย", -4.2, 2.1, 0, 0.45, 4, 9, wall, group);
  box("ผนังขวา", 4.2, 2.1, 0, 0.45, 4, 9, wall, group);
  box("ผนังหน้าซ้าย", -2.5, 2.1, 4.2, 4, 4, 0.45, wall, group);
  box("ผนังหน้าขวา", 2.5, 2.1, 4.2, 4, 4, 0.45, wall, group);

  const roofMesh = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, 2.2, 4),
    material(roof)
  );
  roofMesh.position.set(0, 5, 0);
  roofMesh.rotation.y = Math.PI / 4;
  group.add(roofMesh);

  const door = box("ประตู", 0, 1.5, 4.2, 1.5, 3, 0.18, "#704326", group);
  door.rotation.y = -0.4;

  addLabel(`บ้านที่ ${index + 1}`, x, 6.3, z, "#ffffff");

  const houseData = {
    index,
    name: `บ้านที่ ${index + 1}`,
    missionType,
    used: false
  };

  const furniturePositions = [
    { type: "เตียง", x: -2, z: -1.8 },
    { type: "เก้าอี้", x: 2, z: -1.5 },
    { type: "โคมไฟ", x: 2.5, z: 1.2 },
    { type: "หีบ", x: -2.5, z: 1.4 },
    { type: "โต๊ะ", x: 0, z: -0.5 }
  ];

  for (const item of furniturePositions) {
    makeFurniture(
      item.type,
      x + item.x,
      z + item.z,
      houseData,
      item.type === missionType ? "#f6cf66" : "#a77a55"
    );
  }

  // ผนังกันผู้เล่นเดินทะลุด้านข้างของบ้าน
  collisionBoxes.push(
    { minX: x - 4.5, maxX: x + 4.5, minZ: z - 4.5, maxZ: z - 4.0 },
    { minX: x - 4.5, maxX: x - 4.0, minZ: z - 4.0, maxZ: z + 4.5 },
    { minX: x + 4.0, maxX: x + 4.5, minZ: z - 4.0, maxZ: z + 4.5 },
    { minX: x - 4.5, maxX: x - 2.7, minZ: z + 4.0, maxZ: z + 4.5 },
    { minX: x + 2.7, maxX: x + 4.5, minZ: z + 4.0, maxZ: z + 4.5 }
  );
}

function clearWorld() {
  for (const object of [...scene.children]) {
    if (object !== camera && object !== sun && object.type !== "HemisphereLight") {
      scene.remove(object);
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(m => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  }

  interactables.length = 0;
  collisionBoxes.length = 0;
  movableObjects.length = 0;
  pets.length = 0;
  avatar = null;
  pet = null;
  cityPortal = null;
}

// ======================================
// 3. สร้างแผนที่หมู่บ้านแยกจากแผนที่เมือง
// ======================================
function buildVillage() {
  clearWorld();
  currentMap = "village";
  scene.background = new THREE.Color("#8bd8ff");
  scene.fog = new THREE.Fog("#8bd8ff", 65, 150);
  addGround("#b8d89a");

  // ถนนกลางหมู่บ้าน
  box("ถนน", 0, 0.03, 8, 12, 0.06, 65, "#b9b9b9");
  for (let z = -20; z <= 38; z += 5) {
    box("เส้นถนน", 0, 0.07, z, 0.18, 0.02, 2, "#fff4c7");
  }

  // ภูเขาและต้นไม้
  for (let i = 0; i < 18; i++) {
    addMountain(-42 + i * 5, -32 - Math.random() * 10, 5 + Math.random() * 5,
      ["#668b83", "#718f9e", "#779a72"][i % 3]);
  }

  for (let i = 0; i < 20; i++) {
    addTree(-35 + Math.random() * 70, -25 + Math.random() * 55);
  }

  // บ้าน 10 หลัง แยกตำแหน่งกัน ไม่ซ้อนทับ
  const missionTypes = [
    "เตียง", "เก้าอี้", "โคมไฟ", "หีบ", "โต๊ะ",
    "เตียง", "เก้าอี้", "โคมไฟ", "หีบ", "โต๊ะ"
  ];

  for (let i = 0; i < 10; i++) {
    const col = i % 5;
    const row = Math.floor(i / 5);
    makeHouse(i, -25 + col * 12.5, -15 + row * 20, missionTypes[i]);
  }

  // น้ำตกตกแต่งอยู่บริเวณปลายแผนที่หมู่บ้าน
  box("หน้าผาน้ำตก", 34, 3.5, -25, 8, 7, 3, "#8b9f9b");
  box("น้ำตก", 34, 3.3, -23.35, 4, 6, 0.2, "#67d7f5");
  box("แอ่งน้ำ", 34, 0.1, -20, 12, 0.2, 8, "#3ab8db");

  // ประตูวาร์ปตั้งอยู่ใกล้น้ำตก
  const portal = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.35, 8, 24),
    new THREE.MeshStandardMaterial({
      color: "#8b5cff",
      emissive: "#5632c9",
      emissiveIntensity: 1.3
    })
  );
  portal.position.set(34, 2.2, -17);
  scene.add(portal);

  addInteractive(portal, { type: "portal" });
  addLabel("วาร์ปไปเมือง", 34, 5.2, -17, "#fff1a8");

  // จุดเริ่มต้นหันไปทางหมู่บ้าน
  resetPlayer(0, 2.2, 15);
  createAvatar();
  if (petUnlocked) createPet();
  updateHUD();
}

// ======================================
// 4. สร้างแผนที่เมืองแยกต่างหาก
// ======================================
function buildCity() {
  clearWorld();
  currentMap = "city";
  scene.background = new THREE.Color("#9ddaff");
  scene.fog = new THREE.Fog("#9ddaff", 65, 145);
  addGround("#c6d9a7");

  box("ถนนเมือง", 0, 0.04, 8, 9, 0.08, 70, "#656b76");
  for (let z = -22; z <= 38; z += 5) {
    box("เส้นถนนเมือง", 0, 0.09, z, 0.16, 0.02, 2.1, "#f8e5a3");
  }

  for (let i = 0; i < 16; i++) {
    addMountain(-40 + i * 5.5, -32, 5 + Math.random() * 4,
      ["#6b9a7a", "#7192a8", "#7b9a72"][i % 3]);
  }

  // สร้างอาคารและสิ่งของ 5 ชิ้นในแต่ละสถานที่
  for (const location of cityLocations) {
    const x = location.x;
    const z = location.z;

    box(`${location.name} พื้น`, x, 0.15, z, 13, 0.3, 11, "#d7d1c4");
    box(`${location.name} ผนังหลัง`, x, 3, z - 5, 13, 6, 0.4, location.color);
    box(`${location.name} ผนังซ้าย`, x - 6.3, 3, z, 0.4, 6, 10, location.color);
    box(`${location.name} ผนังขวา`, x + 6.3, 3, z, 0.4, 6, 10, location.color);
    box(`${location.name} ผนังหน้าซ้าย`, x - 4.1, 3, z + 5, 4.4, 6, 0.4, location.color);
    box(`${location.name} ผนังหน้าขวา`, x + 4.1, 3, z + 5, 4.4, 6, 0.4, location.color);
    box(`${location.name} หลังคา`, x, 6.2, z, 13.8, 0.4, 11.8, "#c45b4e");

    addLabel(location.name, x, 8, z, "#ffffff");

    collisionBoxes.push(
      { minX: x - 6.5, maxX: x + 6.5, minZ: z - 5.3, maxZ: z - 4.8 },
      { minX: x - 6.5, maxX: x - 6.0, minZ: z - 4.8, maxZ: z + 5.5 },
      { minX: x + 6.0, maxX: x + 6.5, minZ: z - 4.8, maxZ: z + 5.5 },
      { minX: x - 6.5, maxX: x - 4.4, minZ: z + 4.8, maxZ: z + 5.3 },
      { minX: x + 4.4, maxX: x + 6.5, minZ: z + 4.8, maxZ: z + 5.3 }
    );

    location.objects.forEach((object, index) => {
      const ox = x - 4 + (index % 3) * 4;
      const oz = z - 2 + Math.floor(index / 3) * 3;

      let color = "#d3a05c";
      if (location.id === "hospital") color = "#f2f2f2";
      if (location.id === "school") color = "#6a8dcc";
      if (location.id === "shop") color = "#61b97a";

      const group = new THREE.Group();
      group.position.set(ox, 0, oz);
      scene.add(group);

      // สร้างรูปทรงบล็อกที่ต่างกันเพื่อแยกประเภทสิ่งของ
      box(object[0], 0, 0.65, 0, 1.5, 1.3, 1.1, color, group);
      box("ป้ายสิ่งของ", 0, 1.5, 0, 1.1, 0.3, 0.12, "#f9e8a0", group);

      const hitbox = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2.3, 2),
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false
        })
      );
      hitbox.position.set(ox, 1, oz);
      scene.add(hitbox);

      addInteractive(hitbox, {
        type: "cityObject",
        location,
        object,
        objectIndex: index
      });
    });
  }

  // ประตูกลับหมู่บ้านอยู่นอกอาคาร
  const returnPortal = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.35, 8, 24),
    new THREE.MeshStandardMaterial({
      color: "#55e0ba",
      emissive: "#167d6a",
      emissiveIntensity: 1.1
    })
  );
  returnPortal.position.set(0, 2.2, 28);
  scene.add(returnPortal);
  addInteractive(returnPortal, { type: "returnPortal" });
  addLabel("กลับหมู่บ้าน", 0, 5.1, 28, "#ffffff");

  resetPlayer(0, 2.2, 20);
  createAvatar();
  if (petUnlocked) createPet();
  updateHUD();
}

// ======================================
// 5. ตัวละครและสัตว์เลี้ยง
// ======================================
function createAvatar() {
  avatar = new THREE.Group();

  const style = characterStyles[selectedCharacter];

  const body = box("ตัวละคร", 0, 1.05, 0, 0.65, 0.8, 0.35, style.shirt, avatar);
  const head = box("หัว", 0, 1.72, 0, 0.55, 0.55, 0.55, style.skin, avatar);
  box("ผม", 0, 2.02, 0, 0.57, 0.16, 0.57, "#543a2b", avatar);
  box("ขาซ้าย", -0.17, 0.38, 0, 0.22, 0.55, 0.25, style.pants, avatar);
  box("ขาขวา", 0.17, 0.38, 0, 0.22, 0.55, 0.25, style.pants, avatar);
  box("แขนซ้าย", -0.44, 1.08, 0, 0.2, 0.65, 0.23, style.shirt, avatar);
  box("แขนขวา", 0.44, 1.08, 0, 0.2, 0.65, 0.23, style.shirt, avatar);

  avatar.visible = isThirdPerson;
  scene.add(avatar);
  syncAvatar();
}

function createPet() {
  if (pet) scene.remove(pet);

  pet = new THREE.Group();
  box("ตัวสัตว์เลี้ยง", 0, 0.45, 0, 0.65, 0.55, 0.8, "#d7a36a", pet);
  box("หัวสัตว์เลี้ยง", 0, 0.78, -0.38, 0.55, 0.5, 0.5, "#e5b57b", pet);
  box("หูซ้าย", -0.18, 1.05, -0.48, 0.15, 0.25, 0.15, "#a87947", pet);
  box("หูขวา", 0.18, 1.05, -0.48, 0.15, 0.25, 0.15, "#a87947", pet);
  box("หาง", 0, 0.65, 0.48, 0.2, 0.2, 0.5, "#a87947", pet);
  scene.add(pet);
  pets.push(pet);
}

function syncAvatar() {
  if (!avatar) return;
  const player = controls.getObject();
  avatar.position.set(player.position.x, 0, player.position.z);
  avatar.rotation.y = player.rotation.y;
}

function resetPlayer(x, y, z) {
  controls.getObject().position.set(x, y, z);
  controls.getObject().rotation.set(0, 0, 0);
  camera.rotation.set(0, 0, 0);
  jumpVelocity = 0;
  isGrounded = true;
}

// ======================================
// 6. ภารกิจและคำถาม
// ======================================
function openQuestion(title, question, answers, correctIndex, onFinish) {
  if (currentQuestion) return;

  controls.unlock();
  currentQuestion = { answered: false, onFinish };

  document.getElementById("quizTitle").textContent = title;
  document.getElementById("question").textContent = question;
  document.getElementById("feedback").textContent = "";
  document.getElementById("answers").innerHTML = "";
  document.getElementById("nextButton").classList.add("hidden");

  answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.textContent = answer;

    button.addEventListener("click", () => {
      if (currentQuestion.answered) return;
      currentQuestion.answered = true;

      const correct = index === correctIndex;
      if (correct) {
        score += 10;
        document.getElementById("feedback").textContent =
          "🎉 ถูกต้อง! ได้รับ 10 คะแนน";
        button.classList.add("correct");
        showNotice("เก่งมาก! ได้รับ 10 คะแนน");
      } else {
        document.getElementById("feedback").textContent =
          `ยังไม่ถูกนะ คำตอบที่ถูกคือ ${answers[correctIndex]}`;
        button.classList.add("wrong");
      }

      [...document.getElementById("answers").children].forEach((b, i) => {
        b.disabled = true;
        if (i === correctIndex) b.classList.add("correct");
      });

      document.getElementById("nextButton").classList.remove("hidden");
      updateHUD();
    });

    document.getElementById("answers").appendChild(button);
  });

  document.getElementById("quizScreen").classList.remove("hidden");
}


document.getElementById("nextButton").addEventListener("click", () => {
  if (!currentQuestion) return;

  const callback = currentQuestion.onFinish;
  currentQuestion = null;
  document.getElementById("quizScreen").classList.add("hidden");

  callback?.();
  updateHUD();

  // กลับเข้าสู่เกมและล็อกเมาส์เพื่อให้เดินได้
  document.getElementById("startScreen").classList.add("hidden");
  controls.lock();
});


function startVillageQuestion(house) {
  if (house.used) {
    showNotice("บ้านหลังนี้ทำภารกิจแล้ว ลองไปบ้านหลังอื่นนะ");
    return;
  }

  const questionData = villageQuestions[house.index];

  if (!questionData) return;

  openQuestion(
    `${house.name} — ภารกิจ ${questionData.object}`,
    questionData.q,
    questionData.a,
    questionData.correct,
    () => {
      house.used = true;
      completedVillage.add(house.index);

      // เมื่อทำภารกิจถูกอย่างน้อยหนึ่งครั้ง จะได้สัตว์เลี้ยง
      if (score > 0 && !petUnlocked) {
        petUnlocked = true;
        createPet();
        showNotice("🐾 ได้รับสัตว์เลี้ยงแล้ว! มันจะเดินตามแก");
      }

      updateHUD();
    }
  );
}

function startCityQuestion(data) {
  const key = `${data.location.id}-${data.objectIndex}`;
  if (completedCity.has(key)) {
    showNotice("สิ่งของชิ้นนี้ทำภารกิจแล้ว ลองชิ้นอื่นดูนะ");
    return;
  }

  openQuestion(
    `${data.location.name} — ${data.object[0]}`,
    data.object[1],
    data.object[2],
    data.object[3],
    () => {
      completedCity.add(key);
      updateHUD();
    }
  );
}

// ======================================
// 7. คลิกสิ่งของและวาร์ปข้ามแผนที่
// ======================================
function interact() {
  if (!controls.isLocked || currentQuestion) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables, false);
  if (!hits.length) return;

  const data = hits[0].object.userData.interaction;
  if (!data) return;

  if (data.type === "villageObject") {
    if (currentMap !== "village") return;

    if (data.furnitureType !== data.house.missionType) {
      showNotice(`ภารกิจบ้านนี้อยู่ที่ ${data.house.missionType}`);
      return;
    }

    startVillageQuestion(data.house);
  } else if (data.type === "cityObject") {
    if (currentMap !== "city") return;
    startCityQuestion(data);
  } else if (data.type === "portal") {
    if (completedVillage.size < 10) {
      showNotice(`ทำภารกิจหมู่บ้านให้ครบก่อน ${completedVillage.size}/10`);
      return;
    }

    buildCity();
    showNotice("ยินดีต้อนรับสู่แผนที่เมือง!");
  } else if (data.type === "returnPortal") {
    buildVillage();
    showNotice("กลับสู่หมู่บ้านแล้ว!");
  }
}

document.addEventListener("mousedown", event => {
  if (event.button === 0) interact();
});

// ======================================
// 8. การเคลื่อนไหวและการชน
// ======================================
function collidesAt(x, z) {
  const radius = PLAYER_RADIUS;

  if (x < -47 || x > 47 || z < -47 || z > 47) return true;

  for (const b of collisionBoxes) {
    if (
      x + radius > b.minX &&
      x - radius < b.maxX &&
      z + radius > b.minZ &&
      z - radius < b.maxZ
    ) {
      return true;
    }
  }

  // ป้องกันเดินลงแอ่งน้ำตกในหมู่บ้าน
  if (currentMap === "village" && x > 28 && z < -17 && z > -25) {
    return true;
  }

  return false;
}

function movePlayer(delta) {
  if (!controls.isLocked || currentQuestion) return;

  const player = controls.getObject();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  let dx = 0;
  let dz = 0;

  if (keys.KeyW) { dx += forward.x; dz += forward.z; }
  if (keys.KeyS) { dx -= forward.x; dz -= forward.z; }
  if (keys.KeyA) { dx -= right.x; dz -= right.z; }
  if (keys.KeyD) { dx += right.x; dz += right.z; }

  const length = Math.hypot(dx, dz);
  if (length > 0) {
    dx /= length;
    dz /= length;
  }

  const nextX = player.position.x + dx * WALK_SPEED * delta;
  const nextZ = player.position.z + dz * WALK_SPEED * delta;

  if (!collidesAt(nextX, player.position.z)) player.position.x = nextX;
  if (!collidesAt(player.position.x, nextZ)) player.position.z = nextZ;

  jumpVelocity -= 18 * delta;
  player.position.y += jumpVelocity * delta;

  if (player.position.y <= PLAYER_HEIGHT + 0.5) {
    player.position.y = PLAYER_HEIGHT + 0.5;
    jumpVelocity = 0;
    isGrounded = true;
  }

  syncAvatar();
}

document.addEventListener("keydown", event => {
  keys[event.code] = true;

  if (event.code === "Space" && isGrounded && controls.isLocked) {
    jumpVelocity = JUMP_SPEED;
    isGrounded = false;
  }

  if (["Space", "ArrowUp", "ArrowDown"].includes(event.code)) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", event => {
  keys[event.code] = false;
});

document.addEventListener("pointerlockchange", () => {
  const start = document.getElementById("startScreen");
  if (controls.isLocked) {
    start.classList.add("hidden");
  }
});

document.getElementById("startButton").addEventListener("click", () => {
  document.getElementById("startScreen").classList.add("hidden");
  controls.lock();
});

// ======================================
// 9. มุมมองบุคคลที่หนึ่งและบุคคลที่สาม
// ======================================
document.getElementById("viewButton").addEventListener("click", () => {
  isThirdPerson = !isThirdPerson;

  if (avatar) avatar.visible = isThirdPerson;

  document.getElementById("viewButton").textContent =
    isThirdPerson
      ? "👀 มุมมองบุคคลที่หนึ่ง"
      : "👀 มุมมองบุคคลที่สาม";

  showNotice(isThirdPerson ? "เปลี่ยนเป็นมุมมองบุคคลที่สาม" : "เปลี่ยนเป็นมุมมองบุคคลที่หนึ่ง");
});

function updateCamera() {
  if (!isThirdPerson) {
    camera.position.set(
      controls.getObject().position.x,
      controls.getObject().position.y,
      controls.getObject().position.z
    );
    return;
  }

  const player = controls.getObject();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 0.5,
    player.position.z
  );

  const desired = target.clone().add(
    new THREE.Vector3(
      -direction.x * 5,
      2.2,
      -direction.z * 5
    )
  );

  camera.position.lerp(desired, 0.18);
  camera.lookAt(target);
}

// ======================================
// 10. เลือกตัวละคร
// ======================================
function openOverlay(id) {
  controls.unlock();
  document.getElementById(id).classList.remove("hidden");
}

function closeOverlay(id) {
  document.getElementById(id).classList.add("hidden");
}

document.getElementById("characterButton").addEventListener("click", () => {
  const choices = document.getElementById("characterChoices");
  choices.innerHTML = "";

  characterStyles.forEach((style, index) => {
    const item = document.createElement("div");
    item.className = "characterItem";
    item.innerHTML = `<strong>${style.name}</strong>`;

    const swatch = document.createElement("div");
    swatch.style.height = "25px";
    swatch.style.margin = "10px";
    swatch.style.borderRadius = "8px";
    swatch.style.background = style.shirt;
    item.appendChild(swatch);

    const button = document.createElement("button");
    button.textContent = index === selectedCharacter ? "เลือกอยู่" : "เลือกตัวนี้";
    button.addEventListener("click", () => {
      selectedCharacter = index;
      if (avatar) scene.remove(avatar);
      createAvatar();
      showNotice(`เลือกตัวละคร ${style.name} แล้ว`);
      closeOverlay("characterScreen");
    });

    item.appendChild(button);
    choices.appendChild(item);
  });

  openOverlay("characterScreen");
});

// ======================================
// 11. ร้านค้าและกระเป๋า
// ======================================
function renderShop() {
  document.getElementById("shopScore").textContent = score;
  const root = document.getElementById("shopItems");
  root.innerHTML = "";

  shopCatalog.forEach(item => {
    const owned = ownedItems.includes(item.id);
    const div = document.createElement("div");
    div.className = "shopItem";

    const name = document.createElement("strong");
    name.textContent = item.name;

    const price = document.createElement("p");
    price.textContent = `ราคา ${item.price} คะแนน`;

    const button = document.createElement("button");
    button.textContent = owned ? "ซื้อแล้ว" : "ซื้อสินค้า";
    button.disabled = owned || score < item.price;

    button.addEventListener("click", () => {
      if (owned || score < item.price) return;

      score -= item.price;
      ownedItems.push(item.id);
      equippedItems.push(item.id);
      updateHUD();
      renderShop();
      renderBag();
      showNotice(`ซื้อ ${item.name} สำเร็จ!`);
    });

    div.append(name, price, button);
    root.appendChild(div);
  });
}

function renderBag() {
  const root = document.getElementById("inventoryList");
  root.innerHTML = "";

  if (!ownedItems.length) {
    root.textContent = "กระเป๋ายังว่างอยู่ ลองทำภารกิจเพื่อสะสมคะแนนนะ";
    return;
  }

  ownedItems.forEach(id => {
    const item = shopCatalog.find(x => x.id === id);
    const div = document.createElement("div");
    div.className = "inventoryItem";
    div.textContent = item ? item.name : id;
    root.appendChild(div);
  });

  if (petUnlocked) {
    const petItem = document.createElement("div");
    petItem.className = "inventoryItem";
    petItem.textContent = "🐾 สัตว์เลี้ยงคู่ใจ";
    root.appendChild(petItem);
  }
}

document.getElementById("shopButton").addEventListener("click", () => {
  renderShop();
  openOverlay("shopScreen");
});

document.getElementById("bagButton").addEventListener("click", () => {
  renderBag();
  openOverlay("bagScreen");
});

document.querySelectorAll(".closeButton").forEach(button => {
  button.addEventListener("click", () => {
    closeOverlay("shopScreen");
    closeOverlay("bagScreen");
    closeOverlay("characterScreen");
  });
});

// ======================================
// 12. อัปเดตหน้าจอและสัตว์เลี้ยง
// ======================================
function updateHUD() {
  document.getElementById("score").textContent = score;

  if (currentMap === "village") {
    document.getElementById("progress").textContent = `${completedVillage.size}/10`;
    document.getElementById("mapName").textContent = "แผนที่หมู่บ้าน";
    document.getElementById("hint").textContent =
      "เล็ง + ไปที่เฟอร์นิเจอร์ภารกิจแล้วคลิก";
  } else {
    document.getElementById("progress").textContent = `${completedCity.size}/15`;
    document.getElementById("mapName").textContent = "แผนที่เมือง";
    document.getElementById("hint").textContent =
      "สำรวจโรงเรียน โรงพยาบาล และร้านค้า แล้วคลิกสิ่งของ 5 ชิ้นต่อสถานที่";
  }

  document.getElementById("petStatus").textContent =
    petUnlocked ? "🐾 มีสัตว์เลี้ยงเดินตามแล้ว" : "🐾 ทำภารกิจให้ถูกเพื่อรับสัตว์เลี้ยง";
}

function showNotice(message) {
  const element = document.getElementById("notice");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => element.classList.remove("show"), 2500);
}

function updatePet(delta) {
  if (!pet || !controls.isLocked) return;

  const player = controls.getObject();
  const target = new THREE.Vector3(
    player.position.x - Math.sin(player.rotation.y) * 1.8,
    0,
    player.position.z - Math.cos(player.rotation.y) * 1.8
  );

  pet.position.lerp(target, Math.min(delta * 3, 1));
  pet.position.y = Math.abs(Math.sin(performance.now() * 0.006)) * 0.12;
  pet.rotation.y = player.rotation.y;
}

// ======================================
// 13. เริ่มเกมและวนลูปแสดงผล
// ======================================
buildVillage();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.04);

  movePlayer(delta);
  updatePet(delta);
  syncAvatar();

  if (isThirdPerson) {
    updateCamera();
  } else {
    const player = controls.getObject();
    camera.position.set(
      player.position.x,
      player.position.y,
      player.position.z
    );
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
