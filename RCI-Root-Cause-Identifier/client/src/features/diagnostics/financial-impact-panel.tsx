import React from "react";

export default function FinancialImpactPanel({ impact }: any) {

  if (!impact) return null;

  return (
    <div className="card mt-6">

      <h3 className="text-lg font-semibold mb-4">
        Estimated Financial Impact
      </h3>

      <ul className="space-y-2">

        <li>Downtime Loss: RM {impact.downtimeLoss?.toLocaleString()}</li>

        <li>Scrap Loss: RM {impact.scrapLoss?.toLocaleString()}</li>

        <li>Overtime Cost: RM {impact.overtimeCost?.toLocaleString()}</li>

      </ul>

      <div className="mt-4 font-bold">
        Total Estimated Loss: RM {impact.totalLoss?.toLocaleString()}
      </div>

    </div>
  );
}
