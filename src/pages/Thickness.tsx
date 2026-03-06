import { useEffect, useState } from "react";
import { ref, push, onValue, remove } from "firebase/database";
import { db } from "@/config/firebase";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
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
import { Trash2, Ruler, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { moveToRecycleBin } from "@/utils/recycleBinUtils";
import { isAdmin } from "@/utils/auth";

interface Thickness {
  id: string;
  name: string;
}

const Thickness = () => {
  const { toast } = useToast();
  const [thicknesses, setThicknesses] = useState<Thickness[]>([]);
  const [newThickness, setNewThickness] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Thickness | null>(null);
  const hasEditPermission = isAdmin();

  useEffect(() => {
    const thicknessesRef = ref(db, "thicknesses");
    const unsubscribe = onValue(thicknessesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const thicknessesList = Object.entries(data).map(([id, name]: [string, any]) => ({
          id,
          name: typeof name === 'string' ? name : name.name || '',
        }));
        setThicknesses(thicknessesList);
      } else {
        setThicknesses([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newThickness.trim()) {
      toast({
        title: "Error",
        description: "Please enter a thickness value",
        variant: "destructive",
      });
      return;
    }

    try {
      const thicknessesRef = ref(db, "thicknesses");
      await push(thicknessesRef, newThickness.trim());
      setNewThickness("");
      toast({
        title: "Success",
        description: "Thickness added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add thickness",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await moveToRecycleBin(itemToDelete.id, "thickness", `thicknesses/${itemToDelete.id}`);
      await remove(ref(db, `thicknesses/${itemToDelete.id}`));
      toast({
        title: "Success",
        description: "Thickness moved to recycle bin",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete thickness",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Thickness Options</h1>
          <p className="text-muted-foreground">Manage thickness specifications (e.g., 2 MM, 3 MM, 5 MM)</p>
        </div>

        <Card className="p-6 bg-gradient-to-r from-background to-muted/30">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter thickness (e.g., 2 MM, 3 MM)"
              value={newThickness}
              onChange={(e) => setNewThickness(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAdd()}
              className="flex-1"
            />
            <Button onClick={handleAdd} className="gap-2" disabled={!hasEditPermission}>
              <Plus className="h-4 w-4" />
              Add Thickness
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Ruler className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Thickness List</h2>
            <Badge variant="secondary" className="ml-2">
              {thicknesses.length}
            </Badge>
          </div>

          {thicknesses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ruler className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No thickness options added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {thicknesses.map((thickness) => (
                <div
                  key={thickness.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium">{thickness.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setItemToDelete(thickness);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={!hasEditPermission}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Thickness?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move "{itemToDelete?.name}" to the recycle bin. You can restore it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Thickness;
