// File: ManageJobs.tsx → FINAL PERFECT VERSION (DC-Only Filter + Dynamic Bending Rate + Dynamic Thickness Selection)
import { useEffect, useState } from "react";
import { ref, onValue, remove, update } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateFilterBar, filterJobsByDate } from "@/components/filters/DateFilterBar";
import { isToday, parseISO, format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  Search,
  FileSpreadsheet,
  Pencil,
  Save,
  Wrench,
  Package,
  Loader2,
  Truck,
  Phone,
} from "lucide-react";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { isAdmin } from "@/utils/auth";

type Material = "MS" | "SS" | "AL" | "GI" | "BRASS";
const MATERIAL_OPTIONS = ["MS", "SS", "AL", "GI", "BRASS"] as const;

interface RateRow {
  thickness: number;
  runningMeter: number;
  piercing: number;
}

type MaterialRates = { [key in Material]?: { [thickness: number]: RateRow } };

interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  gst: string;
}

interface Job {
  id: string;
  date: string;
  customerName: string;
  officeName: string;
  materialType: "MS" | "SS" | "AL" | "GI" | "BRASS";
  thickness: string;
  quantity: string;
  runningMeter: string;
  piercingCount: string;
  ratePerPiece: string;
  pricingMode: "running-meter" | "rate-per-piece" | null;
  laserCost: string;
  addMaterialCost: boolean;
  materialKg: string;
  materialRatePerKg: string;
  materialCost: string;
  addFolding: boolean;
  bendingHours: string;
  bendingRatePerHour: string;
  bendingCharge: string;
  totalPrice: string;
  description?: string;
  paymentStatus: "Billed" | "Non-Billed" | "Cash/GPay Paid";
  customerDetails?: CustomerDetails | null;
  createdAt?: string;
  isDC: boolean;
}

const PAYMENT_STATUS_COLORS: Record<Job["paymentStatus"], string> = {
  "Billed": "bg-blue-100 text-blue-800",
  "Non-Billed": "bg-gray-100 text-gray-800",
  "Cash/GPay Paid": "bg-green-100 text-green-800",
};

const ManageJobs = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOffice, setSelectedOffice] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [showOnlyDC, setShowOnlyDC] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [materialRates, setMaterialRates] = useState<MaterialRates>({
    MS: {}, SS: {}, AL: {}, GI: {}, BRASS: {}
  });
  const hasEditPermission = isAdmin();

  // Load Firebase Data (Jobs + Material Rates)
  useEffect(() => {
    const jobsRef = ref(db, "jobs");
    const jobsUnsub = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setJobs([]);
        return;
      }
      const jobsList: Job[] = Object.entries(data).map(([id, j]: [string, any]) => ({
        id,
        date: j.date || "",
        customerName: j.customerName || j.customer || "",
        officeName: j.officeName || "",
        materialType: j.materialType || "MS",
        thickness: String(j.thickness ?? ""),
        quantity: String(j.quantity ?? "1"),
        runningMeter: String(j.runningMeter ?? ""),
        piercingCount: String(j.piercingCount ?? "0"),
        ratePerPiece: String(j.ratePerPiece ?? "0"),
        pricingMode: j.pricingMode || (j.isDC ? null : "running-meter"),
        laserCost: String(j.laserCost ?? "0.00"),
        addMaterialCost: !!j.addMaterialCost,
        materialKg: String(j.materialKg ?? ""),
        materialRatePerKg: String(j.materialRatePerKg ?? ""),
        materialCost: String(j.materialCost ?? "0.00"),
        addFolding: !!j.addFolding,
        bendingHours: String(j.bendingHours ?? "0"),
        bendingRatePerHour: String(j.bendingRatePerHour ?? "1300"),
        bendingCharge: String(j.bendingCharge ?? "0.00"),
        totalPrice: String(j.totalPrice ?? j.totalAmount ?? "0.00"),
        description: j.description || "",
        paymentStatus: j.paymentStatus || "Non-Billed",
        customerDetails: j.customerDetails || null,
        createdAt: j.createdAt || "",
        isDC: !!j.isDC,
      }));
      setJobs(jobsList);
    });

    // Load Material Rates from Firebase
    const ratesUnsub = onValue(ref(db, "materialRates"), (snap) => {
      const data = snap.val();
      if (data) {
        const formatted: MaterialRates = { MS: {}, SS: {}, AL: {}, GI: {}, BRASS: {} };
        Object.keys(data).forEach((material: any) => {
          if (MATERIAL_OPTIONS.includes(material)) {
            const rates = data[material];
            Object.keys(rates).forEach((id) => {
              const row = rates[id];
              if (!formatted[material as Material]) formatted[material as Material] = {};
              formatted[material as Material]![row.thickness] = {
                thickness: row.thickness,
                runningMeter: row.runningMeter,
                piercing: row.piercing,
              };
            });
          }
        });
        setMaterialRates(formatted);
      }
    });

    return () => { 
      jobsUnsub(); 
      ratesUnsub(); 
    };
  }, []);

  const recalculateAll = (job: Job) => {
    if (job.isDC) {
      return { laserCost: "0.00", materialCost: "0.00", bendingCharge: "0.00", totalPrice: "0.00" };
    }
    const thick = parseFloat(job.thickness);
    const qty = parseFloat(job.quantity) || 1;
    const rm = parseFloat(job.runningMeter) || 0;
    const pc = parseFloat(job.piercingCount) || 0;
    const ratePiece = parseFloat(job.ratePerPiece) || 0;
    const bendHrs = parseFloat(job.bendingHours) || 0;
    const bendRate = parseFloat(job.bendingRatePerHour || "1300");

    let laserCost = 0;
    if (job.pricingMode === "rate-per-piece") {
      laserCost = ratePiece * qty;
    } else if (job.materialType && !isNaN(thick) && materialRates[job.materialType]?.[thick]) {
      const rate = materialRates[job.materialType]![thick];
      laserCost = (rm * rate.runningMeter + pc * rate.piercing) * qty;
    }

    const materialCost = job.addMaterialCost
      ? (parseFloat(job.materialKg || "0") * parseFloat(job.materialRatePerKg || "0"))
      : 0;
    const bendingCharge = bendHrs * bendRate;
    const total = laserCost + materialCost + bendingCharge;

    return {
      laserCost: laserCost.toFixed(2),
      materialCost: materialCost.toFixed(2),
      bendingCharge: bendingCharge.toFixed(2),
      totalPrice: total.toFixed(2),
    };
  };

  useEffect(() => {
    let filtered = [...jobs];
    if (showOnlyDC) filtered = filtered.filter(j => j.isDC);
    filtered = filterJobsByDate(filtered, dateFilter, customDateRange);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job =>
        `${job.customerName} ${job.officeName} ${job.description} ${job.customerDetails?.phone}`
          .toLowerCase().includes(term)
      );
    }
    if (selectedOffice !== "all") filtered = filtered.filter(j => j.officeName === selectedOffice);
    if (selectedCustomer !== "all") filtered = filtered.filter(j => j.customerName === selectedCustomer);
    if (selectedPaymentStatus !== "all") filtered = filtered.filter(j => j.paymentStatus === selectedPaymentStatus);
    setFilteredJobs(filtered);
  }, [jobs, searchTerm, selectedOffice, selectedCustomer, selectedPaymentStatus, dateFilter, customDateRange, showOnlyDC]);

  const handleDelete = async (job: Job) => {
    if (!job.id || deletingId) return;
    setDeletingId(job.id);
    try {
      await moveToRecycleBin(job.id, "job", `jobs/${job.id}`);
      await remove(ref(db, `jobs/${job.id}`));
      toast({ title: "Deleted", description: "Job moved to recycle bin" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingJob?.id) return;
    const calc = recalculateAll(editingJob);
    try {
      await update(ref(db, `jobs/${editingJob.id}`), {
        ...editingJob,
        laserCost: calc.laserCost,
        materialCost: calc.materialCost,
        bendingCharge: calc.bendingCharge,
        totalPrice: calc.totalPrice,
        bendingRatePerHour: editingJob.bendingRatePerHour,
        isDC: editingJob.isDC,
      });
      toast({ title: "Success", description: "Job updated!" });
      setEditDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const data = filteredJobs.map(j => ({
        "DC": j.isDC ? "YES" : "",
        "Date": j.date,
        "Customer": j.customerName,
        "Office": j.officeName || "",
        "Material": j.materialType,
        "Thick (mm)": j.thickness,
        "Qty": j.isDC ? "-" : j.quantity,
        "Run Meter": j.isDC || j.pricingMode !== "running-meter" ? "" : j.runningMeter,
        "Piercing": j.isDC || j.pricingMode !== "running-meter" ? "" : j.piercingCount,
        "Rate/Pc": j.isDC || j.pricingMode !== "rate-per-piece" ? "" : j.ratePerPiece,
        "Laser ₹": j.isDC ? 0 : Number(j.laserCost),
        "Mat Kg": j.addMaterialCost ? j.materialKg : "",
        "₹/Kg": j.addMaterialCost ? j.materialRatePerKg : "",
        "Material ₹": j.isDC ? 0 : Number(j.materialCost),
        "Bend Hrs": j.addFolding ? j.bendingHours : "",
        "Bend Rate/Hr": j.addFolding ? j.bendingRatePerHour : "",
        "Bend ₹": j.isDC ? 0 : Number(j.bendingCharge),
        "Total ₹": j.isDC ? 0 : Number(j.totalPrice),
        "Payment": j.paymentStatus,
        "Description": j.description || "",
        "Phone": j.customerDetails?.phone || "",
        "Email": j.customerDetails?.email || "",
        "GST": j.customerDetails?.gst || "",
        "Address": j.customerDetails?.address || "",
      }));
      const ws = utils.json_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Jobs");
      writeFile(wb, `Jobs_${format(new Date(), "dd-MMM-yyyy")}.xlsx`);
      toast({ title: "Success", description: "Excel exported!" });
    } catch {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const uniqueOffices = [...new Set(jobs.map(j => j.officeName).filter(Boolean))].sort();
  const uniqueCustomers = [...new Set(jobs.map(j => j.customerName).filter(Boolean))].sort();
  const totalAmount = filteredJobs.reduce((sum, j) => sum + (j.isDC ? 0 : Number(j.totalPrice || 0)), 0);
  const dcCount = filteredJobs.filter(j => j.isDC).length;
  const isDCOnlyMode = showOnlyDC || filteredJobs.every(j => j.isDC);

  // Get thickness options for editing job based on selected material
  const getThicknessOptions = (materialType: string) => {
    if (!materialType || !materialRates[materialType as Material]) return [];
    return Object.keys(materialRates[materialType as Material] || {})
      .map(Number)
      .sort((a, b) => a - b);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-screen-2xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold">Manage Jobs</h1>
            <p className="text-muted-foreground">View • Edit • Delete • Export (Excel Only)</p>
          </div>
          <Button onClick={exportToExcel} disabled={exporting || filteredJobs.length === 0} className="gap-2">
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
            Export Excel
          </Button>
        </div>

        <Card className="p-4">
          <DateFilterBar onFilterChange={(type, range) => {
            if (type === "clear") { setDateFilter("all"); setCustomDateRange(undefined); }
            else if (type === "range" && range) { setDateFilter("range"); setCustomDateRange(range); }
            else { setDateFilter(type); setCustomDateRange(undefined); }
          }} activeFilter={dateFilter} />
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search customer, phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              id="show-dc-only"
              checked={showOnlyDC}
              onCheckedChange={(c) => setShowOnlyDC(c as boolean)}
            />
            <Label htmlFor="show-dc-only" className="flex items-center gap-2 cursor-pointer font-medium text-purple-700">
              <Truck className="h-5 w-5" />
              Show Only Delivery Challans
            </Label>
          </div>
          <Select value={selectedOffice} onValueChange={setSelectedOffice}>
            <SelectTrigger><SelectValue placeholder="All Offices" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Offices</SelectItem>{uniqueOffices.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger><SelectValue placeholder="All Customers" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Customers</SelectItem>{uniqueCustomers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedPaymentStatus} onValueChange={setSelectedPaymentStatus}>
            <SelectTrigger><SelectValue placeholder="Payment Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
              <SelectItem value="Non-Billed">Non-Billed</SelectItem>
              <SelectItem value="Cash/GPay Paid">Cash / GPay Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            setSearchTerm(""); setSelectedOffice("all"); setSelectedCustomer("all"); setSelectedPaymentStatus("all"); setDateFilter("all"); setCustomDateRange(undefined); setShowOnlyDC(false);
          }}>Clear All</Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/80">
                  <TableHead>DC</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Office</TableHead>
                  {!isDCOnlyMode && (
                    <>
                      <TableHead>Mat</TableHead>
                      <TableHead>Thk</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Run M</TableHead>
                      <TableHead>Pierce</TableHead>
                      <TableHead>Rate/Pc</TableHead>
                      <TableHead>Laser ₹</TableHead>
                      <TableHead>Mat ₹</TableHead>
                      <TableHead>Bend ₹</TableHead>
                      <TableHead className="text-right">Total ₹</TableHead>
                    </>
                  )}
                  <TableHead>Pay</TableHead>
                  <TableHead>Desc</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={20} className="text-center py-20 text-muted-foreground">
                      {showOnlyDC ? "No Delivery Challans found" : "No jobs found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map(job => {
                    const today = job.date && isToday(parseISO(job.date));
                    return (
                      <TableRow key={job.id} className={cn(
                        job.isDC && "bg-purple-50/60 border-l-4 border-purple-500",
                        !job.isDC && today && "bg-blue-50",
                        !job.isDC && job.addFolding && "bg-amber-50/30"
                      )}>
                        <TableCell>
                          {job.isDC && <Badge className="bg-purple-600 text-white"><Truck className="h-3 w-3 mr-1" /> DC</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">
                          {format(parseISO(job.date), "dd MMM")}
                          {today && !job.isDC && <Badge variant="secondary" className="ml-2">Today</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{job.customerName}</div>
                          {job.customerDetails?.phone && <div className="text-xs text-muted-foreground"><Phone className="inline h-3 w-3" /> {job.customerDetails.phone}</div>}
                        </TableCell>
                        <TableCell>{job.officeName || "-"}</TableCell>
                        {!isDCOnlyMode && !job.isDC && (
                          <>
                            <TableCell className="font-semibold">{job.materialType}</TableCell>
                            <TableCell className="font-semibold">{job.thickness}</TableCell>
                            <TableCell>{job.quantity}</TableCell>
                            <TableCell>{job.pricingMode !== "running-meter" ? "-" : job.runningMeter}</TableCell>
                            <TableCell>{job.pricingMode !== "running-meter" ? "-" : job.piercingCount}</TableCell>
                            <TableCell>{job.pricingMode !== "rate-per-piece" ? "-" : job.ratePerPiece}</TableCell>
                            <TableCell className="text-right font-medium text-blue-700">₹{Number(job.laserCost).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-amber-700">
                              {job.addMaterialCost ? `₹${Number(job.materialCost).toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right text-orange-600">
                              {Number(job.bendingCharge) > 0 ? `₹${Number(job.bendingCharge).toLocaleString()}` : "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              ₹{Number(job.totalPrice).toLocaleString()}
                            </TableCell>
                          </>
                        )}
                        {!isDCOnlyMode && job.isDC && (
                          <TableCell colSpan={10} className="text-right font-bold text-purple-600">DC</TableCell>
                        )}
                        <TableCell><Badge className={cn("font-medium", PAYMENT_STATUS_COLORS[job.paymentStatus])}>{job.paymentStatus}</Badge></TableCell>
                        <TableCell className="max-w-[120px] truncate">{job.description || "-"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => { setEditingJob(job); setEditDialogOpen(true); }} disabled={!hasEditPermission}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" disabled={deletingId === job.id || !hasEditPermission}>
                                  {deletingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Job?</AlertDialogTitle><AlertDialogDescription>This job will be moved to recycle bin.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(job)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="flex flex-wrap justify-between items-center gap-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
          <div>
            <p className="text-lg font-medium">
              Showing <strong>{filteredJobs.length}</strong> {showOnlyDC ? "Delivery Challans" : "jobs"}
              {dcCount > 0 && !showOnlyDC && <span className="ml-3 text-purple-700">• <Truck className="inline h-4 w-4" /> {dcCount} DC</span>}
            </p>
          </div>
          {!showOnlyDC && (
            <p className="text-2xl font-bold text-green-700">
              Total: ₹{totalAmount.toLocaleString("en-IN")}
            </p>
          )}
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-screen overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                Edit Job {editingJob?.isDC && <Badge className="ml-3 bg-purple-600 text-white"><Truck className="h-4 w-4 mr-1" /> DELIVERY CHALLAN</Badge>}
              </DialogTitle>
            </DialogHeader>
            {editingJob && (() => {
              const thicknessOptions = getThicknessOptions(editingJob.materialType);
              return (
                <div className="space-y-6 py-4">
                  {editingJob.isDC && (
                    <div className="bg-purple-100 border-2 border-purple-500 rounded-lg p-5 text-center">
                      <p className="text-2xl font-bold text-purple-800">DELIVERY CHALLAN (DC)</p>
                      <p className="text-purple-700">No pricing applied • For material delivery only</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={editingJob.isDC}
                      onCheckedChange={(c) => setEditingJob({ ...editingJob, isDC: c as boolean })}
                    />
                    <Label className="cursor-pointer flex items-center gap-2 text-lg font-medium">
                      <Truck className="h-5 w-5" /> Delivery Challan (DC) — No Billing
                    </Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label>Date</Label><Input type="date" value={editingJob.date} onChange={e => setEditingJob({ ...editingJob, date: e.target.value })} /></div>
                    <div><Label>Customer</Label><Input value={editingJob.customerName} onChange={e => setEditingJob({ ...editingJob, customerName: e.target.value })} /></div>
                    <div><Label>Office</Label><Input value={editingJob.officeName} onChange={e => setEditingJob({ ...editingJob, officeName: e.target.value })} /></div>
                    <div><Label>Material</Label>
                      <Select value={editingJob.materialType} onValueChange={v => setEditingJob({ ...editingJob, materialType: v as any, thickness: "" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MATERIAL_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Thickness (mm)</Label>
                      <Select value={editingJob.thickness} onValueChange={v => setEditingJob({ ...editingJob, thickness: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder={thicknessOptions.length === 0 ? "No rates yet" : "Select thickness"} />
                        </SelectTrigger>
                        <SelectContent>
                          {thicknessOptions.map(t => (
                            <SelectItem key={t} value={t.toString()}>{t} mm</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Label>Pricing Mode</Label>
                      <Select value={editingJob.pricingMode || ""} onValueChange={v => setEditingJob({ ...editingJob, pricingMode: v as any, quantity: "1", runningMeter: "", piercingCount: "", ratePerPiece: "0" })} disabled={editingJob.isDC}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="running-meter">Running Meter + Piercing</SelectItem>
                          <SelectItem value="rate-per-piece">Rate Per Piece</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editingJob.pricingMode === "running-meter" && !editingJob.isDC && (
                      <>
                        <div><Label>Running Meter</Label><Input value={editingJob.runningMeter} onChange={e => setEditingJob({ ...editingJob, runningMeter: e.target.value })} /></div>
                        <div><Label>Piercing Count</Label><Input value={editingJob.piercingCount} onChange={e => setEditingJob({ ...editingJob, piercingCount: e.target.value })} /></div>
                      </>
                    )}
                    {editingJob.pricingMode === "rate-per-piece" && !editingJob.isDC && (
                      <>
                        <div><Label>Quantity</Label><Input value={editingJob.quantity} onChange={e => setEditingJob({ ...editingJob, quantity: e.target.value })} /></div>
                        <div><Label>Rate Per Piece</Label><Input value={editingJob.ratePerPiece} onChange={e => setEditingJob({ ...editingJob, ratePerPiece: e.target.value })} /></div>
                      </>
                    )}
                    <div className="col-span-3 flex items-center gap-3">
                      <Checkbox checked={editingJob.addMaterialCost} onCheckedChange={c => setEditingJob({ ...editingJob, addMaterialCost: c as boolean })} disabled={editingJob.isDC} />
                      <Label className="cursor-pointer flex items-center gap-2"><Package className="h-5 w-5" /> Add Material Cost</Label>
                    </div>
                    {editingJob.addMaterialCost && !editingJob.isDC && (
                      <>
                        <div><Label>Weight (Kg)</Label><Input value={editingJob.materialKg} onChange={e => setEditingJob({ ...editingJob, materialKg: e.target.value })} /></div>
                        <div><Label>Rate/Kg (₹)</Label><Input value={editingJob.materialRatePerKg} onChange={e => setEditingJob({ ...editingJob, materialRatePerKg: e.target.value })} /></div>
                      </>
                    )}
                    <div className="col-span-3 flex items-center gap-3">
                      <Checkbox checked={editingJob.addFolding} onCheckedChange={c => setEditingJob({ ...editingJob, addFolding: c as boolean, bendingHours: c ? "1" : "0" })} disabled={editingJob.isDC} />
                      <Label className="cursor-pointer flex items-center gap-2"><Wrench className="h-5 w-5" /> Add Bending / Folding</Label>
                    </div>
                    {editingJob.addFolding && !editingJob.isDC && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-3 p-4 bg-orange-50 border-2 border-orange-400 rounded-lg">
                        <div>
                          <Label>Bending Hours</Label>
                          <Input type="number" step="0.5" value={editingJob.bendingHours} onChange={e => setEditingJob({ ...editingJob, bendingHours: e.target.value })} />
                        </div>
                        <div>
                          <Label>Rate per Hour (₹)</Label>
                          <Input
                            type="number"
                            step="50"
                            value={editingJob.bendingRatePerHour}
                            onChange={e => setEditingJob({ ...editingJob, bendingRatePerHour: e.target.value })}
                            className="font-bold text-orange-700"
                          />
                        </div>
                        <div className="flex items-end">
                          <div>
                            <Label>Bending Cost</Label>
                            <p className="text-2xl font-bold text-orange-700">
                              ₹{(parseFloat(editingJob.bendingHours || "0") * parseFloat(editingJob.bendingRatePerHour || "1300")).toLocaleString("en-IN")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div><Label>Payment Status</Label>
                      <Select value={editingJob.paymentStatus} onValueChange={v => setEditingJob({ ...editingJob, paymentStatus: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Billed">Billed</SelectItem>
                          <SelectItem value="Non-Billed">Non-Billed</SelectItem>
                          <SelectItem value="Cash/GPay Paid">Cash / GPay Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3"><Label>Description</Label><Textarea value={editingJob.description} onChange={e => setEditingJob({ ...editingJob, description: e.target.value })} /></div>
                  </div>
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardContent className="pt-8 text-center">
                      <p className="text-5xl font-bold text-green-700">
                        {editingJob.isDC ? "DC — No Amount" : `₹${Number(recalculateAll(editingJob).totalPrice).toLocaleString("en-IN")}`}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} size="lg"><Save className="h-5 w-5 mr-2" /> Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ManageJobs;
