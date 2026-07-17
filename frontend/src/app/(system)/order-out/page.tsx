"use client";

import { useState } from "react";
import axios from "axios";
import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Scan,
  Search,
  Send,
  ShieldCheck,
  Package,
  Clock,
  MapPin,
  User,
  CheckCircle,
  Smartphone,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type OrderDetail = {
  order_id: string;
  receiver_name: string;
  phone_number: number;
  description: string | null;
  rack_number: string | null;
  status: string;
  created_at: string;
};

function maskPhone(phone: string | number): string {
  const d = String(phone).replace(/\D/g, "");
  if (d.length <= 4) return "****";
  return `******${d.slice(-4)}`;
}

export default function OrderOutPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [otp, setOtp] = useState("");
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collectedAt, setCollectedAt] = useState<string | null>(null);

  const resetFlow = () => {
    setStep(1);
    setOrderIdInput("");
    setOrder(null);
    setOtp("");
    setIsOtpVerified(false);
    setCollectedAt(null);
  };

  const handleSearch = async (overrideId?: string) => {
    const id = (overrideId ?? orderIdInput).trim();
    if (!id) {
      toast({
        variant: "destructive",
        title: "Order ID Required",
        description: "Please enter a valid Order ID.",
      });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<OrderDetail>(`/api/orders/${encodeURIComponent(id)}`);
      if (data.status === "collected") {
        toast({
          variant: "destructive",
          title: "Already Collected",
          description: `Order ${data.order_id} has already been collected. No action needed.`,
        });
        return;
      }
      setOrder(data);
      setStep(2);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Order not found";
      toast({ variant: "destructive", title: "Lookup failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await api.post(`/api/orders/${encodeURIComponent(order.order_id)}/send-otp`);
      setOtp("");
      setIsOtpVerified(false);
      setStep(3);
      toast({
        title: "OTP Sent",
        description: "Verification code has been sent to the registered mobile number.",
      });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Failed to send OTP";
      toast({ variant: "destructive", title: "OTP failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await api.post(`/api/orders/${encodeURIComponent(order.order_id)}/verify-otp`, {
        code: otp.trim(),
      });
      setIsOtpVerified(true);
      toast({ title: "OTP Verified", description: "Identity confirmed. Order release enabled." });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Invalid OTP";
      toast({ variant: "destructive", title: "Verification failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleCollected = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const { data } = await api.patch<{ collected_at: string }>(
        `/api/orders/${encodeURIComponent(order.order_id)}/collect`,
      );
      setCollectedAt(new Date(data.collected_at).toLocaleString());
      setStep(4);
      toast({ title: "Order Released", description: "Collection recorded successfully." });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object"
          ? String((err.response.data as { error?: string }).error ?? err.message)
          : "Could not complete collection";
      toast({ variant: "destructive", title: "Collection failed", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Order Release Module</h1>
        <p className="text-muted-foreground">Scan or enter ID to begin the secure verification process.</p>
      </div>

      {step === 1 && (
        <div className="grid gap-6 animate-in slide-in-from-bottom-10 duration-500">
           <Card className="glass-card border-white/10 overflow-hidden">
            <CardHeader className="text-center bg-accent/5">
              <div className="mx-auto h-16 w-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-2">
                <Scan className="h-8 w-8 text-accent animate-pulse" />
              </div>
              <CardTitle>QR Scanner</CardTitle>
              <CardDescription>Live webcam detection enabled</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center border-y border-white/5 relative bg-black/50 p-0">
              <div className="absolute inset-0">
                <Scanner 
                  onScan={(result) => {
                    if (result && result.length > 0) {
                      let rawId = result[0].rawValue;
                      if (rawId.includes('/p/')) {
                        rawId = rawId.split('/p/').pop()?.split('?')[0] || rawId;
                      }
                      
                      if (!loading && orderIdInput !== rawId) {
                        setOrderIdInput(rawId);
                        // Using a small timeout to let state update smoothly
                        setTimeout(() => void handleSearch(rawId), 200); 
                      }
                    }
                  }}
                  components={{
                    onOff: true,
                    finder: true
                  }}
                  onError={(err) => console.error("Scanner Error", err)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OR MANUAL INPUT</span>
            </div>
          </div>

          <Card className="glass border-white/10">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Enter Order ID (e.g. SP-XXXXX)"
                    className="bg-white/5 pl-10 border-white/10"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => void handleSearch()}
                  disabled={loading}
                  className="bg-accent hover:bg-purple-600 px-8"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "VERIFY ID"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 2 && order && (
        <Card className="glass-card animate-in zoom-in-95 duration-500">
          <CardHeader className="flex flex-row items-center justify-between border-b border-white/5">
            <div>
              <CardTitle>Order Identity Details</CardTitle>
              <CardDescription>Verified order found in system</CardDescription>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 uppercase">
              {order.status}
            </Badge>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Receiver</p>
                  <p className="font-semibold">{order.receiver_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Phone</p>
                  <p className="font-semibold">{maskPhone(order.phone_number)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Order ID</p>
                  <p className="font-semibold text-primary">{order.order_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Rack Number</p>
                  <p className="font-semibold">{order.rack_number ?? "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 col-span-2">
                <div className="h-10 w-10 bg-white/5 rounded-full flex items-center justify-center text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Stored At</p>
                  <p className="font-semibold">{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            {order.description && (
              <p className="text-sm text-muted-foreground border-t border-white/5 pt-4">{order.description}</p>
            )}
            <div className="flex gap-4 pt-4">
              <Button onClick={() => setStep(1)} variant="ghost" className="flex-1">
                CANCEL
              </Button>
              <Button
                onClick={() => void handleSendOtp()}
                disabled={loading}
                className="flex-1 bg-accent hover:bg-purple-600 gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                SEND OTP
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && order && (
        <Card className="glass border-accent/20 animate-in fade-in duration-500">
          <CardHeader className="text-center pb-2">
            <ShieldCheck className="h-12 w-12 text-accent mx-auto mb-4" />
            <CardTitle>Identity Verification</CardTitle>
            <CardDescription>Enter the 6-digit code sent to {maskPhone(order.phone_number)}</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-center gap-4">
              <Input
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-40 text-center text-2xl font-bold tracking-[0.4em] h-16 bg-white/5 border-white/20 focus:border-accent"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
              />
            </div>
            <div className="flex flex-col gap-4">
              {!isOtpVerified ? (
                <Button
                  onClick={() => void handleVerifyOtp()}
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-accent hover:bg-purple-600"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "VERIFY OTP"}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 text-green-500 rounded-lg border border-green-500/20">
                  <CheckCircle className="h-4 w-4" /> Verified Successfully
                </div>
              )}

              <Button
                onClick={() => void handleCollected()}
                disabled={!isOtpVerified || loading}
                className={`w-full font-bold h-14 ${isOtpVerified ? "bg-primary glow-orange" : "bg-muted opacity-50"}`}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "MARK AS COLLECTED"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && order && (
        <Card className="glass-card text-center p-12 animate-in zoom-in duration-700 glow-orange">
          <div className="mx-auto h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Success!</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Order has been released and collection timestamp recorded.
          </p>
          <div className="bg-white/5 p-6 rounded-2xl mb-8 text-left border border-white/5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <span className="text-muted-foreground">Order ID:</span>
              <span className="font-mono">{order.order_id}</span>
              <span className="text-muted-foreground">Released At:</span>
              <span>{collectedAt ?? new Date().toLocaleString()}</span>
              <span className="text-muted-foreground">Security Personnel:</span>
              <span>Authenticated session</span>
            </div>
          </div>
          <Button onClick={resetFlow} size="lg" className="bg-primary px-12 font-bold">
            NEXT OPERATION
          </Button>
        </Card>
      )}
    </div>
  );
}
