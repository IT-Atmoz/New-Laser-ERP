// src/pages/SheetView.tsx → FINAL PERFECT VERSION (2025 Updated + Excel Only + DC Support + Admin-Only Revenue)
import { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateFilterBar, filterJobsByDate } from "@/components/filters/DateFilterBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isToday, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Download, FileSpreadsheet, Pencil, Calendar, ChevronRight, ArrowLeft, User, Mail, Phone, MapPin, FileText as GstIcon, Wrench, Save, Package, Loader2, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/utils/auth";

// Rate Chart (Laser Only)
const RATE_CHART: Record<string, Record<number, { rm: number; piercing: number }>> = {
  MS: { 1: { rm: 8, piercing: 0.6 }, 1.5: { rm: 13, piercing: 0.8 }, 2: { rm: 16, piercing: 1 }, 3: { rm: 24, piercing: 1.5 }, 4: { rm: 28, piercing: 2 }, 5: { rm: 32, piercing: 2.5 }, 6: { rm: 40, piercing: 3 }, 8: { rm: 60, piercing: 4 }, 10: { rm: 70, piercing: 5 }, 12: { rm: 90, piercing: 6 }, 16: { rm: 160, piercing: 8 } },
  SS: { 0.5: { rm: 14, piercing: 0.5 }, 0.6: { rm: 14, piercing: 0.5 }, 1: { rm: 22, piercing: 1 }, 1.5: { rm: 28, piercing: 1 }, 2: { rm: 40, piercing: 1 }, 2.5: { rm: 70, piercing: 2.5 }, 3: { rm: 90, piercing: 3 }, 4: { rm: 130, piercing: 4 } },
  AL: { 1: { rm: 20, piercing: 1 }, 1.5: { rm: 30, piercing: 1.5 }, 2: { rm: 40, piercing: 2 }, 3: { rm: 60, piercing: 3 }, 4: { rm: 80, piercing: 4 }, 5: { rm: 100, piercing: 5 } },
  GI: { 0.5: { rm: 10, piercing: 0.6 }, 1: { rm: 15, piercing: 1 }, 1.5: { rm: 20, piercing: 1 }, 2: { rm: 30, piercing: 1.5 } },
  BRASS: { 1: { rm: 30, piercing: 1 }, 1.5: { rm: 45, piercing: 1.5 }, 2: { rm: 60, piercing: 2 }, 3: { rm: 90, piercing: 3 } },
};
const BENDING_RATE_PER_HOUR = 1300;

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
  pricingMode: "running-meter" | "rate-per-piece";
  laserCost: string;
  addMaterialCost: boolean;
  materialKg: string;
  materialRatePerKg: string;
  materialCost: string;
  addFolding: boolean;
  bendingHours: string;
  bendingCharge: string;
  totalPrice: string;
  description?: string;
  paymentStatus: "Billed" | "Non-Billed" | "Cash/GPay Paid";
  customerDetails?: CustomerDetails | null;
  isDC: boolean;
}

interface DateGroup {
  date: string;
  jobs: Job[];
  totalJobs: number;
  totalRevenue: number;
}

const PAYMENT_STATUS_COLORS: Record<Job["paymentStatus"], string> = {
  "Billed": "bg-blue-100 text-blue-800",
  "Non-Billed": "bg-gray-100 text-gray-800",
  "Cash/GPay Paid": "bg-green-100 text-green-800",
};

const SheetView = () => {
  const { toast } = useToast();
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
  const [filterType, setFilterType] = useState<"all" | "today" | "month" | "year" | "range">("all");
  const [customRange, setCustomRange] = useState<{ from: Date; to: Date } | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Admin check from localStorage
  const isUserAdmin = () => {
    try {
      const role = localStorage.getItem("userRole");
      return role === "admin";
    } catch {
      return false;
    }
  };

  const hasEditPermission = isAdmin(); // existing admin check (your auth util)
  const showRevenue = isUserAdmin(); // NEW: controls visibility of revenue

  // Fetch Jobs
  useEffect(() => {
    const jobsRef = ref(db, "jobs");
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setAllJobs([]);
        return;
      }
      const jobsList: Job[] = Object.entries(data).map(([id, j]: [string, any]) => ({
        id,
        date: j.date || "",
        customerName: j.customerName || "",
        officeName: j.officeName || "",
        materialType: j.materialType || "MS",
        thickness: String(j.thickness ?? ""),
        quantity: String(j.quantity ?? "1"),
        runningMeter: String(j.runningMeter ?? ""),
        piercingCount: String(j.piercingCount ?? "0"),
        ratePerPiece: String(j.ratePerPiece ?? "0"),
        pricingMode: j.pricingMode || "running-meter",
        laserCost: String(j.laserCost ?? "0.00"),
        addMaterialCost: !!j.addMaterialCost,
        materialKg: String(j.materialKg ?? ""),
        materialRatePerKg: String(j.materialRatePerKg ?? ""),
        materialCost: String(j.materialCost ?? "0.00"),
        addFolding: !!j.addFolding,
        bendingHours: String(j.bendingHours ?? "0"),
        bendingCharge: String(j.bendingCharge ?? "0.00"),
        totalPrice: String(j.totalPrice ?? "0.00"),
        description: j.description || "",
        paymentStatus: j.paymentStatus || "Non-Billed",
        customerDetails: j.customerDetails || null,
        isDC: !!j.isDC,
      }));
      setAllJobs(jobsList);
    });
    return () => unsubscribe();
  }, []);

  // Filter & Group by Date
  useEffect(() => {
    const filtered = filterJobsByDate(allJobs, filterType === "all" ? "all" : filterType, customRange);
    setFilteredJobs(filtered);
    const grouped = filtered.reduce((acc: Record<string, Job[]>, job) => {
      const key = job.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(job);
      return acc;
    }, {});

    const groups: DateGroup[] = Object.entries(grouped)
      .map(([date, jobs]: [string, Job[]]) => ({
        date,
        jobs,
        totalJobs: jobs.length,
        totalRevenue: jobs.reduce((sum, j) => sum + Number(j.totalPrice || 0), 0),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setDateGroups(groups);
  }, [allJobs, filterType, customRange]);

  const handleFilterChange = (
    type: "today" | "month" | "year" | "range" | "clear",
    range?: { from: Date; to: Date }
  ) => {
    if (type === "clear") {
      setFilterType("all");
      setCustomRange(undefined);
    } else if (type === "range" && range) {
      setFilterType("range");
      setCustomRange(range);
    } else {
      setFilterType(type);
      setCustomRange(undefined);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const group = dateGroups.find(g => g.date === date);
    setSelectedJobs(group?.jobs || []);
  };

  const handleBack = () => {
    setSelectedDate(null);
    setSelectedJobs([]);
  };

  // Recalculate All Costs
  const recalculateAll = (job: Job) => {
    const thick = parseFloat(job.thickness);
    const qty = parseFloat(job.quantity) || 1;
    const rm = parseFloat(job.runningMeter) || 0;
    const pc = parseFloat(job.piercingCount) || 0;
    const ratePiece = parseFloat(job.ratePerPiece) || 0;
    let laserCost = 0;
    if (job.pricingMode === "rate-per-piece") {
      laserCost = ratePiece * qty;
    } else if (job.materialType && !isNaN(thick)) {
      const rates = RATE_CHART[job.materialType]?.[thick];
      if (rates) laserCost = (rm * rates.rm + pc * rates.piercing) * qty;
    }
    const materialCost = job.addMaterialCost
      ? (parseFloat(job.materialKg || "0") * parseFloat(job.materialRatePerKg || "0"))
      : 0;
    const bendingCharge = parseFloat(job.bendingHours || "0") * BENDING_RATE_PER_HOUR;
    const total = laserCost + materialCost + bendingCharge;
    return {
      laserCost: laserCost.toFixed(2),
      materialCost: materialCost.toFixed(2),
      bendingCharge: bendingCharge.toFixed(2),
      totalPrice: total.toFixed(2),
    };
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
        isDC: editingJob.isDC,
      });
      toast({ title: "Success", description: "Job updated!" });
      setEditDialogOpen(false);
    } catch {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  // EXPORT TO EXCEL ONLY
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");
      const data = (selectedDate ? selectedJobs : filteredJobs).map(j => ({
        "Date": j.date,
        "DC": j.isDC ? "Yes" : "No",
        "Customer": j.customerName,
        "Office": j.officeName || "",
        "Material": j.materialType,
        "Thick (mm)": j.thickness,
        "Qty": j.quantity,
        "Run Meter": j.pricingMode === "running-meter" ? j.runningMeter : "",
        "Piercing": j.pricingMode === "running-meter" ? j.piercingCount : "",
        "Rate/Pc": j.pricingMode === "rate-per-piece" ? j.ratePerPiece : "",
        "Laser ₹": Number(j.laserCost),
        "Mat Kg": j.addMaterialCost ? j.materialKg : "",
        "₹/Kg": j.addMaterialCost ? j.materialRatePerKg : "",
        "Material ₹": Number(j.materialCost),
        "Bend Hrs": j.addFolding ? j.bendingHours : "",
        "Bend ₹": Number(j.bendingCharge),
        "Total ₹": Number(j.totalPrice),
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
      const filename = selectedDate
        ? `Sheet_${format(parseISO(selectedDate), "dd-MMM-yyyy")}`
        : `Sheet_${format(new Date(), "dd-MMM-yyyy")}`;
      writeFile(wb, `${filename}.xlsx`);
      toast({ title: "Success", description: "Excel exported!" });
    } catch {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  // DATE LIST VIEW
  if (!selectedDate) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold">Sheet View</h1>
              <p className="text-muted-foreground">Daily job summary • Click date to see details</p>
            </div>
            <Button onClick={exportToExcel} disabled={exporting || dateGroups.length === 0} className="gap-2">
              {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
              Export Excel
            </Button>
          </div>
          <Card className="p-4">
            <DateFilterBar onFilterChange={handleFilterChange} activeFilter={filterType} />
          </Card>

          {dateGroups.length === 0 ? (
            <Card className="text-center py-32">
              <Calendar className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-semibold text-muted-foreground">No Jobs Found</h3>
            </Card>
          ) : (
            <div className="grid gap-5">
              {dateGroups.map(group => {
                const today = isToday(parseISO(group.date));
                return (
                  <Card
                    key={group.date}
                    className={cn("cursor-pointer hover:shadow-xl transition-all", today && "ring-4 ring-green-500")}
                    onClick={() => handleDateSelect(group.date)}
                  >
                    <CardHeader className={cn("pb-4", today && "bg-green-50")}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={cn("p-4 rounded-xl", today ? "bg-green-600 text-white" : "bg-muted")}>
                            <Calendar className="h-8 w-8" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl">
                              {format(parseISO(group.date), "dd MMMM, yyyy")}
                              {today && <Badge className="ml-3 text-lg px-4 py-1 animate-pulse">Today</Badge>}
                            </CardTitle>
                            <p className="text-muted-foreground">
                              {format(parseISO(group.date), "EEEE")} • {group.totalJobs} jobs
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardHeader>

                   
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // DETAILED DAY VIEW
  const selectedTotal = selectedJobs.reduce((s, j) => s + Number(j.totalPrice || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {format(parseISO(selectedDate!), "dd MMMM, yyyy")}
                {isToday(parseISO(selectedDate!)) && <Badge className="ml-3 text-lg px-4 animate-pulse">Today</Badge>}
              </h1>
              <p className="text-muted-foreground">
                {selectedJobs.length} jobs
                {showRevenue && ` • Total: ₹${selectedTotal.toLocaleString()}`}
              </p>
            </div>
          </div>
          <Button onClick={exportToExcel} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
            Export This Day
          </Button>
        </div>

        <Card className="overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/80">
                  <TableHead>#</TableHead>
                  <TableHead>DC</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Office</TableHead>
                  <TableHead>Mat</TableHead>
                  <TableHead>Thk</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Run M</TableHead>
                  <TableHead>Pierce</TableHead>
                  <TableHead>Rate/Pc</TableHead>
                  <TableHead>Laser ₹</TableHead>
                  <TableHead>Mat Kg</TableHead>
                  <TableHead>₹/Kg</TableHead>
                  <TableHead>Mat ₹</TableHead>
                  <TableHead>Bend H</TableHead>
                  <TableHead>Bend ₹</TableHead>
                  <TableHead>Pay</TableHead>
                  {showRevenue && <TableHead className="text-right">Total ₹</TableHead>}
                  <TableHead>Desc</TableHead>
                  <TableHead className="text-right">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedJobs.map((job, i) => (
                  <TableRow key={job.id} className={cn(job.addFolding && "bg-amber-50/40", job.isDC && "bg-purple-50/30")}>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell>
                      {job.isDC ? (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          <Truck className="h-3 w-3 mr-1" /> DC
                        </Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{job.customerName}</div>
                      {job.customerDetails?.phone && (
                        <div className="text-xs text-muted-foreground">
                          <Phone className="inline h-3 w-3" /> {job.customerDetails.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{job.officeName || "-"}</TableCell>
                    <TableCell>{job.materialType}</TableCell>
                    <TableCell>{job.thickness}</TableCell>
                    <TableCell>{job.quantity}</TableCell>
                    <TableCell>{job.pricingMode === "running-meter" ? job.runningMeter : "-"}</TableCell>
                    <TableCell>{job.pricingMode === "running-meter" ? job.piercingCount : "-"}</TableCell>
                    <TableCell>{job.pricingMode === "rate-per-piece" ? job.ratePerPiece : "-"}</TableCell>
                    <TableCell className="font-medium text-blue-700">₹{Number(job.laserCost).toFixed(2)}</TableCell>
                    <TableCell>{job.addMaterialCost ? job.materialKg : "-"}</TableCell>
                    <TableCell>{job.addMaterialCost ? job.materialRatePerKg : "-"}</TableCell>
                    <TableCell className="text-right font-medium text-amber-700">
                      {job.addMaterialCost ? `₹${Number(job.materialCost).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>{job.addFolding ? job.bendingHours : "-"}</TableCell>
                    <TableCell className="text-right text-orange-600">
                      {Number(job.bendingCharge) > 0 ? `₹${Number(job.bendingCharge).toLocaleString()}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("font-medium", PAYMENT_STATUS_COLORS[job.paymentStatus])}>
                        {job.paymentStatus}
                      </Badge>
                    </TableCell>
                    {showRevenue && (
                      <TableCell className="text-right font-bold text-green-600">
                        ₹{Number(job.totalPrice).toLocaleString()}
                      </TableCell>
                    )}
                    <TableCell className="max-w-[150px] truncate">{job.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingJob(job); setEditDialogOpen(true); }} disabled={!hasEditPermission}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* EDIT DIALOG with DC Checkbox */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-5xl max-h-screen overflow-y-auto">
            <DialogHeader><DialogTitle className="text-2xl">Edit Job</DialogTitle></DialogHeader>
            {editingJob && (
              <div className="space-y-6 py-4">
                {/* Customer Info */}
                {editingJob.customerDetails && (
                  <Card className="bg-blue-50">
                    <CardHeader><CardTitle className="text-lg"><User className="inline h-5 w-5 mr-2" />Customer Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><Mail className="inline" /> {editingJob.customerDetails.email || "—"}</div>
                      <div><Phone className="inline" /> {editingJob.customerDetails.phone || "—"}</div>
                      <div><MapPin className="inline" /> {editingJob.customerDetails.address || "—"}</div>
                      <div><GstIcon className="inline" /> GST: {editingJob.customerDetails.gst || "—"}</div>
                    </CardContent>
                  </Card>
                )}

                {/* DC Checkbox */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={editingJob.isDC}
                    onCheckedChange={(c) => setEditingJob({ ...editingJob, isDC: c as boolean })}
                  />
                  <Label className="cursor-pointer flex items-center gap-2 text-lg font-medium">
                    <Truck className="h-5 w-5" /> Delivery Challan (DC)
                  </Label>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><Label>Date</Label><Input type="date" value={editingJob.date} onChange={e => setEditingJob({ ...editingJob, date: e.target.value })} /></div>
                  <div><Label>Customer</Label><Input value={editingJob.customerName} onChange={e => setEditingJob({ ...editingJob, customerName: e.target.value })} /></div>
                  <div><Label>Office</Label><Input value={editingJob.officeName} onChange={e => setEditingJob({ ...editingJob, officeName: e.target.value })} /></div>
                  <div><Label>Material</Label>
                    <Select value={editingJob.materialType} onValueChange={v => setEditingJob({ ...editingJob, materialType: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["MS","SS","AL","GI","BRASS"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Thickness</Label><Input value={editingJob.thickness} onChange={e => setEditingJob({ ...editingJob, thickness: e.target.value })} /></div>
                  <div className="col-span-3">
                    <Label>Pricing Mode</Label>
                    <Select value={editingJob.pricingMode} onValueChange={v => setEditingJob({ ...editingJob, pricingMode: v as any, quantity: "1", runningMeter: "", piercingCount: "", ratePerPiece: "0" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="running-meter">Running Meter + Piercing</SelectItem>
                        <SelectItem value="rate-per-piece">Rate Per Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingJob.pricingMode === "running-meter" ? (
                    <>
                      <div><Label>Running Meter</Label><Input value={editingJob.runningMeter} onChange={e => setEditingJob({ ...editingJob, runningMeter: e.target.value })} /></div>
                      <div><Label>Piercing Count</Label><Input value={editingJob.piercingCount} onChange={e => setEditingJob({ ...editingJob, piercingCount: e.target.value })} /></div>
                    </>
                  ) : (
                    <>
                      <div><Label>Quantity</Label><Input value={editingJob.quantity} onChange={e => setEditingJob({ ...editingJob, quantity: e.target.value })} /></div>
                      <div><Label>Rate Per Piece</Label><Input value={editingJob.ratePerPiece} onChange={e => setEditingJob({ ...editingJob, ratePerPiece: e.target.value })} /></div>
                    </>
                  )}
                  <div className="col-span-3 flex items-center gap-3">
                    <Checkbox checked={editingJob.addMaterialCost} onCheckedChange={c => setEditingJob({ ...editingJob, addMaterialCost: c as boolean })} />
                    <Label className="cursor-pointer flex items-center gap-2"><Package className="h-5 w-5" /> Add Material Cost</Label>
                  </div>
                  {editingJob.addMaterialCost && (
                    <>
                      <div><Label>Weight (Kg)</Label><Input value={editingJob.materialKg} onChange={e => setEditingJob({ ...editingJob, materialKg: e.target.value })} /></div>
                      <div><Label>Rate/Kg (₹)</Label><Input value={editingJob.materialRatePerKg} onChange={e => setEditingJob({ ...editingJob, materialRatePerKg: e.target.value })} /></div>
                    </>
                  )}
                  <div className="col-span-3 flex items-center gap-3">
                    <Checkbox checked={editingJob.addFolding} onCheckedChange={c => setEditingJob({ ...editingJob, addFolding: c as boolean, bendingHours: c ? "1" : "0" })} />
                    <Label className="cursor-pointer flex items-center gap-2"><Wrench className="h-5 w-5" /> Add Bending</Label>
                  </div>
                  {editingJob.addFolding && (
                    <div><Label>Bending Hours</Label><Input type="number" step="0.5" value={editingJob.bendingHours} onChange={e => setEditingJob({ ...editingJob, bendingHours: e.target.value })} /></div>
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

                {/* Summary */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardContent className="pt-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
                    <div><p className="text-muted-foreground">Laser Cost</p><p className="text-3xl font-bold text-blue-700">₹{Number(editingJob.laserCost).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Material Cost</p><p className="text-3xl font-bold text-amber-700">₹{Number(editingJob.materialCost).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground">Bending Cost</p><p className="text-3xl font-bold text-orange-700">₹{Number(editingJob.bendingCharge).toLocaleString()}</p></div>
                    <div><p className="text-lg text-muted-foreground">TOTAL</p><p className="text-5xl font-bold text-green-700">₹{Number(editingJob.totalPrice).toLocaleString()}</p></div>
                  </CardContent>
                </Card>
              </div>
            )}
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

export default SheetView;
