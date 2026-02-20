import React, { useRef, useCallback, useEffect, useImperativeHandle, forwardRef, useMemo } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";

const Graph3D = forwardRef((props, ref) => {
    // Destructure props safely
    const {
        graphData = { nodes: [], links: [] },
        width,
        height,
        backgroundColor,
        selectedNode,
        tracePath,
        darkMode = true,
        COLORS = { accent: "#00d4ff", danger: "#ff3d5a", warning: "#ffb020", pillBg: "rgba(5,11,20,0.9)", labelColor: "#cbd5e1" },
        linkColor,
        linkWidth,
        linkOpacity,
        linkDirectionalArrowLength,
        linkDirectionalArrowRelPos,
        linkDirectionalParticles,
        linkDirectionalParticleWidth,
        linkDirectionalParticleSpeed,
        linkVisibility,
        d3VelocityDecay,
        onNodeClick,
        enableNodeDrag,
        enableNavigationControls,
        showNavInfo,
        warmupTicks,
        cooldownTicks
    } = props;

    const fgRef = useRef();

    // 1. Expose camera methods to parent via imperative handle
    //    Wrapping in an object ensures parent always gets stable method references
    //    even if fgRef.current is null on first render.
    useImperativeHandle(ref, () => ({
        graphData: () => fgRef.current?.graphData() || { nodes: [], links: [] },
        cameraPosition: (pos, lookAt, ms) => fgRef.current?.cameraPosition(pos, lookAt, ms),
        scene: () => fgRef.current?.scene(),
        d3Force: (forceName) => fgRef.current?.d3Force(forceName),
        d3ReheatSimulation: () => fgRef.current?.d3ReheatSimulation()
    }));

    // 2. Initial Setup: Lighting, Physics, and Transparent Background
    //    Without proper lighting, MeshStandardMaterial nodes are invisible on dark bg.
    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;

        const scene = fg.scene();
        if (scene) {
            scene.background = null; // Transparent — let CSS handle bg color

            // Clear old lights to prevent accumulation on re-renders
            const oldLights = scene.children.filter(obj => obj.isLight);
            oldLights.forEach(light => scene.remove(light));

            // 3-point lighting setup
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);

            const direct = new THREE.DirectionalLight(0xffffff, 0.8);
            direct.position.set(100, 200, 100);
            scene.add(direct);

            const point = new THREE.PointLight(0xffffff, 0.5);
            point.position.set(-100, -100, -100);
            scene.add(point);
        }

        // Physics: tighter clustering for financial networks
        fg.d3Force('charge')?.strength(-20);
        fg.d3Force('link')?.distance(30);
        fg.d3Force('center')?.strength(1.5);
    }, [graphData]);

    // 3. Node Visual Generator — creates Three.js objects for each node
    const nodeThreeObject = useCallback((node) => {
        const isSelected = selectedNode?.id === node.id;
        const isSuspicious = node.suspicious || false;
        const isPath = tracePath && tracePath.includes(node.id);
        const score = node.score || 0;
        const totalDegree = (node.in_degree || 0) + (node.out_degree || 0);

        // Determine Size based on risk & connectivity
        let r = 2.5;
        if (isSuspicious && score >= 80) r = 5.5;
        else if (isSuspicious) r = 4.5;
        else if (totalDegree > 20) r = 4;
        else if (totalDegree > 5) r = 3;

        // Determine Color based on risk level
        let nodeColor = "#4a6fa5"; // Default (normal)
        if (isSuspicious) {
            if (score >= 80) nodeColor = COLORS.danger || "#ff3d5a";         // Critical
            else if (score >= 50) nodeColor = COLORS.warning || "#ffb020";   // High/Med
            else nodeColor = "#eab308";                                       // Low suspicion
        } else if (node.centrality_score > 0.05) {
            nodeColor = "#a855f7"; // Centrality bridge
        } else if (totalDegree > 10) {
            nodeColor = "#06b6d4"; // High volume hub
        }

        const group = new THREE.Group();

        // A. Primary Sphere — MeshStandardMaterial reacts to light + has emissive fallback
        const geometry = new THREE.SphereGeometry(r, 16, 12);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(nodeColor),
            emissive: new THREE.Color(nodeColor),
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // B. Glow Effect for suspicious / selected nodes
        if (isSuspicious || isSelected) {
            const glowR = isSelected ? r * 1.6 : r * 1.3;
            const glowGeo = new THREE.SphereGeometry(glowR, 16, 12);
            const glowColor = isSelected ? (COLORS.accent || "#00d4ff") : nodeColor;
            const glowMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(glowColor),
                transparent: true,
                opacity: 0.2,
                depthWrite: false
            });
            group.add(new THREE.Mesh(glowGeo, glowMat));
        }

        // C. Selection ring (torus)
        if (isSelected) {
            const ringGeo = new THREE.TorusGeometry(r * 1.8, 0.3, 8, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(COLORS.accent || "#00d4ff"),
                transparent: true,
                opacity: 0.7
            });
            group.add(new THREE.Mesh(ringGeo, ringMat));
        }

        // D. Path highlight ring
        if (isPath && !isSelected) {
            const pathGeo = new THREE.TorusGeometry(r * 1.6, 0.25, 8, 32);
            const pathMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color("#ffb020"),
                transparent: true,
                opacity: 0.6
            });
            group.add(new THREE.Mesh(pathGeo, pathMat));
        }

        // E. Text Label (Sprite) — shown for notable nodes
        if (isSuspicious || isSelected || isPath || totalDegree > 20) {
            const label = node.id || "Unknown";
            const shortLabel = label.length > 12 ? label.slice(0, 10) + ".." : label;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;

            ctx.clearRect(0, 0, 256, 64);

            // Pill background
            ctx.fillStyle = COLORS.pillBg || "rgba(0,0,0,0.8)";
            ctx.beginPath();
            ctx.roundRect(10, 10, 236, 44, 12);
            ctx.fill();

            // Label text
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? (COLORS.accent || "#fff") : (COLORS.labelColor || "#ddd");
            ctx.fillText(shortLabel, 128, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(12, 3, 1);
            sprite.position.set(0, -(r + 4), 0);
            group.add(sprite);
        }

        return group;
    }, [selectedNode, tracePath, COLORS]);

    // Failsafe for empty data
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: COLORS.labelColor }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>🕸️</div>
                    <div>Empty Graph — upload a CSV to visualize</div>
                </div>
            </div>
        );
    }

    return (
        <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={width}
            height={height}
            backgroundColor="rgba(0,0,0,0)"
            rendererConfig={{ preserveDrawingBuffer: true, alpha: true }}

            nodeThreeObject={nodeThreeObject}
            nodeThreeObjectExtend={false}

            // Links
            linkColor={linkColor}
            linkWidth={linkWidth}
            linkOpacity={linkOpacity}
            linkDirectionalArrowLength={3.5}
            linkDirectionalArrowRelPos={1}
            linkDirectionalParticles={linkDirectionalParticles}
            linkDirectionalParticleWidth={linkDirectionalParticleWidth}
            linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
            linkVisibility={linkVisibility}

            // Physics
            d3VelocityDecay={d3VelocityDecay}
            onNodeClick={onNodeClick}
            enableNodeDrag={enableNodeDrag}
            enableNavigationControls={enableNavigationControls}
            showNavInfo={showNavInfo}

            // Performance
            warmupTicks={warmupTicks}
            cooldownTicks={cooldownTicks}
        />
    );
});

export default Graph3D;
