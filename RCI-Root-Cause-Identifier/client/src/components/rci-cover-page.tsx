import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import type { RCICoverPage } from "@shared/export-types";

interface RCICoverPagePreviewProps {
  data: RCICoverPage;
  variant?: "preview" | "print";
}

const defaultConfidentialityNotice = 
  "This document contains confidential information prepared exclusively for the named recipient. " +
  "Distribution, reproduction, or disclosure to third parties without prior written consent is prohibited. " +
  "The contents herein are intended for decision-support purposes and should be validated against authoritative sources.";

export function RCICoverPagePreview({ 
  data,
  variant = "preview"
}: RCICoverPagePreviewProps) {
  const isPreview = variant === "preview";

  return (
    <Card className={isPreview ? "" : "border-0 shadow-none"}>
      <CardContent className={`${isPreview ? "p-8" : "p-0"}`}>
        <div 
          className="flex flex-col min-h-[500px] bg-background"
          style={{ aspectRatio: isPreview ? "8.5/11" : undefined }}
          data-testid="cover-page-preview"
        >
          <div className="flex-1 flex flex-col justify-center items-center text-center px-8 py-12">
            <div className="space-y-2 mb-12">
              <p className="text-sm text-muted-foreground uppercase tracking-widest">
                Prepared for
              </p>
              <h1 className="text-2xl font-semibold" data-testid="text-client-name">
                {data.clientName}
              </h1>
            </div>

            <Separator className="w-24 my-8" />

            <div className="space-y-3 mb-12">
              <h2 className="text-3xl font-bold" data-testid="text-engagement-title">
                {data.engagementTitle}
              </h2>
              {data.engagementSubtitle && (
                <p className="text-lg text-muted-foreground">
                  {data.engagementSubtitle}
                </p>
              )}
            </div>

            <div className="space-y-1 text-muted-foreground">
              <p className="text-sm" data-testid="text-assessment-date">
                {data.assessmentDate}
              </p>
              {data.documentReference && (
                <p className="text-xs">
                  Ref: {data.documentReference}
                </p>
              )}
            </div>
          </div>

          <div className="border-t px-8 py-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Prepared by
                </p>
                <p className="font-medium" data-testid="text-firm-name">
                  {data.preparedBy.firmName}
                </p>
                {data.preparedBy.consultantName && (
                  <p className="text-sm text-muted-foreground">
                    {data.preparedBy.consultantName}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <p className="text-xs text-muted-foreground leading-relaxed" data-testid="text-confidentiality">
              {data.confidentialityNotice}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function createCoverPageData(options: {
  clientName: string;
  engagementTitle: string;
  engagementSubtitle?: string;
  assessmentDate?: Date | string;
  firmName?: string;
  consultantName?: string;
  documentReference?: string;
  confidentialityNotice?: string;
}): RCICoverPage {
  const dateStr = options.assessmentDate 
    ? (typeof options.assessmentDate === "string" 
        ? options.assessmentDate 
        : format(options.assessmentDate, "MMMM d, yyyy"))
    : format(new Date(), "MMMM d, yyyy");

  return {
    clientName: options.clientName,
    engagementTitle: options.engagementTitle,
    engagementSubtitle: options.engagementSubtitle,
    assessmentDate: dateStr,
    preparedBy: {
      firmName: options.firmName || "Scope Optix",
      consultantName: options.consultantName,
    },
    confidentialityNotice: options.confidentialityNotice || defaultConfidentialityNotice,
    documentReference: options.documentReference,
  };
}

export { defaultConfidentialityNotice };
