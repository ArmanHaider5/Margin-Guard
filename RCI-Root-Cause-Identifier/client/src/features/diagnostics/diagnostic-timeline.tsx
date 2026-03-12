import React from "react";

export default function DiagnosticTimeline({ chains }: { chains: any[] }) {

  if (!chains || chains.length === 0) return null;

  const chain = chains[0]?.chain || [];

  return (
    <div className="card mt-6">

      <h3 className="text-lg font-semibold mb-6">
        Diagnostic Timeline
      </h3>

      <div className="flex items-center overflow-x-auto">

        {chain.map((step: string, index: number) => (

          <div key={index} className="flex items-center">

            <div className="p-3 bg-blue-100 rounded-lg text-sm min-w-[150px] text-center">
              {step}
            </div>

            {index < chain.length - 1 && (
              <div className="mx-4 text-gray-400 text-xl">
                →
              </div>
            )}

          </div>

        ))}

      </div>

    </div>
  );
}
