
"use client";

import { useState } from "react";
import axios from "axios";
import { PackagePlus, CheckCircle2, QrCode, ClipboardList, MapPin, Hash, Phone, User, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type CreatedOrder = {
  order_id: string;
  qr_code_base64: string | null;
  created_at: string;
};

export default function OrderInPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    receiverName: "",
    phoneNumber: "",
    description: "",
    location: "",
    rackNumber: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [timestamp, setTimestamp] = useState("");
  const [qrSrc, setQrSrc] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post<CreatedOrder>("/api/orders", {
        receiver_name: formData.receiverName.trim(),
        phone_number: formData.phoneNumber.trim(),
        description: formData.description.trim(),
        location: formData.location.trim(),
        rack_number: formData.rackNumber.trim(),
      });
      setOrderId(data.order_id);
      setTimestamp(new Date(data.created_at).toLocaleString());
      setQrSrc(data.qr_code_base64);
      setIsSubmitted(true);
      toast({
        title: "Secure SMS Dispatched",
        description: `Intake SMS sent to ${formData.phoneNumber} for order ${data.order_id}.`,
      });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Could not create order";
      toast({ variant: "destructive", title: "Order intake failed", description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-500">
        <Card className="glass border-primary/20 overflow-hidden">
          <CardHeader className="bg-primary/5 text-center py-8 border-b border-primary/10">
            <div className="mx-auto h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-primary animate-bounce" />
            </div>
            <CardTitle className="text-3xl font-bold">Order Successfully Secured</CardTitle>
            <div className="flex items-center justify-center gap-2 text-muted-foreground mt-2">
              <Send className="h-4 w-4" />
              <span>Secure ID and QR sent to {formData.phoneNumber}</span>
            </div>
          </CardHeader>
          <CardContent className="p-8 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">System Unique ID</Label>
                  <p className="text-2xl font-mono font-bold text-primary tracking-wider">{orderId}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Storage Timestamp</Label>
                  <p className="text-lg font-medium">{timestamp}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Storage Location</Label>
                  <p className="text-lg font-medium">
                    {formData.location} - Rack {formData.rackNumber}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setFormData({ receiverName: "", phoneNumber: "", description: "", location: "", rackNumber: "" });
                  setQrSrc(null);
                  setOrderId("");
                  setTimestamp("");
                }}
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/5"
              >
                Register New Order
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-2xl border border-white/10 glow-orange">
              <div className="relative h-48 w-48 bg-white p-2 rounded-xl mb-4 flex items-center justify-center">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="Order QR code" className="max-h-full max-w-full rounded-lg object-contain" />
                ) : (
                  <QrCode className="h-24 w-24 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Encrypted Token QR</p>
                <p className="text-[10px] text-muted-foreground uppercase mt-1">Linked to {orderId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Storage Module</h1>
        <p className="text-muted-foreground">
          Register new intake. A unique ID and QR will be generated and sent to the receiver.
        </p>
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="pb-4 border-b border-white/5">
          <CardTitle className="flex items-center gap-2 text-xl">
            <PackagePlus className="h-5 w-5 text-primary" />
            Storage Intake Form
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Receiver Name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  required
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                  value={formData.receiverName}
                  onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  required
                  inputMode="numeric"
                  maxLength={14}
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="desc" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Order Description
                </Label>
                <Input
                  id="desc"
                  placeholder="e.g., Electronics Box, Amazon Package"
                  required
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Destination / Hall
                </Label>
                <Input
                  id="loc"
                  placeholder="Main Hall - Block B"
                  required
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rack" className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" /> Assigned Rack
                </Label>
                <Input
                  id="rack"
                  placeholder="R-102"
                  required
                  className="bg-white/5 border-white/10 focus:border-primary/50"
                  value={formData.rackNumber}
                  onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                />
              </div>
            </div>

            <Separator className="bg-white/5" />

            <div className="flex justify-end gap-4 items-center">
              <p className="text-xs text-muted-foreground italic">
                Sign in via the sidebar, then submit to create the order on the API.
              </p>
              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="bg-primary hover:bg-orange-600 font-bold px-10 shadow-lg glow-orange transition-all active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    SECURING…
                  </>
                ) : (
                  "GENERATE ID & SECURE"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
