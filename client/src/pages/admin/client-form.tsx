import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Link } from "wouter";

const clientFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  industry: z.string().min(1, "Industry is required"),
  description: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  analysisPeriodStart: z.string().optional(),
  analysisPeriodEnd: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

const industries = [
  { id: "manufacturing", label: "Manufacturing" },
  { id: "construction", label: "Construction" },
  { id: "fnb_full_service", label: "F&B - Full Service Restaurant" },
  { id: "fnb_qsr", label: "F&B - Quick Service Restaurant" },
  { id: "fnb_fast_food", label: "F&B - Fast Food Chain" },
  { id: "fnb_franchise", label: "F&B - Franchise" },
  { id: "fnb_independent", label: "F&B - Independent Restaurant" },
  { id: "healthcare", label: "Healthcare, Hospitals & Pharmacies" },
  { id: "hospitality", label: "Hospitality" },
  { id: "hotels_airbnb", label: "Hotels & Airbnb" },
  { id: "logistics", label: "Logistics" },
  { id: "oil_gas", label: "Oil & Gas" },
  { id: "property_development", label: "Property Development" },
  { id: "retail", label: "Retail" },
  { id: "event_management", label: "Event Management" },
  { id: "other", label: "Other" },
];

// Shape returned by GET/PATCH /api/admin/clients/:id (shared/schema.ts's
// `clients` table). Only `name` and `industry` overlap with fields the form
// below actually collects — `description`, the contact fields, and the
// analysis-period fields are not real columns and are not sent or received
// here; they are decorative on both create and edit (see the note on
// `clientFormSchema` above).
interface StoredClient {
  id:       string;
  name:     string;
  industry: string;
}

export default function ClientForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = useParams<{ id?: string }>();
  const clientId = params.id;
  const isEditMode = !!clientId;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      description: "",
      contactPerson: "",
      contactEmail: "",
      contactPhone: "",
      analysisPeriodStart: "",
      analysisPeriodEnd: "",
    },
  });

  // In edit mode, load the real persisted record so the form reflects what
  // is actually saved (name/industry only — see StoredClient above) rather
  // than reusing whatever the create form's blank defaults happened to be.
  const {
    data: existingClient,
    isLoading: isLoadingClient,
    isError: isClientLoadError,
  } = useQuery<StoredClient>({
    queryKey: ["/api/admin/clients", clientId],
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingClient) {
      form.reset({
        ...form.getValues(),
        name: existingClient.name,
        industry: existingClient.industry,
      });
    }
  }, [existingClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const createClient = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await apiRequest("POST", "/api/admin/clients", data);
      return response.json();
    },
    // Land on the new client's own workspace (client-detail.tsx), not the
    // list — matches the intended flow (create → client workspace → next
    // steps) rather than dropping the consultant back where they started.
    onSuccess: (created: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Client created",
        description: "The client organization has been created successfully.",
      });
      navigate(`/admin/clients/${created.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client",
        variant: "destructive",
      });
    },
  });

  // Wires the existing PATCH /api/admin/clients/:id endpoint (already
  // auth-gated, already implemented in server/system/routes.ts) — this form
  // previously always POSTed a brand-new client even when the route was
  // "/admin/clients/:id/edit", silently creating a duplicate instead of
  // editing. Only name/industry are sent: the only fields this form both
  // collects and the server persists.
  const updateClient = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const response = await apiRequest("PATCH", `/api/admin/clients/${clientId}`, {
        name: data.name,
        industry: data.industry,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Client updated",
        description: "The client organization has been updated successfully.",
      });
      navigate("/admin/clients");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (isEditMode) {
      updateClient.mutate(data);
    } else {
      createClient.mutate(data);
    }
  };

  const isSaving = isEditMode ? updateClient.isPending : createClient.isPending;

  // Edit mode, still loading the record to edit: render only the header
  // chrome so the form below never briefly shows blank/default fields for
  // an existing client.
  if (isEditMode && isLoadingClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/clients">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Edit Client</h1>
                <p className="text-muted-foreground">Loading client details…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode, but the client couldn't be loaded (deleted, bad id, etc.):
  // show a clear error instead of silently falling through to the create
  // form, which would let the user believe they're editing this client
  // while actually submitting a brand-new one.
  if (isEditMode && isClientLoadError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/clients">
                <Button variant="ghost" size="icon" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Edit Client</h1>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive" data-testid="text-client-load-error">
                This client could not be loaded — it may have been deleted, or the link may be
                invalid. No changes have been made.
              </p>
              <Link href="/admin/clients">
                <Button variant="outline" className="mt-4">Back to Clients</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/clients">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-form-title">
                {isEditMode ? "Edit Client" : "Add New Client"}
              </h1>
              <p className="text-muted-foreground">
                {isEditMode ? "Update this client organization" : "Create a new client organization"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Client Details</CardTitle>
                <CardDescription>Enter the client organization information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., ABC Chocolate Sdn Bhd" 
                          {...field} 
                          data-testid="input-client-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry *</FormLabel>
                      {/*
                        `value` (controlled), not `defaultValue` (uncontrolled
                        — Radix Select only reads it once, at mount). Edit
                        mode populates this field via `form.reset()` after an
                        async fetch, which happens after mount — with
                        `defaultValue` the trigger stayed stuck on the
                        placeholder even though the real value was already
                        correctly present in form state (and would still have
                        been submitted correctly on save, just invisibly).
                      */}
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map((ind) => (
                            <SelectItem key={ind.id} value={ind.id}>
                              {ind.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the company and their challenges..."
                          className="resize-none"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>
                        Optional notes about this client
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Contact Information</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="contactPerson"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Name" 
                              {...field}
                              data-testid="input-contact-person"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="+60 12-345 6789" 
                              {...field}
                              data-testid="input-contact-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email"
                            placeholder="contact@company.com" 
                            {...field}
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium mb-4">Analysis Period</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="analysisPeriodStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              data-testid="input-period-start"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="analysisPeriodEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              data-testid="input-period-end"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    The period of data you'll be analyzing for this client
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Link href="/admin/clients">
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    data-testid="button-submit"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {isEditMode ? "Save Changes" : "Create Client"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
