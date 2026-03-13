import { useEffect, useState } from "react";
import { ref, onValue, set, push, remove } from "firebase/database";
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

interface RateRow {
  thickness: number;
  runningMeter: number;
  piercing: number;
}

const MaterialTypes = () => {
  const { toast } = useToast();
  const hasEditPermission = isAdmin();

  // Dynamic material names from Firebase
  const [materialNames, setMaterialNames] = useState<{ id: string; name: string }[]>([]);
  // Rates keyed by material name
  const [rates, setRates] = useState<Record<string, Record<string, RateRow>>>({});

  // Add new material type
  const [newMaterial, setNewMaterial] = useState("");

  // Add new rate row
  const [newRate, setNewRate] = useState({ material: "", thickness: "", runningMeter: "", piercing: "" });

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RateRow>>({});

  // Dialogs
  const [deleteRateDialog, setDeleteRateDialog] = useState<{ material: string; id: string } | null>(null);
  const [deleteMaterialDialog, setDeleteMaterialDialog] = useState<{ id: string; name: string } | null>(null);

  const [loading, setLoading] = useState(true);

  // Load material names
  useEffect(() => {
    const unsub = onValue(ref(db, "materialTypes"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({ id, name: v.name }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setMaterialNames(list);
        // Set first material as default for new rate if not set
        setNewRate(prev => prev.material ? prev : { ...prev, material: list[0]?.name || "" });
      } else {
        setMaterialNames([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load rates
  useEffect(() => {
    const unsub = onValue(ref(db, "materialRates"), (snap) => {
      const data = snap.val();
      if (data) {
        const normalized: Record<string, Record<string, RateRow>> = {};
        Object.entries(data).forEach(([mat, value]: [string, any]) => {
          if (typeof value === "object" && value !== null) {
            normalized[mat] = value as Record<string, RateRow>;
          }
        });
        setRates(normalized);
      } else {
        setRates({});
      }
    });
    return () => unsub();
  }, []);

  // Add new material type
  const handleAddMaterial = async () => {
    const name = newMaterial.trim().toUpperCase();
    if (!name) {
      toast({ title: "Error", description: "Material name is required", variant: "destructive" });
      return;
    }
    if (materialNames.some(m => m.name === name)) {
      toast({ title: "Already Exists", description: `"${name}" already exists`, variant: "destructive" });
      return;
    }
    try {
      await push(ref(db, "materialTypes"), { name });
      toast({ title: "Added", description: `Material "${name}" added` });
      setNewMaterial("");
    } catch {
      toast({ title: "Error", description: "Failed to add material", variant: "destructive" });
    }
  };

  // Delete material type + all its rates
  const handleDeleteMaterial = async () => {
    if (!deleteMaterialDialog) return;
    try {
      await remove(ref(db, `materialTypes/${deleteMaterialDialog.id}`));
      await remove(ref(db, `materialRates/${deleteMaterialDialog.name}`));
      toast({ title: "Deleted", description: `"${deleteMaterialDialog.name}" and its rates removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete material", variant: "destructive" });
    } finally {
      setDeleteMaterialDialog(null);
    }
  };

  // Add rate row
  const handleAddRate = async () => {
    const { material, thickness, runningMeter, piercing } = newRate;
    if (!material || !thickness || !runningMeter || !piercing) {
      toast({ title: "Error", description: "All fields required", variant: "destructive" });
      return;
    }
    const t = parseFloat(thickness), rm = parseFloat(runningMeter), p = parseFloat(piercing);
    if (isNaN(t) || isNaN(rm) || isNaN(p)) {
      toast({ title: "Invalid", description: "Enter valid numbers", variant: "destructive" });
      return;
    }
    try {
      const newRef = push(ref(db, `materialRates/${material}`));
      await set(newRef, { thickness: t, runningMeter: rm, piercing: p });
      toast({ title: "Added", description: "Rate added!" });
      setNewRate({ ...newRate, thickness: "", runningMeter: "", piercing: "" });
    } catch {
      toast({ title: "Error", description: "Failed to add rate", variant: "destructive" });
    }
  };

  // Edit rate
  const startEdit = (material: string, id: string, row: RateRow) => {
    setEditingId(`${material}-${id}`);
    setEditValues({ thickness: row.thickness, runningMeter: row.runningMeter, piercing: row.piercing });
  };

  const saveEdit = async (material: string, id: string) => {
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
      toast({ title: "Updated", description: "Rate updated" });
      setEditingId(null);
      setEditValues({});
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  // Delete rate row
  const confirmDeleteRate = async () => {
    if (!deleteRateDialog) return;
    try {
      await remove(ref(db, `materialRates/${deleteRateDialog.material}/${deleteRateDialog.id}`));
      toast({ title: "Deleted", description: "Rate removed" });
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeleteRateDialog(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-10 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 w-full space-y-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Package className="h-10 w-10 text-primary" />
              Material Types
            </h1>
            <p className="text-muted-foreground mt-2">Add custom materials and manage their rates</p>
          </div>
          <Badge variant="secondary" className="text-lg px-6 py-3">Live in Database</Badge>
        </div>

        {/* Add New Material Type */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-3">
              <Plus className="h-6 w-6" /> Add New Material Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <label className="text-sm font-medium mb-1 block">Material Name</label>
                <Input
                  placeholder="e.g. WOOD, ACRYLIC, PVC..."
                  value={newMaterial}
                  onChange={e => setNewMaterial(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddMaterial()}
                />
              </div>
              <Button onClick={handleAddMaterial} size="lg" className="gap-2">
                <Plus className="h-5 w-5" /> Add Material
              </Button>
            </div>

            {/* Material chips */}
            {materialNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {materialNames.map(m => (
                  <div key={m.id} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    {m.name}
                    {hasEditPermission && (
                      <button
                        onClick={() => setDeleteMaterialDialog({ id: m.id, name: m.name })}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Rate Row */}
        {materialNames.length > 0 && (
          <Card className="border-2 border-dashed border-green-300 bg-green-50/30">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-3">
                <Plus className="h-6 w-6 text-green-600" /> Add Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="min-w-40">
                  <label className="text-sm font-medium mb-1 block">Material</label>
                  <Select
                    value={newRate.material}
                    onValueChange={v => setNewRate({ ...newRate, material: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                    <SelectContent>
                      {materialNames.map(m => (
                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Thickness (mm)</label>
                  <Input placeholder="e.g. 1.5" value={newRate.thickness} onChange={e => setNewRate({ ...newRate, thickness: e.target.value })} className="w-36" type="number" step="0.1" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Running Meter Rate</label>
                  <Input placeholder="e.g. 20" value={newRate.runningMeter} onChange={e => setNewRate({ ...newRate, runningMeter: e.target.value })} className="w-44" type="number" step="0.1" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Piercing Rate</label>
                  <Input placeholder="e.g. 1.5" value={newRate.piercing} onChange={e => setNewRate({ ...newRate, piercing: e.target.value })} className="w-36" type="number" step="0.1" />
                </div>
                <Button onClick={handleAddRate} size="lg" className="gap-2">
                  <Plus className="h-5 w-5" /> Add Rate
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No materials yet */}
        {materialNames.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No materials added yet</p>
            <p className="text-sm mt-1">Add your first material type above</p>
          </div>
        )}

        {/* Rate Tables per Material */}
        {materialNames.map(({ name }) => {
          const materialRates = rates[name] || {};
          const entries = Object.entries(materialRates);
          return (
            <Card key={name} className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Package className="h-8 w-8" />
                  {name}
                  <Badge variant="secondary" className="ml-4">{entries.length} Rates</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32 font-bold">Thickness (mm)</TableHead>
                      <TableHead className="font-bold">Running Meter Rate</TableHead>
                      <TableHead className="font-bold">Piercing Rate</TableHead>
                      <TableHead className="text-right w-32 font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length > 0 ? (
                      entries.map(([id, row]) => {
                        const isEditing = editingId === `${name}-${id}`;
                        return (
                          <TableRow key={id} className="hover:bg-muted/50">
                            <TableCell>
                              {isEditing ? (
                                <Input value={editValues.thickness ?? row.thickness} onChange={e => setEditValues({ ...editValues, thickness: Number(e.target.value) || 0 })} type="number" step="0.1" className="w-24" />
                              ) : (
                                <span className="font-medium">{row.thickness}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editValues.runningMeter ?? row.runningMeter} onChange={e => setEditValues({ ...editValues, runningMeter: Number(e.target.value) || 0 })} type="number" step="0.1" />
                              ) : (
                                <span className="font-semibold text-green-700">₹{row.runningMeter}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editValues.piercing ?? row.piercing} onChange={e => setEditValues({ ...editValues, piercing: Number(e.target.value) || 0 })} type="number" step="0.1" />
                              ) : (
                                <span className="font-semibold text-blue-700">₹{row.piercing}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(name, id)}><Save className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditValues({}); }}><X className="h-4 w-4" /></Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => startEdit(name, id, row)} disabled={!hasEditPermission}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteRateDialog({ material: name, id })} disabled={!hasEditPermission}>
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
                          No rates added yet for {name}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

        {/* Delete Rate Row Dialog */}
        <AlertDialog open={!!deleteRateDialog} onOpenChange={() => setDeleteRateDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Rate?</AlertDialogTitle>
              <AlertDialogDescription>This rate will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteRate} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Material Type Dialog */}
        <AlertDialog open={!!deleteMaterialDialog} onOpenChange={() => setDeleteMaterialDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleteMaterialDialog?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the material type and ALL its rates permanently.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteMaterial} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
};

export default MaterialTypes;
