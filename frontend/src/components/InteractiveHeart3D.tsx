import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Volume2, VolumeX, Eye, Zap, Layers, RefreshCw, Sparkles, Heart } from 'lucide-react';

interface InteractiveHeart3DProps {
  bpm: number;
  alertLevel?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  height?: number | string;
  enableControls?: boolean;
}

export const InteractiveHeart3D: React.FC<InteractiveHeart3DProps> = ({
  bpm,
  alertLevel = 'GREEN',
  height = 420,
  enableControls = true
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [conductionMode, setConductionMode] = useState(true);
  const [selectedChamber, setSelectedChamber] = useState<string>('Entire Myocardium');
  const [currentBpm, setCurrentBpm] = useState(bpm);

  useEffect(() => {
    setCurrentBpm(bpm);
  }, [bpm]);

  // Audio Context for Stethoscope S1 (Lub) and S2 (Dub)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playHeartSound = (isS1: boolean) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      // S1 (AV valves closing): Lower pitch, longer duration
      // S2 (Semilunar valves closing): Higher pitch, shorter duration
      const freq = isS1 ? 75 : 110;
      const duration = isS1 ? 0.12 : 0.08;

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const width = container.clientWidth || 400;
    const h = typeof height === 'number' ? height : container.clientHeight || 400;

    const camera = new THREE.PerspectiveCamera(45, width / h, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    // 2. Renderer with Antialiasing & Alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(5, 8, 6);
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x0d9488, 1.2); // Teal rim glow
    rimLight.position.set(-6, -4, -4);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xf43f5e, 1.5, 10); // Red internal glow
    warmLight.position.set(0, 0, 2);
    scene.add(warmLight);

    // 4. Heart Geometry Group
    const heartGroup = new THREE.Group();
    scene.add(heartGroup);

    // Color definitions based on alert
    const getBaseColor = () => {
      switch (alertLevel) {
        case 'RED': return 0xdc2626;
        case 'ORANGE': return 0xea580c;
        case 'YELLOW': return 0xd97706;
        default: return 0xe11d48; // Healthy crimson
      }
    };

    // Myocardial Muscle Material
    const muscleMaterial = new THREE.MeshPhysicalMaterial({
      color: getBaseColor(),
      emissive: 0x4c0519,
      roughness: 0.25,
      metalness: 0.15,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      wireframe: wireframeMode,
      transparent: true,
      opacity: wireframeMode ? 0.6 : 0.95
    });

    // Vessel Materials
    const aortaMaterial = new THREE.MeshStandardMaterial({
      color: 0xbe123c, // Oxygenated artery red
      roughness: 0.3,
      metalness: 0.2,
      wireframe: wireframeMode
    });

    const venaCavaMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Deoxygenated venous blue
      roughness: 0.3,
      metalness: 0.2,
      wireframe: wireframeMode
    });

    const coronaryArteryMaterial = new THREE.MeshStandardMaterial({
      color: 0xff4d4d,
      emissive: 0xaa1111,
      roughness: 0.2
    });

    // A. Left & Right Ventricles (Dual Bulb Anatomical Approximation)
    const leftVentricleGeo = new THREE.SphereGeometry(1.2, 32, 32);
    leftVentricleGeo.scale(0.9, 1.4, 0.9);
    const leftVentricle = new THREE.Mesh(leftVentricleGeo, muscleMaterial);
    leftVentricle.position.set(-0.25, -0.4, 0);
    leftVentricle.rotation.z = 0.2;
    heartGroup.add(leftVentricle);

    const rightVentricleGeo = new THREE.SphereGeometry(1.0, 32, 32);
    rightVentricleGeo.scale(0.85, 1.25, 0.85);
    const rightVentricle = new THREE.Mesh(rightVentricleGeo, muscleMaterial);
    rightVentricle.position.set(0.45, -0.3, 0.15);
    rightVentricle.rotation.z = -0.15;
    heartGroup.add(rightVentricle);

    // B. Left & Right Atria
    const leftAtriumGeo = new THREE.SphereGeometry(0.75, 24, 24);
    leftAtriumGeo.scale(0.9, 0.8, 0.9);
    const leftAtrium = new THREE.Mesh(leftAtriumGeo, muscleMaterial);
    leftAtrium.position.set(-0.6, 0.8, -0.2);
    heartGroup.add(leftAtrium);

    const rightAtriumGeo = new THREE.SphereGeometry(0.8, 24, 24);
    rightAtriumGeo.scale(0.95, 0.85, 0.9);
    const rightAtrium = new THREE.Mesh(rightAtriumGeo, muscleMaterial);
    rightAtrium.position.set(0.65, 0.75, 0.05);
    heartGroup.add(rightAtrium);

    // C. Ascending Aorta with Aortic Arch Curve
    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.1, 0.7, 0),
      new THREE.Vector3(-0.1, 1.5, 0),
      new THREE.Vector3(0.3, 1.8, -0.1),
      new THREE.Vector3(0.6, 1.5, -0.4),
      new THREE.Vector3(0.6, 0.3, -0.5)
    ]);
    const aortaGeo = new THREE.TubeGeometry(aortaCurve, 40, 0.26, 16, false);
    const aorta = new THREE.Mesh(aortaGeo, aortaMaterial);
    heartGroup.add(aorta);

    // Aortic Arch Branches (Brachiocephalic, Left Common Carotid, Left Subclavian)
    for (let i = 0; i < 3; i++) {
      const branchGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.45, 12);
      const branch = new THREE.Mesh(branchGeo, aortaMaterial);
      branch.position.set(0.05 + i * 0.18, 1.85, -0.05 - i * 0.06);
      branch.rotation.z = -0.1 + i * 0.1;
      heartGroup.add(branch);
    }

    // D. Pulmonary Trunk / Artery
    const pulmonaryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.6, 0.3),
      new THREE.Vector3(0.0, 1.2, 0.2),
      new THREE.Vector3(-0.5, 1.4, -0.2)
    ]);
    const pulmonaryGeo = new THREE.TubeGeometry(pulmonaryCurve, 30, 0.22, 16, false);
    const pulmonary = new THREE.Mesh(pulmonaryGeo, venaCavaMaterial);
    heartGroup.add(pulmonary);

    // E. Superior Vena Cava
    const svcGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.2, 16);
    const svc = new THREE.Mesh(svcGeo, venaCavaMaterial);
    svc.position.set(0.85, 1.3, -0.1);
    svc.rotation.z = -0.1;
    heartGroup.add(svc);

    // F. Coronary Vasculature Network (Surface Vessels)
    const vesselCurves = [
      // Left Anterior Descending (LAD) Artery
      [new THREE.Vector3(-0.1, 0.6, 0.9), new THREE.Vector3(-0.15, 0.0, 1.1), new THREE.Vector3(-0.25, -0.7, 0.9), new THREE.Vector3(-0.2, -1.3, 0.4)],
      // Right Coronary Artery (RCA)
      [new THREE.Vector3(0.4, 0.5, 0.8), new THREE.Vector3(0.65, 0.1, 0.7), new THREE.Vector3(0.55, -0.5, 0.6), new THREE.Vector3(0.2, -1.0, 0.4)]
    ];
    vesselCurves.forEach(points => {
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.045, 8, false), coronaryArteryMaterial);
      heartGroup.add(tube);
    });

    // G. Electrical Conduction Pathway Nodes & Spark Particles
    const conductionPoints = [
      new THREE.Vector3(0.85, 1.1, 0.1),  // Sinoatrial (SA) Node
      new THREE.Vector3(0.1, 0.5, 0.1),   // Atrioventricular (AV) Node
      new THREE.Vector3(0.0, 0.0, 0.2),   // Bundle of His
      new THREE.Vector3(-0.3, -0.7, 0.3), // Left Bundle Branch
      new THREE.Vector3(0.3, -0.6, 0.3),  // Right Bundle Branch
      new THREE.Vector3(-0.2, -1.4, 0.1), // Purkinje Apical Network
      new THREE.Vector3(0.2, -1.2, 0.1)
    ];

    const sparkGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 }); // Electric cyan glow
    const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
    sparkMesh.visible = conductionMode;
    heartGroup.add(sparkMesh);

    // Node markers
    const saNodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const saNodeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Gold SA Node
    const saNode = new THREE.Mesh(saNodeGeo, saNodeMat);
    saNode.position.copy(conductionPoints[0]);
    saNode.visible = conductionMode;
    heartGroup.add(saNode);

    // Conduction Wire
    const conductionCurve = new THREE.CatmullRomCurve3(conductionPoints.slice(0, 6));
    const conductionTube = new THREE.Mesh(
      new THREE.TubeGeometry(conductionCurve, 30, 0.02, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6, wireframe: true })
    );
    conductionTube.visible = conductionMode;
    heartGroup.add(conductionTube);

    // 5. Mouse Interaction / Orbital Rotation
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    let rotationVelocity = { x: 0.002, y: 0.005 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !enableControls) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      heartGroup.rotation.y += deltaX * 0.01;
      heartGroup.rotation.x += deltaY * 0.01;

      rotationVelocity = { x: deltaY * 0.002, y: deltaX * 0.002 };
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch support for mobile
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !enableControls || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;

      heartGroup.rotation.y += deltaX * 0.01;
      heartGroup.rotation.x += deltaY * 0.01;

      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const onTouchEnd = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 6. Animation Loop: Dynamic Cardiac Cycle
    let animationFrameId: number;
    let clock = new THREE.Clock();
    let lastBeatTime = 0;
    let s2Played = false;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      const beatFrequency = (currentBpm || 72) / 60; // beats per second
      const beatPeriod = 1 / beatFrequency;
      const beatPhase = (elapsedTime % beatPeriod) / beatPeriod; // 0.0 to 1.0

      // Sound Triggering for S1 (Systole start) and S2 (Systole end)
      if (beatPhase < 0.1 && elapsedTime - lastBeatTime > beatPeriod * 0.8) {
        playHeartSound(true);
        lastBeatTime = elapsedTime;
        s2Played = false;
      } else if (beatPhase > 0.32 && !s2Played) {
        playHeartSound(false);
        s2Played = true;
      }

      // Contraction Scale Curves: Wiggers diagram approximation
      // Rapid ventricular ejection (systole: 0.1 to 0.35)
      // Isovolumetric relaxation and rapid ventricular filling (diastole: 0.35 to 1.0)
      let scaleY = 1.0;
      let scaleXZ = 1.0;

      if (beatPhase < 0.15) {
        // Atrial kick / ventricular pre-systole
        const t = beatPhase / 0.15;
        scaleY = 1.0 + Math.sin(t * Math.PI) * 0.06;
        scaleXZ = 1.0 + Math.sin(t * Math.PI) * 0.04;
      } else if (beatPhase >= 0.15 && beatPhase < 0.4) {
        // Ventricular Systolic Contraction
        const t = (beatPhase - 0.15) / 0.25;
        const systolicPump = Math.sin(t * Math.PI);
        scaleY = 1.0 - systolicPump * 0.14; // Myocardium thickens and shortens
        scaleXZ = 1.0 + systolicPump * 0.11;
      } else {
        // Diastolic Filling Relaxation
        const t = (beatPhase - 0.4) / 0.6;
        scaleY = 0.95 + Math.sin(t * Math.PI * 0.5) * 0.05;
        scaleXZ = 1.05 - Math.sin(t * Math.PI * 0.5) * 0.05;
      }

      heartGroup.scale.set(scaleXZ, scaleY, scaleXZ);

      // Electrical Spark Progression along Conduction Path
      if (conductionMode) {
        const sparkT = (beatPhase * 1.5) % 1.0;
        const sparkPos = conductionCurve.getPointAt(sparkT);
        sparkMesh.position.copy(sparkPos);
        const pulseGlow = Math.sin(elapsedTime * 12) * 0.5 + 0.5;
        saNode.scale.setScalar(1.0 + pulseGlow * 0.3);
      }

      // Idle Rotation Dampening
      if (!isDragging) {
        heartGroup.rotation.y += rotationVelocity.y;
        heartGroup.rotation.x += rotationVelocity.x;
        rotationVelocity.x *= 0.96;
        rotationVelocity.y = rotationVelocity.y * 0.96 + 0.003 * 0.04; // Baseline slow drift
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = typeof height === 'number' ? height : container.clientHeight || 400;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      renderer.dispose();
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [alertLevel, wireframeMode, conductionMode, height, enableControls]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-b from-navy-950 via-slate-900 to-navy-950 border border-navy-800 shadow-2xl flex flex-col justify-between">
      
      {/* 3D Viewport Canvas Container */}
      <div
        ref={mountRef}
        className="w-full relative cursor-grab active:cursor-grabbing flex items-center justify-center"
        style={{ height }}
      >
        {/* Subtle Watermark Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none"></div>

        {/* Live Telemetry Overlay Badge */}
        <div className="absolute top-4 left-4 z-10 pointer-events-none flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs font-mono font-extrabold text-white uppercase tracking-wider">
              Live Contraction Cycle
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white font-mono tracking-tight">{currentBpm}</span>
            <span className="text-xs font-bold text-teal-400">BPM</span>
            <span className="text-[10px] text-slate-400 font-mono ml-1">
              ({((currentBpm / 60)).toFixed(2)} Hz)
            </span>
          </div>
        </div>

        {/* Chamber Selection Badge */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white text-xs font-mono">
          <Heart className="w-3.5 h-3.5 text-teal-400" />
          <span>{selectedChamber}</span>
        </div>
      </div>

      {/* Interactive Control HUD Toolbar */}
      <div className="p-3 bg-navy-900/80 backdrop-blur-md border-t border-navy-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        
        {/* Left: Toggles */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition font-medium ${
              soundEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                : 'bg-navy-950/60 text-slate-400 border-navy-800 hover:text-white'
            }`}
            title="Toggle S1/S2 Stethoscope Acoustic Simulation"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundEnabled ? 'Audio Active' : 'Sound Off'}</span>
          </button>

          {/* Conduction Mode Toggle */}
          <button
            onClick={() => setConductionMode(!conductionMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition font-medium ${
              conductionMode
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-navy-950/60 text-slate-400 border-navy-800 hover:text-white'
            }`}
            title="Toggle SA/AV Node Electrical Pathway"
          >
            <Zap className={`w-3.5 h-3.5 ${conductionMode ? 'text-cyan-400' : ''}`} />
            <span>Electrical Nodes</span>
          </button>

          {/* Wireframe / Structural Toggle */}
          <button
            onClick={() => setWireframeMode(!wireframeMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition font-medium ${
              wireframeMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-navy-950/60 text-slate-400 border-navy-800 hover:text-white'
            }`}
            title="Toggle Myocardial Surface Wireframe"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wireframe</span>
          </button>
        </div>

        {/* Right: Chamber Quick Highlighting */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-slate-500 hidden sm:inline mr-1">Focus:</span>
          {['Entire Myocardium', 'Left Ventricle', 'Aortic Arch'].map((chamber) => (
            <button
              key={chamber}
              onClick={() => setSelectedChamber(chamber)}
              className={`px-2 py-1 rounded-md transition ${
                selectedChamber === chamber
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-navy-950 hover:bg-navy-800 text-slate-400'
              }`}
            >
              {chamber.split(' ')[0]}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};

