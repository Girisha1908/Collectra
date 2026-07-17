"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, MoreHorizontal, Package, Clock, ShieldCheck, AlertTriangle, X, Trash, RefreshCw, Send, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Order {
  id: string;
  name: string;
  phone: string;
  rack: string;
  date: string;
  time: string;
  status: string;
  qr: string | null;
  description: string | null;
}

export default function OrdersPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [rackOrder, setRackOrder] = useState<Order | null>(null);
  const [newRackInput, setNewRackInput] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/orders");
      const formatted = res.data.map((item: any) => ({
        id: item.order_id,
        name: item.receiver_name,
        phone: item.phone_number,
        rack: item.rack_number || "N/A",
        date: new Date(item.created_at).toLocaleDateString(),
        time: new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        status: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "Unknown",
        qr: item.qr_code_base64 || null,
        description: item.description || "No description provided."
      }));
      setOrders(formatted);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load orders", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSendReminder = async (orderId: string) => {
    try {
      await api.post(`/api/orders/${orderId}/remind`);
      toast({ title: "Reminder sent", description: "SMS reminder was successfully dispatched." });
    } catch (err) {
      toast({ title: "Failed to send reminder", variant: "destructive" });
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to permanently delete this order?")) return;
    try {
      await api.delete(`/api/orders/${orderId}`);
      toast({ title: "Order Removed", description: `${orderId} deleted successfully.` });
      fetchOrders();
    } catch (err) {
      toast({ title: "Failed to remove order", variant: "destructive" });
    }
  };

  const handleRackChange = async () => {
    if (!rackOrder) return;
    try {
      await api.patch(`/api/orders/${rackOrder.id}/rack`, { rack: newRackInput });
      toast({ title: "Rack Updated", description: "Successfully updated storage location." });
      setRackOrder(null);
      fetchOrders();
    } catch (err) {
      toast({ title: "Failed to update rack", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Stored":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Package className="mr-1 h-3 w-3" /> Stored</Badge>;
      case "Collected":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><ShieldCheck className="mr-1 h-3 w-3" /> Collected</Badge>;
      case "Overdue":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20"><AlertTriangle className="mr-1 h-3 w-3" /> Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    order.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Rack Change Modal overlay */}
      {rackOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background border border-white/10 rounded-xl max-w-sm w-full p-6 space-y-4 shadow-2xl relative">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setRackOrder(null)}>
              <X className="h-4 w-4" />
            </Button>
            <h3 className="font-bold text-lg">Change Rack</h3>
            <p className="text-sm text-muted-foreground">Assign a new rack location for {rackOrder.id}.</p>
            <Input 
              placeholder="e.g. Rack B4" 
              value={newRackInput} 
              onChange={e => setNewRackInput(e.target.value)} 
            />
            <Button className="w-full" onClick={handleRackChange}>Save Location</Button>
          </div>
        </div>
      )}

      {/* View Details Modal overlay */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-background border border-white/10 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setViewOrder(null)}>
              <X className="h-4 w-4" />
            </Button>
            <h3 className="font-bold text-xl mb-6 font-headline tracking-tight">Order Profile</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <dt className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Secure ID</dt>
                  <dd className="font-mono text-primary font-bold">{viewOrder.id}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Receiver</dt>
                  <dd className="font-medium">{viewOrder.name}</dd>
                  <dd className="text-sm text-muted-foreground">{viewOrder.phone}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Description</dt>
                  <dd className="text-sm">{viewOrder.description}</dd>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                  <div>
                    <dt className="text-[10px] uppercase font-bold text-muted-foreground">Rack No.</dt>
                    <dd className="font-bold">{viewOrder.rack}</dd>
                  </div>
                  <div>{getStatusBadge(viewOrder.status)}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center border border-white/5 rounded-xl bg-white/5 p-6">
                {viewOrder.qr ? (
                  <div className="bg-white p-2 rounded-lg">
                    <img src={viewOrder.qr} alt="QR" className="w-48 h-48" />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-white/10 flex items-center justify-center rounded-lg">
                     <AlertTriangle className="text-muted-foreground mx-auto" />
                  </div>
                )}
                <p className="mt-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center">Encrypted Hash Token</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stored Orders Inventory</h1>
          <p className="text-muted-foreground">Manage and track all order statuses in the system.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search ID or Name..." 
              className="bg-white/5 pl-10 border-white/10 focus-visible:border-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" className="gap-2" onClick={fetchOrders}><RefreshCw className="h-4 w-4" /> Refresh</Button>
        </div>
      </div>

      <div className="glass-card border-white/5 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[120px]">Order ID</TableHead>
              <TableHead>Receiver Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Rack No.</TableHead>
              <TableHead>Date Stored</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20 text-muted-foreground">
                  <div className="flex justify-center items-center gap-2"><Loader2 className="animate-spin" /> Loading data...</div>
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-mono font-bold text-primary">{order.id}</TableCell>
                  <TableCell className="font-medium">{order.name}</TableCell>
                  <TableCell className="text-muted-foreground">{order.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       {order.rack}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{order.date}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2 w-2" /> {order.time}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass border-white/10 w-48">
                        <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => setViewOrder(order)}>
                          <Package className="mr-2 h-4 w-4 text-primary" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => handleSendReminder(order.id)}>
                          <Send className="mr-2 h-4 w-4" /> Send Reminder
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-white/10 cursor-pointer" onClick={() => { setRackOrder(order); setNewRackInput(order.rack); }}>
                          <RefreshCw className="mr-2 h-4 w-4 text-blue-400" /> Change Rack
                        </DropdownMenuItem>
                        <DropdownMenuItem className="focus:bg-destructive/20 text-destructive cursor-pointer" onClick={() => handleDelete(order.id)}>
                          <Trash className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
