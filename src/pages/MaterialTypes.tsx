// src/pages/RateChartMaster.tsx → FINAL FIXED & CLEAN VERSION (2025)
import { useEffect, useState } from "react";
import { ref, onValue, set, push, remove, get } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Save, X, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/utils/auth";

// Initial rates (from your PDF)
const INITIAL_RATES = {
  MS: [
    { thickness: 1, runningMeter: 8, piercing: 0.6 },
    { thickness: 1.5, runningMeter: 13, piercing: 0.8 },
    { thickness: 2, runningMeter: 16, piercing: 1 },
    { thickness: 3, runningMeter: 24, piercing: 1.5 },
    { thickness: 4, runningMeter: 28, piercing: 2 },
    { thickness: 5, runningMeter: 32, piercing: 2.5 },
    { thickness: 6, runningMeter: 40, piercing: 3 },
    { thickness: 8, runningMeter: 60, piercing: 4 },
    { thickness: 10, runningMeter: 70, piercing: 5 },
    { thickness: 12, runningMeter: 90, piercing: 6 },
    { thickness: 16, runningMeter: 160, piercing: 8 },
  ],
  SS: [
    { thickness: 0.5, runningMeter: 14, piercing: 0.5 },
    { thickness: 0.6, runningMeter: 14, piercing: 0.5 },
    { thickness: 1, runningMeter: 22, piercing: 1 },
    { thickness: 1.5, runningMeter: 28, piercing: 1 },
    { thickness: 2, runningMeter: 40, piercing: 1 },
    { thickness: 2.5, runningMeter: 70, piercing: 2.5 },
    { thickness: 3, runningMeter: 90, piercing: 3 },
    { thickness: 4, runningMeter: 130, piercing: 4 },
  ],
  AL: [
    { thickness: 1, runningMeter: 20, piercing: 1 },
    { thickness: 1.5, runningMeter: 30, piercing: 1.5 },
    { thickness: 2, runningMeter: 40, piercing: 2 },
    { thickness: 3, runningMeter: 60, piercing: 3 },
    { thickness: 4, runningMeter: 80, piercing: 4 },
    { thickness: 5, runningMeter: 100, piercing: 5 },
  ],
  GI: [
    { thickness: 0.5, runningMeter: 10, piercing: 0.6 },
    { thickness: 1, runningMeter: 15, piercing: 1 },
    { thickness: 1.5, runningMeter: 20, piercing: 1 },
    { thickness: 2, runningMeter: 30, piercing: 1.5 },
  ],
  BRASS: [
    { thickness: 1, runningMeter: 30, piercing: 1 },
    { thickness: 1.5, runningMeter: 45, piercing: 1.5 },
    { thickness: 2, runningMeter: 60, piercing: 2 },
    { thickness: 3, runningMeter: 90, piercing: 3 },
  ],
};

type Material = "MS" | "SS" | "AL" | "GI" | "BRASS";

interface RateRow {
  id?: string;
  thickness: number;
  runningMeter: number;
  piercing: number;
}

const RateChartMaster = () => {
  const { toast } = useToast();
  const [rates, setRates] = useState<Record<Material, Record<string, RateRow>>>({
    MS: {}, SS: {}, AL: {}, GI: {}, BRASS: {}
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RateRow>>({});
  const [newRow, setNewRow] = useState({
    material: "MS" as Material,
    thickness: "",
    runningMeter: "",
    piercing: ""
  });
  const [deleteDialog, setDeleteDialog] = useState<{ material: Material; id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const hasEditPermission = isAdmin();

  // Seed initial data properly using push() → avoids numeric keys forever
  const seedInitialData = async () => {
    const ratesRef = ref(db, "materialRates");
    const snapshot = await get(ratesRef);
    const exists = snapshot.exists() && Object.keys(snapshot.val() || {}).length > 0;

    if (!exists) {
      const writePromises = Object.entries(INITIAL_RATES).map(([material, rows]) => {
        const materialRef = ref(db, `materialRates/${material}`);
        const promises = rows.map(row => {
          const newRef = push(materialRef); // Always use push → random key
          return set(newRef, row);
        });
        return Promise.all(promises);
      });

      await Promise.all(writePromises);
      toast({
        title: "Rate Chart Initialized",
        description: "All default rates have been imported successfully!",
      });
    }
  };

  // Load rates + seed if empty
  useEffect(() => {
    const ratesRef = ref(db, "materialRates");

    const unsubscribe = onValue(ratesRef, async (snapshot) => {
      const data = snapshot.val();

      if (data) {
        // Normalize: ensure every material has object structure (not array)
        const normalized: Record<Material, Record<string, RateRow>> = {
          MS: {}, SS: {}, AL: {}, GI: {}, BRASS: {}
        };

        Object.entries(data).forEach(([mat, value]) => {
          const material = mat as Material;
          if (normalized[material]) {
            // If it's an array → convert to object with push keys (safe migration)
            if (Array.isArray(value)) {
              value.forEach((row: any, index) => {
                if (row && typeof row === "object") {
                  normalized[material][`legacy_${index}`] = row;
                }
              });
            } else if (typeof value === "object" && value !== null) {
              normalized[material] = value as Record<string, RateRow>;
            }
          }
        });

        setRates(normalized);
      } else {
        // First time → seed clean data
        await seedInitialData();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const startEdit = (material: Material, id: string, row: RateRow) => {
    setEditingId(`${material}-${id}`);
    setEditValues({
      thickness: row.thickness,
      runningMeter: row.runningMeter,
      piercing: row.piercing,
    });
  };

  const saveEdit = async (material: Material, id: string) => {
    if (!editValues.thickness || !editValues.runningMeter || !editValues.piercing) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }

    try {
      await set(ref(db, `materialRates/${material}/${id}`), {
        thickness: Number(editValues.thickness),
        runningMeter: Number(editValues.runningMeter),
        piercing: Number(editValues.piercing),
      });
      toast({ title: "Success", description: "Rate updated successfully" });
      setEditingId(null);
      setEditValues({});
    } catch (err) {
      toast({ title: "Error", description: "Failed to update rate", variant: "destructive" });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const addNewRate = async () => {
    const { material, thickness, runningMeter, piercing } = newRow;
    if (!thickness || !runningMeter || !piercing) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }

    const t = parseFloat(thickness);
    const rm = parseFloat(runningMeter);
    const p = parseFloat(piercing);

    if (isNaN(t) || isNaN(rm) || isNaN(p)) {
      toast({ title: "Invalid", description: "Please enter valid numbers", variant: "destructive" });
      return;
    }

    try {
      const newRef = push(ref(db, `materialRates/${material}`));
      await set(newRef, { thickness: t, runningMeter: rm, piercing: p });
      toast({ title: "Added", description: "New rate added!" });
      setNewRow({ ...newRow, thickness: "", runningMeter: "", piercing: "" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to add rate", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      await remove(ref(db, `materialRates/${deleteDialog.material}/${deleteDialog.id}`));
      toast({ title: "Deleted", description: "Rate removed permanently" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteDialog(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-lg">Loading Rate Chart...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Package className="h-10 w-10 text-primary" />
              Rate Chart Master
            </h1>
            <p className="text-muted-foreground mt-2">Manage laser cutting rates by material & thickness</p>
          </div>
          <Badge variant="secondary" className="text-lg px-6 py-3">Live in Database</Badge>
        </div>

        {/* Add New Rate – All Users */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Plus className="h-6 w-6" />
              Add New Rate (All Users)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-32">
                <label className="text-sm font-medium">Material</label>
                <Select value={newRow.material} onValueChange={(v) => setNewRow({ ...newRow, material: v as Material })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["MS", "SS", "AL", "GI", "BRASS"].map(m => (
                      <SelectItem key={m} value={m}>{m === "AL" ? "ALUMINIUM" : m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input placeholder="Thickness (mm)" value={newRow.thickness} onChange={e => setNewRow({ ...newRow, thickness: e.target.value })} className="w-40" type="number" step="0.1" />
              <Input placeholder="Running Meter Rate" value={newRow.runningMeter} onChange={e => setNewRow({ ...newRow, runningMeter: e.target.value })} className="w-48" type="number" step="0.1" />
              <Input placeholder="Piercing Rate" value={newRow.piercing} onChange={e => setNewRow({ ...newRow, piercing: e.target.value })} className="w-40" type="number" step="0.1" />
              <Button onClick={addNewRate} size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> Add Rate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Material Tables */}
        {(["MS", "SS", "AL", "GI", "BRASS"] as Material[]).map((material) => {
          const materialRates = rates[material] || {};
          const entries = Object.entries(materialRates);

          return (
            <Card key={material} className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Package className="h-8 w-8" />
                  {material === "AL" ? "ALUMINIUM" : material}
                  <Badge variant="secondary" className="ml-4">{entries.length} Rates</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32 font-bold">Thickness</TableHead>
                      <TableHead className="font-bold">Running Meter Rate</TableHead>
                      <TableHead className="font-bold">Piercing Rate</TableHead>
                      <TableHead className="text-right w-32 font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length > 0 ? (
                      entries.map(([id, row]) => {
                        const isEditing = editingId === `${material}-${id}`;
                        return (
                          <TableRow key={id} className="hover:bg-muted/50">
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editValues.thickness ?? row.thickness}
                                  onChange={(e) => setEditValues({ ...editValues, thickness: Number(e.target.value) || 0 })}
                                  type="number"
                                  step="0.1"
                                  className="w-24"
                                />
                              ) : (
                                <span className="font-medium">{row.thickness}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editValues.runningMeter ?? row.runningMeter}
                                  onChange={(e) => setEditValues({ ...editValues, runningMeter: Number(e.target.value) || 0 })}
                                  type="number"
                                  step="0.1"
                                />
                              ) : (
                                <span className="font-semibold text-green-700">₹{row.runningMeter}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editValues.piercing ?? row.piercing}
                                  onChange={(e) => setEditValues({ ...editValues, piercing: Number(e.target.value) || 0 })}
                                  type="number"
                                  step="0.1"
                                />
                              ) : (
                                <span className="font-semibold text-blue-700">₹{row.piercing}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(material, id)}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEdit(material, id, row)}
                                    disabled={!hasEditPermission}
                                    title={hasEditPermission ? "Edit" : "Admin only"}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteDialog({ material, id })}
                                    disabled={!hasEditPermission}
                                    title={hasEditPermission ? "Delete" : "Admin only"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          No rates defined yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rate Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This rate will be removed from all calculations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default RateChartMaster;
