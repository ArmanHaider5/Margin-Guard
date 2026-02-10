import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  Building2, 
  Plus,
  Search,
  ArrowLeft,
  MoreVertical,
  FileText,
  BarChart3,
  Mail,
  Phone,
  User
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Client } from "@shared/schema";

export default function AdminClients() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/admin/clients"],
  });

  const filteredClients = clients?.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-clients-title">Client Organizations</h1>
              <p className="text-muted-foreground">Manage your consulting clients</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-clients"
              />
            </div>
            <Link href="/admin/clients/new">
              <Button data-testid="button-add-client">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredClients && filteredClients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover-elevate cursor-pointer" data-testid={`card-client-${client.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                        <CardDescription>{client.industry}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`menu-client-${client.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link href={`/admin/clients/${client.id}`}>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/clients/${client.id}/edit`}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <Link href={`/admin/clients/${client.id}`}>
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                        </Link>
                        <Link href={`/clients/${client.id}/diagnostics/new`}>
                          <DropdownMenuItem>Start Diagnostic</DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {client.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{client.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={client.status === "active" ? "default" : "secondary"}>
                        {client.status}
                      </Badge>
                    </div>

                    {(client.contactPerson || client.contactEmail || client.contactPhone) && (
                      <div className="pt-2 border-t space-y-1">
                        {client.contactPerson && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="w-3 h-3" />
                            <span>{client.contactPerson}</span>
                          </div>
                        )}
                        {client.contactEmail && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span>{client.contactEmail}</span>
                          </div>
                        )}
                        {client.contactPhone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{client.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                      <span>Added {client.createdAt ? formatDistanceToNow(new Date(client.createdAt), { addSuffix: true }) : "recently"}</span>
                      <div className="flex gap-2">
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2" data-testid={`button-view-${client.id}`}>
                            <FileText className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/clients/${client.id}/diagnostics/new`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2" data-testid={`button-analyze-${client.id}`}>
                            <BarChart3 className="w-3 h-3 mr-1" />
                            Analyze
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium">No clients yet</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "No clients match your search" : "Add your first client to get started"}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
