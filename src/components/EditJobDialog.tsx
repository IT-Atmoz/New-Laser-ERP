import { useState, useEffect } from "react";
import { ref, update, onValue } from "firebase/database";
import { db } from "@/config/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComboboxInput } from "@/components/ui/combobox-input";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface Job {
  id: string;
  date: string;
  customerName: string;
  officeName: string;
  materialType: string;
  thickness: string;
  quantity: string;
  dimensions: string;
  runningMeter: string;
  piercingCount: string;
  rate: string;
  totalPrice: string;
}

interface ListItem {
  id: string;
  name: string;
}

interface EditJobDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditJobDialog({ job, open, onOpenChange }: EditJobDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<ListItem[]>([]);
  const [offices, setOffices] = useState<ListItem[]>([]);
  const [materialTypes, setMaterialTypes] = useState<ListItem[]>([]);
  const [thicknesses, setThicknesses] = useState<ListItem[]>([]);
  const [dimensions, setDimensions] = useState<ListItem[]>([]);

  const [formData, setFormData] = useState({
    date: "",
    customerName: "",
    officeName: "",
    materialType: "",
    thickness: "",
    quantity: "",
    dimensions: "",
    runningMeter: "",
    piercingCount: "",
    rate: "",
    totalPrice: "",
  });

  // Fetch all data from Firebase
  useEffect(() => {
    const customersRef = ref(db, "customers");
    const officesRef = ref(db, "offices");
    const materialTypesRef = ref(db, "materialTypes");
    const thicknessesRef = ref(db, "thicknesses");
    const dimensionsRef = ref(db, "dimensions");

    const unsubscribeCustomers = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          name: typeof item === 'string' ? item : item.name || '',
        }));
        setCustomers(list);
      }
    });

    const unsubscribeOffices = onValue(officesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          name: typeof item === 'string' ? item : item.name || '',
        }));
        setOffices(list);
      }
    });

    const unsubscribeMaterialTypes = onValue(materialTypesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          name: typeof item === 'string' ? item : item.name || '',
        }));
        setMaterialTypes(list);
      }
    });

    const unsubscribeThicknesses = onValue(thicknessesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          name: typeof item === 'string' ? item : item.name || '',
        }));
        setThicknesses(list);
      }
    });

    const unsubscribeDimensions = onValue(dimensionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, item]: [string, any]) => ({
          id,
          name: typeof item === 'string' ? item : item.name || '',
        }));
        setDimensions(list);
      }
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeOffices();
      unsubscribeMaterialTypes();
      unsubscribeThicknesses();
      unsubscribeDimensions();
    };
  }, []);

  // Update form data when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        date: job.date,
        customerName: job.customerName,
        officeName: job.officeName,
        materialType: job.materialType,
        thickness: job.thickness,
        quantity: job.quantity,
        dimensions: job.dimensions,
        runningMeter: job.runningMeter,
        piercingCount: job.piercingCount,
        rate: job.rate,
        totalPrice: job.totalPrice,
      });
    }
  }, [job]);

  // Auto-calculate total price
  useEffect(() => {
    const qty = Number(formData.quantity) || 0;
    const rate = Number(formData.rate) || 0;
    setFormData((prev) => ({ ...prev, totalPrice: (qty * rate).toString() }));
  }, [formData.quantity, formData.rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;

    setLoading(true);
    try {
      const jobRef = ref(db, `jobs/${job.id}`);
      await update(jobRef, {
        ...formData,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Job updated successfully",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer Name</Label>
              <ComboboxInput
                value={formData.customerName}
                onValueChange={(value) => setFormData({ ...formData, customerName: value })}
                options={customers.map((c) => ({ value: c.name, label: c.name }))}
                placeholder="Select or type customer name"
                emptyMessage="No customer found"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-office">Office Name</Label>
              <ComboboxInput
                value={formData.officeName}
                onValueChange={(value) => setFormData({ ...formData, officeName: value })}
                options={offices.map((o) => ({ value: o.name, label: o.name }))}
                placeholder="Select or type office name"
                emptyMessage="No office found"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-material">Material Type</Label>
              <ComboboxInput
                value={formData.materialType}
                onValueChange={(value) => setFormData({ ...formData, materialType: value })}
                options={materialTypes.map((m) => ({ value: m.name, label: m.name }))}
                placeholder="Select or type material type"
                emptyMessage="No material found"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-thickness">Thickness</Label>
              <ComboboxInput
                value={formData.thickness}
                onValueChange={(value) => setFormData({ ...formData, thickness: value })}
                options={thicknesses.map((t) => ({ value: t.name, label: t.name }))}
                placeholder="Select or type thickness"
                emptyMessage="No thickness found"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dimensions">Dimensions</Label>
              <ComboboxInput
                value={formData.dimensions}
                onValueChange={(value) => setFormData({ ...formData, dimensions: value })}
                options={dimensions.map((d) => ({ value: d.name, label: d.name }))}
                placeholder="Select or type dimensions"
                emptyMessage="No dimensions found"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-running">Running Meter</Label>
              <Input
                id="edit-running"
                type="text"
                value={formData.runningMeter}
                onChange={(e) => setFormData({ ...formData, runningMeter: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-piercing">Piercing Count</Label>
              <Input
                id="edit-piercing"
                type="text"
                value={formData.piercingCount}
                onChange={(e) => setFormData({ ...formData, piercingCount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-rate">Rate (₹)</Label>
              <Input
                id="edit-rate"
                type="number"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-total">Total Price (₹)</Label>
              <Input
                id="edit-total"
                type="text"
                value={formData.totalPrice}
                readOnly
                className="bg-muted/50 font-semibold text-success"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
