import { useEffect, useState } from "react";
import { ref, push, onValue, remove } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Layers, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAdmin } from "@/utils/auth";

interface Model {
  id: string;
  name: string;
  materialType: string;
}

interface MaterialType {
  id: string;
  name: string;
}

const Models = () => {
  const { toast } = useToast();
  const hasEditPermission = isAdmin();

  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  // new model input per material type
  const [newModelInputs, setNewModelInputs] = useState<Record<string, string>>({});

  const [deleteDialog, setDeleteDialog] = useState<Model | null>(null);

  // Load material types from Firebase (masters)
  useEffect(() => {
    const unsub = onValue(ref(db, "materialTypes"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({ id, name: v.name }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setMaterialTypes(list);
      } else {
        setMaterialTypes([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load models from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "models"), (snap) => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, v]: [string, any]) => ({
          id,
          name: v.name,
          materialType: v.materialType,
        }));
        setModels(list);
      } else {
        setModels([]);
      }
    });
    return () => unsub();
  }, []);

  const handleAdd = async (materialType: string) => {
    const name = (newModelInputs[materialType] || "").trim().toUpperCase();
    if (!name) {
      toast({ title: "Error", description: "Model name is required", variant: "destructive" });
      return;
    }
    if (models.some((m) => m.name === name && m.materialType === materialType)) {
      toast({ title: "Already Exists", description: `"${name}" already exists under ${materialType}`, variant: "destructive" });
      return;
    }
    try {
      await push(ref(db, "models"), { name, materialType });
      toast({ title: "Added", description: `Model "${name}" added` });
      setNewModelInputs((prev) => ({ ...prev, [materialType]: "" }));
    } catch {
      toast({ title: "Error", description: "Failed to add model", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await remove(ref(db, `models/${deleteDialog.id}`));
      toast({ title: "Deleted", description: `"${deleteDialog.name}" removed` });
    } catch {
      toast({ title: "Error", description: "Failed to delete model", variant: "destructive" });
    } finally {
      setDeleteDialog(null);
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
      <div className="p-6 w-full space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Layers className="h-10 w-10 text-primary" />
            Models
          </h1>
          <p className="text-muted-foreground mt-2">
            Add models under each material type — reflects live in Add Job
          </p>
        </div>

        {/* No material types */}
        {materialTypes.length === 0 && (
          <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl">
            <Layers className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No material types found</p>
            <p className="text-sm mt-1">Add material types first from the Material Types page</p>
          </div>
        )}

        {/* One card per material type */}
        {materialTypes.map(({ name }) => {
          const groupModels = models.filter((m) => m.materialType === name);
          return (
            <Card key={name} className="overflow-hidden shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 py-4">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Layers className="h-5 w-5" />
                  {name}
                  <Badge variant="secondary">{groupModels.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">

                {/* Add input */}
                {hasEditPermission && (
                  <div className="flex gap-3 items-center">
                    <Input
                      placeholder={`Add model under ${name}...`}
                      value={newModelInputs[name] || ""}
                      onChange={(e) => setNewModelInputs((prev) => ({ ...prev, [name]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAdd(name)}
                      className="max-w-xs"
                    />
                    <Button onClick={() => handleAdd(name)} size="sm" className="gap-1">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                )}

                {/* Model chips */}
                {groupModels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {groupModels.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium"
                      >
                        {model.name}
                        {hasEditPermission && (
                          <button
                            onClick={() => setDeleteDialog(model)}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No models added yet</p>
                )}

              </CardContent>
            </Card>
          );
        })}

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleteDialog?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>This model will be permanently removed.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
};

export default Models;
