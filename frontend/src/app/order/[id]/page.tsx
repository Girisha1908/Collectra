import { CheckCircle, AlertTriangle, ShieldCheck, MapPin, Lock, Clock, QrCode } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PublicOrderDetails = {
  order_id: string;
  created_at: string;
  rack_number: string | null;
  qr_code_base64: string;
  status: "stored" | "overdue" | "collected";
};

export default async function PublicTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let order: PublicOrderDetails | null = null;
  let errorStr = null;

  try {
    // SSR fetches from backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    console.log(`[Frontend Server] Fetching order details for ID: ${id} from API: ${apiUrl}`);
    const res = await fetch(`${apiUrl}/api/public/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) {
      errorStr = `Order not found (${res.status})`;
    } else {
      order = await res.json();
    }
  } catch (err: any) {
    errorStr = err.message || "Failed to fetch";
  }

  // 1. Error / Not Found State
  if (errorStr || !order) {
    console.warn(`[Frontend Server] Order tracking failed: ${errorStr}`);
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="glass max-w-md w-full border-destructive/20 bg-destructive/5 text-center p-8 glow-purple">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-destructive mb-2 font-headline">Order Unavailable</h2>
          <p className="text-muted-foreground text-sm">This tracking link is invalid, expired, or the parcel has been removed from the repository.</p>
        </Card>
      </div>
    );
  }

  console.log(`[Frontend Server] Order tracking details successfully loaded. Status: ${order.status}`);

  // Configuration values based on status
  const isCollected = order.status === "collected";
  const isOverdue = order.status === "overdue";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className={`glass-card max-w-xl w-full border-white/10 overflow-hidden ${isCollected ? "glow-purple border-purple-500/20" : isOverdue ? "glow-orange border-amber-500/20" : "glow-orange"}`}>
        
        {/* Banner Section */}
        <div className={`pt-10 pb-6 text-center border-b border-white/5 relative ${isCollected ? "bg-purple-500/5" : isOverdue ? "bg-amber-500/5" : "bg-accent/10"}`}>
          
          {/* Badge at top corner */}
          <div className="absolute top-4 right-4">
            {isCollected ? (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-semibold uppercase tracking-wider text-xs">
                Redeemed
              </Badge>
            ) : isOverdue ? (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-semibold uppercase tracking-wider text-xs animate-pulse">
                Overdue
              </Badge>
            ) : (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold uppercase tracking-wider text-xs">
                Secured
              </Badge>
            )}
          </div>

          {/* Status Icon */}
          <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${isCollected ? "bg-purple-500/20" : isOverdue ? "bg-amber-500/20" : "bg-orange-500/20"}`}>
            {isCollected ? (
              <Lock className="h-8 w-8 text-purple-400" />
            ) : isOverdue ? (
              <AlertTriangle className="h-8 w-8 text-amber-400 animate-pulse" />
            ) : (
              <CheckCircle className="h-8 w-8 text-orange-500" />
            )}
          </div>

          <h1 className="text-2xl font-bold font-headline">
            {isCollected ? "Order Handed Over" : isOverdue ? "Action Required: Order Overdue" : "Order Successfully Secured"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1.5 px-6">
            <ShieldCheck className="h-4 w-4" /> 
            {isCollected ? "Identity verified & collection timestamped" : isOverdue ? "Holding limit exceeded. Please collect immediately." : "Secure ID verified and locked in storage"}
          </p>
        </div>

        {/* Content Section */}
        <CardContent className="p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            
            {/* Metadata Fields */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">System Unique ID</p>
                <p className="font-mono font-bold text-primary text-sm sm:text-base">{order.order_id}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Storage Timestamp</p>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Storage Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{order.rack_number || "Awaiting Placement"}</p>
                </div>
              </div>
            </div>

            {/* QR Code Graphic container */}
            {isCollected ? (
              <div className="bg-white/5 border border-purple-500/20 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all hover:bg-white/10">
                <div className="relative p-2 rounded-lg mb-4 bg-white/10">
                  <img 
                    src={order.qr_code_base64} 
                    alt={`QR for ${order.order_id}`} 
                    className="w-40 h-40 object-contain opacity-25 filter blur-[2px]" 
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-destructive/90 text-destructive-foreground font-mono font-black text-xs px-3 py-1.5 rounded-full border border-destructive shadow-lg tracking-widest uppercase rotate-12">
                      REDEEMED
                    </span>
                  </div>
                </div>
                <h3 className="font-bold text-sm text-purple-400">QR Code Redeemed</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Already picked up</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all hover:bg-white/10">
                <div className="bg-white p-2.5 rounded-lg mb-4 shadow-[0_0_15px_rgba(255,165,0,0.1)] transition-transform duration-300 hover:scale-105">
                  <img 
                    src={order.qr_code_base64} 
                    alt={`QR for ${order.order_id}`} 
                    className="w-40 h-40 object-contain" 
                  />
                </div>
                <h3 className="font-bold text-sm flex items-center gap-1.5 text-foreground justify-center">
                  <QrCode className="h-4 w-4 text-orange-500" />
                  Secure Collection QR
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Encodes Order ID for Scanner</p>
              </div>
            )}
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
