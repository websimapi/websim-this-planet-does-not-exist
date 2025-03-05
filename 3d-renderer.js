import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadTextureWithFallback } from './planet-generator.js';

export class PlanetRenderer {
  constructor(container, size = { width: 300, height: 300 }) {
    this.container = container;
    this.size = size;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.planet = null;
    this.controls = null;
    this.isAnimating = false;
    
    this.init();
  }
  
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      this.size.width / this.size.height, 
      0.1, 
      1000
    );
    this.camera.position.z = 2;
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    
    // Add renderer to container
    this.container.appendChild(this.renderer.domElement);
    
    // Add orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    this.scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 3, 5);
    this.scene.add(directionalLight);
    
    // Add stars background
    this.addStars();
    
    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    
    // Start animation
    this.startAnimation();
  }
  
  addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
    });
    
    const starsVertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(stars);
  }
  
  async createPlanet(imageUrl = null) {
    // Remove existing planet if any
    if (this.planet) {
      this.scene.remove(this.planet);
    }
    
    // Create geometry
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    let material;
    
    if (imageUrl) {
      try {
        // Load texture with fallback
        const texture = await loadTextureWithFallback(imageUrl);
        
        // Create material with texture
        material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.7,
          metalness: 0.1
        });
      } catch (error) {
        console.error('Failed to load texture, falling back to default material:', error);
        
        // Fallback material - procedural planet
        material = this.createProceduralPlanetMaterial();
      }
    } else {
      // Default material - procedural planet
      material = this.createProceduralPlanetMaterial();
    }
    
    // Create mesh
    this.planet = new THREE.Mesh(geometry, material);
    
    // Add atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(1.02, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.1
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.planet.add(atmosphere);
    
    // Add to scene
    this.scene.add(this.planet);
    
    return this.planet;
  }
  
  createProceduralPlanetMaterial() {
    // Create a procedural planet texture as fallback
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Fill background with a random base color
    const hue = Math.random() * 360;
    ctx.fillStyle = `hsl(${hue}, 50%, 40%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some noise/features
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 5 + 1;
      const alpha = Math.random() * 0.3;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${hue + Math.random() * 60 - 30}, 60%, 60%, ${alpha})`;
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    
    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.1
    });
  }
  
  startAnimation() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.animate();
  }
  
  stopAnimation() {
    this.isAnimating = false;
  }
  
  animate() {
    if (!this.isAnimating) return;
    
    requestAnimationFrame(() => this.animate());
    
    if (this.planet) {
      this.planet.rotation.y += 0.001;
    }
    
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  handleResize() {
    if (!this.container) return;
    
    // Update size
    this.size.width = this.container.clientWidth;
    this.size.height = this.container.clientHeight;
    
    // Update camera
    this.camera.aspect = this.size.width / this.size.height;
    this.camera.updateProjectionMatrix();
    
    // Update renderer
    this.renderer.setSize(this.size.width, this.size.height);
  }
  
  updateSize(width, height) {
    this.size.width = width;
    this.size.height = height;
    this.handleResize();
  }
  
  dispose() {
    this.stopAnimation();
    
    if (this.planet) {
      this.scene.remove(this.planet);
      this.planet.geometry.dispose();
      this.planet.material.dispose();
      if (this.planet.material.map) {
        this.planet.material.map.dispose();
      }
    }
    
    if (this.controls) {
      this.controls.dispose();
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Create a smaller planet renderer for gallery cards
export class MiniPlanetRenderer extends PlanetRenderer {
  constructor(container, size = { width: 150, height: 150 }) {
    super(container, size);
    
    // Adjust camera and controls for mini renderer
    this.camera.position.z = 2.5;
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1.5;
  }
}

