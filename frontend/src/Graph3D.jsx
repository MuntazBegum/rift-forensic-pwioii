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

    // 1. Expose camera methods to parent
    useImperativeHandle(ref, () => ({
        graphData: () => fgRef.current?.graphData() || { nodes: [], links: [] },
        cameraPosition: (pos, lookAt, ms) => fgRef.current?.cameraPosition(pos, lookAt, ms),
        scene: () => fgRef.current?.scene(),
        d3Force: (forceName) => fgRef.current?.d3Force(forceName),
        d3ReheatSimulation: () => fgRef.current?.d3ReheatSimulation()
    }));

    // 2. Initial Setup: Lighting, Physics, and Transparent Background
    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;

        // Force transparency by default
        // If backgroundColor prop is provided, we can set scene.background, but we prefer transparent
        // to let CSS handle it.
        const scene = fg.scene();
        if (scene) {
            scene.background = null; // Ensure transparency

            // Clear old lights to prevent accumulation
            const oldLights = scene.children.filter(obj => obj.isLight);
            oldLights.forEach(light => scene.remove(light));

            // Add robust 3-point lighting
            // Ambient to light up everything
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);

            // Directional for shadows/definition
            const direct = new THREE.DirectionalLight(0xffffff, 0.8);
            direct.position.set(100, 200, 100);
            scene.add(direct);

            // Point light for close-up highlights
            const point = new THREE.PointLight(0xffffff, 0.5);
            point.position.set(-100, -100, -100);
            scene.add(point);
        }

        // Physics settings
        fg.d3Force('charge')?.strength(-20);
        fg.d3Force('link')?.distance(30);
        fg.d3Force('center')?.strength(1.5);
    }, [graphData]); // Re-run if data changes significantly

    // 3. Node Visual Generator
    const nodeThreeObject = useCallback((node) => {
        // Safe access to properties
        const isSelected = selectedNode?.id === node.id;
        const isSuspicious = node.suspicious || false; // Ensure fallback
        const isPath = tracePath && tracePath.includes(node.id);
        const score = node.score || 0;
        const totalDegree = (node.in_degree || 0) + (node.out_degree || 0);

        // Determine Size
        let r = 2.5;
        if (isSuspicious && score >= 80) r = 5.5;
        else if (isSuspicious) r = 4.5;
        else if (totalDegree > 20) r = 4;
        else if (totalDegree > 5) r = 3;

        // Determine Color
        let nodeColor = "#4a6fa5"; // Default (normal)
        if (isSuspicious) {
            if (score >= 80) nodeColor = COLORS.danger || "#ff3d5a";    // Critical
            else if (score >= 50) nodeColor = COLORS.warning || "#ffb020"; // High/Med
            else nodeColor = "#eab308"; // Low suspicion
        } else if (node.centrality_score > 0.05) {
            nodeColor = "#a855f7"; // Centrality Hub
        } else if (totalDegree > 10) {
            nodeColor = "#06b6d4"; // High volume
        }

        const group = new THREE.Group();

        // A. Primary Sphere
        // Use MeshStandardMaterial for reaction to light + fallback emissive
        const geometry = new THREE.SphereGeometry(r, 16, 12);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(nodeColor),
            emissive: new THREE.Color(nodeColor),
            emissiveIntensity: 0.4, // Always visible even in dark
            roughness: 0.3,
            metalness: 0.5,
            transparent: true,
            opacity: 1.0
        });
        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        // B. Glow Effect (Suspicious / Selected)
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

        // C. Text Label (Sprite)
        // Show if suspicious, selected, path, or high volume
        if (isSuspicious || isSelected || isPath || totalDegree > 20) {
            const label = node.id || "Unknown";
            const shortLabel = label.length > 12 ? label.slice(0, 10) + ".." : label;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64; // wider for padding

            // Clear
            ctx.clearRect(0, 0, 256, 64);

            // Pill Background
            ctx.fillStyle = COLORS.pillBg || "rgba(0,0,0,0.8)";
            ctx.beginPath();
            // simple rounded rect simulation
            ctx.roundRect(10, 10, 236, 44, 12);
            ctx.fill();

            // Text
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isSelected ? (COLORS.accent || "#fff") : (COLORS.labelColor || "#ddd");
            ctx.fillText(shortLabel, 128, 32);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({
                map: texture,
                transparent: true,
                depthTest: false // Ensures label is always on top of other 3D objects
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(12, 3, 1);
            sprite.position.set(0, -(r + 4), 0); // Position below node
            group.add(sprite);
        }

        return group;
    }, [selectedNode, tracePath, COLORS]);

    // Render failsafe
    if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: COLORS.labelColor }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 10 }}>🕸️</div>
                    <div>Empty Graph</div>
                </div>
            </div>
        );
    }

    return (
        <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            width={width} // Pass explicit dimensions
            height={height}
            backgroundColor="rgba(0,0,0,0)" // Transparent background
            rendererConfig={{ preserveDrawingBuffer: true, alpha: true }} // WebGL Config

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
