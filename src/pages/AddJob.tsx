import { useState, useEffect } from "react";
import { ref, push, onValue } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
}

const AddJob = () => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    customer: "",
    sizeModel: "",
    pixel: "",
    no: "",
    projectName: "",
    quantity: "",
    length: "",
    width: "",
    pricePerSqft: "",
    billNo: "",
  });

  // Auto-calculated fields
  const length = parseFloat(formData.length) || 0;
  const width = parseFloat(formData.width) || 0;
  const quantity = parseFloat(formData.quantity) || 0;
  const pricePerSqft = parseFloat(formData.pricePerSqft) || 0;

  const totSize = (length / 304) * (width / 304);
  const totSqft = totSize * quantity;
  const price = totSqft * pricePerSqft;
  const totalAmount = price;

  // Load customers from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "customers"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, c]: [any, any]) => ({
          id,
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          fullName: `${c.firstName || ""} ${c.lastName || ""}`.trim(),
        }));
        setCustomers(list);
      }
    });
    return () => unsub();
  }, []);

  // Load material types (used as Models options)
  useEffect(() => {
    const unsub = onValue(ref(db, "materialTypes"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data)
          .map(([, v]: [string, any]) => v.name as string)
          .sort();
        setMaterialTypes(list);
      } else {
        setMaterialTypes([]);
      }
    });
    return () => unsub();
  }, []);

  const set = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const isFormValid = () =>
    formData.date && formData.customer && formData.projectName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast({ title: "Incomplete Form", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await push(ref(db, "jobs"), {
        date: formData.date,
        customer: formData.customer,
        sizeModel: formData.sizeModel,
        pixel: formData.pixel,
        no: formData.no,
        projectName: formData.projectName,
        quantity: quantity,
        length: length,
        width: width,
        totSize: +totSize.toFixed(4),
        totSqft: +totSqft.toFixed(4),
        pricePerSqft: pricePerSqft,
        price: +price.toFixed(2),
        totalAmount: +totalAmount.toFixed(2),
        billNo: formData.billNo,
        createdAt: new Date().toISOString(),
      });
      toast({ title: "Success", description: "Job saved successfully!" });
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        customer: "",
        sizeModel: "",
        pixel: "",
        no: "",
        projectName: "",
        quantity: "",
        length: "",
        width: "",
        pricePerSqft: "",
        billNo: "",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save job", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fmt = (val: number) =>
    val > 0 ? val.toLocaleString("en-IN", { maximumFractionDigits: 4 }) : "—";

  return (
    <DashboardLayout>
      <div className="w-full p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Add New Job</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-2xl">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {/* Row 1: DATE, CUSTOMER */}
              <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">
                <div className="space-y-2">
                  <Label>DATE *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={e => set("date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>CUSTOMER *</Label>
                  <ComboboxInput
                    value={formData.customer}
                    onValueChange={v => set("customer", v)}
                    options={customers.map(c => ({ value: c.fullName, label: c.fullName }))}
                    placeholder="Search customer..."
                  />
                </div>
              </div>

              {/* Row 2: MODELS, PIXEL, NO */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>MODELS</Label>
                  <ComboboxInput
                    value={formData.sizeModel}
                    onValueChange={v => set("sizeModel", v)}
                    options={materialTypes.map(m => ({ value: m, label: m }))}
                    placeholder="Select or type model..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIXEL</Label>
                  <Input
                    value={formData.pixel}
                    onChange={e => set("pixel", e.target.value)}
                    placeholder="e.g. 300dpi"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NO</Label>
                  <Input
                    value={formData.no}
                    onChange={e => set("no", e.target.value)}
                    placeholder="e.g. 001"
                  />
                </div>
              </div>

              {/* Row 2: PROJECT NAME, BILL NO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PROJECT NAME *</Label>
                  <Input
                    value={formData.projectName}
                    onChange={e => set("projectName", e.target.value)}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>BILL NO</Label>
                  <Input
                    value={formData.billNo}
                    onChange={e => set("billNo", e.target.value)}
                    placeholder="e.g. INV-001"
                  />
                </div>
              </div>

              {/* Row 3: QUANTITY, LENGTH, WIDTH */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>QUANTITY</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.quantity}
                    onChange={e => set("quantity", e.target.value)}
                    placeholder="e.g. 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>LENGTH (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.length}
                    onChange={e => set("length", e.target.value)}
                    placeholder="e.g. 4"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WIDTH (mm)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.width}
                    onChange={e => set("width", e.target.value)}
                    placeholder="e.g. 2"
                  />
                </div>
              </div>

              {/* Row 4: PRICE/SQFT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>PRICE/SQFT (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.pricePerSqft}
                    onChange={e => set("pricePerSqft", e.target.value)}
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              {/* Calculated Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-400 mt-2">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">TOT SIZE (sq ft)</p>
                  <p className="text-2xl font-bold text-blue-700">{fmt(totSize)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">TOT SQFT</p>
                  <p className="text-2xl font-bold text-indigo-700">{fmt(totSqft)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">TOTAL AMOUNT (₹)</p>
                  <p className="text-3xl font-bold text-green-700">
                    {totalAmount > 0 ? `₹${totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  size="lg"
                  disabled={saving || !isFormValid()}
                  className="px-16 text-lg bg-green-600 hover:bg-green-700"
                >
                  {saving ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                  {saving ? "Saving..." : "Save Job"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddJob;
