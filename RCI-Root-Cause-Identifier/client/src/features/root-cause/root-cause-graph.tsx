import React from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

export default function RootCauseGraph({ chains }: { chains: any[] }) {

  if (!chains || chains.length === 0) return null;

  const nodes: any[] = [];
  const edges: any[] = [];

  let nodeIndex = 0;

  chains.forEach((chain, cIndex) => {

    chain.chain.forEach((step: string, i: number) => {

      const id = `${cIndex}-${i}`;

      nodes.push({
        id,
        data: { label: step },
        position: { x: i * 220, y: cIndex * 120 }
      });

      if (i > 0) {
        edges.push({
          id: `${id}-edge`,
          source: `${cIndex}-${i - 1}`,
          target: id
        });
      }

      nodeIndex++;
    });

  });

  return (
    <div style={{ height: 400 }}>
      <ReactFlow nodes={nodes} edges={edges}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
