/**
 * Case Memory Redirect Page
 * 
 * INSTITUTIONAL RULE: Case memory must always be client-owned.
 * Cases are displayed ONLY within the Client Overview.
 * This page redirects users to select a client first.
 */

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Building2,
  FolderOpen,
} from "lucide-react";

export default function CasesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Case Memory</h1>
              <p className="text-sm text-muted-foreground">Client-owned diagnostic cases</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center max-w-lg mx-auto">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2" data-testid="text-access-title">
            Case Memory is Client-Owned
          </h2>
          <p className="text-muted-foreground mb-6" data-testid="text-access-description">
            Cases are displayed within the Client Overview. Please select a client to view their saved diagnostic cases.
          </p>
          <Link href="/admin/clients">
            <Button data-testid="button-go-to-clients">
              <Building2 className="w-4 h-4 mr-2" />
              Go to Clients
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
